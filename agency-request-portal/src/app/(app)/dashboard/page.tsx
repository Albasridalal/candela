import Link from "next/link";
import { format } from "date-fns";
import { DesignerLoadTable } from "@/components/dashboard/DesignerLoadTable";
import { MiniStat, StatCard } from "@/components/dashboard/StatCard";
import { FlagBadge, PriorityBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/Card";
import { getRepo } from "@/lib/data";
import { daysPending, describeDeadline, flagOf, formatDate, todayISO } from "@/lib/logic";
import { alertRequests, computeDesignerLoad, computeStats } from "@/lib/stats";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = todayISO();
  const requests = await getRepo().listRequests();

  const stats = computeStats(requests, today);
  const load = computeDesignerLoad(requests, today);
  const alerts = alertRequests(requests, today);
  const attention = [...alerts.overdue, ...alerts.dueSoon].slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Agency workload as of {format(new Date(), "EEEE d MMMM yyyy")}.
          </p>
        </div>
        <LinkButton href="/requests/new">New request</LinkButton>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open requests"
          value={stats.open}
          hint="Not yet delivered"
          tone="brand"
          href="/requests?flag=open"
        />
        <StatCard
          label="In progress"
          value={stats.inProgress}
          hint={`${stats.newCount} not started yet`}
          href="/requests?status=In+Progress"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          hint="Deadline passed, not delivered"
          tone={stats.overdue > 0 ? "danger" : "neutral"}
          href="/requests?flag=overdue"
        />
        <StatCard
          label="Delivered this week"
          value={stats.deliveredThisWeek}
          hint="Last 7 days"
          tone="success"
          href="/requests?status=Delivered"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Workload by designer"
            description="Pending and overdue requests for each agency designer."
          />
          <CardBody className="px-0 py-2">
            <DesignerLoadTable rows={load} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="At a glance" />
          <CardBody className="divide-y divide-slate-100 px-1 py-1">
            <MiniStat label="New / not started" value={stats.newCount} />
            <MiniStat label="Due in the next 2 days" value={stats.dueSoon} />
            <MiniStat label="Open, no designer assigned" value={stats.unassigned} />
            <MiniStat
              label="Average days pending"
              value={stats.averageDaysPending === null ? "—" : `${stats.averageDaysPending}d`}
            />
            <MiniStat
              label="Average turnaround (delivered)"
              value={stats.averageTurnaround === null ? "—" : `${stats.averageTurnaround}d`}
            />
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardHeader
          title="Needs attention"
          description="Overdue first, then anything due within two days."
          action={
            <Link
              href="/requests?flag=overdue"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              View all
            </Link>
          }
        />
        {attention.length === 0 ? (
          <EmptyState
            title="Nothing needs chasing"
            description="No request is overdue or due within the next two days."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {attention.map((request) => {
              const flag = flagOf(request, today);
              return (
                <li key={request.id}>
                  <Link
                    href={`/requests/${request.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{request.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {request.reference} · {request.designer?.name ?? "Unassigned"} ·{" "}
                        {daysPending(request, today)} days pending
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={request.priority} />
                      <FlagBadge flag={flag} label={describeDeadline(request, today)} />
                      <span className="hidden text-xs text-slate-500 sm:inline">
                        {formatDate(request.deadline)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
