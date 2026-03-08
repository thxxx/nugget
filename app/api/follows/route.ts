import { jsonError, jsonOk } from "@/lib/http";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isUuid, toErrorMessage } from "@/lib/server/helpers";

type FollowBody = {
  followerUserId?: string;
  followingUserId?: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewerId = searchParams.get("viewerId")?.trim() ?? "";
    const type = searchParams.get("type")?.trim() ?? "following";

    if (!isUuid(viewerId)) {
      return jsonError("INVALID_VIEWER", "viewerId 형식이 올바르지 않습니다.", 400);
    }

    if (type !== "following" && type !== "followers") {
      return jsonError("INVALID_TYPE", "type은 following 또는 followers여야 합니다.", 400);
    }

    const supabase = createServiceRoleClient();

    if (type === "following") {
      const { data: followingRows, error: followingError } = await supabase
        .from("follows")
        .select("following_user_id")
        .eq("follower_user_id", viewerId);

      if (followingError) {
        return jsonError("DB_ERROR", followingError.message, 500);
      }

      const ids = (followingRows ?? []).map((row) => row.following_user_id);
      if (!ids.length) {
        return jsonOk({ users: [] });
      }

      const [usersResult, reverseResult] = await Promise.all([
        supabase.from("users").select("id,nickname").in("id", ids),
        supabase
          .from("follows")
          .select("follower_user_id")
          .eq("following_user_id", viewerId)
          .in("follower_user_id", ids),
      ]);

      if (usersResult.error) {
        return jsonError("DB_ERROR", usersResult.error.message, 500);
      }

      if (reverseResult.error) {
        return jsonError("DB_ERROR", reverseResult.error.message, 500);
      }

      const followerSet = new Set((reverseResult.data ?? []).map((row) => row.follower_user_id));

      return jsonOk({
        users: (usersResult.data ?? [])
          .map((user) => ({
            id: user.id,
            nickname: user.nickname,
            isFollowing: true,
            isFollower: followerSet.has(user.id),
          }))
          .sort((a, b) => a.nickname.localeCompare(b.nickname)),
      });
    }

    const { data: followerRows, error: followerError } = await supabase
      .from("follows")
      .select("follower_user_id")
      .eq("following_user_id", viewerId);

    if (followerError) {
      return jsonError("DB_ERROR", followerError.message, 500);
    }

    const ids = (followerRows ?? []).map((row) => row.follower_user_id);
    if (!ids.length) {
      return jsonOk({ users: [] });
    }

    const [usersResult, followingResult] = await Promise.all([
      supabase.from("users").select("id,nickname").in("id", ids),
      supabase
        .from("follows")
        .select("following_user_id")
        .eq("follower_user_id", viewerId)
        .in("following_user_id", ids),
    ]);

    if (usersResult.error) {
      return jsonError("DB_ERROR", usersResult.error.message, 500);
    }

    if (followingResult.error) {
      return jsonError("DB_ERROR", followingResult.error.message, 500);
    }

    const followingSet = new Set((followingResult.data ?? []).map((row) => row.following_user_id));

    return jsonOk({
      users: (usersResult.data ?? [])
        .map((user) => ({
          id: user.id,
          nickname: user.nickname,
          isFollowing: followingSet.has(user.id),
          isFollower: true,
        }))
        .sort((a, b) => a.nickname.localeCompare(b.nickname)),
    });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FollowBody;
    const followerUserId = body.followerUserId?.trim() ?? "";
    const followingUserId = body.followingUserId?.trim() ?? "";

    if (!isUuid(followerUserId) || !isUuid(followingUserId)) {
      return jsonError("INVALID_INPUT", "userId 형식이 올바르지 않습니다.", 400);
    }

    if (followerUserId === followingUserId) {
      return jsonError("SELF_FOLLOW", "자기 자신은 팔로우할 수 없습니다.", 400);
    }

    const supabase = createServiceRoleClient();

    const { error } = await supabase.from("follows").insert({
      follower_user_id: followerUserId,
      following_user_id: followingUserId,
    });

    if (error) {
      if (error.code === "23505") {
        return jsonOk({ ok: true, duplicated: true });
      }

      return jsonError("DB_ERROR", error.message, 500);
    }

    return jsonOk({ ok: true }, 201);
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as FollowBody;
    const followerUserId = body.followerUserId?.trim() ?? "";
    const followingUserId = body.followingUserId?.trim() ?? "";

    if (!isUuid(followerUserId) || !isUuid(followingUserId)) {
      return jsonError("INVALID_INPUT", "userId 형식이 올바르지 않습니다.", 400);
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_user_id", followerUserId)
      .eq("following_user_id", followingUserId);

    if (error) {
      return jsonError("DB_ERROR", error.message, 500);
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
