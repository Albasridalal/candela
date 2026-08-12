import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Phone, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff")
    .select("*, branches ( name )")
    .eq("id", id)
    .single();
  if (!staff) notFound();

  const { data: staffServices } = await supabase
    .from("staff_services")
    .select("services ( name )")
    .eq("staff_id", id);

  const { data: hours } = await supabase
    .from("staff_working_hours")
    .select("*")
    .eq("staff_id", id)
    .order("day_of_week");

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
        <CardContent className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-sm text-ink">
            <Phone className="h-3.5 w-3.5 text-ink-muted" /> {staff.phone || "—"}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-ink">
            <Mail className="h-3.5 w-3.5 text-ink-muted" /> {staff.email || "—"}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Badge tone={staff.employment_status === "active" ? "success" : "neutral"}>
              {staff.employment_status}
            </Badge>
            <Badge tone="neutral">{(staff.branches as { name: string } | null)?.name}</Badge>
            <Badge tone="brand">{staff.commission_percentage}% commission</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink">Services</h2>
        <div className="flex flex-wrap gap-2">
          {staffServices?.length ? (
            staffServices.map((s, i) => (
              <Badge key={i} tone="neutral">
                {(s.services as unknown as { name: string } | null)?.name}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-ink-muted">No services assigned.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink">Working hours</h2>
        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card divide-y divide-border">
          {DAYS.map((day, i) => {
            const row = hours?.find((h) => h.day_of_week === i);
            return (
              <div key={day} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-ink">{day}</span>
                <span className="text-ink-muted">
                  {row?.is_working ? `${row.start_time} – ${row.end_time}` : "Off"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
