import { Appointment, AppointmentStatus } from "./database.types";

export * from "./database.types";

/**
 * An appointment joined with the handful of related fields the calendar and
 * dashboard always need: who it's for, who's doing it, and what's booked.
 */
export interface AppointmentWithDetails extends Appointment {
  customer_name: string;
  customer_phone: string | null;
  staff_name: string;
  service_id: string | null;
  service_name: string;
  service_price: number;
  service_duration_minutes: number;
}

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "arrived",
  "in_service",
  "completed",
  "cancelled",
  "no_show",
];

/** The columns of the appointment query that map onto AppointmentWithDetails. */
export const APPOINTMENT_SELECT = `
  id, business_id, branch_id, customer_id, staff_id, start_time, end_time, status,
  notes, source, booking_reference, created_at, updated_at,
  customers ( full_name, phone ),
  staff ( full_name ),
  appointment_services ( service_id, price, duration_minutes, services ( name ) )
` as const;

interface AppointmentRow {
  id: string;
  business_id: string;
  branch_id: string;
  customer_id: string;
  staff_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  source: Appointment["source"];
  booking_reference: string | null;
  created_at: string;
  updated_at: string;
  customers: { full_name: string; phone: string | null } | null;
  staff: { full_name: string } | null;
  appointment_services: {
    service_id: string;
    price: number;
    duration_minutes: number;
    services: { name: string } | null;
  }[];
}

/** Flattens a joined appointment row into AppointmentWithDetails. */
export function mapAppointmentRow(row: unknown): AppointmentWithDetails {
  const r = row as AppointmentRow;
  const service = r.appointment_services?.[0];
  return {
    id: r.id,
    business_id: r.business_id,
    branch_id: r.branch_id,
    customer_id: r.customer_id,
    staff_id: r.staff_id,
    start_time: r.start_time,
    end_time: r.end_time,
    status: r.status,
    notes: r.notes,
    source: r.source,
    booking_reference: r.booking_reference,
    created_at: r.created_at,
    updated_at: r.updated_at,
    customer_name: r.customers?.full_name ?? "Unknown customer",
    customer_phone: r.customers?.phone ?? null,
    staff_name: r.staff?.full_name ?? "Unassigned",
    service_id: service?.service_id ?? null,
    service_name: service?.services?.name ?? "Service",
    service_price: service?.price ?? 0,
    service_duration_minutes:
      service?.duration_minutes ??
      Math.round((new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 60_000),
  };
}
