import { jsonError, jsonOk } from "@/lib/http";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isUuid, toErrorMessage } from "@/lib/server/helpers";

function parseSaveId(param: string) {
  const value = Number(param);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const saveId = parseSaveId(params.id);

    if (!saveId) {
      return jsonError("INVALID_SAVE_ID", "save id 형식이 올바르지 않습니다.", 400);
    }

    const { searchParams } = new URL(request.url);
    const viewerId = searchParams.get("viewerId")?.trim() ?? "";

    if (!isUuid(viewerId)) {
      return jsonError("INVALID_VIEWER", "viewerId 형식이 올바르지 않습니다.", 400);
    }

    const supabase = createServiceRoleClient();

    const { data: saveRow, error: saveError } = await supabase
      .from("place_saves")
      .select("id,user_id,memo,is_public")
      .eq("id", saveId)
      .maybeSingle();

    if (saveError) {
      return jsonError("DB_ERROR", saveError.message, 500);
    }

    if (!saveRow) {
      return jsonError("NOT_FOUND", "저장 정보를 찾을 수 없습니다.", 404);
    }

    if (saveRow.user_id === viewerId) {
      return jsonOk({
        memo: saveRow.memo,
      });
    }

    if (saveRow.is_public !== true) {
      return jsonError("FORBIDDEN", "비공개 저장은 볼 수 없습니다.", 403);
    }

    const { data: followRow, error: followError } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_user_id", viewerId)
      .eq("following_user_id", saveRow.user_id)
      .maybeSingle();

    if (followError) {
      return jsonError("DB_ERROR", followError.message, 500);
    }

    if (!followRow) {
      return jsonError("FORBIDDEN", "팔로우한 사용자 메모만 볼 수 있습니다.", 403);
    }

    return jsonOk({
      memo: saveRow.memo,
    });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
