import "server-only";

import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/** The batch `setAll` receives; annotated because the overload loses inference. */
type CookiesToSet = Parameters<SetAllCookies>[0];

/**
 * Request-scoped Supabase client. Cookie writes throw when called from a React
 * Server Component (only Server Actions and Route Handlers may set cookies), so
 * those failures are swallowed — the middleware refreshes the session instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — safe to ignore.
        }
      },
    },
  });
}
