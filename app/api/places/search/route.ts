import { getServerKakaoSearchEnv } from "@/lib/env/server";
import { jsonError, jsonOk } from "@/lib/http";
import { toSearchPlaceItems } from "@/lib/kakao/local-search";
import { toErrorMessage } from "@/lib/server/helpers";

type SearchBody = {
  query?: string;
};

type KakaoLocalSearchResponse = {
  documents: Array<{
    id: string;
    place_name: string;
    category_name: string;
    phone: string;
    address_name: string;
    road_address_name: string;
    x: string;
    y: string;
    place_url: string;
  }>;
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchBody;
    const query = body.query?.trim() ?? "";

    if (query.length < 2) {
      return jsonError("INVALID_QUERY", "검색어는 2자 이상 입력해 주세요.", 400);
    }

    const env = getServerKakaoSearchEnv();
    const endpoint = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    endpoint.searchParams.set("query", query);
    endpoint.searchParams.set("size", "5");
    endpoint.searchParams.set("page", "1");
    endpoint.searchParams.set("sort", "accuracy");

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return jsonError(
        "KAKAO_API_ERROR",
        `카카오 장소 검색 호출에 실패했습니다. (${response.status})`,
        502,
      );
    }

    const payload = (await response.json()) as KakaoLocalSearchResponse;
    const items = toSearchPlaceItems(payload.documents ?? []);

    return jsonOk({
      total: payload.meta?.total_count ?? 0,
      items,
    });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
