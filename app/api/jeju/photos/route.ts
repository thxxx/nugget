import { getServerKakaoSearchEnv } from "@/lib/env/server";
import { jsonError, jsonOk } from "@/lib/http";
import type { PlacePhotoItem } from "@/lib/jeju/types";
import { toErrorMessage } from "@/lib/server/helpers";

type KakaoImageResponse = {
  documents: Array<{
    image_url: string;
    thumbnail_url: string;
    width: number;
    height: number;
    display_sitename: string;
  }>;
};

const ALLOWED_HOSTS = [/\.kakaocdn\.net$/, /\.daumcdn\.net$/, /\.pstatic\.net$/];

function isAllowed(url: string) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && ALLOWED_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}

async function searchImages(query: string, key: string) {
  const endpoint = new URL("https://dapi.kakao.com/v2/search/image");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("size", "24");
  endpoint.searchParams.set("sort", "accuracy");
  const res = await fetch(endpoint, {
    headers: { Authorization: `KakaoAK ${key}` },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`이미지 검색 실패 (${res.status})`);
  const data = (await res.json()) as KakaoImageResponse;
  return data.documents ?? [];
}

/**
 * Representative photos for a place via Kakao (Daum) image search.
 * GET /api/jeju/photos?q=<name area>&fallback=<name 제주>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const fallback = searchParams.get("fallback")?.trim();
    if (!q) return jsonError("INVALID_QUERY", "q가 필요해요.", 400);

    const { KAKAO_REST_API_KEY } = getServerKakaoSearchEnv();

    const pick = (docs: KakaoImageResponse["documents"]) => {
      const seen = new Set<string>();
      const out: PlacePhotoItem[] = [];
      for (const d of docs) {
        if (!isAllowed(d.image_url) || seen.has(d.image_url)) continue;
        const ratio = d.width / Math.max(1, d.height);
        if (d.width < 420 || d.height < 300 || ratio < 0.62 || ratio > 2.1) continue;
        seen.add(d.image_url);
        out.push({ src: d.image_url, thumb: d.thumbnail_url, w: d.width, h: d.height });
        if (out.length >= 6) break;
      }
      return out;
    };

    let photos = pick(await searchImages(q, KAKAO_REST_API_KEY));
    if (photos.length < 2 && fallback && fallback !== q) {
      const more = pick(await searchImages(fallback, KAKAO_REST_API_KEY));
      const seen = new Set(photos.map((p) => p.src));
      photos = [...photos, ...more.filter((p) => !seen.has(p.src))].slice(0, 6);
    }

    return jsonOk({ photos });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
