import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Contact,
  ExternalLink,
  Globe,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness, getCurrentProfile, getPrimaryBranch } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { APPOINTMENT_SELECT, AppointmentWithDetails, mapAppointmentRow } from "@/lib/types";
import { appointmentStatusConfig } from "@/lib/utils/status";
import { formatCurrency } from "@/lib/utils/currency";
import {
  addDaysToKey,
  formatDateKey,
  formatInstantTime,
  salonWallClockToIso,
  toSalonWallClock,
  todayInSalon,
} from "@/lib/utils/timezone";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/calendar?new=1", label: "New booking", icon: CalendarDays },
  { href: "/customers/new", label: "New customer", icon: Contact },
  { href: "/services?new=1", label: "New service", icon: Sparkles },
  { href: "/staff/new", label: "New staff", icon: UsersRound },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const [profile, business, branch] = await Promise.all([
    getCurrentProfile(),
    getBusiness(),
    getPrimaryBranch(),
  ]);

  const today = todayInSalon();
  const todayStart = salonWallClockToIso(today, "00:00");
  const tomorrowStart = salonWallClockToIso(addDaysToKey(today, 1), "00:00");
  const weekEnd = salonWallClockToIso(addDaysToKey(today, 8), "00:00");

  const [{ data: todayRows }, { data: upcomingRows }, { count: customerCount }, { count: staffCount }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .gte("start_time", todayStart)
        .lt("start_time", tomorrowStart)
        .order("start_time"),
      supabase
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .gte("start_time", tomorrowStart)
        .lt("start_time", weekEnd)
        .neq("status", "cancelled")
        .order("start_time")
        .limit(8),
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("employment_status", "active"),
    ]);

  const todayAppointments = (todayRows ?? []).map(mapAppointmentRow);
  const upcoming = (upcomingRows ?? []).map(mapAppointmentRow);
  const activeToday = todayAppointments.filter((a) => a.status !== "cancelled");
  const todayRevenue = activeToday.reduce((sum, a) => sum + Number(a.service_price ?? 0), 0);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">Welcome back,</p>
          <h1 className="text-2xl font-semibold text-ink">{firstName}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {business?.name ?? "Your salon"} · {formatDateKey(today)}
          </p>
        </div>
        <Link
          href="/book"
          target="_blank"
          className="flex items-center gap-2 rounded-pill border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
        >
          <Globe className="h-4 w-4" /> Public booking page
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-card transition-colors hover:border-brand-200 hover:bg-brand-50/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
              <action.icon className="h-5 w-5 text-brand-600" />
            </span>
            <span className="min-w-0 text-sm font-medium leading-tight text-ink">
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Today's appointments" value={String(activeToday.length)} icon={CalendarDays} />
        <StatCard label="Expected today" value={formatCurrency(todayRevenue)} icon={Clock} />
        <StatCard label="Total customers" value={String(customerCount ?? 0)} icon={Contact} href="/customers" />
        <StatCard label="Active staff" value={String(staffCount ?? 0)} icon={UsersRound} href="/staff" />
      </div>

      {/* Today */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Today</h2>
          <Link href="/calendar" className="text-xs font-medium text-brand-700">
            Open calendar
          </Link>
        </div>
        {todayAppointments.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing booked today"
            description={
              branch
                ? "Tap a slot in the calendar to add a booking."
                : "Set up your salon in Settings to start booking."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
            {todayAppointments.map((appointment, i) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                withBorder={i !== todayAppointments.length - 1}
              />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Upcoming (next 7 days)
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={Clock} title="No upcoming appointments" />
        ) : (
          <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
            {upcoming.map((appointment, i) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                showDate
                withBorder={i !== upcoming.length - 1}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  icon: typeof CalendarDays;
  href?: string;
}) {
  const content = (
    <Card className="h-full">
      <CardContent className="flex items-center gap-3 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
          <Icon className="h-5 w-5 text-brand-600" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs leading-tight text-ink-muted">{label}</span>
          <span className="block text-lg font-semibold text-ink">{value}</span>
        </span>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function AppointmentRow({
  appointment,
  showDate,
  withBorder,
}: {
  appointment: AppointmentWithDetails;
  showDate?: boolean;
  withBorder?: boolean;
}) {
  const status = appointmentStatusConfig[appointment.status];
  return (
    <Link
      href="/calendar"
      className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-subtle ${
        withBorder ? "border-b border-border" : ""
      }`}
    >
      <div className="w-20 shrink-0">
        <p className="text-sm font-semibold text-ink">{formatInstantTime(appointment.start_time)}</p>
        {showDate && (
          <p className="text-[11px] text-ink-muted">
            {formatDateKey(toSalonWallClock(appointment.start_time).date)}
          </p>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {appointment.customer_name}
          {appointment.source === "online" && (
            <Globe className="ml-1 inline h-3 w-3 text-brand-600" aria-label="Booked online" />
          )}
        </p>
        <p className="truncate text-xs text-ink-muted">
          {appointment.service_name} · {appointment.staff_name}
          {appointment.customer_phone ? ` · ${appointment.customer_phone}` : ""}
        </p>
      </div>
      <Badge tone={status.tone}>{status.label}</Badge>
    </Link>
  );
}
