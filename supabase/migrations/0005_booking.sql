-- ============================================================================
-- 0005_booking.sql
-- Adds what the public online booking flow and staff availability need:
--  - a short unique reference number shown to customers after booking
--  - a "source" flag so staff-created vs. self-booked appointments are visible
--  - a staff_time_off table for breaks / vacations, checked during availability
-- ============================================================================

create type appointment_source as enum ('staff', 'online');

alter table appointments
  add column booking_reference text,
  add column source appointment_source not null default 'staff';

create unique index idx_appointments_booking_reference on appointments(booking_reference)
  where booking_reference is not null;

create table staff_time_off (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint staff_time_off_range check (end_date >= start_date)
);

create index idx_staff_time_off_staff_id on staff_time_off(staff_id, start_date, end_date);

alter table staff_time_off enable row level security;

create policy staff_time_off_all on staff_time_off
  for all using (staff_id in (select id from staff where business_id = auth_business_id()))
  with check (staff_id in (select id from staff where business_id = auth_business_id()));

-- Generates a short, human-friendly booking reference like "SL-7F3K2Q".
create or replace function generate_booking_reference()
returns text
language sql
as $$
  select 'SL-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
$$;
