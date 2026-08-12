import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Feedback";
import { ServicesClient } from "@/components/services/ServicesClient";

export default async function ServicesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: categories }, { data: services }] = await Promise.all([
    supabase.from("service_categories").select("*").order("sort_order"),
    supabase.from("services").select("*").order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Services" description="Your service menu, categories and pricing." />
      <ServicesClient
        initialCategories={categories ?? []}
        initialServices={services ?? []}
        businessId={profile?.business_id ?? ""}
      />
    </div>
  );
}
