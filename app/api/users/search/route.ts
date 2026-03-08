import { jsonError, jsonOk } from "@/lib/http";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isUuid, toErrorMessage } from "@/lib/server/helpers";

const SEARCH_LIMIT = 20;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const viewerId = searchParams.get("viewerId")?.trim() ?? "";

    if (!q) {
      return jsonOk({ users: [] });
    }

    if (viewerId && !isUuid(viewerId)) {
      return jsonError("INVALID_VIEWER", "viewerId 형식이 올바르지 않습니다.", 400);
    }

    const supabase = createServiceRoleClient();

    let usersQuery = supabase
      .from("users")
      .select("id,nickname")
      .ilike("nickname", `%${q}%`)
      .order("nickname", { ascending: true })
      .limit(SEARCH_LIMIT);

    if (viewerId) {
      usersQuery = usersQuery.neq("id", viewerId);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      return jsonError("DB_ERROR", usersError.message, 500);
    }

    if (!users?.length) {
      return jsonOk({ users: [] });
    }

    const userIds = users.map((user) => user.id);

    let followingSet = new Set<string>();
    let followerSet = new Set<string>();

    if (viewerId) {
      const [followingResult, followerResult] = await Promise.all([
        supabase
          .from("follows")
          .select("following_user_id")
          .eq("follower_user_id", viewerId)
          .in("following_user_id", userIds),
        supabase
          .from("follows")
          .select("follower_user_id")
          .eq("following_user_id", viewerId)
          .in("follower_user_id", userIds),
      ]);

      if (followingResult.error) {
        return jsonError("DB_ERROR", followingResult.error.message, 500);
      }

      if (followerResult.error) {
        return jsonError("DB_ERROR", followerResult.error.message, 500);
      }

      followingSet = new Set(
        (followingResult.data ?? []).map((relation) => relation.following_user_id),
      );
      followerSet = new Set((followerResult.data ?? []).map((relation) => relation.follower_user_id));
    }

    const { data: saveRows, error: saveRowsError } = await supabase
      .from("place_saves")
      .select("user_id,is_public")
      .in("user_id", userIds);

    if (saveRowsError) {
      return jsonError("DB_ERROR", saveRowsError.message, 500);
    }

    const saveCountByUserId = new Map<string, number>();
    for (const row of saveRows ?? []) {
      if (!row.is_public) {
        continue;
      }

      const prev = saveCountByUserId.get(row.user_id) ?? 0;
      saveCountByUserId.set(row.user_id, prev + 1);
    }

    return jsonOk({
      users: users.map((user) => ({
        id: user.id,
        nickname: user.nickname,
        isFollowing: followingSet.has(user.id),
        isFollower: followerSet.has(user.id),
        saveCount: saveCountByUserId.get(user.id) ?? 0,
      })),
    });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
