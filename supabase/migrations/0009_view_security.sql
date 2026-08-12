-- ============================================================================
-- 0009_view_security.sql
-- Bug fix: views created via the SQL editor / migrations are owned by a
-- privileged role. In Postgres, a view queries its underlying tables using
-- the VIEW OWNER's privileges by default — which silently bypasses Row
-- Level Security for anyone who queries the view, defeating the whole
-- point of 0002_rls.sql for these two views.
--
-- security_invoker = true (Postgres 15+, which Supabase runs) makes the
-- view use the querying user's own privileges instead, so RLS is enforced
-- exactly as it is for the underlying tables.
-- ============================================================================

alter view customer_stats set (security_invoker = true);
alter view daily_sales_summary set (security_invoker = true);
