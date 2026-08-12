import { Globe } from "lucide-react";
import { AppointmentWithDetails } from "@/lib/types";
import { appointmentStatusConfig } from "@/lib/utils/status";
import { formatTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export function AppointmentCard({
  appointment,
  onClick,
  style,
  compact,
}: {
  appointment: AppointmentWithDetails;
  onClick?: () => void;
  style?: React.CSSProperties;
  compact?: boolean;
}) {
  const status = appointmentStatusConfig[appointment.status];

  return (
    <button
      onClick={onClick}
      style={style}
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-surface p-1.5 text-left shadow-subtle transition-transform active:scale-[0.98]",
        "border-l-4",
        compact ? "absolute inset-x-0.5" : "w-full"
      )}
      data-status={appointment.status}
    >
      <div className="flex items-center gap-1">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dot)} />
        <p className="truncate text-[11px] font-semibold text-ink">{appointment.customer_name}</p>
        {appointment.source === "online" && (
          <Globe className="h-2.5 w-2.5 shrink-0 text-brand-500" aria-label="Booked online" />
        )}
      </div>
      <p className="truncate text-[10px] text-ink-muted">{appointment.service_name}</p>
      <p className="truncate text-[10px] text-ink-muted">
        {formatTime(appointment.start_time)} · {appointment.staff_name}
      </p>
    </button>
  );
}
