import { jsonError, jsonOk } from "@/lib/http";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isUuid, toErrorMessage } from "@/lib/server/helpers";

const SEARCH_LIMIT = 20;
const TOP_SAVED_LIMIT = 10;

async function getFollowSets(
  supabase: ReturnType<typeof createServiceRoleClient>,
  viewerId: string,
  userIds: string[],
) {
  if (!viewerId || !userIds.length) {
    return {
      followingSet: new Set<string>(),
      followerSet: new Set<string>(),
    };
  }

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
    throw new Error(followingResult.error.message);
  }

  if (followerResult.error) {
    throw new Error(followerResult.error.message);
  }

  return {
    followingSet: new Set(
      (followingResult.data ?? []).map((relation) => relation.following_user_id),
    ),
    followerSet: new Set(
      (followerResult.data ?? []).map((relation) => relation.follower_user_id),
    ),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const viewerId = searchParams.get("viewerId")?.trim() ?? "";

    if (viewerId && !isUuid(viewerId)) {
      return jsonError("INVALID_VIEWER", "viewerId 형식이 올바르지 않습니다.", 400);
    }

    const supabase = createServiceRoleClient();

    if (!q) {
      const { data: saveRows, error: saveRowsError } = await supabase
        .from("place_saves")
        .select("user_id")
        .eq("is_public", true);

      if (saveRowsError) {
        return jsonError("DB_ERROR", saveRowsError.message, 500);
      }

      const saveCountByUserId = new Map<string, number>();
      for (const row of saveRows ?? []) {
        if (viewerId && row.user_id === viewerId) {
          continue;
        }

        const prev = saveCountByUserId.get(row.user_id) ?? 0;
        saveCountByUserId.set(row.user_id, prev + 1);
      }

      if (!saveCountByUserId.size) {
        return jsonOk({ users: [] });
      }

      const rankedUserIds = Array.from(saveCountByUserId.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_SAVED_LIMIT)
        .map(([userId]) => userId);

      const { data: rankedUsers, error: rankedUsersError } = await supabase
        .from("users")
        .select("id,nickname")
        .in("id", rankedUserIds);

      if (rankedUsersError) {
        return jsonError("DB_ERROR", rankedUsersError.message, 500);
      }

      const sortedUsers = (rankedUsers ?? [])
        .sort((a, b) => {
          const countDiff =
            (saveCountByUserId.get(b.id) ?? 0) - (saveCountByUserId.get(a.id) ?? 0);
          if (countDiff !== 0) {
            return countDiff;
          }

          return a.nickname.localeCompare(b.nickname);
        })
        .slice(0, TOP_SAVED_LIMIT);

      const { followingSet, followerSet } = await getFollowSets(
        supabase,
        viewerId,
        sortedUsers.map((user) => user.id),
      );

      return jsonOk({
        users: sortedUsers.map((user) => ({
          id: user.id,
          nickname: user.nickname,
          isFollowing: followingSet.has(user.id),
          isFollower: followerSet.has(user.id),
          saveCount: saveCountByUserId.get(user.id) ?? 0,
        })),
      });
    }

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

    const { followingSet, followerSet } = await getFollowSets(
      supabase,
      viewerId,
      userIds,
    );

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
