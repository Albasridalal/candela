import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RequestFilters } from "@/components/requests/RequestFilters";
import { RequestsTable } from "@/components/requests/RequestsTable";
import { getRepo } from "@/lib/data";
import { todayISO } from "@/lib/logic";
import { applyFilters, parseFilters } from "@/lib/query";

export const metadata = { title: "Requests" };
export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const today = todayISO();

  const repo = getRepo();
  const [requests, designers, workTypes] = await Promise.all([
    repo.listRequests(),
    repo.listDesigners(),
    repo.listWorkTypes(),
  ]);

  const visible = applyFilters(requests, filters, today);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every design request sent to the agency. Overdue rows are red, due soon amber.
          </p>
        </div>
        <LinkButton href="/requests/new">New request</LinkButton>
      </header>

      <RequestFilters
        filters={filters}
        designers={designers.filter((designer) => designer.is_active)}
        workTypes={workTypes.filter((workType) => workType.is_active)}
        resultCount={visible.length}
      />

      <Card className="overflow-hidden">
        <RequestsTable requests={visible} filters={filters} today={today} />
      </Card>
    </div>
  );
}
