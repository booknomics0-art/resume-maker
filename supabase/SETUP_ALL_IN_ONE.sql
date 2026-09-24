-- CraftCV: ALL-IN-ONE setup. Paste this whole file in Supabase SQL Editor → Run (safe to re-run).

-- ============================================================================
-- CraftCV — Supabase schema  (run in SQL Editor or `supabase db push`)
-- ============================================================================
-- Tables
--   profiles           one row per auth user (name, email, role, last seen)
--   resumes            every resume of every user (full JSON + indexed columns)
--   resume_downloads   one row per PDF download (analytics)
--   events             generic product events
--   template_catalog   the template library (seeded from src/lib/templates.ts by
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
  ('ats-sterling', 'Sterling ATS', 'compact', 'Dense', 'One clean column, plain headings, photo top-right. The safest file you can send.', array['it','data','finance','operations','healthcare','education']::text[], array['Parses in every tracker','One A4 page, top to bottom','Photo frame, no clutter']::text[], '{"p":"#12233f","a":"#c8d3e2"}'::jsonb, array['mod-tight']::text[], 0, true),
  ('ats-ink', 'Ink ATS', 'minimal', 'Minimal', 'Hairlines and air in pure black and white — an ATS sheet that still looks designed.', array['design','data','education','operations']::text[], array['Zero decoration to break','Reads calm and fast','Prints on any printer']::text[], '{"p":"#101114","a":"#d7dade"}'::jsonb, array['mod-tight']::text[], 1, true),
  ('it-sidebar', 'Navy Sidebar', 'split', 'Sidebar', 'Navy column for stack, links and photo; story on the right, one page, no waste.', array['it','data','operations','design']::text[], array['Skills always visible','Photo in the rail','Tuned to hold one page']::text[], '{"p":"#12233f","p2":"#1b3258","p3":"#24416f","pm":"#3d5e8c","a":"#c8d3e2"}'::jsonb, array['mod-tight']::text[], 2, true),
  ('it-masthead', 'Dev Masthead', 'masthead', 'Masthead', 'Oversized name, numbered sections, facts rail for your stack and links.', array['it','data','design']::text[], array['Numbered sections scan fast','Stack stays in the rail','Engineer-grade density']::text[], '{"p":"#334155","a":"#e2e8f0"}'::jsonb, array['mod-tight','mod-numbered']::text[], 3, true),
  ('data-bars', 'Skills Bars', 'infographic', 'Infographic', 'Tinted panel with proficiency bars, language dots and your photo up top.', array['data','it','finance','operations']::text[], array['Skills read at a glance','Photo + facts in one panel','Bold but tidy']::text[], '{"p":"#1d3f94","p2":"#2551b8","p3":"#2f64d4","pm":"#4a76e0","a":"#bccbe4"}'::jsonb, array['mod-tight']::text[], 4, true),
  ('data-grid', 'Analytics Grid', 'corporate', 'Corporate', 'Label rail on the left, metrics on the right — a dashboard on paper.', array['data','finance','operations']::text[], array['Every number aligned','Formal, ultra-scannable','Two pages if you need them']::text[], '{"p":"#22262e","a":"#c9a227"}'::jsonb, array['mod-tight']::text[], 5, true),
  ('corp-boardroom', 'Boardroom Grid', 'corporate', 'Corporate', 'Section labels in a left rail, content on the right, photo in the header.', array['finance','operations','hr','sales']::text[], array['Instant section finding','Formal by default','ATS-friendly structure']::text[], '{"p":"#101114","a":"#d7dade"}'::jsonb, array['mod-tight']::text[], 6, true),
  ('corp-tint', 'Steel Memo', 'tintsheet', 'Tint Sheet', 'A pale steel page, one wide-tracked name, boxed competencies in a grid.', array['operations','finance','hr']::text[], array['One colour story, no noise','Skills read in one sweep','Great on screen and paper']::text[], '{"p":"#243044","p2":"#eaeef4","p3":"#d8e0ec","pm":"#6b7f9c","a":"#9fb2ca"}'::jsonb, array['mod-tight']::text[], 7, true),
  ('sales-panelband', 'Photo Panel CV', 'panelband', 'Panel Band', 'Espresso band with a round photo, then a beige rail of numbers and tools.', array['sales','marketing','hr']::text[], array['Photo-forward, not flashy','Rail keeps quota and reach','Confident header']::text[], '{"p":"#1d2b3a","p2":"#f2e8de","p3":"#e2d0c0","pm":"#94765c","a":"#c99a63"}'::jsonb, array['mod-tight']::text[], 8, true),
  ('sales-band', 'Burgundy Band', 'metro', 'Statement', 'A single burgundy band with cream chips — warm authority, one page.', array['sales','marketing','operations']::text[], array['Memorable at a glance','One accent, used once','Prints beautifully in colour']::text[], '{"p":"#3d1220","p2":"#54192c","p3":"#6c2339","pm":"#8a4258","a":"#e3cfd4"}'::jsonb, array['mod-tight','mod-band-flat']::text[], 9, true),
  ('care-sidebar', 'Petrol Sidebar', 'split', 'Sidebar', 'Deep teal rail for licences, units and photo; clinical detail in the main column.', array['healthcare','it','operations']::text[], array['Licences never get lost','Calm, trustworthy colour','One page, dense but kind']::text[], '{"p":"#0c3540","p2":"#14505d","p3":"#1d6a79","pm":"#3d8b99","a":"#a9d6de"}'::jsonb, array['mod-tight']::text[], 10, true),
  ('edu-chalk', 'Chalk Tint', 'tintsheet', 'Tint Sheet', 'Chalkboard-green wash, centred name, boxed subjects and a framed photo.', array['education','healthcare','hr']::text[], array['Distinctive but neat','Subjects as a grid','Prints softly, reads sharp']::text[], '{"p":"#26402f","p2":"#f0ece1","p3":"#e0d8c6","pm":"#7b7460","a":"#9c8a63"}'::jsonb, array['mod-tight']::text[], 11, true),
  ('creative-spine', 'Copper Spine', 'spinegradient', 'Gradient Spine', 'Midnight gradient rail carrying the name, copper hairlines in the body.', array['design','marketing','data']::text[], array['Rail holds the identity','Centred headings, calm body','Stands out in a stack']::text[], '{"p":"#15181f","p2":"#20242d","p3":"#2b303b","pm":"#414a5a","a":"#b06f3a"}'::jsonb, array['mod-tight']::text[], 12, true),
  ('lead-serif', 'Executive Serif', 'classic', 'Classic', 'Centred serif name with a photo frame over double rules — boardroom formal.', array['finance','operations','sales','hr']::text[], array['Reads authoritative','Loved by senior reviewers','Nothing to apologise for']::text[], '{"p":"#22262e","a":"#c9a227"}'::jsonb, array['mod-tight','mod-serif']::text[], 13, true),
  ('fresher-portrait', 'Graduate Portrait', 'portrait', 'Portrait', 'Photo header, tracked name, education and internships in the side column.', array['it','sales','education','hr']::text[], array['Photo where it belongs','Internships up front','Clean two-column balance']::text[], '{"p":"#1d3f94","a":"#bccbe4"}'::jsonb, array['mod-tight','mod-square']::text[], 14, true),
  ('ats-ledger', 'Ledger ATS', 'ledger', 'Ledger', 'Dates in the left rule and one clean column of facts — parses, prints and reads like a sheet.', array['it','data','finance','operations','healthcare','education']::text[], array['Ruled rows, no ambiguity','Long histories fit one page','Photo in the header, still plain']::text[], '{"p":"#334155","a":"#e2e8f0"}'::jsonb, array['mod-tight']::text[], 15, true),
  ('ats-numbered', 'Numbered ATS', 'editorial', 'Editorial', 'Numbered sections in a wide margin, so a recruiter can quote your page back to you.', array['operations','finance','hr','data']::text[], array['Sections name themselves','Calm, considered rhythm','Two columns of air, one column of text']::text[], '{"p":"#22262e","a":"#c9a227"}'::jsonb, array['mod-tight']::text[], 16, true),
  ('ats-grid', 'Grid ATS', 'corporate', 'Corporate', 'Label rail on the left, plain text on the right — no tables for a parser to trip over.', array['finance','operations','it','hr']::text[], array['Label-aligned sections','Formal and dry','Prints identically in mono']::text[], '{"p":"#0e4b56","a":"#b6d7dd"}'::jsonb, array['mod-tight']::text[], 17, true),
  ('it-timeline', 'Engineering Timeline', 'timeline', 'Timeline', 'Roles on a dotted line with dates in the gutter; photo up top, stack beside it.', array['it','data','operations']::text[], array['Progression is the headline','Promotions read instantly','Photo frame in the header']::text[], '{"p":"#12233f","a":"#c8d3e2"}'::jsonb, array['mod-tight']::text[], 18, true),
  ('it-soft', 'Product Panels', 'soft', 'Soft', 'Rounded pale-teal panels and pill skills — for engineers who also talk to customers.', array['it','design','hr','marketing']::text[], array['Approachable, still technical','Skills scannable as pills','Kind to a long tool list']::text[], '{"p":"#0e4b56","a":"#b6d7dd"}'::jsonb, array['mod-tight']::text[], 19, true),
  ('it-monogram', 'Initials Mark', 'monogram', 'Monogram', 'Boxed initials, tracked serif name, one gold rule. Quiet senior-engineer presence.', array['it','data','operations','finance']::text[], array['Works with or without a photo','Memorable header','Serif without the age']::text[], '{"p":"#22262e","p2":"#2c313b","p3":"#373d49","pm":"#4d5563","a":"#c9a227"}'::jsonb, array['mod-tight']::text[], 20, true),
  ('data-spine', 'Analyst Spine', 'spine', 'Spine', 'A teal spine down the page edge with sideways titles; every metric stays on its rule.', array['data','it','finance']::text[], array['Strong visual identity','One accent, used once','Great for dashboard-heavy work']::text[], '{"p":"#0e4b56","a":"#b6d7dd"}'::jsonb, array['mod-tight']::text[], 21, true),
  ('data-banner', 'Impact Banner', 'banner', 'Banner', 'Full-width midnight banner, story on the left, reach and revenue in a right rail.', array['data','marketing','operations']::text[], array['Numbers never scroll away','Confident header','Good on a phone screen']::text[], '{"p":"#15181f","p2":"#20242d","p3":"#2b303b","pm":"#414a5a","a":"#b06f3a"}'::jsonb, array['mod-tight']::text[], 22, true),
  ('data-soft', 'Reporting Panels', 'soft', 'Soft', 'Rounded grey panels with pill skills for analysts who present as much as they model.', array['data','finance','hr']::text[], array['Soft look, hard numbers','Pills keep the stack readable','One page by design']::text[], '{"p":"#101114","a":"#d7dade"}'::jsonb, array['mod-tight']::text[], 23, true),
  ('corp-classic', 'Corporate Serif', 'classic', 'Classic', 'Centred serif header, framed photo and double rules — the page audit committees expect.', array['finance','operations','hr','sales']::text[], array['Reads authoritative','Conservative by default','Prints beautifully']::text[], '{"p":"#12233f","a":"#c8d3e2"}'::jsonb, array['mod-tight','mod-serif']::text[], 24, true),
  ('corp-metro', 'Corporate Band', 'metro', 'Statement', 'A flat slate band with pearl chips: formal, but not from 1998.', array['operations','finance','it']::text[], array['One band, then business','Chips organise the page','Sharp in laser print']::text[], '{"p":"#333d4d","p2":"#3f4b5e","p3":"#4d5b72","pm":"#67788f","a":"#bcc7d6"}'::jsonb, array['mod-tight','mod-band-flat']::text[], 25, true),
  ('corp-portrait', 'Client Portrait', 'portrait', 'Portrait', 'Photo header with a burgundy accent and airy columns — client-facing consulting CV.', array['sales','operations','finance','hr']::text[], array['Face, then evidence','Warm accent, cold structure','Two clear columns']::text[], '{"p":"#4d1828","a":"#e3cfd4"}'::jsonb, array['mod-tight','mod-square']::text[], 26, true),
  ('sales-masthead', 'Quota Masthead', 'masthead', 'Masthead', 'Oversized name, gold rules, and a facts rail built to carry quota and territory.', array['sales','marketing']::text[], array['Numbers where eyes land first','Big name, bigger targets','Photo optional, frame present']::text[], '{"p":"#22262e","a":"#c9a227"}'::jsonb, array['mod-tight','mod-numbered']::text[], 27, true),
  ('sales-timeline', 'Pipeline Timeline', 'timeline', 'Timeline', 'Attainment climbing down a dotted line — the growth curve is the layout.', array['sales','marketing','operations']::text[], array['Growth is visible at a glance','Dates always clear','Calm teal, no hype']::text[], '{"p":"#0e4b56","a":"#b6d7dd"}'::jsonb, array['mod-tight']::text[], 28, true),
  ('sales-studio', 'Brand Studio', 'studio', 'Studio', 'Beige panel, round photo, small-caps sections — warm for agency and brand roles.', array['marketing','sales','design']::text[], array['Friendly without being casual','Panel keeps the basics','Photo front and centre']::text[], '{"p":"#1d2b3a","p2":"#f2e8de","p3":"#e2d0c0","pm":"#94765c","a":"#c99a63"}'::jsonb, array['mod-tight']::text[], 29, true),
  ('care-compact', 'Clinical ATS', 'compact', 'Dense', 'Plain single column with licences, units and patient ratios first — hospital-portal safe.', array['healthcare','operations']::text[], array['No layout risk at intake','Credentials at the top','One dense, honest page']::text[], '{"p":"#101114","a":"#d7dade"}'::jsonb, array['mod-tight']::text[], 30, true),
  ('care-spine', 'Ward Spine', 'spine', 'Spine', 'A forest-green spine with sideways titles; shifts and wards stay aligned down the page.', array['healthcare','education']::text[], array['Sections marked on the edge','Calm, trustworthy colour','Prints well in mono']::text[], '{"p":"#1d4032","a":"#d9c9a8"}'::jsonb, array['mod-tight']::text[], 31, true),
  ('care-panelband', 'Care Panel', 'panelband', 'Panel Band', 'Photo in a petrol band, registrations and skills in the pale rail under it.', array['healthcare','hr','operations']::text[], array['Photo without the flash','Rail holds credentials','Two zones, no overlap']::text[], '{"p":"#1d3b42","p2":"#e7f0f1","p3":"#d1e3e5","pm":"#6d8c91","a":"#8fb4b9"}'::jsonb, array['mod-tight']::text[], 32, true),
  ('care-monogram', 'Physician Seal', 'monogram', 'Monogram', 'Centred seal and serif name for consultant, academic-medical and board-certified CVs.', array['healthcare','education']::text[], array['Formal and unhurried','Works with no photo','Fellowships get their own block']::text[], '{"p":"#12233f","p2":"#1b3258","p3":"#24416f","pm":"#3d5e8c","a":"#c8d3e2"}'::jsonb, array['mod-tight']::text[], 33, true),
  ('edu-minimal', 'Quiet Academic', 'minimal', 'Minimal', 'Hairlines and air for syllabi, board results and research interests.', array['education','data','design']::text[], array['Nothing competes with the content','Long lists read calmly','Prints light']::text[], '{"p":"#334155","a":"#e2e8f0"}'::jsonb, array['mod-tight']::text[], 34, true),
  ('edu-editorial', 'Faculty Editorial', 'editorial', 'Editorial', 'Numbered margin, framed photo, and room for papers, clubs and curriculum work.', array['education','hr','healthcare']::text[], array['Every section numbered','Magazine pacing','Handles a long record']::text[], '{"p":"#4d1828","a":"#e3cfd4"}'::jsonb, array['mod-tight']::text[], 35, true),
  ('edu-banner', 'Principal Banner', 'banner', 'Banner', 'Navy banner up top, results and departments in a right rail — leadership in schools.', array['education','operations','hr']::text[], array['Header carries the title','Rail keeps the outcomes','Confident, not loud']::text[], '{"p":"#12233f","p2":"#1b3258","p3":"#24416f","pm":"#3d5e8c","a":"#c8d3e2"}'::jsonb, array['mod-tight']::text[], 36, true),
  ('edu-soft', 'Primary Panels', 'soft', 'Soft', 'Rounded pale-blue panels and pill skills — warm for early-years and school roles.', array['education','healthcare','design']::text[], array['Approachable by design','Skills stay scannable','Great with a photo']::text[], '{"p":"#1d3f94","a":"#bccbe4"}'::jsonb, array['mod-tight']::text[], 37, true),
  ('creative-masthead', 'Studio Masthead', 'masthead', 'Masthead', 'Giant uppercase name with a framed photo; the portfolio link lives in the rail.', array['design','marketing']::text[], array['Type does the branding','Rail keeps links and tools','One accent, no decoration']::text[], '{"p":"#101114","a":"#d7dade"}'::jsonb, array['mod-tight']::text[], 38, true),
  ('creative-classic', 'Editorial Serif', 'classic', 'Classic', 'Copper rules under a serif header, for copy, editing and brand writing.', array['design','marketing','education']::text[], array['Reads like a masthead','Formal with a pulse','Prints elegantly']::text[], '{"p":"#22262e","a":"#c9a227"}'::jsonb, array['mod-tight','mod-serif']::text[], 39, true),
  ('creative-tint', 'Poster Tint', 'tintsheet', 'Tint Sheet', 'A washed poster page: one tracked name, boxed tools in two columns, framed photo.', array['design','marketing']::text[], array['Poster presence','Tools as a grid','Calm, low-glare field']::text[], '{"p":"#26402f","p2":"#f0ece1","p3":"#e0d8c6","pm":"#7b7460","a":"#9c8a63"}'::jsonb, array['mod-tight']::text[], 40, true),
  ('creative-panelband', 'Portfolio Band', 'panelband', 'Panel Band', 'Copper-framed photo band, then exhibits and tools in a pale rail.', array['design','marketing','data']::text[], array['Portfolio-first header','Rail keeps the craft list','Strong but restrained']::text[], '{"p":"#1a1f2c","p2":"#eef0f4","p3":"#dfe3ea","pm":"#6b7484","a":"#b06f3a"}'::jsonb, array['mod-tight']::text[], 41, true),
  ('lead-metro', 'Board Band', 'metro', 'Statement', 'A flat navy band with silver chips for CXO, head and director roles.', array['operations','finance','sales','hr']::text[], array['Gravitas in one band','Chips keep it tidy','Memorable at a glance']::text[], '{"p":"#12233f","p2":"#1b3258","p3":"#24416f","pm":"#3d5e8c","a":"#c8d3e2"}'::jsonb, array['mod-tight','mod-band-flat']::text[], 42, true),
  ('lead-ledger', 'Director Ledger', 'ledger', 'Ledger', 'Board tenures, P&L and mandates in ruled rows — dry, formal, unarguable.', array['finance','operations','hr']::text[], array['Every mandate on a line','Dates never get lost','Reads like a dossier']::text[], '{"p":"#4d1828","a":"#e3cfd4"}'::jsonb, array['mod-tight']::text[], 43, true),
  ('lead-portrait', 'Chair Portrait', 'portrait', 'Portrait', 'Square framed photo, letter-spaced name, warm beige rules — a calm senior page.', array['operations','hr','sales']::text[], array['Composed and senior','Hairline structure','Photo where it belongs']::text[], '{"p":"#3f2a1d","a":"#dcc9b0"}'::jsonb, array['mod-tight','mod-square']::text[], 44, true),
  ('lead-split', 'Executive Sidebar', 'split', 'Sidebar', 'Board seats, mandates and links in a slate rail; achievements take the main column.', array['finance','operations','marketing']::text[], array['Rail keeps the roles','Story gets the space','Prints crisply']::text[], '{"p":"#333d4d","p2":"#3f4b5e","p3":"#4d5b72","pm":"#67788f","a":"#bcc7d6"}'::jsonb, array['mod-tight']::text[], 45, true),
  ('fresher-timeline', 'First Line', 'timeline', 'Timeline', 'College to first role on a dotted line, so a short history still looks structured.', array['it','sales','operations']::text[], array['Progress, however early','Dates always clear','Photo in the header']::text[], '{"p":"#0c3540","p2":"#14505d","p3":"#1d6a79","pm":"#3d8b99","a":"#a9d6de"}'::jsonb, array['mod-tight']::text[], 46, true),
  ('fresher-studio', 'Junior Studio', 'studio', 'Studio', 'Sand panel with a round photo; kind to internships, trainees and projects.', array['education','hr','design','marketing']::text[], array['Warm, not childish','Panel holds the basics','Projects get the main column']::text[], '{"p":"#26402f","p2":"#f0ece1","p3":"#e0d8c6","pm":"#7b7460","a":"#9c8a63"}'::jsonb, array['mod-tight']::text[], 47, true),
  ('fresher-spine', 'Graduate Spine', 'spinegradient', 'Gradient Spine', 'A copper gradient rail carrying your name, body kept to three tight blocks.', array['design','it','data']::text[], array['Bold rail, disciplined body','Name reads from the edge','Photo optional, frame ready']::text[], '{"p":"#15181f","p2":"#20242d","p3":"#2b303b","pm":"#414a5a","a":"#b06f3a"}'::jsonb, array['mod-tight']::text[], 48, true),
  ('fresher-bars', 'Starter Skills', 'infographic', 'Infographic', 'Skill bars and language dots for a first CV — evidence replaces tenure.', array['it','data','marketing']::text[], array['Skills visualised honestly','Photo up top','Projects sit beside them']::text[], '{"p":"#333d4d","p2":"#3f4b5e","p3":"#4d5b72","pm":"#67788f","a":"#bcc7d6"}'::jsonb, array['mod-tight']::text[], 49, true)
on conflict (id) do update set
  name = excluded.name, layout = excluded.layout, family_label = excluded.family_label, tagline = excluded.tagline,
  best_for = excluded.best_for, strengths = excluded.strengths, palette = excluded.palette, mods = excluded.mods,
  sort_order = excluded.sort_order, is_active = true;
