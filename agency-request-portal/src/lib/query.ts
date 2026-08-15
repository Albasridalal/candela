import {
  daysPending,
  daysToDeadline,
  flagOf,
  isOpen,
  priorityRank,
  todayISO,
} from "./logic";
import { PRIORITIES, STATUSES, type Priority, type RequestRecord, type Status } from "./types";

/**
 * Filtering and sorting run in the application rather than the database so the
 * demo and Supabase backends behave identically. A marketing team's request
 * volume is small enough that this is not worth pushing into SQL.
 */

export const SORT_KEYS = ["deadline", "priority", "days_pending", "submitted"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  deadline: "Deadline",
  priority: "Priority",
  days_pending: "Days pending",
  submitted: "Date submitted",
};

export type SortDirection = "asc" | "desc";

export type RequestFilters = {
  status: Status | "all";
  /** Work type name — names are what the user edits, and they are unique. */
  type: string | "all";
  priority: Priority | "all";
  /** Designer id, or the literal `unassigned`. */
  designer: string | "all";
  flag: "all" | "overdue" | "due-soon" | "open";
  search: string;
  sort: SortKey;
  direction: SortDirection;
};

export const DEFAULT_FILTERS: RequestFilters = {
  status: "all",
  type: "all",
  priority: "all",
  designer: "all",
  flag: "all",
  search: "",
  sort: "deadline",
  direction: "asc",
};

type RawParams = Record<string, string | string[] | undefined>;

function single(params: RawParams, key: string): string | undefined {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ? raw.trim() : undefined;
}

export function parseFilters(params: RawParams): RequestFilters {
  const status = single(params, "status");
  const priority = single(params, "priority");
  const flag = single(params, "flag");
  const sort = single(params, "sort");
  const direction = single(params, "direction");

  return {
    status: STATUSES.includes(status as Status) ? (status as Status) : "all",
    type: single(params, "type") ?? "all",
    priority: PRIORITIES.includes(priority as Priority) ? (priority as Priority) : "all",
    designer: single(params, "designer") ?? "all",
    flag:
      flag === "overdue" || flag === "due-soon" || flag === "open" ? flag : "all",
    search: single(params, "q") ?? "",
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : DEFAULT_FILTERS.sort,
    direction: direction === "desc" ? "desc" : "asc",
  };
}

/** True when anything other than sorting has been narrowed. */
export function hasActiveFilters(filters: RequestFilters): boolean {
  return (
    filters.status !== "all" ||
    filters.type !== "all" ||
    filters.priority !== "all" ||
    filters.designer !== "all" ||
    filters.flag !== "all" ||
    filters.search !== ""
  );
}

/** Serialises filters back into a query string, omitting defaults. */
export function toSearchParams(filters: Partial<RequestFilters>): string {
  const params = new URLSearchParams();
  const put = (key: string, value: string | undefined, fallback: string) => {
    if (value && value !== fallback) params.set(key, value);
  };
  put("status", filters.status, "all");
  put("type", filters.type, "all");
  put("priority", filters.priority, "all");
  put("designer", filters.designer, "all");
  put("flag", filters.flag, "all");
  put("q", filters.search, "");
  put("sort", filters.sort, DEFAULT_FILTERS.sort);
  put("direction", filters.direction, "asc");
  const query = params.toString();
  return query ? `?${query}` : "";
}

function matches(request: RequestRecord, filters: RequestFilters, today: string): boolean {
  if (filters.status !== "all" && request.status !== filters.status) return false;
  if (filters.type !== "all" && request.work_type?.name !== filters.type) return false;
  if (filters.priority !== "all" && request.priority !== filters.priority) return false;

  if (filters.designer === "unassigned") {
    if (request.designer) return false;
  } else if (filters.designer !== "all" && request.designer?.id !== filters.designer) {
    return false;
  }

  if (filters.flag === "open" && !isOpen(request)) return false;
  if (filters.flag === "overdue" && flagOf(request, today) !== "overdue") return false;
  if (filters.flag === "due-soon" && flagOf(request, today) !== "due-soon") return false;

  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const haystack = [
      request.title,
      request.brief ?? "",
      request.reference,
      request.designer?.name ?? "",
      request.work_type?.name ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

function compare(a: RequestRecord, b: RequestRecord, sort: SortKey, today: string): number {
  switch (sort) {
    case "priority":
      return priorityRank(a.priority) - priorityRank(b.priority);
    case "submitted":
      return a.date_submitted.localeCompare(b.date_submitted);
    case "days_pending":
      // Longest wait first is the useful reading, so invert into ascending order.
      return (daysPending(b, today) ?? 0) - (daysPending(a, today) ?? 0);
    case "deadline":
    default:
      return (daysToDeadline(a, today) ?? 0) - (daysToDeadline(b, today) ?? 0);
  }
}

/** A request with nothing to sort on sinks within its group, either direction. */
function lacksSortValue(request: RequestRecord, sort: SortKey): boolean {
  if (sort === "deadline") return !request.deadline;
  if (sort === "days_pending") return !isOpen(request);
  return false;
}

export function applyFilters(
  requests: RequestRecord[],
  filters: RequestFilters,
  today: string = todayISO(),
): RequestRecord[] {
  const visible = requests.filter((request) => matches(request, filters, today));

  return visible.sort((a, b) => {
    // Open work always outranks delivered work, whatever the sort. This is a
    // chase list: a request delivered last week must never head the table just
    // because its deadline is the oldest date on the page.
    const byOpen = Number(isOpen(b)) - Number(isOpen(a));
    if (byOpen !== 0) return byOpen;

    const aMissing = lacksSortValue(a, filters.sort);
    const bMissing = lacksSortValue(b, filters.sort);
    if (aMissing !== bMissing) return aMissing ? 1 : -1;

    const primary = compare(a, b, filters.sort, today);
    if (primary !== 0) return filters.direction === "desc" ? -primary : primary;

    // Stable, meaningful tiebreak so equal deadlines still read urgent-first.
    const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
    if (byPriority !== 0) return byPriority;
    return a.reference.localeCompare(b.reference);
  });
}
