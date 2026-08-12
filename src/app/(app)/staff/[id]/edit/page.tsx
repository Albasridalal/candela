import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Feedback";
import { StaffForm } from "@/components/staff/StaffForm";
import { TimeOffManager } from "@/components/staff/TimeOffManager";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: staff },
    { data: branches },
    { data: services },
    { data: staffServices },
    { data: hours },
    { data: timeOff },
  ] = await Promise.all([
    supabase.from("staff").select("*").eq("id", id).single(),
    supabase.from("branches").select("*").order("name"),
    supabase.from("services").select("*").eq("is_active", true).order("name"),
    supabase.from("staff_services").select("service_id").eq("staff_id", id),
    supabase.from("staff_working_hours").select("*").eq("staff_id", id).order("day_of_week"),
    supabase.from("staff_time_off").select("*").eq("staff_id", id).order("start_date"),
  ]);

  if (!staff) notFound();

  return (
    <div>
      <PageHeader title="Edit Staff Member" />
      <StaffForm
        staff={staff}
        branches={branches ?? []}
        services={services ?? []}
        initialServiceIds={(staffServices ?? []).map((s) => s.service_id)}
        initialHours={
          hours && hours.length > 0
            ? hours.map((h) => ({
                day_of_week: h.day_of_week,
                is_working: h.is_working,
                start_time: h.start_time ?? "10:00",
                end_time: h.end_time ?? "19:00",
              }))
            : undefined
        }
      />
      <div className="mt-6 max-w-lg">
        <TimeOffManager staffId={id} initialTimeOff={timeOff ?? []} />
      </div>
    </div>
  );
}
