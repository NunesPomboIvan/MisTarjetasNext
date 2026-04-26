import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * UUID fijo para el "usuario" único en uso personal sin login.
 */
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Cliente de Supabase para uso en Server Components, Server Actions y Route Handlers.
 * Sin auth — usa la anon key y un user_id hardcodeado.
 *
 * Wrappea el cliente para que `auth.getUser()` siempre retorne el usuario fijo.
 */
export async function createClient() {
  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  // Override getUser para retornar el usuario fijo
  const fakeUser = {
    id: DEFAULT_USER_ID,
    email: "personal@local",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };

  client.auth.getUser = async () => ({
    data: { user: fakeUser },
    error: null,
  });

  return client;
}
