-- ============================================================================
-- CraftCV — Supabase schema  (run in SQL Editor or `supabase db push`)
-- ============================================================================
-- Tables
--   profiles           one row per auth user (name, email, role, last seen)
--   resumes            every resume of every user (full JSON + indexed columns)
--   resume_downloads   one row per PDF download (analytics)
--   events             generic product events
--   template_catalog   the 80 templates (seeded from src/lib/templates.ts by
--                      scripts/seed-templates.mjs) — usage stats join on it
-- Security
--   RLS on every table. Users only see their own rows. `admin` role sees all.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;


-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  provider      text not null default 'email' check (provider in ('email','google')),
  role          text not null default 'user'  check (role in ('user','admin')),
  city          text,
  phone         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);
create unique index if not exists profiles_email_idx on public.profiles (lower(email));
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create a profile when a user signs up (email or Google)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, provider)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    case when new.raw_app_meta_data->>'provider' = 'google' then 'google' else 'email' end
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- is_admin() — defined after profiles exists (plpgsql, so body is not validated early)
create or replace function public.is_admin()
returns boolean language plpgsql stable security definer set search_path = public as $$
declare r text;
begin
  select role into r from public.profiles where id = auth.uid();
  return coalesce(r = 'admin', false);
end $$;

alter table public.profiles enable row level security;
drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
drop policy if exists "profiles: admin all"  on public.profiles;
create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles p where p.id = auth.uid())); -- users cannot promote themselves
create policy "profiles: admin all"  on public.profiles for all using (public.is_admin());

-- ---------------------------------------------------------------------------
-- template_catalog  (the sellable asset — one row per template)
-- ---------------------------------------------------------------------------
create table if not exists public.template_catalog (
  id           text primary key,                -- e.g. 'portrait-navy'
  name         text not null,
  layout       text not null,                   -- split | classic | ... | corporate
  family_label text not null,                   -- 'Portrait', 'Studio', ...
  tagline      text,
  best_for     text[] not null default '{}',
  strengths    text[] not null default '{}',
  palette      jsonb not null default '{}'::jsonb,
  mods         text[] not null default '{}',
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists template_catalog_updated_at on public.template_catalog;
create trigger template_catalog_updated_at before update on public.template_catalog
  for each row execute function public.set_updated_at();
alter table public.template_catalog enable row level security;
drop policy if exists "catalog: read all"    on public.template_catalog;
drop policy if exists "catalog: admin write" on public.template_catalog;
create policy "catalog: read all"    on public.template_catalog for select using (true);
create policy "catalog: admin write" on public.template_catalog for all using (public.is_admin());

-- ---------------------------------------------------------------------------
-- resumes  (every resume of every user lives here)
-- ---------------------------------------------------------------------------
create table if not exists public.resumes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  client_id     text not null,                  -- id generated in the browser (stable across sync)
  name          text not null default 'Untitled resume',
  field_id      text not null default 'it',     -- career field (it, data, marketing, ...)
  template_id   text not null default 'modern',
  completeness  smallint not null default 0 check (completeness between 0 and 100),
  data          jsonb not null,                 -- the full Resume object (see src/lib/types.ts)
  is_deleted    boolean not null default false,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, client_id)
);
create index if not exists resumes_user_idx      on public.resumes (user_id, is_deleted, updated_at desc);
create index if not exists resumes_template_idx  on public.resumes (template_id);
create index if not exists resumes_field_idx     on public.resumes (field_id);
create index if not exists resumes_data_gin      on public.resumes using gin (data jsonb_path_ops);
drop trigger if exists resumes_updated_at on public.resumes;
create trigger resumes_updated_at before update on public.resumes
  for each row execute function public.set_updated_at();

-- keep the indexed columns in sync with the JSON, whatever the client sends
create or replace function public.resumes_sync_columns()
returns trigger language plpgsql as $$
begin
  new.name        := coalesce(nullif(new.data->>'name',''), new.name, 'Untitled resume');
  new.field_id    := coalesce(nullif(new.data->>'fieldId',''), new.field_id);
  new.template_id := coalesce(nullif(new.data->>'templateId',''), new.template_id);
  return new;
end $$;
drop trigger if exists resumes_sync_columns on public.resumes;
create trigger resumes_sync_columns before insert or update on public.resumes
  for each row execute function public.resumes_sync_columns();

