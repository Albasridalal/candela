import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/ui/Feedback";
import { BranchesClient } from "@/components/branches/BranchesClient";

export default async function BranchesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { data: branches } = await supabase.from("branches").select("*").order("name");

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Locations and opening hours. Opening hours bound what times customers can book online."
      />
      <BranchesClient initialBranches={branches ?? []} businessId={profile?.business_id ?? ""} />
    </div>
  );
}
