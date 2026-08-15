import { cn } from "@/lib/utils/cn";
import type { Flag } from "@/lib/logic";
import type { Priority, Status } from "@/lib/types";

const BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

const STATUS_STYLES: Record<Status, string> = {
  New: "border-slate-300 bg-slate-100 text-slate-700",
  "In Progress": "border-blue-200 bg-blue-50 text-blue-700",
  Delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  High: "border-rose-200 bg-rose-50 text-rose-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-800",
  Low: "border-slate-200 bg-slate-50 text-slate-600",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return <span className={cn(BASE, STATUS_STYLES[status], className)}>{status}</span>;
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span className={cn(BASE, PRIORITY_STYLES[priority], className)}>
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          priority === "High" && "bg-rose-500",
          priority === "Medium" && "bg-amber-500",
          priority === "Low" && "bg-slate-400",
        )}
      />
      {priority}
    </span>
  );
}

/** Renders nothing for on-track requests so the table stays quiet. */
export function FlagBadge({ flag, label }: { flag: Flag; label?: string | null }) {
  if (flag === "ok") return null;
  const isOverdue = flag === "overdue";
  return (
    <span
      className={cn(
        BASE,
        isOverdue
          ? "border-red-300 bg-red-100 text-red-800"
          : "border-amber-300 bg-amber-100 text-amber-900",
      )}
    >
      {label ?? (isOverdue ? "Overdue" : "Due soon")}
    </span>
  );
}

export function CountBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "danger" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
        tone === "neutral" && "bg-slate-200 text-slate-700",
        tone === "danger" && "bg-red-600 text-white",
        tone === "warning" && "bg-amber-500 text-white",
      )}
    >
      {children}
    </span>
  );
}
