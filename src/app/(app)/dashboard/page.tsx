import Link from "next/link";
import {
  ShoppingBag,
  Receipt,
  Wallet,
  Boxes,
  Inbox as InboxIcon,
  BookText,
  ListChecks,
  UsersRound,
  Sparkles,
  Megaphone,
  Contact,
  Building2,
  Settings as SettingsIcon,
  Globe,
  ExternalLink,
} from "lucide-react";
import { BranchSelector } from "@/components/dashboard/BranchSelector";
import { MenuSection, DashboardMenuItem } from "@/components/dashboard/MenuSection";
import { getCurrentProfile } from "@/lib/supabase/queries";

const operationsItems: DashboardMenuItem[] = [
  { href: "/pos", label: "Retail POS", description: "Checkout customers and take payment", icon: ShoppingBag },
  { href: "/sales", label: "Sales", description: "View invoices and transaction history", icon: Receipt },
  { href: "/expenses", label: "Expenses", description: "Track business expenses and receipts", icon: Wallet },
  { href: "/inventory", label: "Inventory", description: "Manage retail products and stock", icon: Boxes },
  { href: "/inbox", label: "Inbox", description: "Customer messages, all in one place", icon: InboxIcon },
  { href: "/journal", label: "Journal", description: "Daily notes for your team", icon: BookText },
  { href: "/todo", label: "My Todo", description: "Tasks assigned to you and your team", icon: ListChecks },
];

const myBusinessItems: DashboardMenuItem[] = [
  { href: "/staff", label: "Staff", description: "Team members, roles and working hours", icon: UsersRound },
  { href: "/services", label: "Services", description: "Your service menu and pricing", icon: Sparkles },
  { href: "/marketing", label: "Marketing", description: "Offers, promos, gift cards and campaigns", icon: Megaphone },
  { href: "/customers", label: "Customers", description: "Your customer list and profiles", icon: Contact },
  { href: "/branches", label: "Branches", description: "Manage salon locations", icon: Building2 },
  { href: "/settings", label: "Settings", description: "Business preferences and roles", icon: SettingsIcon },
];

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="pb-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-muted">Welcome back,</p>
          <h1 className="text-xl font-semibold text-ink">{firstName}</h1>
        </div>
        <BranchSelector />
      </div>

      <Link
        href="/book"
        target="_blank"
        className="mb-6 flex items-center gap-3 rounded-card border border-brand-200 bg-brand-50 p-4 shadow-card active:bg-brand-100"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
          <Globe className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Public booking page</p>
          <p className="truncate text-xs text-ink-muted">Share /book with customers — no login needed</p>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-brand-600" />
      </Link>

      <MenuSection title="Operations" items={operationsItems} />
      <MenuSection title="My Business" items={myBusinessItems} />
    </div>
  );
}
