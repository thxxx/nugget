import { createClient } from "@supabase/supabase-js";

import { getPublicSupabaseEnv } from "@/lib/env/public";

const env = getPublicSupabaseEnv();

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
