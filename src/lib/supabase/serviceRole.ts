import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Bypasses Row Level Security. NEVER import this into a Client Component or
 * expose SUPABASE_SERVICE_ROLE_KEY to the browser — it is only referenced
 * from Route Handlers under src/app/api/public/**, which run on the server
 * and are the sole gate for what the public booking flow can read/write.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
