import { jsonError, jsonOk } from "@/lib/http";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isUuid, toErrorMessage } from "@/lib/server/helpers";

type SaveReactionBody = {
  viewerId?: string;
  reaction?: "like" | "dislike";
};

type SaveReactionDeleteBody = {
  viewerId?: string;
};

function parseSaveId(param: string) {
  const value = Number(param);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

async function assertReactionPermission(
  supabase: ReturnType<typeof createServiceRoleClient>,
  saveId: number,
  viewerId: string,
) {
  const { data: saveRow, error: saveError } = await supabase
    .from("place_saves")
    .select("id,user_id,is_public")
    .eq("id", saveId)
    .maybeSingle();

  if (saveError) {
    return {
      ok: false as const,
      response: jsonError("DB_ERROR", saveError.message, 500),
    };
  }

  if (!saveRow) {
    return {
      ok: false as const,
      response: jsonError("NOT_FOUND", "저장 정보를 찾을 수 없습니다.", 404),
    };
  }

  if (saveRow.user_id === viewerId) {
    return {
      ok: false as const,
      response: jsonError("FORBIDDEN", "내 메모에는 반응할 수 없습니다.", 403),
    };
  }

  if (saveRow.is_public !== true) {
    return {
      ok: false as const,
      response: jsonError("FORBIDDEN", "비공개 저장에는 반응할 수 없습니다.", 403),
    };
  }

  const { data: followRow, error: followError } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_user_id", viewerId)
    .eq("following_user_id", saveRow.user_id)
    .maybeSingle();

  if (followError) {
    return {
      ok: false as const,
      response: jsonError("DB_ERROR", followError.message, 500),
    };
  }

  if (!followRow) {
    return {
      ok: false as const,
      response: jsonError("FORBIDDEN", "팔로우한 사용자 메모에만 반응할 수 있습니다.", 403),
    };
  }

  return {
    ok: true as const,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const saveId = parseSaveId(params.id);

    if (!saveId) {
      return jsonError("INVALID_SAVE_ID", "save id 형식이 올바르지 않습니다.", 400);
    }

    let body: SaveReactionBody;
    try {
      body = (await request.json()) as SaveReactionBody;
    } catch {
      return jsonError("INVALID_BODY", "요청 본문(JSON) 형식이 올바르지 않습니다.", 400);
    }
    const viewerId = body.viewerId?.trim() ?? "";
    const reaction = body.reaction;

    if (!isUuid(viewerId)) {
      return jsonError("INVALID_VIEWER", "viewerId 형식이 올바르지 않습니다.", 400);
    }

    if (reaction !== "like" && reaction !== "dislike") {
      return jsonError("INVALID_REACTION", "reaction은 like 또는 dislike여야 합니다.", 400);
    }

    const supabase = createServiceRoleClient();
    const permission = await assertReactionPermission(supabase, saveId, viewerId);
    if (!permission.ok) {
      return permission.response;
    }

    const { data, error } = await supabase
      .from("place_save_reactions")
      .upsert(
        {
          save_id: saveId,
          user_id: viewerId,
          reaction,
        },
        {
          onConflict: "save_id,user_id",
        },
      )
      .select("save_id,user_id,reaction")
      .single();

    if (error) {
      if (error.code === "42P01") {
        return jsonError(
          "MISSING_TABLE",
          "place_save_reactions 테이블이 없습니다. SQL 마이그레이션을 먼저 실행해 주세요.",
          500,
        );
      }

      return jsonError("DB_ERROR", error.message, 500);
    }

    return jsonOk({ reaction: data });
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

    let body: SaveReactionDeleteBody;
    try {
      body = (await request.json()) as SaveReactionDeleteBody;
    } catch {
      return jsonError("INVALID_BODY", "요청 본문(JSON) 형식이 올바르지 않습니다.", 400);
    }
    const viewerId = body.viewerId?.trim() ?? "";

    if (!isUuid(viewerId)) {
      return jsonError("INVALID_VIEWER", "viewerId 형식이 올바르지 않습니다.", 400);
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("place_save_reactions")
      .delete()
      .eq("save_id", saveId)
      .eq("user_id", viewerId);

    if (error) {
      if (error.code === "42P01") {
        return jsonError(
          "MISSING_TABLE",
          "place_save_reactions 테이블이 없습니다. SQL 마이그레이션을 먼저 실행해 주세요.",
          500,
        );
      }

      return jsonError("DB_ERROR", error.message, 500);
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
