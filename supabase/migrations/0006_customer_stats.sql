-- ============================================================================
-- 0006_customer_stats.sql
-- Replaces the earlier customer_stats view with the fuller picture the
-- customer profile page needs: first/last visit, cancellations, no-shows,
-- and the customer's most-booked service and staff member.
-- ============================================================================

drop view if exists customer_stats;

create or replace view customer_stats as
with appt_counts as (
  select
    a.customer_id,
    count(*) filter (where a.status = 'completed') as total_visits,
    count(*) filter (where a.status = 'cancelled') as cancelled_count,
    count(*) filter (where a.status = 'no_show') as no_show_count,
    min(a.start_time) filter (where a.status = 'completed') as first_visit_at,
    max(a.start_time) filter (where a.status = 'completed') as last_visit_at
  from appointments a
  group by a.customer_id
),
service_counts as (
  select customer_id, service_name, cnt,
         row_number() over (partition by customer_id order by cnt desc) as rn
  from (
    select a.customer_id, sv.name as service_name, count(*) as cnt
    from appointments a
    join appointment_services aps on aps.appointment_id = a.id
    join services sv on sv.id = aps.service_id
    where a.status = 'completed'
    group by a.customer_id, sv.name
  ) x
),
staff_counts as (
  select customer_id, staff_name, cnt,
         row_number() over (partition by customer_id order by cnt desc) as rn
  from (
    select a.customer_id, st.full_name as staff_name, count(*) as cnt
    from appointments a
    join staff st on st.id = a.staff_id
    where a.status = 'completed'
    group by a.customer_id, st.full_name
  ) x
),
spend as (
  select customer_id, coalesce(sum(total), 0) as total_spend
  from sales
  where customer_id is not null
  group by customer_id
)
select
  c.id as customer_id,
  c.business_id,
  coalesce(ac.total_visits, 0) as total_visits,
  coalesce(ac.cancelled_count, 0) as cancelled_count,
  coalesce(ac.no_show_count, 0) as no_show_count,
  ac.first_visit_at,
  ac.last_visit_at,
  ac.last_visit_at as last_appointment_at, -- kept for backward compatibility
  sc.service_name as preferred_service,
  stc.staff_name as preferred_staff,
  coalesce(sp.total_spend, 0) as total_spend
from customers c
left join appt_counts ac on ac.customer_id = c.id
left join service_counts sc on sc.customer_id = c.id and sc.rn = 1
left join staff_counts stc on stc.customer_id = c.id and stc.rn = 1
left join spend sp on sp.customer_id = c.id;
