import { createClient } from "@/lib/supabase/server";
import { Branch, Business, Profile } from "@/lib/types/database.types";

/** The signed-in user's profile, or null when they aren't linked to a salon. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function getBusiness(): Promise<Business | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("*").limit(1).maybeSingle();
  return (data as Business | null) ?? null;
}

/**
 * This app runs one salon. The schema keeps a branches table (so a second
 * location can be added later without a migration), but the UI always works
 * against the salon's primary branch.
 */
export async function getPrimaryBranch(): Promise<Branch | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("branches")
    .select("*")
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return (data as Branch | null) ?? null;
}
