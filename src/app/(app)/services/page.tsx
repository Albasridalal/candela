import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Feedback";
import { ServicesClient } from "@/components/services/ServicesClient";

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const supabase = await createClient();
  const [profile, { data: categories }, { data: services }, { new: autoNew }] = await Promise.all([
    getCurrentProfile(),
    supabase.from("service_categories").select("*").order("sort_order").order("name"),
    supabase.from("services").select("*").order("name"),
    searchParams,
  ]);

  return (
    <div>
      <PageHeader title="Services" description="Your service menu, categories, duration and pricing." />
      <ServicesClient
        initialCategories={categories ?? []}
        initialServices={services ?? []}
        businessId={profile?.business_id ?? ""}
        autoOpenNew={autoNew === "1"}
      />
    </div>
  );
}