alter table public.resumes enable row level security;
drop policy if exists "resumes: select own" on public.resumes;
drop policy if exists "resumes: insert own" on public.resumes;
drop policy if exists "resumes: update own" on public.resumes;
drop policy if exists "resumes: delete own" on public.resumes;
drop policy if exists "resumes: admin all"  on public.resumes;
create policy "resumes: select own" on public.resumes for select using (auth.uid() = user_id);
create policy "resumes: insert own" on public.resumes for insert with check (auth.uid() = user_id);
create policy "resumes: update own" on public.resumes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "resumes: delete own" on public.resumes for delete using (auth.uid() = user_id);
create policy "resumes: admin all"  on public.resumes for all using (public.is_admin());

-- ---------------------------------------------------------------------------
-- resume_downloads
-- ---------------------------------------------------------------------------
create table if not exists public.resume_downloads (
  id           bigint generated always as identity primary key,
  user_id      uuid references auth.users(id) on delete set null,
  client_id    text,
  template_id  text,
  field_id     text,
  created_at   timestamptz not null default now()
);
create index if not exists downloads_user_idx     on public.resume_downloads (user_id, created_at desc);
create index if not exists downloads_template_idx on public.resume_downloads (template_id);
alter table public.resume_downloads enable row level security;
drop policy if exists "downloads: insert own" on public.resume_downloads;
drop policy if exists "downloads: select own" on public.resume_downloads;
drop policy if exists "downloads: admin all"  on public.resume_downloads;
create policy "downloads: insert own" on public.resume_downloads for insert with check (auth.uid() = user_id);
create policy "downloads: select own" on public.resume_downloads for select using (auth.uid() = user_id);
create policy "downloads: admin all"  on public.resume_downloads for all using (public.is_admin());

-- ---------------------------------------------------------------------------
-- events  (generic analytics)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists events_type_idx on public.events (type, created_at desc);
create index if not exists events_user_idx on public.events (user_id, created_at desc);
alter table public.events enable row level security;
drop policy if exists "events: insert own" on public.events;
drop policy if exists "events: admin read" on public.events;
create policy "events: insert own" on public.events for insert with check (user_id is null or auth.uid() = user_id);
create policy "events: admin read" on public.events for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- account deletion (GDPR / DPDP) — callable by the user, deletes everything
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.resume_downloads where user_id = uid;
  delete from public.events           where user_id = uid;
  delete from public.resumes          where user_id = uid;
  delete from public.profiles         where id = uid;
  delete from auth.users              where id = uid;
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- purge soft-deleted resumes older than 30 days (call from pg_cron or manually)
-- ---------------------------------------------------------------------------
create or replace function public.purge_deleted_resumes()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.resumes where is_deleted and deleted_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;
-- Optional (needs pg_cron extension enabled in Dashboard → Database → Extensions):
-- select cron.schedule('purge-deleted-resumes', '0 3 * * *', $$select public.purge_deleted_resumes()$$);

-- ---------------------------------------------------------------------------
-- admin views (only admins can read the underlying tables → views inherit RLS)
-- ---------------------------------------------------------------------------
create or replace view public.admin_overview as
select
  (select count(*) from public.profiles)                                   as users,
  (select count(*) from public.profiles where created_at > now() - interval '7 days') as users_7d,
  (select count(*) from public.resumes where not is_deleted)               as resumes,
  (select count(*) from public.resumes where not is_deleted and completeness = 100) as resumes_complete,
  (select count(*) from public.resume_downloads)                           as downloads,
  (select count(*) from public.resume_downloads where created_at > now() - interval '7 days') as downloads_7d;

create or replace view public.admin_template_usage as
select
  c.id            as template_id,
  c.name,
  c.family_label,
  c.layout,
  count(distinct r.id) filter (where not r.is_deleted) as resumes_using,
  count(d.id)                                          as downloads
from public.template_catalog c
left join public.resumes r          on r.template_id = c.id
left join public.resume_downloads d on d.template_id = c.id
group by c.id, c.name, c.family_label, c.layout
order by downloads desc, resumes_using desc;

create or replace view public.admin_resumes as
select
  r.id, r.client_id, r.user_id, p.email, p.full_name as owner,
  r.name, r.field_id, r.template_id, r.completeness,
  r.data->'personal'->>'fullName' as candidate_name,
  r.data->'personal'->>'headline' as headline,
  r.data->'personal'->>'city'     as city,
  r.is_deleted, r.created_at, r.updated_at
from public.resumes r
join public.profiles p on p.id = r.user_id
order by r.updated_at desc;

-- ---------------------------------------------------------------------------
-- realtime (optional: live dashboard updates)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.resumes;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- make the first admin (replace the email, run once)
-- ---------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where lower(email) = 'you@example.com';
