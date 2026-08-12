import { AppointmentStatus, PaymentStatus, TaskPriority, TaskStatus } from "@/lib/types/database.types";

export const appointmentStatusConfig: Record<
  AppointmentStatus,
  { label: string; tone: "neutral" | "brand" | "success" | "warning" | "danger" | "info"; dot: string }
> = {
  confirmed: { label: "Confirmed", tone: "brand", dot: "bg-brand-500" },
  pending: { label: "Pending", tone: "warning", dot: "bg-amber-500" },
  arrived: { label: "Arrived", tone: "info", dot: "bg-blue-500" },
  in_service: { label: "In Service", tone: "success", dot: "bg-emerald-500" },
  completed: { label: "Completed", tone: "neutral", dot: "bg-stone-400" },
  cancelled: { label: "Cancelled", tone: "danger", dot: "bg-red-400" },
  no_show: { label: "No Show", tone: "danger", dot: "bg-red-600" },
};

export const paymentStatusConfig: Record<PaymentStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  paid: { label: "Paid", tone: "success" },
  partially_paid: { label: "Partial", tone: "warning" },
  unpaid: { label: "Unpaid", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
};

export const taskPriorityConfig: Record<TaskPriority, { label: string; tone: "neutral" | "warning" | "danger" }> = {
  low: { label: "Low", tone: "neutral" },
  medium: { label: "Medium", tone: "warning" },
  high: { label: "High", tone: "danger" },
};

export const taskStatusConfig: Record<TaskStatus, { label: string; tone: "neutral" | "info" | "success" }> = {
  pending: { label: "Pending", tone: "neutral" },
  in_progress: { label: "In Progress", tone: "info" },
  completed: { label: "Completed", tone: "success" },
};
