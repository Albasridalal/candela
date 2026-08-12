-- ============================================================================
-- Views used by the Customers list, Customer profile, and Reports pages.
-- Views inherit RLS from their underlying tables automatically.
-- ============================================================================

create or replace view customer_stats as
select
  c.id as customer_id,
  c.business_id,
  count(distinct a.id) filter (where a.status = 'completed') as total_visits,
  max(a.start_time) as last_appointment_at,
  coalesce(sum(s.total), 0) as total_spend
from customers c
left join appointments a on a.customer_id = c.id
left join sales s on s.customer_id = c.id
group by c.id, c.business_id;

create or replace view daily_sales_summary as
select
  business_id,
  branch_id,
  date(created_at) as sale_date,
  count(*) as sale_count,
  coalesce(sum(total), 0) as total_sales
from sales
group by business_id, branch_id, date(created_at);
