import Link from "next/link";
import { ArrowDown, ArrowUp, MessageSquare, Paperclip } from "lucide-react";
import { FlagBadge, PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { daysPending, describeDeadline, flagOf, formatDate } from "@/lib/logic";
import { SORT_LABELS, toSearchParams, type RequestFilters, type SortKey } from "@/lib/query";
import type { RequestRecord } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

function SortHeader({
  sortKey,
  filters,
  className,
}: {
  sortKey: SortKey;
  filters: RequestFilters;
  className?: string;
}) {
  const active = filters.sort === sortKey;
  // Clicking the active column flips direction; a new column starts ascending.
  const direction = active && filters.direction === "asc" ? "desc" : "asc";
  const href = `/requests${toSearchParams({ ...filters, sort: sortKey, direction })}`;

  return (
    <th className={cn("table-head", className)} aria-sort={active ? (filters.direction === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1 transition hover:text-slate-900",
          active && "text-slate-900",
        )}
      >
        {SORT_LABELS[sortKey]}
        {active ? (
          filters.direction === "asc" ? (
            <ArrowUp className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden />
          )
        ) : null}
      </Link>
    </th>
  );
}

export function RequestsTable({
  requests,
  filters,
  today,
}: {
  requests: RequestRecord[];
  filters: RequestFilters;
  today: string;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No requests match these filters"
        description="Try clearing a filter, or log a new request for the agency."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[62rem] border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="table-head">Request</th>
            <th className="table-head">Type</th>
            <SortHeader sortKey="priority" filters={filters} />
            <th className="table-head">Designer</th>
            <th className="table-head">Status</th>
            <SortHeader sortKey="days_pending" filters={filters} className="text-right" />
            <SortHeader sortKey="deadline" filters={filters} />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((request) => {
            const flag = flagOf(request, today);
            const pending = daysPending(request, today);

            return (
              <tr
                key={request.id}
                className={cn(
                  "transition",
                  flag === "overdue" && "bg-red-50 hover:bg-red-100/70",
                  flag === "due-soon" && "bg-amber-50 hover:bg-amber-100/70",
                  flag === "ok" && "hover:bg-slate-50",
                )}
              >
                <td className="table-cell max-w-[26rem]">
                  <Link href={`/requests/${request.id}`} className="group block">
                    <span
                      className={cn(
                        "block truncate font-medium group-hover:text-brand-700",
                        flag === "overdue" ? "text-red-900" : "text-slate-900",
                      )}
                    >
                      {request.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      {request.reference}
                      {request.comment_count > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" aria-hidden />
                          {request.comment_count}
                        </span>
                      ) : null}
                      {request.attachment_count > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3 w-3" aria-hidden />
                          {request.attachment_count}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </td>

                <td className="table-cell whitespace-nowrap">{request.work_type?.name ?? "—"}</td>

                <td className="table-cell">
                  <PriorityBadge priority={request.priority} />
                </td>

                <td className="table-cell whitespace-nowrap">
                  {request.designer ? (
                    request.designer.name
                  ) : (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </td>

                <td className="table-cell">
                  <StatusBadge status={request.status} />
                </td>

                <td className="table-cell text-right tabular-nums">
                  {pending === null ? <span className="text-slate-400">—</span> : `${pending}d`}
                </td>

                <td className="table-cell whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span className={cn(flag === "overdue" && "font-medium text-red-800")}>
                      {formatDate(request.deadline)}
                    </span>
                    <FlagBadge flag={flag} label={describeDeadline(request, today)} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
