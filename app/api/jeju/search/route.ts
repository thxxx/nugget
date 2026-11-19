import { getServerKakaoSearchEnv } from "@/lib/env/server";
import { jsonError, jsonOk } from "@/lib/http";
import { inferCategory } from "@/lib/jeju/category";
import { JEJU_RECT } from "@/lib/jeju/geo";
import type { Place, SearchResponse } from "@/lib/jeju/types";
import { toErrorMessage } from "@/lib/server/helpers";

type KakaoKeywordResponse = {
  documents: Array<{
    id: string;
    place_name: string;
    category_name: string;
    category_group_code: string;
    phone: string;
    address_name: string;
    road_address_name: string;
    x: string;
    y: string;
    place_url: string;
  }>;
  meta: { total_count: number; pageable_count: number; is_end: boolean };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const page = Math.min(Math.max(Number(searchParams.get("page") ?? 1) || 1, 1), 45);

    if (query.length < 1) {
      return jsonError("INVALID_QUERY", "검색어를 입력해 주세요.", 400);
    }

    const env = getServerKakaoSearchEnv();
    const endpoint = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    endpoint.searchParams.set("query", query);
    endpoint.searchParams.set("rect", JEJU_RECT);
    endpoint.searchParams.set("size", "15");
    endpoint.searchParams.set("page", String(page));
    endpoint.searchParams.set("sort", "accuracy");

    const response = await fetch(endpoint, {
      headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return jsonError("KAKAO_API_ERROR", `장소 검색에 실패했어요. (${response.status})`, 502);
    }

    const payload = (await response.json()) as KakaoKeywordResponse;
    const items: Place[] = (payload.documents ?? [])
      .map((doc) => ({
        id: doc.id,
        name: doc.place_name,
        categoryName: doc.category_name,
        category: inferCategory(doc.category_group_code, doc.category_name),
        address: doc.road_address_name || doc.address_name,
        phone: doc.phone,
        url: doc.place_url,
        lat: Number(doc.y),
        lng: Number(doc.x),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    const body: SearchResponse = {
      items,
      total: payload.meta?.pageable_count ?? items.length,
      isEnd: payload.meta?.is_end ?? true,
    };
    return jsonOk(body);
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
