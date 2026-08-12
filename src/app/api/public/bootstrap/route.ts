import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

// V1 is single-salon: the public booking page always books into the first
// (and only) business/branch. If you add more branches or businesses later,
// swap this for a lookup by slug (e.g. /book/[businessSlug]).
export async function GET() {
  const supabase = createServiceRoleClient();

  const { data: business } = await supabase.from("businesses").select("*").limit(1).single();
  if (!business) {
    return NextResponse.json({ error: "No business configured yet." }, { status: 404 });
  }

  const [{ data: branches }, { data: categories }, { data: services }, { data: staff }, { data: staffServices }] =
    await Promise.all([
      supabase.from("branches").select("*").eq("business_id", business.id).eq("is_active", true).order("name"),
      supabase
        .from("service_categories")
        .select("*")
        .eq("business_id", business.id)
        .order("sort_order"),
      supabase
        .from("services")
        .select("*")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("staff")
        .select("id, full_name, profile_image_url, branch_id")
        .eq("business_id", business.id)
        .eq("employment_status", "active")
        .order("full_name"),
      supabase
        .from("staff_services")
        .select("staff_id, service_id")
        .in(
          "service_id",
          (
            await supabase
              .from("services")
              .select("id")
              .eq("business_id", business.id)
              .eq("is_active", true)
          ).data?.map((s) => s.id) ?? []
        ),
    ]);

  return NextResponse.json({
    business: { id: business.id, name: business.name, currency: business.currency },
    branches: branches ?? [],
    categories: categories ?? [],
    services: services ?? [],
    staff: staff ?? [],
    staffServices: staffServices ?? [],
  });
}
