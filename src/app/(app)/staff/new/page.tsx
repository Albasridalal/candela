import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getPrimaryBranch } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/ui/Feedback";
import { StaffForm } from "@/components/staff/StaffForm";

export const dynamic = "force-dynamic";

export default async function NewStaffPage() {
  const supabase = await createClient();
  const [profile, branch, { data: services }] = await Promise.all([
    getCurrentProfile(),
    getPrimaryBranch(),
    supabase.from("services").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Add staff member" description="Details, services and working hours." />
      <StaffForm
        businessId={profile?.business_id ?? ""}
        branchId={branch?.id ?? null}
        services={services ?? []}
      />
    </div>
  );
}
