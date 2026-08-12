import { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/Feedback";

export function ComingSoon({
  title,
  icon: Icon,
  description = "This module isn't built yet — the current release focuses on Services, Customers, Online Booking, the Calendar, and Staff availability.",
}: {
  title: string;
  icon: LucideIcon;
  description?: string;
}) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border px-6 py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <Icon className="h-6 w-6 text-brand-600" />
        </div>
        <p className="font-medium text-ink">Coming soon</p>
        <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>
      </div>
    </div>
  );
}
