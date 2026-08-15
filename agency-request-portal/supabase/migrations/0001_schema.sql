-- Agency Request Portal — core schema.
-- Design requests KFH Marketing sends to its external agency.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Editable reference lists
-- ---------------------------------------------------------------------------

create table if not exists public.work_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.designers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index if not exists designers_name_key on public.designers (lower(name));

-- ---------------------------------------------------------------------------
-- Requests
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.request_priority as enum ('High', 'Medium', 'Low');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.request_status as enum ('New', 'In Progress', 'Delivered');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.attachment_kind as enum ('reference', 'deliverable');
exception when duplicate_object then null;
end $$;

-- Human-readable reference (REQ-0001) shown in the UI and quoted in emails.
create sequence if not exists public.request_reference_seq;

create table if not exists public.requests (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique
                    default 'REQ-' || lpad(nextval('public.request_reference_seq')::text, 4, '0'),
  title           text not null check (length(btrim(title)) >= 3),
  brief           text,
  work_type_id    uuid references public.work_types (id) on delete set null,
  priority        public.request_priority not null default 'Medium',
  date_submitted  date not null default current_date,
  deadline        date,
  designer_id     uuid references public.designers (id) on delete set null,
  status          public.request_status not null default 'New',
  -- Stamped by trigger; never written by the application.
  delivered_at    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists requests_status_idx on public.requests (status);
create index if not exists requests_deadline_idx on public.requests (deadline);
create index if not exists requests_designer_idx on public.requests (designer_id);

create table if not exists public.request_comments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (id) on delete cascade,
  author      text not null,
  body        text not null check (length(btrim(body)) > 0),
  created_at  timestamptz not null default now()
);

create index if not exists request_comments_request_idx
  on public.request_comments (request_id, created_at);

create table if not exists public.request_attachments (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests (id) on delete cascade,
  kind          public.attachment_kind not null default 'reference',
  file_name     text not null,
  mime_type     text,
  size_bytes    bigint,
  storage_path  text not null unique,
  created_at    timestamptz not null default now()
);

create index if not exists request_attachments_request_idx
  on public.request_attachments (request_id, created_at);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists requests_touch_updated_at on public.requests;
create trigger requests_touch_updated_at
  before update on public.requests
  for each row execute function public.touch_updated_at();

-- Keeps delivered_at truthful no matter where the status is changed from —
-- the app, Supabase Studio, or a direct SQL update.
create or replace function public.sync_delivered_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Delivered' then
    if new.delivered_at is null then
      new.delivered_at := current_date;
    end if;
  else
    new.delivered_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists requests_sync_delivered_at on public.requests;
create trigger requests_sync_delivered_at
  before insert or update of status on public.requests
  for each row execute function public.sync_delivered_at();
