import { CalendarView } from "@/components/calendar/CalendarView";
import { PageHeader } from "@/components/ui/Feedback";
import { getBranches } from "@/lib/supabase/queries";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const branches = await getBranches();
  const { new: autoNew } = await searchParams;

  return (
    <div>
      <PageHeader title="Calendar" description="Day and week view across your team." />
      <CalendarView branches={branches} autoOpenNew={autoNew === "1"} />
    </div>
  );
}
