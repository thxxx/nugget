import { jsonError, jsonOk } from "@/lib/http";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  normalizeNickname,
  toErrorMessage,
  trimNickname,
} from "@/lib/server/helpers";

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 20;

type LoginOrSignupBody = {
  nickname?: string;
  signupOnMissing?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginOrSignupBody;
    const nickname = typeof body.nickname === "string" ? trimNickname(body.nickname) : "";
    const signupOnMissing = Boolean(body.signupOnMissing);

    if (!nickname || nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
      return jsonError("INVALID_NICKNAME", "닉네임은 2~20자여야 합니다.", 400);
    }

    const nicknameNormalized = normalizeNickname(nickname);
    const supabase = createServiceRoleClient();

    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id,nickname")
      .eq("nickname_normalized", nicknameNormalized)
      .maybeSingle();

    if (existingUserError) {
      return jsonError("DB_ERROR", existingUserError.message, 500);
    }

    if (existingUser) {
      return jsonOk({
        user: existingUser,
        created: false,
      });
    }

    if (!signupOnMissing) {
      return jsonError("NOT_FOUND", "없는 닉네임입니다. 가입하시겠습니까?", 404);
    }

    const { data: createdUser, error: createUserError } = await supabase
      .from("users")
      .insert({
        nickname,
      })
      .select("id,nickname")
      .single();

    if (createUserError) {
      if (createUserError.code === "23505") {
        const { data: conflictUser, error: conflictError } = await supabase
          .from("users")
          .select("id,nickname")
          .eq("nickname_normalized", nicknameNormalized)
          .single();

        if (conflictError) {
          return jsonError("DB_ERROR", conflictError.message, 500);
        }

        return jsonOk({
          user: conflictUser,
          created: false,
        });
      }

      return jsonError("DB_ERROR", createUserError.message, 500);
    }

    return jsonOk(
      {
        user: createdUser,
        created: true,
      },
      201,
    );
  } catch (error) {
    return jsonError("UNEXPECTED_ERROR", toErrorMessage(error), 500);
  }
}
