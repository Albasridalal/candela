-- ============================================================================
-- 0008_overlap_guard.sql
-- The app checks for overlapping appointments before writing (both in the
-- staff calendar form and the public booking API), but a database-level
-- guard is what actually guarantees no double-booking under concurrent
-- requests. Cancelled appointments don't block new bookings.
-- ============================================================================

create extension if not exists "btree_gist";

alter table appointments
  add constraint appointments_no_staff_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(start_time, end_time) with &&
  )
  where (status <> 'cancelled');
