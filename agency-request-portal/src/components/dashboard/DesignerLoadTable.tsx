import Link from "next/link";
import { EmptyState } from "@/components/ui/Card";
import type { DesignerLoad } from "@/lib/stats";
import { cn } from "@/lib/utils/cn";

/**
 * Pending vs overdue per designer. The bar is drawn from the counts themselves
 * (no chart library) so it stays crisp, printable and dependency-free.
 */
export function DesignerLoadTable({ rows }: { rows: DesignerLoad[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No open work assigned"
        description="Every request is delivered. New requests will appear here once assigned."
      />
    );
  }

  const peak = Math.max(1, ...rows.map((row) => row.pending));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="table-head">Designer</th>
            <th className="table-head w-[38%]">Workload</th>
            <th className="table-head text-right">Pending</th>
            <th className="table-head text-right">Overdue</th>
            <th className="table-head text-right">Oldest</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const onTrack = Math.max(0, row.pending - row.overdue);
            const href =
              row.id === "unassigned"
                ? "/requests?designer=unassigned&flag=open"
                : `/requests?designer=${row.id}&flag=open`;

            return (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="table-cell">
                  <Link href={href} className="font-medium text-slate-900 hover:text-brand-700">
                    {row.name}
                  </Link>
                  {row.deliveredThisWeek > 0 ? (
                    <p className="text-xs text-emerald-700">
                      {row.deliveredThisWeek} delivered this week
                    </p>
                  ) : null}
                </td>
                <td className="table-cell">
                  <div
                    className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                    role="img"
                    aria-label={`${row.pending} pending, ${row.overdue} overdue`}
                  >
                    {row.overdue > 0 ? (
                      <span
                        className="bg-red-500"
                        style={{ width: `${(row.overdue / peak) * 100}%` }}
                      />
                    ) : null}
                    {onTrack > 0 ? (
                      <span
                        className="bg-brand-500"
                        style={{ width: `${(onTrack / peak) * 100}%` }}
                      />
                    ) : null}
                  </div>
                </td>
                <td className="table-cell text-right font-semibold tabular-nums text-slate-900">
                  {row.pending}
                </td>
                <td
                  className={cn(
                    "table-cell text-right font-semibold tabular-nums",
                    row.overdue > 0 ? "text-red-700" : "text-slate-400",
                  )}
                >
                  {row.overdue}
                </td>
                <td className="table-cell text-right tabular-nums text-slate-600">
                  {row.pending > 0 ? `${row.oldestDaysPending}d` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="flex items-center gap-4 px-4 pt-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden /> On track
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden /> Overdue
        </span>
      </p>
    </div>
  );
}
