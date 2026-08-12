-- ============================================================================
-- 0007_customers_phone_unique.sql
-- Online bookings look customers up by phone number within the business.
-- This unique index is what makes "match, don't duplicate" possible and
-- race-safe (two simultaneous bookings with the same phone can't create
-- two separate customer rows).
-- ============================================================================

create unique index idx_customers_business_phone_unique
  on customers (business_id, phone)
  where phone is not null and phone <> '';
