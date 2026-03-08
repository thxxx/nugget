import type { MapFeedPlace, SaveOwner } from "@/lib/types/domain";
import { jsonError, jsonOk } from "@/lib/http";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isUuid, toErrorMessage } from "@/lib/server/helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewerId = searchParams.get("viewerId")?.trim() ?? "";

    if (!isUuid(viewerId)) {
      return jsonError("INVALID_VIEWER", "viewerId 형식이 올바르지 않습니다.", 400);
    }

    const supabase = createServiceRoleClient();

    const { data: followingRows, error: followingError } = await supabase
      .from("follows")
      .select("following_user_id")
      .eq("follower_user_id", viewerId);

    if (followingError) {
      return jsonError("DB_ERROR", followingError.message, 500);
    }

    const followingIds = (followingRows ?? []).map((row) => row.following_user_id);
    const followingSet = new Set(followingIds);
    const ownerIds = [viewerId, ...followingIds];

    const { data: saves, error: savesError } = await supabase
      .from("place_saves")
      .select("id,user_id,place_id,memo,visit_status,tags,is_public,rating,created_at")
      .in("user_id", ownerIds)
      .order("created_at", { ascending: false });

    if (savesError) {
      return jsonError("DB_ERROR", savesError.message, 500);
    }

    if (!saves?.length) {
      return jsonOk({ places: [] });
    }

    const saveIds = Array.from(new Set(saves.map((save) => save.id)));
    const placeIds = Array.from(new Set(saves.map((save) => save.place_id)));
    const userIds = Array.from(new Set(saves.map((save) => save.user_id)));

    const [placesResult, usersResult, reactionsResult] = await Promise.all([
      supabase
        .from("places")
        .select(
          "id,external_place_key,name,category,road_address,jibun_address,latitude,longitude",
        )
        .in("id", placeIds),
      supabase.from("users").select("id,nickname").in("id", userIds),
      supabase
        .from("place_save_reactions")
        .select("save_id,user_id,reaction")
        .in("save_id", saveIds),
    ]);

    if (placesResult.error) {
      return jsonError("DB_ERROR", placesResult.error.message, 500);
    }

    if (usersResult.error) {
      return jsonError("DB_ERROR", usersResult.error.message, 500);
    }

    if (reactionsResult.error && reactionsResult.error.code !== "42P01") {
      return jsonError("DB_ERROR", reactionsResult.error.message, 500);
    }

    const placeMap = new Map((placesResult.data ?? []).map((place) => [place.id, place]));
    const userMap = new Map((usersResult.data ?? []).map((user) => [user.id, user]));
    const reactionRows = reactionsResult.error?.code === "42P01" ? [] : reactionsResult.data ?? [];
    const reactionCountMap = new Map<number, { likeCount: number; dislikeCount: number }>();
    const viewerReactionMap = new Map<number, "like" | "dislike">();

    for (const row of reactionRows) {
      if (row.reaction !== "like" && row.reaction !== "dislike") {
        continue;
      }

      const prev = reactionCountMap.get(row.save_id) ?? {
        likeCount: 0,
        dislikeCount: 0,
      };
      if (row.reaction === "like") {
        prev.likeCount += 1;
      } else {
        prev.dislikeCount += 1;
      }
      reactionCountMap.set(row.save_id, prev);

      if (row.user_id === viewerId) {
        viewerReactionMap.set(row.save_id, row.reaction);
      }
    }

    const grouped = new Map<number, MapFeedPlace>();

    for (const save of saves) {
      if (save.user_id !== viewerId && save.is_public !== true) {
        continue;
      }

      const place = placeMap.get(save.place_id);
      const owner = userMap.get(save.user_id);

      if (!place || !owner) {
        continue;
      }

      const isMemoVisible = save.user_id === viewerId || followingSet.has(save.user_id);

      const ownerItem: SaveOwner = {
        userId: owner.id,
        nickname: owner.nickname,
        saveId: save.id,
        memo: isMemoVisible ? save.memo : null,
        visitStatus: save.visit_status === "visited" ? "visited" : "planned",
        tags: Array.isArray(save.tags) ? save.tags.filter((tag) => typeof tag === "string") : [],
        isPublic: save.is_public === true,
        rating: save.rating === 1 || save.rating === 2 || save.rating === 3 ? save.rating : 3,
        likeCount: reactionCountMap.get(save.id)?.likeCount ?? 0,
        dislikeCount: reactionCountMap.get(save.id)?.dislikeCount ?? 0,
        viewerReaction: viewerReactionMap.get(save.id) ?? null,
        createdAt: save.created_at,
      };

      const existing = grouped.get(place.id);
      if (existing) {
        existing.owners.push(ownerItem);
        continue;
      }

      grouped.set(place.id, {
        placeId: place.id,
        externalPlaceKey: place.external_place_key,
        name: place.name,
        category: place.category,
        roadAddress: place.road_address,
        jibunAddress: place.jibun_address,
        latitude: Number(place.latitude),
        longitude: Number(place.longitude),
        owners: [ownerItem],
      });
    }

    return jsonOk({ places: Array.from(grouped.values()) });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
