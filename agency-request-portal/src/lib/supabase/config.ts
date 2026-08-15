/**
 * Supabase is optional. When these are absent the app falls back to demo mode,
 * which keeps the whole UI usable without a provisioned project.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Storage bucket holding reference files and final deliverables. */
export const ATTACHMENTS_BUCKET = "request-attachments";
