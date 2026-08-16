-- ============================================================================
-- 0010_auth_bootstrap.sql
-- Signing up used to leave you stranded: Supabase Auth created the user, but
-- nothing created the matching `profiles` row, so every page showed the
-- "account not linked" notice until someone ran SQL by hand.
--
-- This trigger links every new login to the salon automatically:
--   * first user ever  -> creates the business + a default branch, role owner
--   * everyone after   -> joins the same business as owner (this app is used
--                         by a small salon team, all of whom are admins)
-- ============================================================================

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_branch_count integer;
begin
  select id into v_business_id from businesses order by created_at limit 1;

  if v_business_id is null then
    insert into businesses (name, currency) values ('My Salon', 'KWD')
    returning id into v_business_id;
  end if;

  select count(*) into v_branch_count from branches where business_id = v_business_id;

  if v_branch_count = 0 then
    insert into branches (business_id, name, opening_hours)
    values (
      v_business_id,
      'Main Branch',
      '{"sun":{"open":"10:00","close":"21:00"},
        "mon":{"open":"10:00","close":"21:00"},
        "tue":{"open":"10:00","close":"21:00"},
        "wed":{"open":"10:00","close":"21:00"},
        "thu":{"open":"10:00","close":"21:00"},
        "fri":{"open":"14:00","close":"21:00"},
        "sat":{"open":"10:00","close":"21:00"}}'::jsonb
    );
  end if;

  insert into profiles (id, business_id, full_name, email, role)
  values (
    new.id,
    v_business_id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    'owner'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- Backfill: any existing login without a profile gets linked the same way.
-- ----------------------------------------------------------------------------
do $$
declare
  v_business_id uuid;
  v_user record;
begin
  select id into v_business_id from businesses order by created_at limit 1;
  if v_business_id is null then
    return;
  end if;

  for v_user in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    left join profiles p on p.id = u.id
    where p.id is null
  loop
    insert into profiles (id, business_id, full_name, email, role)
    values (
      v_user.id,
      v_business_id,
      coalesce(nullif(v_user.raw_user_meta_data ->> 'full_name', ''), split_part(v_user.email, '@', 1)),
      v_user.email,
      'owner'
    )
    on conflict (id) do nothing;
  end loop;
end $$;
