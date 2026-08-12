-- ============================================================================
-- Row Level Security
-- Every business-owned table is isolated by business_id, resolved from the
-- signed-in user's profile. No table is left publicly readable/writable.
-- ============================================================================

-- Helper: the caller's business_id, read from their own profile row.
-- SECURITY DEFINER + fixed search_path so it can read profiles regardless of
-- the RLS policy on profiles itself, without being hijackable.
create or replace function auth_business_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select business_id from profiles where id = auth.uid();
$$;

-- Helper: the caller's role.
create or replace function auth_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid();
$$;

alter table businesses enable row level security;
alter table profiles enable row level security;
alter table branches enable row level security;
alter table staff enable row level security;
alter table staff_working_hours enable row level security;
alter table customers enable row level security;
alter table service_categories enable row level security;
alter table services enable row level security;
alter table staff_services enable row level security;
alter table appointments enable row level security;
alter table appointment_services enable row level security;
alter table suppliers enable row level security;
alter table product_categories enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table payments enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;
alter table journal_entries enable row level security;
alter table tasks enable row level security;
alter table marketing_campaigns enable row level security;
alter table gift_cards enable row level security;
alter table memberships enable row level security;

-- businesses: a user may only see their own business row.
create policy businesses_select on businesses
  for select using (id = auth_business_id());
create policy businesses_update on businesses
  for update using (id = auth_business_id() and auth_role() in ('owner'));

-- profiles: users see/manage profiles within their own business.
create policy profiles_select on profiles
  for select using (business_id = auth_business_id());
create policy profiles_insert on profiles
  for insert with check (business_id = auth_business_id() or id = auth.uid());
create policy profiles_update on profiles
  for update using (id = auth.uid() or (business_id = auth_business_id() and auth_role() in ('owner','manager')));

-- Generic pattern applied to every remaining business-owned table:
--   SELECT/INSERT/UPDATE/DELETE allowed only when business_id matches the
--   caller's own business_id. Write access is broadly allowed to any
--   authenticated member of the business for V1; tighten per-role later.

create policy branches_all on branches
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy staff_all on staff
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy staff_working_hours_all on staff_working_hours
  for all using (staff_id in (select id from staff where business_id = auth_business_id()))
  with check (staff_id in (select id from staff where business_id = auth_business_id()));

create policy customers_all on customers
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy service_categories_all on service_categories
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy services_all on services
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy staff_services_all on staff_services
  for all using (staff_id in (select id from staff where business_id = auth_business_id()))
  with check (staff_id in (select id from staff where business_id = auth_business_id()));

create policy appointments_all on appointments
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy appointment_services_all on appointment_services
  for all using (appointment_id in (select id from appointments where business_id = auth_business_id()))
  with check (appointment_id in (select id from appointments where business_id = auth_business_id()));

create policy suppliers_all on suppliers
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy product_categories_all on product_categories
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy products_all on products
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy sales_all on sales
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy sale_items_all on sale_items
  for all using (sale_id in (select id from sales where business_id = auth_business_id()))
  with check (sale_id in (select id from sales where business_id = auth_business_id()));

create policy payments_all on payments
  for all using (sale_id in (select id from sales where business_id = auth_business_id()))
  with check (sale_id in (select id from sales where business_id = auth_business_id()));

create policy expense_categories_all on expense_categories
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy expenses_all on expenses
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy journal_entries_all on journal_entries
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy tasks_all on tasks
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy marketing_campaigns_all on marketing_campaigns
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy gift_cards_all on gift_cards
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());

create policy memberships_all on memberships
  for all using (business_id = auth_business_id()) with check (business_id = auth_business_id());
