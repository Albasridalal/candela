"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Contact,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/customers", label: "Customers", icon: Contact },
  { href: "/services", label: "Services", icon: Sparkles },
  { href: "/staff", label: "Staff", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

const QUICK_ACTIONS = [
  { href: "/calendar?new=1", label: "New booking", description: "Add an appointment", icon: CalendarDays },
  { href: "/customers/new", label: "New customer", description: "Add a customer profile", icon: Contact },
  { href: "/services?new=1", label: "New service", description: "Add to your menu", icon: Sparkles },
  { href: "/staff/new", label: "New staff", description: "Add a team member", icon: UsersRound },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(href + "/");
}

/** Sidebar for tablet/desktop. */
export function SideNav({ salonName }: { salonName: string }) {
  const isActive = useIsActive();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <p className="truncate text-sm font-semibold text-ink">{salonName}</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              isActive(item.href)
                ? "bg-brand-50 font-medium text-brand-700"
                : "text-ink-muted hover:bg-surface-subtle hover:text-ink"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-1 px-3 pb-5">
        <a
          href="/book"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted hover:bg-surface-subtle hover:text-ink"
        >
          <ExternalLink className="h-4 w-4" />
          Booking page
        </a>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted hover:bg-surface-subtle hover:text-ink"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

/** Bottom bar + quick-add sheet for phones. */
export function BottomNav() {
  const isActive = useIsActive();
  const router = useRouter();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const left = NAV_ITEMS.slice(0, 2);
  const right = [NAV_ITEMS[2], NAV_ITEMS[4]];

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-safe backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-center px-2 pt-2">
          {left.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          ))}

          <div className="flex items-center justify-center">
            <button
              onClick={() => setQuickAddOpen(true)}
              aria-label="Quick add"
              className="flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand-900/20 transition-transform active:scale-95"
            >
              <Plus className="h-7 w-7" />
            </button>
          </div>

          {right.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Quick add">
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.href}
              onClick={() => {
                setQuickAddOpen(false);
                router.push(action.href);
              }}
              className="flex flex-col items-start gap-2 rounded-card border border-border bg-surface p-4 text-left active:bg-brand-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                <action.icon className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{action.label}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
        <Link
          href="/settings"
          onClick={() => setQuickAddOpen(false)}
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm text-ink-muted"
        >
          <Settings className="h-4 w-4" /> Settings & opening hours
        </Link>
      </Modal>
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
    <Link href={href} className="flex flex-col items-center gap-1 py-1.5 text-[11px]">
      <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-ink-muted")} />
      <span className={active ? "font-medium text-brand-600" : "text-ink-muted"}>{label}</span>
    </Link>
  );
}
