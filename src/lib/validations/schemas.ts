import { z } from "zod";

export const customerSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  phone: z.string().min(6, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});
export type CustomerFormValues = z.infer<typeof customerSchema>;

export const staffSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  job_title: z.string().optional().or(z.literal("")),
  branch_id: z.string().uuid("Select a branch"),
  commission_percentage: z.coerce.number().min(0).max(100),
  employment_status: z.enum(["active", "inactive"]),
  service_ids: z.array(z.string().uuid()).default([]),
});
export type StaffFormValues = z.infer<typeof staffSchema>;

export const serviceSchema = z.object({
  name: z.string().min(2, "Service name is required"),
  category_id: z.string().uuid("Select a category"),
  description: z.string().optional().or(z.literal("")),
  duration_minutes: z.coerce.number().int().min(5, "Minimum 5 minutes"),
  price: z.coerce.number().min(0),
  is_active: z.boolean().default(true),
  staff_ids: z.array(z.string().uuid()).default([]),
});
export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const appointmentSchema = z.object({
  branch_id: z.string().uuid("Select a branch"),
  customer_id: z.string().uuid("Select a customer"),
  service_id: z.string().uuid("Select a service"),
  staff_id: z.string().uuid("Select a staff member"),
  date: z.string().min(1, "Select a date"),
  start_time: z.string().min(1, "Select a start time"),
  price: z.coerce.number().min(0),
  notes: z.string().optional().or(z.literal("")),
  status: z.enum([
    "confirmed",
    "pending",
    "arrived",
    "in_service",
    "completed",
    "cancelled",
    "no_show",
  ]),
});
export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

export const expenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  category_id: z.string().uuid("Select a category"),
  branch_id: z.string().uuid().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  payment_method: z.enum(["cash", "knet", "card", "payment_link", "complimentary", "other"]),
  notes: z.string().optional().or(z.literal("")),
});
export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  sku: z.string().optional().or(z.literal("")),
  category_id: z.string().uuid().optional().or(z.literal("")),
  brand: z.string().optional().or(z.literal("")),
  cost_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  current_stock: z.coerce.number().int().min(0),
  minimum_stock: z.coerce.number().int().min(0),
  supplier_id: z.string().uuid().optional().or(z.literal("")),
  branch_id: z.string().uuid().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});
export type ProductFormValues = z.infer<typeof productSchema>;

export const taskSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  assigned_staff_id: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["pending", "in_progress", "completed"]),
});
export type TaskFormValues = z.infer<typeof taskSchema>;

export const journalSchema = z.object({
  date: z.string().min(1, "Date is required"),
  title: z.string().min(2, "Title is required"),
  note: z.string().optional().or(z.literal("")),
  branch_id: z.string().uuid().optional().or(z.literal("")),
});
export type JournalFormValues = z.infer<typeof journalSchema>;

export const publicBookingCustomerSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  phone: z.string().min(6, "A valid mobile number is required"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type PublicBookingCustomerValues = z.infer<typeof publicBookingCustomerSchema>;

export const branchSchema = z.object({
  name: z.string().min(2, "Branch name is required"),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});
export type BranchFormValues = z.infer<typeof branchSchema>;
