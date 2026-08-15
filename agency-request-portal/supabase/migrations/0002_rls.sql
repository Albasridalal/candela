-- Row level security.
--
-- The portal is an internal tool: every signed-in KFH marketing user is an
-- account manager and may see and edit all requests. Anonymous visitors get
-- nothing. Phase 2 (a read-only link for the agency) would add a separate
-- policy for a dedicated role rather than loosening these.

alter table public.work_types          enable row level security;
alter table public.designers           enable row level security;
alter table public.requests            enable row level security;
alter table public.request_comments    enable row level security;
alter table public.request_attachments enable row level security;

do $$
declare
  target text;
begin
  foreach target in array array[
    'work_types', 'designers', 'requests', 'request_comments', 'request_attachments'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', target || '_authenticated_all', target);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      target || '_authenticated_all',
      target
    );
  end loop;
end $$;
