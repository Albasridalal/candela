import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Cake, Mail, Pencil, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { APPOINTMENT_SELECT, mapAppointmentRow } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateLabel, formatTime } from "@/lib/utils/date";
import { appointmentStatusConfig } from "@/lib/utils/status";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!customer) notFound();

  const [{ data: stats }, { data: appointmentRows }] = await Promise.all([
    supabase.from("customer_stats").select("*").eq("customer_id", id).maybeSingle(),
    supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("customer_id", id)
      .order("start_time", { ascending: false })
      .limit(50),
  ]);

  const appointments = (appointmentRows ?? []).map(mapAppointmentRow);
  const now = Date.now();
  const upcoming = appointments.filter(
    (a) => new Date(a.start_time).getTime() >= now && a.status !== "cancelled"
  );

  return (
    <div>
      <PageHeader
        title={customer.full_name}
        description={customer.phone ?? undefined}
        action={
          <Link href={`/customers/${id}/edit`}>
            <Button size="sm" variant="outline">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
          <Stat label="Visits" value={String(stats?.total_visits ?? 0)} />
          <Stat label="Upcoming" value={String(upcoming.length)} />
          <Stat label="Cancelled" value={String(stats?.cancelled_count ?? 0)} />
          <Stat label="No-shows" value={String(stats?.no_show_count ?? 0)} />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="space-y-1.5 py-4">
          <p className="flex items-center gap-1.5 text-sm text-ink">
            <Phone className="h-3.5 w-3.5 text-ink-muted" /> {customer.phone || "—"}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-ink">
            <Mail className="h-3.5 w-3.5 text-ink-muted" /> {customer.email || "—"}
          </p>
          {customer.birthday && (
            <p className="flex items-center gap-1.5 text-sm text-ink">
              <Cake className="h-3.5 w-3.5 text-ink-muted" /> {formatDateLabel(customer.birthday)}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {stats?.preferred_service && <Badge tone="brand">Prefers {stats.preferred_service}</Badge>}
            {stats?.preferred_staff && <Badge tone="info">Usually books {stats.preferred_staff}</Badge>}
          </div>
        </CardContent>
      </Card>

      {customer.notes && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <p className="mb-1 text-xs font-medium uppercase text-ink-muted">Notes</p>
            <p className="text-sm text-ink">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-ink">
          <CalendarDays className="h-4 w-4 text-brand-600" /> Booking history
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
          {appointments.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">No appointments yet.</p>
          ) : (
            appointments.map((appointment) => {
              const status = appointmentStatusConfig[appointment.status];
              return (
                <div key={appointment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{appointment.service_name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {formatDateLabel(appointment.start_time)} · {formatTime(appointment.start_time)} ·{" "}
                      {appointment.staff_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm text-ink">{formatCurrency(appointment.service_price)}</span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
