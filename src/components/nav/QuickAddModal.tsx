"use client";

import { useRouter } from "next/navigation";
import { CalendarPlus, UserPlus, ShoppingCart, Receipt } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

const actions = [
  {
    label: "New Appointment",
    description: "Book a customer into the calendar",
    icon: CalendarPlus,
    href: "/calendar?new=1",
  },
  {
    label: "New Customer",
    description: "Add a customer profile",
    icon: UserPlus,
    href: "/customers/new",
  },
  {
    label: "New Sale",
    description: "Start a POS checkout",
    icon: ShoppingCart,
    href: "/pos",
  },
  {
    label: "Add Expense",
    description: "Log a business expense",
    icon: Receipt,
    href: "/expenses?new=1",
  },
];

export function QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <Modal open={open} onClose={onClose} title="Quick Add">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => go(action.href)}
            className="flex flex-col items-start gap-2 rounded-card border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-subtle active:bg-brand-50"
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
    </Modal>
  );
}
