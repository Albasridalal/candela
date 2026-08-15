import { setStatusAction } from "@/lib/actions";
import { STATUSES, type Status } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const ACTIVE_STYLES: Record<Status, string> = {
  New: "bg-slate-700 text-white",
  "In Progress": "bg-blue-600 text-white",
  Delivered: "bg-emerald-600 text-white",
};

/**
 * Segmented control moving a request along New → In Progress → Delivered.
 * Each option posts a server action, so it works without client JavaScript.
 */
export function StatusControl({ id, status }: { id: string; status: Status }) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-slate-50"
      role="group"
      aria-label="Request status"
    >
      {STATUSES.map((option) => {
        const isCurrent = option === status;
        return (
          <form key={option} action={setStatusAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={option} />
            <button
              type="submit"
              aria-pressed={isCurrent}
              disabled={isCurrent}
              className={cn(
                "border-r border-slate-300 px-3.5 py-2 text-sm font-medium transition last:border-r-0",
                isCurrent
                  ? cn(ACTIVE_STYLES[option], "cursor-default")
                  : "text-slate-600 hover:bg-white hover:text-slate-900",
              )}
            >
              {option}
            </button>
          </form>
        );
      })}
    </div>
  );
}
