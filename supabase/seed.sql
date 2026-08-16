-- ============================================================================
-- Development seed data
-- Creates "Demo Salon" with one branch, four staff members, a realistic
-- service menu, a few customers, and appointments spread across today and the
-- next couple of days so the calendar has something to show.
--
-- Signing up through /login links your login to this salon automatically
-- (see supabase/migrations/0010_auth_bootstrap.sql) — no manual SQL needed.
-- ============================================================================

do $$
declare
  v_tz text := 'Asia/Kuwait'; -- must match NEXT_PUBLIC_SALON_TIMEZONE

  v_business_id uuid;
  v_branch_id uuid;

  v_staff_sarah uuid;
  v_staff_maria uuid;
  v_staff_anna uuid;
  v_staff_jenny uuid;

  v_cat_nails uuid;
  v_cat_hair uuid;
  v_cat_massage uuid;
  v_cat_brows uuid;
  v_cat_bath uuid;

  v_svc_gel_mani uuid;
  v_svc_gel_pedi uuid;
  v_svc_classic_mani uuid;
  v_svc_classic_pedi uuid;
  v_svc_blowdry uuid;
  v_svc_hair_treatment uuid;
  v_svc_massage60 uuid;
  v_svc_moroccan_bath uuid;
  v_svc_brow_lam uuid;
  v_svc_lash_lift uuid;

  v_cust_1 uuid;
  v_cust_2 uuid;
  v_cust_3 uuid;
  v_cust_4 uuid;
  v_cust_5 uuid;
  v_cust_6 uuid;

  v_today date := (now() at time zone v_tz)::date;

  v_row record;
  v_appointment_id uuid;
  v_duration integer;
  v_price numeric(10,3);
