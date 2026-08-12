import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";

export interface DashboardMenuItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export function MenuSection({
  title,
  items,
}: {
  title: string;
  items: DashboardMenuItem[];
}) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h2>
      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        {items.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3.5 active:bg-surface-subtle ${
              i !== items.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
              <item.icon className="h-5 w-5 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{item.label}</p>
              <p className="truncate text-xs text-ink-muted">{item.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
