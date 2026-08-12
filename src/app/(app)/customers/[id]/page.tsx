import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Phone, Mail, Cake, CalendarDays, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateLabel, formatTime } from "@/lib/utils/date";
import { appointmentStatusConfig, paymentStatusConfig } from "@/lib/utils/status";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).single();
  if (!customer) notFound();

  const { data: stats } = await supabase
    .from("customer_stats")
    .select("*")
    .eq("customer_id", id)
    .maybeSingle();

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, start_time, status, staff ( full_name ), appointment_services ( services ( name ) )"
    )
    .eq("customer_id", id)
    .order("start_time", { ascending: false })
    .limit(20);

  const { data: sales } = await supabase
    .from("sales")
    .select("id, invoice_number, created_at, total, payment_status")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div>
      <PageHeader
        title={customer.full_name}
        action={
          <Link href={`/customers/${id}/edit`}>
            <Button size="sm" variant="outline">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Total visits" value={String(stats?.total_visits ?? 0)} />
          <Stat label="Total spend" value={formatCurrency(stats?.total_spend ?? 0)} />
          <div className="col-span-2 flex flex-col justify-center gap-1.5 sm:col-span-2">
            {customer.phone && (
              <p className="flex items-center gap-1.5 text-sm text-ink">
                <Phone className="h-3.5 w-3.5 text-ink-muted" /> {customer.phone}
              </p>
            )}
            {customer.email && (
              <p className="flex items-center gap-1.5 text-sm text-ink">
                <Mail className="h-3.5 w-3.5 text-ink-muted" /> {customer.email}
              </p>
            )}
            {customer.birthday && (
              <p className="flex items-center gap-1.5 text-sm text-ink">
                <Cake className="h-3.5 w-3.5 text-ink-muted" /> {formatDateLabel(customer.birthday)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="First visit"
            value={stats?.first_visit_at ? formatDateLabel(stats.first_visit_at) : "—"}
          />
          <Stat
            label="Last visit"
            value={stats?.last_visit_at ? formatDateLabel(stats.last_visit_at) : "—"}
          />
          <Stat label="Cancelled" value={String(stats?.cancelled_count ?? 0)} />
          <Stat label="No-shows" value={String(stats?.no_show_count ?? 0)} />
        </CardContent>
      </Card>

      {(stats?.preferred_service || stats?.preferred_staff) && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap gap-2">
            {stats?.preferred_service && (
              <Badge tone="brand">Prefers {stats.preferred_service}</Badge>
            )}
            {stats?.preferred_staff && (
              <Badge tone="info">Usually books {stats.preferred_staff}</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {customer.notes && (
        <Card className="mb-4">
          <CardContent>
            <p className="mb-1 text-xs font-medium uppercase text-ink-muted">Notes</p>
            <p className="text-sm text-ink">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      <Section title="Appointment History" icon={CalendarDays}>
        {!appointments || appointments.length === 0 ? (
          <EmptyRow text="No appointments yet." />
        ) : (
          appointments.map((a) => {
            const status = appointmentStatusConfig[a.status as keyof typeof appointmentStatusConfig];
            const serviceNames = (
              a.appointment_services as unknown as { services: { name: string } | null }[]
            )
              .map((s) => s.services?.name)
              .filter(Boolean)
              .join(", ");
            return (
              <Row key={a.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{serviceNames || "Service"}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDateLabel(a.start_time)} · {formatTime(a.start_time)} ·{" "}
                    {(a.staff as unknown as { full_name: string } | null)?.full_name}
                  </p>
                </div>
                <Badge tone={status.tone}>{status.label}</Badge>
              </Row>
            );
          })
        )}
      </Section>

      <Section title="Purchase History" icon={Receipt}>
        {!sales || sales.length === 0 ? (
          <EmptyRow text="No purchases yet." />
        ) : (
          sales.map((s) => {
            const status = paymentStatusConfig[s.payment_status as keyof typeof paymentStatusConfig];
            return (
              <Row key={s.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">#{s.invoice_number}</p>
                  <p className="text-xs text-ink-muted">{formatDateLabel(s.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="text-sm font-medium text-ink">{formatCurrency(s.total)}</span>
                </div>
              </Row>
            );
          })
        )}
      </Section>
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

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-ink">
        <Icon className="h-4 w-4 text-brand-600" /> {title}
      </h2>
      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 px-4 py-3">{children}</div>;
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-4 py-6 text-center text-sm text-ink-muted">{text}</p>;
}
