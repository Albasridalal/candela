import { PageHeader } from "@/components/ui/Feedback";
import { SalonSettingsForm } from "@/components/settings/SalonSettingsForm";
import { getBusiness, getPrimaryBranch } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [business, branch] = await Promise.all([getBusiness(), getPrimaryBranch()]);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Salon details and the opening hours that drive online booking."
      />
      <SalonSettingsForm business={business} branch={branch} />
    </div>
  );
}
