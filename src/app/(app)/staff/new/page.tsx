import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Feedback";
import { StaffForm } from "@/components/staff/StaffForm";

export default async function NewStaffPage() {
  const supabase = await createClient();
  const [{ data: branches }, { data: services }] = await Promise.all([
    supabase.from("branches").select("*").eq("is_active", true).order("name"),
    supabase.from("services").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Add Staff Member" />
      <StaffForm branches={branches ?? []} services={services ?? []} />
    </div>
  );
}
