// Hand-written types mirroring supabase/migrations/0001_schema.sql.
// If you change the schema, regenerate with the Supabase CLI instead:
//   npx supabase gen types typescript --project-id <id> > src/lib/types/database.types.ts
// This file is written in the shape the generated file takes (Database /
// Tables / Row-Insert-Update) so swapping it later is a drop-in replace.

export type UserRole = "owner" | "manager" | "receptionist" | "staff";

export type AppointmentStatus =
  | "confirmed"
  | "pending"
  | "arrived"
  | "in_service"
  | "completed"
  | "cancelled"
  | "no_show";

export type EmploymentStatus = "active" | "inactive";

export type PaymentMethod =
  | "cash"
  | "knet"
  | "card"
  | "payment_link"
  | "complimentary"
  | "other";

export type PaymentStatus = "paid" | "partially_paid" | "unpaid" | "refunded";

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type AppointmentSource = "staff" | "online";

export interface Business {
  id: string;
  name: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  business_id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  staff_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpeningHours {
  [day: string]: { open: string; close: string } | undefined;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  opening_hours: OpeningHours | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  business_id: string;
  branch_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  job_title: string | null;
  commission_percentage: number;
  employment_status: EmploymentStatus;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffWorkingHours {
  id: string;
  staff_id: string;
  day_of_week: number; // 0 = Sunday
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
}

export interface Customer {
  id: string;
  business_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  business_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  branch_id: string;
  customer_id: string;
  staff_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  booking_reference: string | null;
  source: AppointmentSource;
  created_at: string;
  updated_at: string;
}

export interface AppointmentService {
  id: string;
  appointment_id: string;
  service_id: string;
  price: number;
  duration_minutes: number;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  branch_id: string | null;
  category_id: string | null;
  supplier_id: string | null;
  name: string;
  sku: string | null;
  brand: string | null;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  business_id: string;
  branch_id: string;
  customer_id: string | null;
  invoice_number: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  service_id: string | null;
  product_id: string | null;
  staff_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Payment {
  id: string;
  sale_id: string;
  method: PaymentMethod;
  amount: number;
  paid_at: string;
}

export interface ExpenseCategory {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
}

export interface Expense {
  id: string;
  business_id: string;
  branch_id: string | null;
  category_id: string | null;
  date: string;
  description: string | null;
  amount: number;
  payment_method: PaymentMethod | null;
  notes: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  business_id: string;
  branch_id: string | null;
  author_id: string | null;
  date: string;
  title: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  assigned_staff_id: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaign {
  id: string;
  business_id: string;
  name: string;
  type: "offer" | "promo_code" | "campaign";
  description: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiftCard {
  id: string;
  business_id: string;
  code: string;
  initial_balance: number;
  current_balance: number;
  customer_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Membership {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  is_active: boolean;
  created_at: string;
}
