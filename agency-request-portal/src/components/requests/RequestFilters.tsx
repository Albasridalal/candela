"use client";

import { useRef } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/Field";
import type { RequestFilters as Filters } from "@/lib/query";
import { hasActiveFilters } from "@/lib/query";
import { PRIORITIES, STATUSES, type Designer, type WorkType } from "@/lib/types";

/**
 * Plain GET form: every filter lives in the URL, so a filtered view can be
 * bookmarked or pasted into an email. Selects submit on change; the search box
 * submits on Enter.
 */
export function RequestFilters({
  filters,
  designers,
  workTypes,
  resultCount,
}: {
  filters: Filters;
  designers: Designer[];
  workTypes: WorkType[];
  resultCount: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();

  return (
    <form ref={formRef} action="/requests" method="get" className="space-y-3">
      {/* Sorting is controlled by the column headers — carry it across filter changes. */}
      <input type="hidden" name="sort" value={filters.sort} />
      <input type="hidden" name="direction" value={filters.direction} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={filters.search}
            placeholder="Search title, brief, reference or designer"
            aria-label="Search requests"
            className="field-control pl-9"
          />
        </div>

        <Select
          name="status"
          defaultValue={filters.status}
          onChange={submit}
          aria-label="Filter by status"
          className="w-auto"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>

        <Select
          name="type"
          defaultValue={filters.type}
          onChange={submit}
          aria-label="Filter by work type"
          className="w-auto"
        >
          <option value="all">All work types</option>
          {workTypes.map((workType) => (
            <option key={workType.id} value={workType.name}>
              {workType.name}
            </option>
          ))}
        </Select>

        <Select
          name="priority"
          defaultValue={filters.priority}
          onChange={submit}
          aria-label="Filter by priority"
          className="w-auto"
        >
          <option value="all">All priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </Select>

        <Select
          name="designer"
          defaultValue={filters.designer}
          onChange={submit}
          aria-label="Filter by designer"
          className="w-auto"
        >
          <option value="all">All designers</option>
          <option value="unassigned">Unassigned</option>
          {designers.map((designer) => (
            <option key={designer.id} value={designer.id}>
              {designer.name}
            </option>
          ))}
        </Select>

        <Select
          name="flag"
          defaultValue={filters.flag}
          onChange={submit}
          aria-label="Filter by deadline flag"
          className="w-auto"
        >
          <option value="all">Any deadline</option>
          <option value="open">Open only</option>
          <option value="overdue">Overdue only</option>
          <option value="due-soon">Due soon only</option>
        </Select>

        {/* Keeps the form usable when a browser blocks the change handlers. */}
        <button
          type="submit"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Apply
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>
          {resultCount} {resultCount === 1 ? "request" : "requests"}
        </span>
        {hasActiveFilters(filters) ? (
          <Link href="/requests" className="font-medium text-brand-700 hover:text-brand-800">
            Clear filters
          </Link>
        ) : null}
      </div>
    </form>
  );
}
