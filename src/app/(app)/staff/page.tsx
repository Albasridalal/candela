import Link from "next/link";
import { UserPlus, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff")
    .select("*, branches ( name )")
    .order("full_name");

  return (
    <div>
      <PageHeader
        title="Staff"
        description={`${staff?.length ?? 0} team members`}
        action={
          <Link href="/staff/new">
            <Button size="sm">
              <UserPlus className="h-4 w-4" /> Add
            </Button>
          </Link>
        }
      />

      {!staff || staff.length === 0 ? (
        <EmptyState icon={UsersRound} title="No staff yet" description="Add your first team member." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => (
            <Link
              key={s.id}
              href={`/staff/${s.id}`}
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-card active:bg-surface-subtle"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                {s.full_name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{s.full_name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {s.job_title} · {(s.branches as { name: string } | null)?.name}
                </p>
              </div>
              <Badge tone={s.employment_status === "active" ? "success" : "neutral"}>
                {s.employment_status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
