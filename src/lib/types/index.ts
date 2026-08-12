import { Appointment, AppointmentStatus } from "./database.types";

export * from "./database.types";

export interface AppointmentWithDetails extends Appointment {
  customer_name: string;
  staff_name: string;
  service_name: string;
  service_price: number;
  service_duration_minutes: number;
}

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "confirmed",
  "pending",
  "arrived",
  "in_service",
  "completed",
  "cancelled",
  "no_show",
];
