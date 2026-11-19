import { getServerKakaoSearchEnv } from "@/lib/env/server";
import { jsonError, jsonOk } from "@/lib/http";
import { simplifyPath } from "@/lib/jeju/geo";
import type { LatLngTuple } from "@/lib/jeju/types";
import { toErrorMessage } from "@/lib/server/helpers";

type KakaoDirectionsResponse = {
  routes?: Array<{
    result_code: number;
    result_msg: string;
    summary?: {
      distance: number;
      duration: number;
      fare?: { taxi?: number; toll?: number };
    };
    sections?: Array<{
      roads?: Array<{ vertexes: number[] }>;
    }>;
  }>;
};

function parseLngLat(value: string | null) {
  if (!value) return null;
  const [lng, lat] = value.split(",").map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

/**
 * Car route between two points via Kakao Mobility Directions.
 * GET /api/jeju/directions?origin=lng,lat&destination=lng,lat
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = parseLngLat(searchParams.get("origin"));
    const destination = parseLngLat(searchParams.get("destination"));

    if (!origin || !destination) {
      return jsonError("INVALID_POINTS", "origin, destination이 필요해요.", 400);
    }

    const env = getServerKakaoSearchEnv();
    const endpoint = new URL("https://apis-navi.kakaomobility.com/v1/directions");
    endpoint.searchParams.set("origin", `${origin.lng},${origin.lat}`);
    endpoint.searchParams.set("destination", `${destination.lng},${destination.lat}`);
    endpoint.searchParams.set("priority", "RECOMMEND");
    endpoint.searchParams.set("summary", "false");

    const response = await fetch(endpoint, {
      headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` },
      next: { revalidate: 60 * 60 * 6 },
    });

    if (!response.ok) {
      return jsonError("KAKAO_NAVI_ERROR", `길찾기 호출에 실패했어요. (${response.status})`, 502);
    }

    const payload = (await response.json()) as KakaoDirectionsResponse;
    const route = payload.routes?.[0];

    if (!route || route.result_code !== 0 || !route.summary) {
      return jsonError(
        "NO_ROUTE",
        route?.result_msg ?? "경로를 찾지 못했어요.",
        422,
      );
    }

    const path: LatLngTuple[] = [];
    for (const section of route.sections ?? []) {
      for (const road of section.roads ?? []) {
        const v = road.vertexes;
        for (let i = 0; i + 1 < v.length; i += 2) {
          path.push([v[i + 1], v[i]]);
        }
      }
    }

    const simplified = simplifyPath(path).map(
      ([lat, lng]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))] as LatLngTuple,
    );

    return jsonOk({
      distance: route.summary.distance,
      duration: route.summary.duration,
      taxi: route.summary.fare?.taxi ?? null,
      path: simplified,
    });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
