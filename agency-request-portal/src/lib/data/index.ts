import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demoRepo } from "./demo";
import { supabaseRepo } from "./supabase";
import type { PortalRepo } from "./repo";

/**
 * Single entry point for data access. Swap happens purely on configuration, so
 * every screen is written once and works against either backend.
 */
export function getRepo(): PortalRepo {
  return isSupabaseConfigured ? supabaseRepo : demoRepo;
}

export const isDemoMode = !isSupabaseConfigured;

export type { PortalRepo };
