import { createClient } from "@/lib/supabase/server";
import { Branch, Profile } from "@/lib/types/database.types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}

export async function getBranches(): Promise<Branch[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("branches").select("*").eq("is_active", true).order("name");
  return (data as Branch[]) ?? [];
}
