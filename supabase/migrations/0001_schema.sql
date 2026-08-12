-- ============================================================================
-- Salon Management App — 0001_schema.sql
-- Multi-business, multi-branch architecture from day one. Every business-
-- owned table carries business_id so Row Level Security (0002_rls.sql) can
-- isolate one business's data from another's.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role as enum ('owner', 'manager', 'receptionist', 'staff');

create type appointment_status as enum (
  'confirmed', 'pending', 'arrived', 'in_service', 'completed', 'cancelled', 'no_show'
);

create type employment_status as enum ('active', 'inactive');

create type payment_method as enum (
  'cash', 'knet', 'card', 'payment_link', 'complimentary', 'other'
);

create type payment_status as enum ('paid', 'partially_paid', 'unpaid', 'refunded');

create type task_priority as enum ('low', 'medium', 'high');

create type task_status as enum ('pending', 'in_progress', 'completed');

-- ----------------------------------------------------------------------------
-- Businesses & Profiles
-- ----------------------------------------------------------------------------
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'KWD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per authenticated user (1:1 with auth.users).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  full_name text not null,
  email text,
  role user_role not null default 'staff',
  staff_id uuid, -- fk added after `staff` table exists, below
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_business_id on profiles(business_id);

-- ----------------------------------------------------------------------------
-- Branches
-- ----------------------------------------------------------------------------
create table branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  opening_hours jsonb, -- { "mon": {"open":"09:00","close":"21:00"}, ... }
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_branches_business_id on branches(business_id);

-- ----------------------------------------------------------------------------
-- Staff
-- ----------------------------------------------------------------------------
create table staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  job_title text,
  commission_percentage numeric(5,2) not null default 0,
  employment_status employment_status not null default 'active',
  profile_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_staff_business_id on staff(business_id);
create index idx_staff_branch_id on staff(branch_id);

alter table profiles
  add constraint profiles_staff_id_fkey foreign key (staff_id) references staff(id) on delete set null;

create table staff_working_hours (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  is_working boolean not null default true,
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  unique (staff_id, day_of_week)
);

create index idx_staff_working_hours_staff_id on staff_working_hours(staff_id);

-- ----------------------------------------------------------------------------
-- Customers
-- ----------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  birthday date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customers_business_id on customers(business_id);
create index idx_customers_phone on customers(phone);
create index idx_customers_full_name on customers using gin (to_tsvector('simple', full_name));

-- ----------------------------------------------------------------------------
-- Services
-- ----------------------------------------------------------------------------
create table service_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_service_categories_business_id on service_categories(business_id);

create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid references service_categories(id) on delete set null,
  name text not null,
  description text,
  duration_minutes integer not null default 30,
  price numeric(10,3) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_services_business_id on services(business_id);
create index idx_services_category_id on services(category_id);

create table staff_services (
  staff_id uuid not null references staff(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (staff_id, service_id)
);

-- ----------------------------------------------------------------------------
-- Appointments
-- ----------------------------------------------------------------------------
create table appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  staff_id uuid not null references staff(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status appointment_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_order check (end_time > start_time)
);

create index idx_appointments_business_id on appointments(business_id);
create index idx_appointments_branch_id on appointments(branch_id);
create index idx_appointments_staff_id on appointments(staff_id);
create index idx_appointments_customer_id on appointments(customer_id);
create index idx_appointments_start_time on appointments(start_time);
-- Speeds up the "does this staff member already have an appointment in this
-- window" overlap check performed by the app before insert/update.
create index idx_appointments_staff_time on appointments(staff_id, start_time, end_time);

create table appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  price numeric(10,3) not null,
  duration_minutes integer not null
);

create index idx_appointment_services_appointment_id on appointment_services(appointment_id);

-- ----------------------------------------------------------------------------
-- Inventory
-- ----------------------------------------------------------------------------
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create index idx_suppliers_business_id on suppliers(business_id);

create table product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_product_categories_business_id on product_categories(business_id);

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  category_id uuid references product_categories(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  name text not null,
  sku text,
  brand text,
  cost_price numeric(10,3) not null default 0,
  selling_price numeric(10,3) not null default 0,
  current_stock integer not null default 0,
  minimum_stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_business_id on products(business_id);
create index idx_products_branch_id on products(branch_id);
create index idx_products_sku on products(sku);

-- ----------------------------------------------------------------------------
-- Sales / POS
-- ----------------------------------------------------------------------------
create table sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete restrict,
  customer_id uuid references customers(id) on delete set null,
  invoice_number text not null,
  subtotal numeric(10,3) not null default 0,
  discount numeric(10,3) not null default 0,
  total numeric(10,3) not null default 0,
  payment_method payment_method,
  payment_status payment_status not null default 'unpaid',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, invoice_number)
);

create index idx_sales_business_id on sales(business_id);
create index idx_sales_branch_id on sales(branch_id);
create index idx_sales_customer_id on sales(customer_id);
create index idx_sales_created_at on sales(created_at);

-- A line item is either a service (service_id set) or a retail product
-- (product_id set), each with the staff member who gets commission credit.
create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  staff_id uuid references staff(id) on delete set null,
  description text not null,
  quantity integer not null default 1,
  unit_price numeric(10,3) not null,
  total_price numeric(10,3) not null,
  constraint sale_items_item_type check (service_id is not null or product_id is not null)
);

create index idx_sale_items_sale_id on sale_items(sale_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  method payment_method not null,
  amount numeric(10,3) not null,
  paid_at timestamptz not null default now()
);

create index idx_payments_sale_id on payments(sale_id);

-- ----------------------------------------------------------------------------
-- Expenses
-- ----------------------------------------------------------------------------
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_expense_categories_business_id on expense_categories(business_id);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  category_id uuid references expense_categories(id) on delete set null,
  date date not null default current_date,
  description text,
  amount numeric(10,3) not null,
  payment_method payment_method,
  notes text,
  receipt_url text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_expenses_business_id on expenses(business_id);
create index idx_expenses_branch_id on expenses(branch_id);
create index idx_expenses_date on expenses(date);

-- ----------------------------------------------------------------------------
-- Journal
-- ----------------------------------------------------------------------------
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  author_id uuid references profiles(id) on delete set null,
  date date not null default current_date,
  title text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_journal_entries_business_id on journal_entries(business_id);
create index idx_journal_entries_date on journal_entries(date);

-- ----------------------------------------------------------------------------
-- Tasks (My Todo)
-- ----------------------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  assigned_staff_id uuid references staff(id) on delete set null,
  priority task_priority not null default 'medium',
  status task_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_business_id on tasks(business_id);
create index idx_tasks_assigned_staff_id on tasks(assigned_staff_id);
create index idx_tasks_status on tasks(status);

-- ----------------------------------------------------------------------------
-- Marketing (V1: structure + basic management UI only)
-- ----------------------------------------------------------------------------
create table marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  type text not null default 'offer', -- offer | promo_code | campaign
  description text,
  is_active boolean not null default true,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_marketing_campaigns_business_id on marketing_campaigns(business_id);

create table gift_cards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  code text not null,
  initial_balance numeric(10,3) not null,
  current_balance numeric(10,3) not null,
  customer_id uuid references customers(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, code)
);

create index idx_gift_cards_business_id on gift_cards(business_id);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,3) not null default 0,
  duration_months integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_memberships_business_id on memberships(business_id);

-- ----------------------------------------------------------------------------
-- updated_at auto-touch trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array[
    'businesses','profiles','branches','staff','customers','services',
    'appointments','products','sales','expenses','journal_entries','tasks'
  ]
  loop
    execute format(
      'create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();',
      t
    );
  end loop;
end $$;
