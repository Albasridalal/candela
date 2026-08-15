"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { CountBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

export type AlertItem = {
  id: string;
  reference: string;
  title: string;
  designer: string;
  deadlineLabel: string;
  detail: string;
  kind: "overdue" | "due-soon";
};

export function AlertsMenu({ items }: { items: AlertItem[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const overdue = items.filter((item) => item.kind === "overdue");
  const dueSoon = items.filter((item) => item.kind === "due-soon");

  // Close when navigating away or clicking outside.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "relative inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50",
          open && "border-slate-400 bg-slate-50",
        )}
      >
        <Bell className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Alerts</span>
        {items.length > 0 ? (
          <CountBadge tone={overdue.length > 0 ? "danger" : "warning"}>{items.length}</CountBadge>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Deadline alerts"
          className="absolute right-0 z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Deadline alerts</p>
            <p className="text-xs text-slate-500">
              {overdue.length} overdue · {dueSoon.length} due soon
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Nothing overdue or due in the next two days.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/requests/${item.id}`}
                      className="block px-4 py-3 transition hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                            item.kind === "overdue"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-900",
                          )}
                        >
                          {item.detail}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.reference} · {item.designer} · due {item.deadlineLabel}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5">
            <Link
              href="/requests?flag=overdue"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              View all overdue requests →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
