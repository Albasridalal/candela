import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Mail, Pencil, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatTimeLabel } from "@/lib/utils/timezone";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: staff }, { data: staffServices }, { data: hours }, { data: timeOff }] =
    await Promise.all([
      supabase.from("staff").select("*").eq("id", id).maybeSingle(),
      supabase.from("staff_services").select("services ( name )").eq("staff_id", id),
      supabase.from("staff_working_hours").select("*").eq("staff_id", id).order("day_of_week"),
      supabase.from("staff_time_off").select("*").eq("staff_id", id).order("start_date"),
    ]);

  if (!staff) notFound();

  return (
    <div>
      <PageHeader
        title={staff.full_name}
        description={staff.job_title ?? undefined}
        action={
          <Link href={`/staff/${id}/edit`}>
            <Button size="sm" variant="outline">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <CardContent className="space-y-1.5 py-4">
          <p className="flex items-center gap-1.5 text-sm text-ink">
            <Phone className="h-3.5 w-3.5 text-ink-muted" /> {staff.phone || "—"}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-ink">
            <Mail className="h-3.5 w-3.5 text-ink-muted" /> {staff.email || "—"}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge tone={staff.employment_status === "active" ? "success" : "neutral"}>
              {staff.employment_status}
            </Badge>
            {(timeOff ?? []).length > 0 && (
              <Badge tone="warning">
                {(timeOff ?? []).length} time-off {timeOff!.length === 1 ? "period" : "periods"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink">Services provided</h2>
        <div className="flex flex-wrap gap-2">
          {staffServices?.length ? (
            staffServices.map((row, i) => (
              <Badge key={i} tone="brand">
                {(row.services as unknown as { name: string } | null)?.name}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-ink-muted">
              No services assigned yet — customers can&apos;t book this person online until you
              assign some.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-ink">
          <CalendarDays className="h-4 w-4 text-brand-600" /> Working hours
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
          {DAYS.map((day, index) => {
            const row = hours?.find((h) => h.day_of_week === index);
            const working = row?.is_working && row.start_time && row.end_time;
            return (
              <div key={day} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-ink">{day}</span>
                <span className={working ? "text-ink-muted" : "text-ink-muted/70"}>
                  {working
                    ? `${formatTimeLabel(row!.start_time!.slice(0, 5))} – ${formatTimeLabel(row!.end_time!.slice(0, 5))}`
                    : "Off"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
