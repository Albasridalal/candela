import { CalendarView } from "@/components/calendar/CalendarView";
import { getCurrentProfile, getPrimaryBranch } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const [branch, profile, { new: autoNew }] = await Promise.all([
    getPrimaryBranch(),
    getCurrentProfile(),
    searchParams,
  ]);

  return (
    <CalendarView
      branch={branch}
      businessId={profile?.business_id ?? ""}
      autoOpenNew={autoNew === "1"}
    />
  );
}
