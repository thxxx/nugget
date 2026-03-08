import { jsonError, jsonOk } from "@/lib/http";
import {
  isUuid,
  normalizePublicFlag,
  normalizeSaveRating,
  normalizeTags,
  normalizeVisitStatus,
  toErrorMessage,
} from "@/lib/server/helpers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { SavePayloadPlace } from "@/lib/types/domain";

type SaveBody = {
  userId?: string;
  place?: SavePayloadPlace;
  memo?: string;
  visitStatus?: "planned" | "visited";
  tags?: string[];
  isPublic?: boolean;
  rating?: 1 | 2 | 3;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveBody;
    const userId = body.userId?.trim() ?? "";
    const place = body.place;
    const memo = (body.memo ?? "").trim();
    const visitStatus = normalizeVisitStatus(body.visitStatus);
    const tags = normalizeTags(body.tags);
    const isPublic = normalizePublicFlag(body.isPublic);
    const rating = normalizeSaveRating(body.rating);

    if (!isUuid(userId)) {
      return jsonError("INVALID_USER", "userId 형식이 올바르지 않습니다.", 400);
    }

    if (!place) {
      return jsonError("INVALID_PLACE", "저장할 장소 정보가 없습니다.", 400);
    }

    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
      return jsonError("INVALID_COORDINATE", "좌표 정보가 올바르지 않습니다.", 400);
    }

    if (memo.length > 500) {
      return jsonError("INVALID_MEMO", "메모는 500자 이하여야 합니다.", 400);
    }

    const supabase = createServiceRoleClient();

    const { data: upsertedPlace, error: placeError } = await supabase
      .from("places")
      .upsert(
        {
          external_place_key: place.externalPlaceKey,
          name: place.title,
          road_address: place.roadAddress,
          jibun_address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          category: place.category,
          phone: place.telephone,
          mapx: place.rawMapx,
          mapy: place.rawMapy,
          source_link: place.link,
          raw_json: place,
        },
        {
          onConflict: "external_place_key",
        },
      )
      .select("id,name,road_address,jibun_address,latitude,longitude")
      .single();

    if (placeError) {
      return jsonError("DB_ERROR", placeError.message, 500);
    }

    const { data: saveRow, error: saveError } = await supabase
      .from("place_saves")
      .upsert(
        {
          user_id: userId,
          place_id: upsertedPlace.id,
          memo,
          visit_status: visitStatus,
          tags,
          is_public: isPublic,
          rating,
        },
        {
          onConflict: "user_id,place_id",
        },
      )
      .select("id,memo,visit_status,tags,is_public,rating,user_id,place_id,created_at,updated_at")
      .single();

    if (saveError) {
      return jsonError("DB_ERROR", saveError.message, 500);
    }

    return jsonOk(
      {
        save: saveRow,
        place: upsertedPlace,
      },
      201,
    );
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
