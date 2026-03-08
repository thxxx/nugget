import { jsonError, jsonOk } from "@/lib/http";
import { isUuid, toErrorMessage } from "@/lib/server/helpers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { SaveLikeActivityItem } from "@/lib/types/domain";

const ACTIVITY_LIMIT = 100;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim() ?? "";

    if (!isUuid(userId)) {
      return jsonError("INVALID_USER", "userId 형식이 올바르지 않습니다.", 400);
    }

    const supabase = createServiceRoleClient();

    const { data: mySaves, error: mySavesError } = await supabase
      .from("place_saves")
      .select("id,place_id")
      .eq("user_id", userId);

    if (mySavesError) {
      return jsonError("DB_ERROR", mySavesError.message, 500);
    }

    if (!mySaves?.length) {
      return jsonOk({ items: [] });
    }

    const saveIdToPlaceId = new Map(mySaves.map((save) => [save.id, save.place_id]));
    const saveIds = mySaves.map((save) => save.id);
    const placeIds = Array.from(new Set(mySaves.map((save) => save.place_id)));

    const { data: reactionRows, error: reactionRowsError } = await supabase
      .from("place_save_reactions")
      .select("save_id,user_id,reaction,created_at")
      .in("save_id", saveIds)
      .eq("reaction", "like")
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LIMIT);

    if (reactionRowsError) {
      if (reactionRowsError.code === "42P01") {
        return jsonError(
          "MISSING_TABLE",
          "place_save_reactions 테이블이 없습니다. SQL 마이그레이션을 먼저 실행해 주세요.",
          500,
        );
      }

      return jsonError("DB_ERROR", reactionRowsError.message, 500);
    }

    if (!reactionRows?.length) {
      return jsonOk({ items: [] });
    }

    const reactorUserIds = Array.from(new Set(reactionRows.map((row) => row.user_id)));

    const [usersResult, placesResult] = await Promise.all([
      supabase.from("users").select("id,nickname").in("id", reactorUserIds),
      supabase.from("places").select("id,name").in("id", placeIds),
    ]);

    if (usersResult.error) {
      return jsonError("DB_ERROR", usersResult.error.message, 500);
    }

    if (placesResult.error) {
      return jsonError("DB_ERROR", placesResult.error.message, 500);
    }

    const userMap = new Map((usersResult.data ?? []).map((user) => [user.id, user]));
    const placeMap = new Map((placesResult.data ?? []).map((place) => [place.id, place]));

    const items: SaveLikeActivityItem[] = reactionRows
      .map((row) => {
        const placeId = saveIdToPlaceId.get(row.save_id);
        const user = userMap.get(row.user_id);
        const place = placeId ? placeMap.get(placeId) : undefined;

        if (!placeId || !user || !place) {
          return null;
        }

        return {
          id: `${row.save_id}:${row.user_id}`,
          saveId: row.save_id,
          placeId,
          placeName: place.name,
          reactorUserId: user.id,
          reactorNickname: user.nickname,
          createdAt: row.created_at,
        };
      })
      .filter((item): item is SaveLikeActivityItem => Boolean(item));

    return jsonOk({ items });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
