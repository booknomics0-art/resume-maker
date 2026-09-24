-- CraftCV: ALL-IN-ONE setup. Paste this whole file in Supabase SQL Editor → Run (safe to re-run).

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

-- ======================= template catalog seed =======================
-- generated by scripts/seed-templates.mjs — do not edit by hand
insert into public.template_catalog (id, name, layout, family_label, tagline, best_for, strengths, palette, mods, sort_order, is_active) values
  ('modern', 'Modern Split', 'split', 'Sidebar', 'Navy sidebar, silver accents. The safe, impressive choice.', array['it','data','design','marketing']::text[], array['Skills always visible','Great for 1-page scans','Strong first impression']::text[], '{"p":"#0f2148","p2":"#16305f","p3":"#1e4076","pm":"#33507e","a":"#c9d2de"}'::jsonb, array[]::text[], 0, true),
  ('slate-split', 'Slate Split', 'split', 'Sidebar', 'Cool slate sidebar with steel accents. Corporate-calm.', array['it','data','operations','sales']::text[], array['Neutral for any industry','Reads sharp in print','Calm, zero distraction']::text[], '{"p":"#333d4d","p2":"#3f4b5e","p3":"#4d5b72","pm":"#5d6d87","a":"#b8c2d1"}'::jsonb, array[]::text[], 1, true),
  ('charcoal-split', 'Charcoal Split', 'split', 'Sidebar', 'Soft black sidebar, warm gray details. Modern serious.', array['it','data','sales','finance']::text[], array['High contrast, low noise','Good for dense skill lists','Ageless look']::text[], '{"p":"#232833","p2":"#2c3341","p3":"#384152","pm":"#4a5468","a":"#a7b0bf"}'::jsonb, array[]::text[], 2, true),
  ('onyx-gold', 'Onyx & Gold', 'split', 'Sidebar', 'Black sidebar with a single gold accent. Premium, confident.', array['design','it','marketing']::text[], array['Stands out in a stack','One accent, zero clutter','Great for founders & creators']::text[], '{"p":"#17181c","p2":"#202229","p3":"#2b2e37","pm":"#3a3e4a","a":"#c9a227"}'::jsonb, array[]::text[], 3, true),
  ('forest-split', 'Forest Split', 'split', 'Sidebar', 'Deep green sidebar, sage accents. Steady and trustworthy.', array['finance','healthcare','operations','education']::text[], array['Trustworthy for client-facing roles','Distinct without being loud','Prints cleanly on A4']::text[], '{"p":"#17362a","p2":"#1e4534","p3":"#275541","pm":"#35684f","a":"#bdd5c6"}'::jsonb, array[]::text[], 4, true),
  ('ocean-split', 'Ocean Split', 'split', 'Sidebar', 'Teal-navy sidebar, cool accents. Fresh but professional.', array['it','marketing','data','design']::text[], array['Fresh for startup resumes','Calm color, clear structure','Skills front and center']::text[], '{"p":"#0e3d46","p2":"#14505d","p3":"#1a6474","pm":"#27788a","a":"#b3d2d8"}'::jsonb, array[]::text[], 5, true),
  ('bordeaux-split', 'Bordeaux Split', 'split', 'Sidebar', 'Deep wine sidebar, rose accents. Warm authority.', array['sales','finance','hr','marketing']::text[], array['Warm, memorable, mature','Works for client-facing careers','Distinct in recruiter stacks']::text[], '{"p":"#4d1828","p2":"#5f2135","p3":"#732c44","pm":"#8a3a56","a":"#d9b7c1"}'::jsonb, array[]::text[], 6, true),
  ('plum-split', 'Plum Split', 'split', 'Sidebar', 'Deep purple sidebar, orchid accents. Creative but composed.', array['design','marketing','it']::text[], array['Creative without candy colors','Strong first impression','Skills always visible']::text[], '{"p":"#37194d","p2":"#462361","p3":"#582f79","pm":"#6d4192","a":"#cdb4de"}'::jsonb, array[]::text[], 7, true),
  ('bronze-split', 'Bronze Split', 'split', 'Sidebar', 'Warm bronze sidebar, tan accents. Heritage tone.', array['operations','finance','hr','education']::text[], array['Warm and grounded','Good for senior traditional roles','Distinct from navy stacks']::text[], '{"p":"#4d2f1c","p2":"#5f3c25","p3":"#72492f","pm":"#8a5c3d","a":"#ddc1a9"}'::jsonb, array[]::text[], 8, true),
  ('ivory-split', 'Ivory Split', 'split', 'Sidebar', 'Light sidebar, steel-navy ink. The quiet opposite of a dark resume.', array['education','healthcare','hr','finance']::text[], array['Bright page, low ink use','Calm for long histories','Great for older reviewers']::text[], '{"p":"#33507e","p2":"#44658f","p3":"#55779f","pm":"#6b89a8","a":"#9fb0c8"}'::jsonb, array['mod-invert']::text[], 9, true),
  ('classic', 'Executive Classic', 'classic', 'Classic', 'Serif headings, generous spacing. Boardroom-ready.', array['finance','operations','sales','hr']::text[], array['Loved by senior reviewers','Reads authoritative','Conservative industries']::text[], '{"p":"#0f2148","a":"#c9d2de"}'::jsonb, array[]::text[], 10, true),
  ('oxford', 'Oxford Classic', 'classic', 'Classic', 'Wine double rules, serif elegance. Old-school weight.', array['finance','sales','hr']::text[], array['Authoritative for finance','Distinct from navy classics','Traditional, not boring']::text[], '{"p":"#4d1828","a":"#d9b7c1"}'::jsonb, array[]::text[], 11, true),
  ('ivy-league', 'Ivy League', 'classic', 'Classic', 'Forest green rules, serif structure. Ivy without the varsity.', array['education','finance','operations']::text[], array['Scholarly tone','Strong for academic paths','Calm and confident']::text[], '{"p":"#17362a","a":"#bdd5c6"}'::jsonb, array[]::text[], 12, true),
  ('aubergine', 'Aubergine', 'classic', 'Classic', 'Deep plum serif. Formal with a creative undertone.', array['design','hr','marketing','sales']::text[], array['Formal yet distinctive','Good for creative management','Elegant on one page']::text[], '{"p":"#37194d","a":"#cdb4de"}'::jsonb, array[]::text[], 13, true),
  ('midnight-serif', 'Midnight Serif', 'classic', 'Classic', 'Near-black ink, gold double rule. The most formal we make.', array['finance','operations','hr','sales']::text[], array['Maximum gravitas','Gold rule reads premium','Boardroom-safe']::text[], '{"p":"#17181c","a":"#c9a227"}'::jsonb, array[]::text[], 14, true),
  ('slate-classic', 'Slate Classic', 'classic', 'Classic', 'Graphite rules, understated serif. Serious, current.', array['operations','finance','sales','data']::text[], array['Modern take on classic','Neutral for any sector','Prints crisp']::text[], '{"p":"#333d4d","a":"#b8c2d1"}'::jsonb, array[]::text[], 15, true),
  ('copperplate', 'Copperplate', 'classic', 'Classic', 'Bronze rules, warm serif. Heritage and warmth.', array['hr','operations','education','sales']::text[], array['Warm, human tone','Good for people-facing roles','Distinct from navy']::text[], '{"p":"#4d2f1c","a":"#ddc1a9"}'::jsonb, array[]::text[], 16, true),
  ('marine', 'Marine Classic', 'classic', 'Classic', 'Deep teal rules, serif formality. Navy’s cooler cousin.', array['sales','finance','it','operations']::text[], array['Distinct among navy resumes','Calm, professional color','Serif structure scans well']::text[], '{"p":"#0e3d46","a":"#b3d2d8"}'::jsonb, array[]::text[], 17, true),
  ('ivory-serif', 'Ivory Serif', 'classic', 'Classic', 'Warm taupe rules, soft contrast. The quietest classic.', array['education','healthcare','hr','finance']::text[], array['Gentle on the eye','Low-contrast, high readability','Works for long documents']::text[], '{"p":"#57493b","a":"#cfc4b2"}'::jsonb, array[]::text[], 18, true),
  ('graphite-classic', 'Graphite Classic', 'classic', 'Classic', 'Charcoal rules, sharp serif. Classic, but darker.', array['finance','operations','sales','data']::text[], array['Darker, more modern classic','Strong name presence','Boardroom-safe']::text[], '{"p":"#2e3138","a":"#b4bac4"}'::jsonb, array[]::text[], 19, true),
  ('minimal', 'Sharp Minimal', 'minimal', 'Minimal', 'Airy, quiet, confident. Lets your numbers speak.', array['design','education','healthcare']::text[], array['Very clean scan','Works with less content','Timeless look']::text[], '{"p":"#76839a","a":"#e4e9f0"}'::jsonb, array[]::text[], 20, true),
  ('ink-minimal', 'Ink Minimal', 'minimal', 'Minimal', 'Near-black type, faint rules. Maximum quiet.', array['design','data','it']::text[], array['Very modern, very calm','Great for 1-page designs','Type does the talking']::text[], '{"p":"#2b3446","a":"#dfe5ee"}'::jsonb, array[]::text[], 21, true),
  ('steel-minimal', 'Steel Minimal', 'minimal', 'Minimal', 'Soft blue-gray accents. Minimal with a cool cast.', array['it','data','design']::text[], array['Cool, technical feel','Hairline structure','Easy to scan']::text[], '{"p":"#5b7699","a":"#d9e2ee"}'::jsonb, array[]::text[], 22, true),
  ('sage-minimal', 'Sage Minimal', 'minimal', 'Minimal', 'Muted green accents. Calm, natural, current.', array['healthcare','education','design']::text[], array['Soft, approachable tone','Good for care & education','Very readable']::text[], '{"p":"#6d8a77","a":"#dfe9e2"}'::jsonb, array[]::text[], 23, true),
  ('rust-minimal', 'Rust Minimal', 'minimal', 'Minimal', 'Warm terracotta accents. Minimal with personality.', array['design','marketing','operations']::text[], array['Warm without being loud','Distinct from gray stacks','Focus stays on content']::text[], '{"p":"#9a6a52","a":"#efe0d8"}'::jsonb, array[]::text[], 24, true),
  ('orchid-minimal', 'Orchid Minimal', 'minimal', 'Minimal', 'Dusty purple accents. Minimal, a touch creative.', array['design','marketing','it']::text[], array['Creative, not candy','Quiet structure','Strong name presence']::text[], '{"p":"#7d5f92","a":"#e8dfee"}'::jsonb, array[]::text[], 25, true),
  ('teal-minimal', 'Teal Minimal', 'minimal', 'Minimal', 'Quiet teal accents. Fresh minimal.', array['it','data','healthcare']::text[], array['Fresh, current feel','Hairline clarity','ATS-safe single column']::text[], '{"p":"#4f828c","a":"#d8e8ea"}'::jsonb, array[]::text[], 26, true),
  ('graphite-minimal', 'Graphite Minimal', 'minimal', 'Minimal', 'Darker gray, tighter air. Minimal for serious content.', array['data','operations','finance','education']::text[], array['Denser than typical minimal','Serious tone','Scans fast']::text[], '{"p":"#4a505c","a":"#dde1e7"}'::jsonb, array[]::text[], 27, true),
  ('editorial', 'Editorial', 'minimal', 'Minimal', 'Serif headings, hairline rules. The magazine look.', array['design','education','marketing']::text[], array['Magazine-grade typography','Distinct on the page','Timeless pairing']::text[], '{"p":"#33507e","a":"#d5dce6"}'::jsonb, array['mod-serif']::text[], 28, true),
  ('champagne-minimal', 'Champagne Minimal', 'minimal', 'Minimal', 'Soft gold accents. Minimal that feels premium.', array['design','finance','marketing']::text[], array['Premium feel, zero clutter','Gold stays subtle','Great one-pager']::text[], '{"p":"#9c7c3c","a":"#ece2cc"}'::jsonb, array[]::text[], 29, true),
  ('metro', 'Metro Two-Tone', 'metro', 'Statement', 'Bold navy header band with silver section chips.', array['marketing','sales','it']::text[], array['Memorable at a glance','Energetic but tidy','Good for startups']::text[], '{"p":"#0f2148","p2":"#16305f","p3":"#1e4076","pm":"#33507e","a":"#c9d2de"}'::jsonb, array[]::text[], 30, true),
  ('cobalt-metro', 'Cobalt Metro', 'metro', 'Statement', 'Brighter blue band. Bolder, more energetic.', array['marketing','sales','it','design']::text[], array['High energy, high polish','Stands out in stacks','Chips keep it organized']::text[], '{"p":"#1d3f94","p2":"#2551b8","p3":"#2f64d4","pm":"#4a76e0","a":"#c3d3f2"}'::jsonb, array[]::text[], 31, true),
  ('petrol-metro', 'Petrol Metro', 'metro', 'Statement', 'Deep teal band, cool chips. Modern industrial.', array['it','data','marketing']::text[], array['Distinct from navy','Strong header presence','Tidy section chips']::text[], '{"p":"#0e3d46","p2":"#14505d","p3":"#1a6474","pm":"#27788a","a":"#b3d2d8"}'::jsonb, array[]::text[], 32, true),
  ('charcoal-metro', 'Charcoal Metro', 'metro', 'Statement', 'Soft black band, gray chips. Bold, but sober.', array['sales','it','operations','finance']::text[], array['Bold without color noise','Very modern feel','Strong first line of sight']::text[], '{"p":"#232833","p2":"#2c3341","p3":"#384152","pm":"#4a5468","a":"#a7b0bf"}'::jsonb, array[]::text[], 33, true),
  ('bordeaux-metro', 'Bordeaux Metro', 'metro', 'Statement', 'Wine band, rose chips. Warm and confident.', array['marketing','sales','hr']::text[], array['Warm, memorable header','Distinct from blue stacks','Confident tone']::text[], '{"p":"#4d1828","p2":"#5f2135","p3":"#732c44","pm":"#8a3a56","a":"#d9b7c1"}'::jsonb, array[]::text[], 34, true),
  ('forest-metro', 'Forest Metro', 'metro', 'Statement', 'Green band, sage chips. Grounded energy.', array['operations','finance','marketing','sales']::text[], array['Trustworthy with energy','Distinct color, tidy layout','Good for field roles']::text[], '{"p":"#17362a","p2":"#1e4534","p3":"#275541","pm":"#35684f","a":"#bdd5c6"}'::jsonb, array[]::text[], 35, true),
  ('plum-metro', 'Plum Metro', 'metro', 'Statement', 'Purple band, orchid chips. Creative energy.', array['design','marketing','it']::text[], array['Creative, memorable','Strong statement header','Keeps content tidy']::text[], '{"p":"#37194d","p2":"#462361","p3":"#582f79","pm":"#6d4192","a":"#cdb4de"}'::jsonb, array[]::text[], 36, true),
  ('bronze-metro', 'Bronze Metro', 'metro', 'Statement', 'Bronze band, tan chips. Heritage with punch.', array['sales','operations','hr','finance']::text[], array['Warm and distinctive','Punchy but professional','Great for senior roles']::text[], '{"p":"#4d2f1c","p2":"#5f3c25","p3":"#72492f","pm":"#8a5c3d","a":"#ddc1a9"}'::jsonb, array[]::text[], 37, true),
  ('silver-metro', 'Silver Metro', 'metro', 'Statement', 'Light band, navy ink. The inverted statement.', array['hr','finance','education','healthcare']::text[], array['Light, airy, modern','Still makes a statement','Low ink, bright page']::text[], '{"p":"#0f2148","p2":"#16305f","p3":"#1e4076","pm":"#33507e","a":"#c9d2de"}'::jsonb, array['mod-band-tint']::text[], 38, true),
  ('noir-metro', 'Noir Metro', 'metro', 'Statement', 'Flat black band, gold details. Statement, monochrome.', array['marketing','design','sales']::text[], array['Maximum contrast, monochrome','Gold details read premium','Unforgettable header']::text[], '{"p":"#17181c","p2":"#202229","p3":"#2b2e37","pm":"#3a3e4a","a":"#c9a227"}'::jsonb, array['mod-band-flat']::text[], 39, true),
  ('compact', 'Compact Pro', 'compact', 'Dense', 'Dense single column, ATS-first. Maximum content, no fuss.', array['data','finance','healthcare','operations','education']::text[], array['Most ATS-friendly','Fits long histories','Recruiter-speed scanning']::text[], '{"p":"#0f2148","a":"#c9d2de"}'::jsonb, array[]::text[], 40, true),
  ('slate-compact', 'Slate Compact', 'compact', 'Dense', 'Same density, cooler tone. Dense but modern.', array['data','operations','it','finance']::text[], array['ATS-first density','Cool, current look','Fits 10+ years of work']::text[], '{"p":"#333d4d","a":"#b8c2d1"}'::jsonb, array[]::text[], 41, true),
  ('forest-compact', 'Forest Compact', 'compact', 'Dense', 'Green rules, dense layout. Serious and steady.', array['finance','healthcare','operations','education']::text[], array['Dense and trustworthy','Distinct from blue dense resumes','Recruiter-speed scanning']::text[], '{"p":"#17362a","a":"#bdd5c6"}'::jsonb, array[]::text[], 42, true),
  ('bordeaux-compact', 'Bordeaux Compact', 'compact', 'Dense', 'Wine rules, dense columns. Formal density.', array['sales','finance','operations','hr']::text[], array['Formal tone at full density','Warm, memorable rules','Fits long histories']::text[], '{"p":"#4d1828","a":"#d9b7c1"}'::jsonb, array[]::text[], 43, true),
  ('graphite-compact', 'Graphite Compact', 'compact', 'Dense', 'Charcoal rules, tight and modern. The sober workhorse.', array['operations','data','finance','it']::text[], array['Sober, modern, dense','Strong title bars','Great for big histories']::text[], '{"p":"#2e3138","a":"#b4bac4"}'::jsonb, array[]::text[], 44, true),
  ('teal-compact', 'Teal Compact', 'compact', 'Dense', 'Teal rules, dense layout. Fresh density.', array['it','data','healthcare','finance']::text[], array['Fresh take on ATS layout','Clear section bars','Maximum content']::text[], '{"p":"#0e3d46","a":"#b3d2d8"}'::jsonb, array[]::text[], 45, true),
  ('plum-compact', 'Plum Compact', 'compact', 'Dense', 'Purple rules, dense structure. Dense with character.', array['it','design','data','marketing']::text[], array['Dense but distinctive','Modern purple, not loud','Keeps everything visible']::text[], '{"p":"#37194d","a":"#cdb4de"}'::jsonb, array[]::text[], 46, true),
  ('bronze-compact', 'Bronze Compact', 'compact', 'Dense', 'Bronze rules, dense grid. Heritage density.', array['operations','finance','hr','education']::text[], array['Warm, grounded tone','Dense and readable','Senior-friendly look']::text[], '{"p":"#4d2f1c","a":"#ddc1a9"}'::jsonb, array[]::text[], 47, true),
  ('onyx-compact', 'Onyx Compact', 'compact', 'Dense', 'Black rules, gold title bars. Dense and premium.', array['finance','data','operations','sales']::text[], array['Premium, high contrast','Gold bars read sharp','Maximum content, ATS-first']::text[], '{"p":"#17181c","a":"#c9a227"}'::jsonb, array[]::text[], 48, true),
  ('ivory-compact', 'Ivory Compact', 'compact', 'Dense', 'Warm gray rules, soft density. Gentle on the eye.', array['education','healthcare','hr','finance']::text[], array['Soft, readable density','Low-contrast, low-fatigue','Long-history friendly']::text[], '{"p":"#57493b","a":"#cfc4b2"}'::jsonb, array[]::text[], 49, true),
  ('portrait', 'Portrait Ink', 'portrait', 'Portrait', 'Letter-spaced black name, square photo, hairline columns. The Canva classic.', array['design','marketing','hr','education']::text[], array['Instantly recognisable style','Photo without heaviness','Very readable columns']::text[], '{"p":"#17181c","a":"#d9dde3"}'::jsonb, array[]::text[], 50, true),
  ('portrait-navy', 'Portrait Navy', 'portrait', 'Portrait', 'Navy name and rules, warm white page.', array['finance','it','operations','sales']::text[], array['Professional and current','Photo-friendly','Prints crisp']::text[], '{"p":"#0f2148","a":"#cfd7e2"}'::jsonb, array[]::text[], 51, true),
  ('portrait-taupe', 'Portrait Taupe', 'portrait', 'Portrait', 'Warm taupe ink, soft rules. Quiet luxury.', array['design','hr','education','healthcare']::text[], array['Soft and premium','Great with a photo','Calm for reviewers']::text[], '{"p":"#5a4d42","a":"#e2dad1"}'::jsonb, array[]::text[], 52, true),
  ('portrait-sage', 'Portrait Sage', 'portrait', 'Portrait', 'Muted green headings, airy page. Fresh and calm.', array['healthcare','education','operations']::text[], array['Calm, natural tone','Distinct from gray stacks','Readable columns']::text[], '{"p":"#4f6b5a","a":"#d7e2da"}'::jsonb, array[]::text[], 53, true),
  ('portrait-rose', 'Portrait Rosé', 'portrait', 'Portrait', 'Dusty rose accents on ink type. Creative, composed.', array['design','marketing','hr']::text[], array['Creative without noise','Memorable accent','Photo-first header']::text[], '{"p":"#2b2a2e","a":"#e6cdd0"}'::jsonb, array[]::text[], 54, true),
  ('studio', 'Studio Beige', 'studio', 'Studio', 'Soft beige panel, round photo, small-caps sections. Warm modern.', array['design','marketing','hr','education']::text[], array['Warm and friendly','Photo front and center','Skills always visible']::text[], '{"p":"#2b2622","p2":"#f2ece3","p3":"#e3d9cb","pm":"#8a7d6e","a":"#b8977a"}'::jsonb, array[]::text[], 55, true),
  ('studio-blush', 'Studio Blush', 'studio', 'Studio', 'Blush panel, charcoal ink. Soft creative.', array['design','marketing','healthcare']::text[], array['Gentle, creative tone','Distinct in a stack','Photo-friendly']::text[], '{"p":"#2d262a","p2":"#f6e9ea","p3":"#ead4d6","pm":"#8f7478","a":"#c2848c"}'::jsonb, array[]::text[], 56, true),
  ('studio-mint', 'Studio Mint', 'studio', 'Studio', 'Mint panel, deep green ink. Fresh professional.', array['healthcare','education','operations']::text[], array['Fresh and calm','Great for care roles','Readable at a glance']::text[], '{"p":"#1e3a30","p2":"#e8f2ec","p3":"#d2e4d9","pm":"#6b8a7a","a":"#5f9b7f"}'::jsonb, array[]::text[], 57, true),
  ('studio-sky', 'Studio Sky', 'studio', 'Studio', 'Pale blue panel, navy ink. Corporate soft.', array['it','finance','data','sales']::text[], array['Corporate but warm','Photo without darkness','Prints light']::text[], '{"p":"#14264a","p2":"#e9eff8","p3":"#d3ddef","pm":"#6d7f9f","a":"#4c6fae"}'::jsonb, array[]::text[], 58, true),
  ('studio-lavender', 'Studio Lavender', 'studio', 'Studio', 'Lavender panel, plum ink. Creative calm.', array['design','marketing','it']::text[], array['Creative, composed','Distinct color story','Skills column stays visible']::text[], '{"p":"#2f2340","p2":"#efeaf6","p3":"#ded4ec","pm":"#83729c","a":"#7d5f92"}'::jsonb, array[]::text[], 59, true),
  ('monogram', 'Monogram Black', 'monogram', 'Monogram', 'Boxed initials, wide-tracked serif name, centered rules. Editorial.', array['design','marketing','hr','sales']::text[], array['Magazine look','Strong personal brand','Works without a photo']::text[], '{"p":"#17181c","a":"#cfd2d8"}'::jsonb, array[]::text[], 60, true),
  ('monogram-navy', 'Monogram Navy', 'monogram', 'Monogram', 'Navy seal and rules. Formal with flair.', array['finance','sales','operations','it']::text[], array['Formal yet memorable','Great for senior roles','Photo optional']::text[], '{"p":"#0f2148","a":"#c9d2de"}'::jsonb, array[]::text[], 61, true),
  ('monogram-wine', 'Monogram Bordeaux', 'monogram', 'Monogram', 'Wine seal, serif elegance. Warm authority.', array['sales','hr','marketing','finance']::text[], array['Warm and distinguished','Distinct from black stacks','Elegant spacing']::text[], '{"p":"#4d1828","a":"#d9b7c1"}'::jsonb, array[]::text[], 62, true),
  ('monogram-forest', 'Monogram Forest', 'monogram', 'Monogram', 'Deep green seal. Scholarly and calm.', array['education','healthcare','finance']::text[], array['Scholarly tone','Calm authority','Clean centered structure']::text[], '{"p":"#17362a","a":"#bdd5c6"}'::jsonb, array[]::text[], 63, true),
  ('monogram-gold', 'Monogram Gold', 'monogram', 'Monogram', 'Black type, gold seal. The premium monogram.', array['design','marketing','sales','finance']::text[], array['Premium single accent','Unforgettable header','Boardroom-safe']::text[], '{"p":"#17181c","a":"#c9a227"}'::jsonb, array[]::text[], 64, true),
  ('timeline', 'Timeline Navy', 'timeline', 'Timeline', 'Dates in the gutter, dotted career line, tinted header. Story at a glance.', array['it','sales','operations','marketing']::text[], array['Career progression is obvious','Great for 5+ years','Recruiters love the scan']::text[], '{"p":"#0f2148","p2":"#16305f","p3":"#1e4076","pm":"#33507e","a":"#c9d2de"}'::jsonb, array[]::text[], 65, true),
  ('timeline-teal', 'Timeline Teal', 'timeline', 'Timeline', 'Teal line and dots. Fresh chronology.', array['it','data','healthcare']::text[], array['Fresh, modern color','Clear progression','Tidy dates column']::text[], '{"p":"#0e3d46","p2":"#14505d","p3":"#1a6474","pm":"#27788a","a":"#b3d2d8"}'::jsonb, array[]::text[], 66, true),
  ('timeline-charcoal', 'Timeline Charcoal', 'timeline', 'Timeline', 'Charcoal line, warm gray dates. Sober story.', array['finance','operations','data','sales']::text[], array['Serious and clear','Neutral for any sector','Prints sharp']::text[], '{"p":"#232833","p2":"#2c3341","p3":"#384152","pm":"#4a5468","a":"#a7b0bf"}'::jsonb, array[]::text[], 67, true),
  ('timeline-wine', 'Timeline Bordeaux', 'timeline', 'Timeline', 'Wine line and dots. Warm chronology.', array['sales','hr','marketing']::text[], array['Warm and memorable','Progression reads instantly','Distinct color']::text[], '{"p":"#4d1828","p2":"#5f2135","p3":"#732c44","pm":"#8a3a56","a":"#d9b7c1"}'::jsonb, array[]::text[], 68, true),
  ('timeline-cobalt', 'Timeline Cobalt', 'timeline', 'Timeline', 'Bright blue line. Energetic, startup-ready.', array['marketing','it','design','sales']::text[], array['High energy','Clear scan','Modern feel']::text[], '{"p":"#1d3f94","p2":"#2551b8","p3":"#2f64d4","pm":"#4a76e0","a":"#c3d3f2"}'::jsonb, array[]::text[], 69, true),
  ('infographic', 'Infographic Navy', 'infographic', 'Infographic', 'Dark right panel with skill bars and language dots. Visual, bold.', array['it','design','marketing','data']::text[], array['Skills visualised','Bold first impression','Photo-friendly']::text[], '{"p":"#0f2148","p2":"#16305f","p3":"#1e4076","pm":"#33507e","a":"#c9d2de"}'::jsonb, array[]::text[], 70, true),
  ('infographic-onyx', 'Infographic Onyx', 'infographic', 'Infographic', 'Black panel, gold bars. Premium visual.', array['design','marketing','sales']::text[], array['Premium contrast','Gold bars pop','Memorable in stacks']::text[], '{"p":"#17181c","p2":"#202229","p3":"#2b2e37","pm":"#3a3e4a","a":"#c9a227"}'::jsonb, array[]::text[], 71, true),
  ('infographic-forest', 'Infographic Forest', 'infographic', 'Infographic', 'Green panel, sage bars. Grounded visual.', array['operations','healthcare','education']::text[], array['Trustworthy tone','Skills visualised','Distinct color']::text[], '{"p":"#17362a","p2":"#1e4534","p3":"#275541","pm":"#35684f","a":"#bdd5c6"}'::jsonb, array[]::text[], 72, true),
  ('infographic-plum', 'Infographic Plum', 'infographic', 'Infographic', 'Purple panel, orchid bars. Creative visual.', array['design','marketing','it']::text[], array['Creative energy','Bars read at a glance','Strong header']::text[], '{"p":"#37194d","p2":"#462361","p3":"#582f79","pm":"#6d4192","a":"#cdb4de"}'::jsonb, array[]::text[], 73, true),
  ('infographic-slate', 'Infographic Slate', 'infographic', 'Infographic', 'Slate panel, steel bars. Corporate visual.', array['it','data','finance','operations']::text[], array['Neutral corporate','Skills visualised','Calm palette']::text[], '{"p":"#333d4d","p2":"#3f4b5e","p3":"#4d5b72","pm":"#5d6d87","a":"#b8c2d1"}'::jsonb, array[]::text[], 74, true),
  ('corporate', 'Corporate Ink', 'corporate', 'Corporate', 'Section labels in a left column, content on the right. Boardroom clean.', array['finance','operations','hr','sales']::text[], array['Extremely scannable','Conservative industries','ATS-friendly structure']::text[], '{"p":"#17181c","a":"#d9dde3"}'::jsonb, array[]::text[], 75, true),
  ('corporate-navy', 'Corporate Navy', 'corporate', 'Corporate', 'Navy labels and rules. The classic corporate CV.', array['finance','it','operations','data']::text[], array['Classic corporate look','Reads authoritative','Prints crisp']::text[], '{"p":"#0f2148","a":"#c9d2de"}'::jsonb, array[]::text[], 76, true),
  ('corporate-graphite', 'Corporate Graphite', 'corporate', 'Corporate', 'Graphite labels. Modern corporate.', array['operations','data','finance','sales']::text[], array['Modern and sober','Neutral for any sector','Clear label column']::text[], '{"p":"#2e3138","a":"#b4bac4"}'::jsonb, array[]::text[], 77, true),
  ('corporate-forest', 'Corporate Forest', 'corporate', 'Corporate', 'Forest labels. Steady and trustworthy.', array['finance','healthcare','education','operations']::text[], array['Trustworthy tone','Distinct from navy','Very scannable']::text[], '{"p":"#17362a","a":"#bdd5c6"}'::jsonb, array[]::text[], 78, true),
  ('corporate-bronze', 'Corporate Bronze', 'corporate', 'Corporate', 'Bronze labels, warm rules. Heritage corporate.', array['hr','operations','sales','education']::text[], array['Warm and grounded','Senior-friendly','Clean structure']::text[], '{"p":"#4d2f1c","a":"#ddc1a9"}'::jsonb, array[]::text[], 79, true)
on conflict (id) do update set
  name = excluded.name, layout = excluded.layout, family_label = excluded.family_label, tagline = excluded.tagline,
  best_for = excluded.best_for, strengths = excluded.strengths, palette = excluded.palette, mods = excluded.mods,
  sort_order = excluded.sort_order, is_active = true;
