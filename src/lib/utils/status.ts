import { AppointmentStatus, PaymentStatus } from "@/lib/types/database.types";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export const appointmentStatusConfig: Record<
  AppointmentStatus,
  {
    label: string;
    tone: Tone;
    /** Small colour dot used in lists */
    dot: string;
    /** Border + background used for calendar cards */
    card: string;
  }
> = {
  pending: {
    label: "Pending",
    tone: "warning",
    dot: "bg-amber-500",
    card: "border-amber-200 border-l-amber-400 bg-amber-50",
  },
  confirmed: {
    label: "Confirmed",
    tone: "brand",
    dot: "bg-brand-500",
    card: "border-brand-200 border-l-brand-500 bg-brand-50",
  },
  arrived: {
    label: "Arrived",
    tone: "info",
    dot: "bg-blue-500",
    card: "border-blue-200 border-l-blue-500 bg-blue-50",
  },
  in_service: {
    label: "In service",
    tone: "success",
    dot: "bg-emerald-500",
    card: "border-emerald-200 border-l-emerald-500 bg-emerald-50",
  },
  completed: {
    label: "Completed",
    tone: "neutral",
    dot: "bg-stone-400",
    card: "border-border border-l-stone-400 bg-surface-subtle",
  },
  cancelled: {
    label: "Cancelled",
    tone: "danger",
    dot: "bg-red-400",
    card: "border-red-100 border-l-red-300 bg-red-50",
  },
  no_show: {
    label: "No show",
    tone: "danger",
    dot: "bg-red-600",
    card: "border-red-200 border-l-red-600 bg-red-50",
  },
};

export const paymentStatusConfig: Record<PaymentStatus, { label: string; tone: Tone }> = {
  paid: { label: "Paid", tone: "success" },
  partially_paid: { label: "Partial", tone: "warning" },
  unpaid: { label: "Unpaid", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
};
