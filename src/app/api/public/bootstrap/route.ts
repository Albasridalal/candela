import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export const dynamic = "force-dynamic";

/**
 * Everything the public booking page needs in one request: the salon, its
 * branch, the service menu, and which staff member can perform what.
 *
 * This is single-salon: the booking page always books into the first business
 * and its first active branch. Add a /book/[slug] lookup here if that changes.
 */
export async function GET() {
  const supabase = createServiceRoleClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, currency")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "This salon isn't set up for online booking yet." }, { status: 404 });
  }

  const [{ data: branches }, { data: categories }, { data: services }, { data: staff }] =
    await Promise.all([
      supabase
        .from("branches")
        .select("id, name, address, phone, opening_hours")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("created_at"),
      supabase.from("service_categories").select("*").eq("business_id", business.id).order("sort_order"),
      supabase
        .from("services")
        .select("id, category_id, name, description, duration_minutes, price")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("staff")
        .select("id, full_name, job_title, profile_image_url, branch_id")
        .eq("business_id", business.id)
        .eq("employment_status", "active")
        .order("full_name"),
    ]);

  const serviceIds = (services ?? []).map((s) => s.id);
  const { data: staffServices } = serviceIds.length
    ? await supabase.from("staff_services").select("staff_id, service_id").in("service_id", serviceIds)
    : { data: [] };

  return NextResponse.json({
    business,
    branches: branches ?? [],
    categories: categories ?? [],
    services: services ?? [],
    staff: staff ?? [],
    staffServices: staffServices ?? [],
  });
}