begin
  -- Business + branch ---------------------------------------------------------
  insert into businesses (name, currency) values ('Demo Salon', 'KWD')
    returning id into v_business_id;

  insert into branches (business_id, name, address, phone, is_active, opening_hours)
  values (
    v_business_id, 'Main Branch', 'Salmiya, Kuwait', '+965 2222 3333', true,
    '{"sun":{"open":"10:00","close":"22:00"},"mon":{"open":"10:00","close":"22:00"},
      "tue":{"open":"10:00","close":"22:00"},"wed":{"open":"10:00","close":"22:00"},
      "thu":{"open":"10:00","close":"22:00"},"fri":{"open":"14:00","close":"22:00"},
      "sat":{"open":"10:00","close":"22:00"}}'::jsonb
  ) returning id into v_branch_id;

  -- Staff ---------------------------------------------------------------------
  insert into staff (business_id, branch_id, full_name, phone, job_title, employment_status)
  values (v_business_id, v_branch_id, 'Sarah', '+965 5000 0001', 'Senior Nail Technician', 'active')
    returning id into v_staff_sarah;
  insert into staff (business_id, branch_id, full_name, phone, job_title, employment_status)
  values (v_business_id, v_branch_id, 'Maria', '+965 5000 0002', 'Hair Stylist', 'active')
    returning id into v_staff_maria;
  insert into staff (business_id, branch_id, full_name, phone, job_title, employment_status)
  values (v_business_id, v_branch_id, 'Anna', '+965 5000 0003', 'Massage Therapist', 'active')
    returning id into v_staff_anna;
  insert into staff (business_id, branch_id, full_name, phone, job_title, employment_status)
  values (v_business_id, v_branch_id, 'Jenny', '+965 5000 0004', 'Brows & Lashes Specialist', 'active')
    returning id into v_staff_jenny;

  -- Working hours: 10:00-19:00 every day except Friday -------------------------
  insert into staff_working_hours (staff_id, day_of_week, is_working, start_time, end_time)
  select s.id, d, true, '10:00', '19:00'
  from (values (v_staff_sarah),(v_staff_maria),(v_staff_anna),(v_staff_jenny)) as s(id)
  cross join generate_series(0,6) as d
  where d <> 5;

  insert into staff_working_hours (staff_id, day_of_week, is_working)
  select s.id, 5, false
  from (values (v_staff_sarah),(v_staff_maria),(v_staff_anna),(v_staff_jenny)) as s(id);

  -- Service categories --------------------------------------------------------
  insert into service_categories (business_id, name, sort_order) values (v_business_id, 'Nails', 1) returning id into v_cat_nails;
  insert into service_categories (business_id, name, sort_order) values (v_business_id, 'Hair', 2) returning id into v_cat_hair;
  insert into service_categories (business_id, name, sort_order) values (v_business_id, 'Massage', 3) returning id into v_cat_massage;
  insert into service_categories (business_id, name, sort_order) values (v_business_id, 'Brows & Lashes', 4) returning id into v_cat_brows;
  insert into service_categories (business_id, name, sort_order) values (v_business_id, 'Moroccan Bath', 5) returning id into v_cat_bath;

  -- Services ------------------------------------------------------------------
  insert into services (business_id, category_id, name, description, duration_minutes, price)
  values (v_business_id, v_cat_nails, 'Gel Manicure', 'Long-lasting gel polish with cuticle care.', 45, 8.000)
    returning id into v_svc_gel_mani;
  insert into services (business_id, category_id, name, description, duration_minutes, price)
  values (v_business_id, v_cat_nails, 'Gel Pedicure', 'Gel polish pedicure with foot spa.', 60, 10.000)
    returning id into v_svc_gel_pedi;
  insert into services (business_id, category_id, name, description, duration_minutes, price)
  values (v_business_id, v_cat_nails, 'Classic Manicure', 'Classic polish manicure.', 30, 5.000)
    returning id into v_svc_classic_mani;
  insert into services (business_id, category_id, name, description, duration_minutes, price)
  values (v_business_id, v_cat_nails, 'Classic Pedicure', 'Classic polish pedicure with foot spa.', 45, 7.000)
    returning id into v_svc_classic_pedi;
  insert into services (business_id, category_id, name, description, duration_minutes, price)
  values (v_business_id, v_cat_hair, 'Hair Blow Dry', 'Wash and professional blow dry styling.', 45, 9.000)
    returning id into v_svc_blowdry;
  insert into services (business_id, category_id, name, description, duration_minutes, price)
  values (v_business_id, v_cat_hair, 'Hair Treatment', 'Deep conditioning nourishing treatment.', 60, 15.000)
    returning id into v_svc_hair_treatment;
  insert into services (business_id, category_id, name, description, duration_minutes, price)
  values (v_business_id, v_cat_massage, 'Full Body Massage 60 min', 'Relaxing full body massage.', 60, 18.000)
    returning id into v_svc_massage60;
  insert into services (business_id, category_id, name, description, duration_minutes, price)
  values (v_business_id, v_cat_bath, 'Moroccan Bath', 'Traditional exfoliating hammam ritual.', 75, 20.000)
    returning id into v_svc_moroccan_bath;
  insert into services (business_id, category_id, name, description, duration_minutes, price)
  values (v_business_id, v_cat_brows, 'Brow Lamination', 'Fuller, fluffed, laminated brows.', 40, 12.000)
    returning id into v_svc_brow_lam;
  insert into services (business_id, category_id, name, description, duration_minutes, price)
  values (v_business_id, v_cat_brows, 'Lash Lift', 'Natural curl and lift for lashes.', 45, 12.000)
    returning id into v_svc_lash_lift;

  -- Who can perform what ------------------------------------------------------
  insert into staff_services (staff_id, service_id) values
    (v_staff_sarah, v_svc_gel_mani), (v_staff_sarah, v_svc_gel_pedi),
    (v_staff_sarah, v_svc_classic_mani), (v_staff_sarah, v_svc_classic_pedi),
    (v_staff_maria, v_svc_blowdry), (v_staff_maria, v_svc_hair_treatment),
    (v_staff_anna, v_svc_massage60), (v_staff_anna, v_svc_moroccan_bath),
    (v_staff_jenny, v_svc_brow_lam), (v_staff_jenny, v_svc_lash_lift);

  -- Customers -----------------------------------------------------------------
  insert into customers (business_id, full_name, phone, email, notes) values
    (v_business_id, 'Fatima Al-Sabah', '+965 9900 1111', 'fatima@example.com', 'Prefers gel over classic.') returning id into v_cust_1;
  insert into customers (business_id, full_name, phone, email) values
    (v_business_id, 'Noor Al-Rashid', '+965 9900 2222', 'noor@example.com') returning id into v_cust_2;
  insert into customers (business_id, full_name, phone, email) values
    (v_business_id, 'Layla Hassan', '+965 9900 3333', 'layla@example.com') returning id into v_cust_3;
  insert into customers (business_id, full_name, phone) values
    (v_business_id, 'Reem Al-Ajmi', '+965 9900 4444') returning id into v_cust_4;
  insert into customers (business_id, full_name, phone) values
    (v_business_id, 'Dana Al-Otaibi', '+965 9900 5555') returning id into v_cust_5;
  insert into customers (business_id, full_name, phone) values
    (v_business_id, 'Mona Al-Fahad', '+965 9900 6666') returning id into v_cust_6;

  -- Appointments --------------------------------------------------------------
  -- End time and price always come from the service, exactly like the app does.
  for v_row in
    select * from (values
      (v_cust_6, v_staff_maria, v_svc_blowdry,          0, time '09:30', 'completed'),
      (v_cust_1, v_staff_sarah, v_svc_gel_mani,         0, time '10:00', 'confirmed'),
      (v_cust_2, v_staff_maria, v_svc_hair_treatment,   0, time '11:00', 'arrived'),
      (v_cust_3, v_staff_anna,  v_svc_massage60,        0, time '12:30', 'in_service'),
      (v_cust_4, v_staff_jenny, v_svc_brow_lam,         0, time '14:00', 'pending'),
      (v_cust_5, v_staff_sarah, v_svc_gel_pedi,         0, time '15:00', 'confirmed'),
      (v_cust_1, v_staff_jenny, v_svc_lash_lift,        1, time '10:00', 'confirmed'),
      (v_cust_2, v_staff_anna,  v_svc_moroccan_bath,    1, time '13:00', 'pending'),
      (v_cust_3, v_staff_sarah, v_svc_classic_pedi,     1, time '16:00', 'confirmed'),
      (v_cust_5, v_staff_maria, v_svc_blowdry,          2, time '11:00', 'confirmed'),
      (v_cust_6, v_staff_jenny, v_svc_brow_lam,         2, time '17:30', 'confirmed'),
      (v_cust_4, v_staff_anna,  v_svc_massage60,       -1, time '12:00', 'no_show')
    ) as t(customer_id, staff_id, service_id, day_offset, start_at, status)
  loop
    select duration_minutes, price into v_duration, v_price
    from services where id = v_row.service_id;

    insert into appointments (
      business_id, branch_id, customer_id, staff_id, start_time, end_time, status
    ) values (
      v_business_id,
      v_branch_id,
      v_row.customer_id,
      v_row.staff_id,
      ((v_today + v_row.day_offset) + v_row.start_at) at time zone v_tz,
      ((v_today + v_row.day_offset) + v_row.start_at + make_interval(mins => v_duration)) at time zone v_tz,
      v_row.status::appointment_status
    ) returning id into v_appointment_id;

    insert into appointment_services (appointment_id, service_id, price, duration_minutes)
    values (v_appointment_id, v_row.service_id, v_price, v_duration);
  end loop;

  raise notice 'Demo Salon business_id: %', v_business_id;
  raise notice 'Main Branch branch_id: %', v_branch_id;
end $$;
