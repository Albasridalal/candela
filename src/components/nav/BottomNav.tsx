"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BarChart3, Users, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";
import { QuickAddModal } from "./QuickAddModal";

const navItems = [
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const navItemsRight = [
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/dashboard", label: "More", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-safe backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-center px-2 pt-2">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          ))}

          <div className="flex items-center justify-center">
            <button
              onClick={() => setQuickAddOpen(true)}
              aria-label="Quick add"
              className={cn(
                "flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full",
                "bg-brand text-white shadow-lg shadow-brand-900/20 active:scale-95 transition-transform"
              )}
            >
              <Plus className="h-7 w-7" />
            </button>
          </div>

          {navItemsRight.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof CalendarDays;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 py-1.5 text-[11px]"
    >
      <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-ink-muted")} />
      <span className={cn(active ? "font-medium text-brand-600" : "text-ink-muted")}>
        {label}
      </span>
    </Link>
  );
}
