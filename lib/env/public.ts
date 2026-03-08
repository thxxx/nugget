export type PublicSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

export type PublicKakaoMapsEnv = {
  NEXT_PUBLIC_KAKAO_MAP_APP_KEY: string;
};

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  };
}

export function getPublicKakaoMapsEnv(): PublicKakaoMapsEnv {
  const kakaoMapAppKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  if (!kakaoMapAppKey) {
    throw new Error("Missing NEXT_PUBLIC_KAKAO_MAP_APP_KEY in .env.local");
  }

  return {
    NEXT_PUBLIC_KAKAO_MAP_APP_KEY: kakaoMapAppKey,
  };
}
