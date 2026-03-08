import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerSupabaseEnv } from "@/lib/env/server";

const env = getServerSupabaseEnv();

export function createServiceRoleClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
