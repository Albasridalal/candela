-- ============================================================================
-- 0011_grants.sql
-- Row Level Security decides which ROWS a caller may touch, but Postgres
-- still needs table-level privileges before RLS is ever consulted. Depending
-- on how the migrations are applied, the API roles can end up without them —
-- which surfaces as "permission denied for table ..." on every query.
--
-- These grants are explicit so a freshly migrated database behaves the same
-- everywhere. `anon` is deliberately left out: the public booking page never
-- talks to the database directly, it goes through the server routes in
-- src/app/api/public/** which use the service role.
-- ============================================================================

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

grant execute on all functions in schema public to authenticated, service_role;

-- Anything created by a later migration inherits the same privileges.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to authenticated, service_role;
