import Link from "next/link";
import { UserPlus, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function StaffPage() {
  const supabase = await createClient();
  const [{ data: staff }, { data: hours }] = await Promise.all([
    supabase.from("staff").select("*").order("full_name"),
    supabase.from("staff_working_hours").select("staff_id, day_of_week, is_working"),
  ]);

  return (
    <div>
      <PageHeader
        title="Staff"
        description={`${staff?.length ?? 0} team ${staff?.length === 1 ? "member" : "members"}`}
        action={
          <Link href="/staff/new">
            <Button size="sm">
              <UserPlus className="h-4 w-4" /> Add
            </Button>
          </Link>
        }
      />

      {!staff || staff.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No staff yet"
          description="Add your first team member so appointments can be booked."
          action={
            <Link href="/staff/new">
              <Button size="sm">Add staff member</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => {
            const workingDays = (hours ?? [])
              .filter((h) => h.staff_id === member.id && h.is_working)
              .map((h) => DAY_SHORT[h.day_of_week]);
            return (
              <Link
                key={member.id}
                href={`/staff/${member.id}`}
                className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-card hover:bg-surface-subtle"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                  {member.full_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{member.full_name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {member.job_title || "Team member"}
                  </p>
                  <p className="truncate text-[11px] text-ink-muted">
                    {workingDays.length > 0 ? workingDays.join(" · ") : "No working hours set"}
                  </p>
                </div>
                <Badge tone={member.employment_status === "active" ? "success" : "neutral"}>
                  {member.employment_status}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
