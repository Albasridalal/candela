import "server-only";

import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export type SessionUser = {
  email: string;
  /** Name shown against comments and status changes. */
  label: string;
};

const DEMO_USER: SessionUser = {
  email: "demo@kfh.example",
  label: "Account Manager",
};

/** Turns `layla.hassan@kfh.com` into `Layla Hassan`. */
function labelFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const words = local.split(/[._-]+/).filter(Boolean);
  if (words.length === 0) return email;
  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured) return DEMO_USER;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  return { email: user.email, label: labelFromEmail(user.email) };
}

/** Author name recorded on comments. Falls back when the session is unreadable. */
export async function getAuthorLabel(): Promise<string> {
  const user = await getSessionUser();
  return user?.label ?? "Account Manager";
}
