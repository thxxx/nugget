import "server-only";

type SupabaseServerEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

type KakaoSearchEnv = {
  KAKAO_REST_API_KEY: string;
};

export function getServerSupabaseEnv(): SupabaseServerEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };
}

export function getServerKakaoSearchEnv(): KakaoSearchEnv {
  const kakaoRestApiKey = process.env.KAKAO_REST_API_KEY;

  if (!kakaoRestApiKey) {
    throw new Error("Missing KAKAO_REST_API_KEY in .env.local");
  }

  return {
    KAKAO_REST_API_KEY: kakaoRestApiKey,
  };
}
