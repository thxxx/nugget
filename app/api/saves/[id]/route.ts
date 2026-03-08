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

type SavePatchBody = {
  userId?: string;
  memo?: string;
  visitStatus?: "planned" | "visited";
  tags?: string[];
  isPublic?: boolean;
  rating?: 1 | 2 | 3;
};

type SaveDeleteBody = {
  userId?: string;
};

function parseSaveId(param: string) {
  const value = Number(param);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const saveId = parseSaveId(params.id);

    if (!saveId) {
      return jsonError("INVALID_SAVE_ID", "save id 형식이 올바르지 않습니다.", 400);
    }

    const body = (await request.json()) as SavePatchBody;
    const userId = body.userId?.trim() ?? "";
    const memo = (body.memo ?? "").trim();
    const visitStatus = normalizeVisitStatus(body.visitStatus);
    const tags = normalizeTags(body.tags);
    const isPublic = normalizePublicFlag(body.isPublic);
    const rating = normalizeSaveRating(body.rating);

    if (!isUuid(userId)) {
      return jsonError("INVALID_USER", "userId 형식이 올바르지 않습니다.", 400);
    }

    if (memo.length > 500) {
      return jsonError("INVALID_MEMO", "메모는 500자 이하여야 합니다.", 400);
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("place_saves")
      .update({ memo, visit_status: visitStatus, tags, is_public: isPublic, rating })
      .eq("id", saveId)
      .eq("user_id", userId)
      .select("id,memo,visit_status,tags,is_public,rating,updated_at")
      .maybeSingle();

    if (error) {
      return jsonError("DB_ERROR", error.message, 500);
    }

    if (!data) {
      return jsonError("NOT_FOUND", "저장 정보를 찾을 수 없습니다.", 404);
    }

    return jsonOk({ save: data });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const saveId = parseSaveId(params.id);

    if (!saveId) {
      return jsonError("INVALID_SAVE_ID", "save id 형식이 올바르지 않습니다.", 400);
    }

    const body = (await request.json()) as SaveDeleteBody;
    const userId = body.userId?.trim() ?? "";

    if (!isUuid(userId)) {
      return jsonError("INVALID_USER", "userId 형식이 올바르지 않습니다.", 400);
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("place_saves")
      .delete()
      .eq("id", saveId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      return jsonError("DB_ERROR", error.message, 500);
    }

    if (!data) {
      return jsonError("NOT_FOUND", "저장 정보를 찾을 수 없습니다.", 404);
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
