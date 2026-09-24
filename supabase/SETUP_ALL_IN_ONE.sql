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
  ('ats-sterling', 'Sterling ATS', 'compact', 'Dense', 'One clean column, plain headings, zero decoration. The safest file you can send.', array['it','data','finance','operations','healthcare','education']::text[], array['Parses in every tracker','Fits a long career history','Prints in pure black and white']::text[], '{"p":"#1c2430","a":"#c4cddb"}'::jsonb, array[]::text[], 0, true),
  ('ats-executive', 'Executive ATS', 'compact', 'Dense', 'Navy title bars over a dense single column. Same parse, more authority.', array['finance','operations','sales','hr']::text[], array['Section bars guide the eye','Senior-candidate tone','One or two pages, both clean']::text[], '{"p":"#12233f","a":"#c8d3e2"}'::jsonb, array[]::text[], 1, true),
  ('ats-technical', 'Technical ATS', 'compact', 'Dense', 'Graphite rules, tight leading, skills listed first for keyword matching.', array['it','data','operations']::text[], array['Skills high on the page','Handles a big tool list','Maximum content per page']::text[], '{"p":"#262b33","a":"#b3bcc9"}'::jsonb, array[]::text[], 2, true),
  ('ats-entry', 'Entry Level ATS', 'compact', 'Dense', 'Education and projects sit above experience — for freshers and career switchers.', array['education','hr','it','sales']::text[], array['Coursework gets the top slot','Still one clean column','Honest for a short CV']::text[], '{"p":"#2f4358","a":"#c2d0dd"}'::jsonb, array[]::text[], 3, true),
  ('sidebar-navy', 'Navy Sidebar', 'split', 'Sidebar', 'Deep navy column, silver detail. Contacts and skills never scroll out of view.', array['it','data','design','marketing','operations']::text[], array['Skills always visible','Strong first impression','Great for a one-page scan']::text[], '{"p":"#12233f","p2":"#1b3258","p3":"#24416f","pm":"#3d5e8c","a":"#c8d3e2"}'::jsonb, array[]::text[], 4, true),
  ('sidebar-graphite', 'Graphite Sidebar', 'split', 'Sidebar', 'Soft black column with cool gray detail — modern, serious, quiet.', array['it','data','sales','finance']::text[], array['High contrast, low noise','Roomy for a long skill list','Ages well']::text[], '{"p":"#262b33","p2":"#313841","p3":"#3d4650","pm":"#59636f","a":"#b3bcc9"}'::jsonb, array[]::text[], 5, true),
  ('sidebar-petrol', 'Petrol Sidebar', 'split', 'Sidebar', 'Deep teal-blue column. Fresh without looking like a startup pitch deck.', array['it','healthcare','data','design']::text[], array['Distinct but calm','Clear two-zone structure','Good in print and on screen']::text[], '{"p":"#0d3b45","p2":"#124e5b","p3":"#186272","pm":"#2c7c8e","a":"#b9d6dc"}'::jsonb, array[]::text[], 6, true),
  ('sidebar-ivory', 'Ivory Sidebar', 'split', 'Sidebar', 'The inverse: a pale column, steel-navy ink. Bright page, easy on the eye.', array['education','healthcare','hr','finance']::text[], array['Light on printer ink','Comfortable for a long read','Unusual in a good way']::text[], '{"p":"#2f4358","p2":"#3b546e","p3":"#476585","pm":"#5f7d9b","a":"#c2d0dd"}'::jsonb, array['mod-invert']::text[], 7, true),
  ('classic-serif', 'Executive Serif', 'classic', 'Classic', 'Centred serif name over double rules. The formal choice for conservative hiring.', array['finance','operations','sales','hr','education']::text[], array['Reads authoritative','Loved by senior reviewers','Nothing to apologise for']::text[], '{"p":"#12233f","a":"#c8d3e2"}'::jsonb, array['mod-serif']::text[], 8, true),
  ('classic-hairline', 'Hairline Classic', 'classic', 'Classic', 'Thin rules, wide margins, restrained ink. Classic with the volume turned down.', array['hr','education','finance','operations']::text[], array['Very legible','Soft on the eye','Two-page friendly']::text[], '{"p":"#2b3442","a":"#cfd6e0"}'::jsonb, array['mod-serif']::text[], 9, true),
  ('classic-academic', 'Academic CV', 'classic', 'Classic', 'Serif throughout, publications-and-education ordering for research and teaching.', array['education','healthcare','data']::text[], array['Scholarly structure','Room for publications','Conference-ready']::text[], '{"p":"#3a2230","a":"#cbb8c2"}'::jsonb, array['mod-serif']::text[], 10, true),
  ('classic-luxe', 'Gold Rule Classic', 'classic', 'Classic', 'Near-black serif with a single brass rule. Formal, a shade warm.', array['finance','sales','hr','design']::text[], array['Quiet premium detail','Memorable without colour','Boardroom-safe']::text[], '{"p":"#16181d","a":"#b9964a"}'::jsonb, array['mod-serif']::text[], 11, true),
  ('minimal-quiet', 'Quiet Minimal', 'minimal', 'Minimal', 'Small caps over hairlines, generous air. Lets the numbers speak.', array['design','data','education']::text[], array['Very clean scan','Works with less content','Timeless']::text[], '{"p":"#6c7789","a":"#dde3ec"}'::jsonb, array[]::text[], 12, true),
  ('minimal-slate', 'Slate Minimal', 'minimal', 'Minimal', 'Graphite ink, tighter spacing. Minimal for people with a lot to say.', array['it','data','finance','operations']::text[], array['Denser than most minimals','Cool, current tone','Fast to read']::text[], '{"p":"#333d4d","a":"#d5dbe4"}'::jsonb, array[]::text[], 13, true),
  ('minimal-ink', 'Ink Minimal', 'minimal', 'Minimal', 'Near-black type, no rules at all except one under the name.', array['design','marketing','data']::text[], array['Zero decoration','Type sets the hierarchy','Excellent one-pager']::text[], '{"p":"#1a1d23","a":"#d9dde3"}'::jsonb, array[]::text[], 14, true),
  ('corporate-boardroom', 'Boardroom Grid', 'corporate', 'Corporate', 'Section labels in a left rail, content on the right. Extremely scannable.', array['finance','operations','hr','sales']::text[], array['Instant section finding','ATS-friendly structure','Formal by default']::text[], '{"p":"#1a1d23","a":"#d6dae1"}'::jsonb, array[]::text[], 15, true),
  ('corporate-navy', 'Navy Grid', 'corporate', 'Corporate', 'The same rail in navy ink with a rule under every block.', array['finance','it','data','operations']::text[], array['Classic corporate grid','Reads authoritative','Prints crisp']::text[], '{"p":"#12233f","a":"#c8d3e2"}'::jsonb, array[]::text[], 16, true),
  ('corporate-pine', 'Pine Grid', 'corporate', 'Corporate', 'Deep green labels — grounded, easy on the eye, distinct in a navy stack.', array['healthcare','education','operations','finance']::text[], array['Trustworthy tone','Clear label column','Comfortable long read']::text[], '{"p":"#183a2c","a":"#c6d8cd"}'::jsonb, array[]::text[], 17, true),
  ('band-navy', 'Navy Band', 'metro', 'Statement', 'Full-width navy header, silver section chips. Confident, still corporate.', array['marketing','sales','it']::text[], array['Memorable header','Chips keep it organised','Good for startups and agencies']::text[], '{"p":"#12233f","p2":"#1b3258","p3":"#24416f","pm":"#3d5e8c","a":"#c8d3e2"}'::jsonb, array[]::text[], 18, true),
  ('band-slate', 'Slate Band', 'metro', 'Statement', 'Steel band with a flat finish — the statement with the colour dialled down.', array['operations','finance','data','it']::text[], array['Neutral for any sector','Sharp on a laser printer','Strong name presence']::text[], '{"p":"#2f4358","p2":"#3b546e","p3":"#476585","pm":"#5f7d9b","a":"#c2d0dd"}'::jsonb, array['mod-band-flat']::text[], 19, true),
  ('band-noir', 'Noir Band', 'metro', 'Statement', 'Flat black header with brass detail. The boldest thing in the pile, quietly.', array['design','marketing','sales']::text[], array['Maximum contrast','One metal accent','Stands out without colour']::text[], '{"p":"#16181d","p2":"#1f2229","p3":"#292d36","pm":"#3d4350","a":"#b9964a"}'::jsonb, array['mod-band-flat']::text[], 20, true),
  ('band-tinted', 'Tinted Band', 'metro', 'Statement', 'Pale navy wash instead of a dark block — for reviewers who print in colour.', array['hr','education','healthcare','finance']::text[], array['Bright page, clear header','Lower ink cost','Calm but structured']::text[], '{"p":"#12233f","p2":"#1b3258","p3":"#24416f","pm":"#3d5e8c","a":"#c8d3e2"}'::jsonb, array['mod-band-tint']::text[], 21, true),
  ('timeline-navy', 'Career Timeline', 'timeline', 'Timeline', 'Dates in the left gutter, a dotted line down the page. Progression is obvious.', array['it','sales','operations','marketing']::text[], array['Progression reads instantly','Great for 5+ years','Recruiter-friendly scan']::text[], '{"p":"#12233f","p2":"#1b3258","p3":"#24416f","pm":"#3d5e8c","a":"#c8d3e2"}'::jsonb, array[]::text[], 22, true),
  ('timeline-graphite', 'Graphite Timeline', 'timeline', 'Timeline', 'Charcoal line and dots, warm gray dates. Sober storytelling.', array['finance','operations','data','sales']::text[], array['Neutral for any sector','Dates never get lost','Prints sharp']::text[], '{"p":"#262b33","p2":"#313841","p3":"#3d4650","pm":"#59636f","a":"#b3bcc9"}'::jsonb, array[]::text[], 23, true),
  ('portrait-ink', 'Portrait Ink', 'portrait', 'Portrait', 'Letter-spaced name, square photo, hairline columns. The clean photo resume.', array['marketing','hr','design','education']::text[], array['Photo without heaviness','Very readable columns','Recognisable structure']::text[], '{"p":"#16181d","a":"#d9dde3"}'::jsonb, array['mod-square']::text[], 24, true),
  ('portrait-steel', 'Portrait Steel', 'portrait', 'Portrait', 'Navy ink on a warm white page, round photo. Photo CV, corporate edition.', array['sales','operations','finance','it']::text[], array['Professional and current','Photo-friendly','Crisp in print']::text[], '{"p":"#12233f","a":"#ccd6e3"}'::jsonb, array['mod-square']::text[], 25, true),
  ('studio-mist', 'Mist Panel', 'studio', 'Studio', 'Pale steel panel, round photo, small-caps sections. Warm but working.', array['hr','marketing','education','design']::text[], array['Friendly, still formal','Photo front and centre','Skills stay in view']::text[], '{"p":"#243042","p2":"#eaeff5","p3":"#d6dee9","pm":"#7d8da3","a":"#4f6b8c"}'::jsonb, array[]::text[], 26, true),
  ('studio-clay', 'Clay Panel', 'studio', 'Studio', 'Warm sand panel with taupe ink. The soft corporate look.', array['design','education','healthcare','hr']::text[], array['Warm, human tone','Reads gentle, not casual','Great with a photo']::text[], '{"p":"#3c2f24","p2":"#f3ece3","p3":"#e3d7c8","pm":"#8d7a66","a":"#9a7550"}'::jsonb, array[]::text[], 27, true),
  ('monogram-seal', 'Initials Seal', 'monogram', 'Monogram', 'Boxed initials, tracked serif name, centered rules. Strong without a photo.', array['design','marketing','hr','sales']::text[], array['Personal-brand header','Works with no photo','Editorial spacing']::text[], '{"p":"#16181d","a":"#cfd2d8"}'::jsonb, array[]::text[], 28, true),
  ('monogram-navy', 'Navy Seal', 'monogram', 'Monogram', 'Navy seal and rules — formal, with a little flair.', array['finance','sales','operations','it']::text[], array['Formal yet memorable','Good for senior roles','Clean centered block']::text[], '{"p":"#12233f","p2":"#1b3258","p3":"#24416f","pm":"#3d5e8c","a":"#c8d3e2"}'::jsonb, array[]::text[], 29, true),
  ('skills-bars', 'Skills Bars', 'infographic', 'Infographic', 'Tinted right panel with proficiency bars and language dots. Visual, kept tidy.', array['it','design','data','marketing']::text[], array['Skills read at a glance','Bold first impression','Photo-friendly']::text[], '{"p":"#12233f","p2":"#1b3258","p3":"#24416f","pm":"#3d5e8c","a":"#c8d3e2"}'::jsonb, array[]::text[], 30, true),
  ('skills-slate', 'Slate Skills Panel', 'infographic', 'Infographic', 'The same panel in graphite for a corporate environment.', array['it','data','finance','operations']::text[], array['Neutral corporate tone','Bars, not badges','Calm palette']::text[], '{"p":"#333d4d","p2":"#3f4b5e","p3":"#4d5b72","pm":"#67788f","a":"#bcc7d6"}'::jsonb, array[]::text[], 31, true),
  ('editorial-wide', 'Wide Margin', 'editorial', 'Editorial', 'Numbered sections in a broad left margin, magazine spacing down the page.', array['design','marketing','education','hr']::text[], array['Reads like a profile piece','Huge margins, zero clutter','Portfolio careers']::text[], '{"p":"#16181d","a":"#c9ccd3"}'::jsonb, array[]::text[], 32, true),
  ('editorial-navy', 'Navy Editorial', 'editorial', 'Editorial', 'Serif headings over hairlines with numbered margins. Boardroom magazine.', array['finance','operations','sales','it']::text[], array['Quiet authority','Long histories scan fast','Prints beautifully']::text[], '{"p":"#12233f","a":"#c8d3e2"}'::jsonb, array['mod-serif']::text[], 33, true),
  ('spine-navy', 'Navy Spine', 'spine', 'Spine', 'A navy spine down the page edge, section titles turned sideways inside it.', array['it','data','design','operations']::text[], array['Strong visual identity','Photo sits in the spine','Clean page edge']::text[], '{"p":"#12233f","p2":"#1b3258","p3":"#24416f","pm":"#3d5e8c","a":"#c8d3e2"}'::jsonb, array[]::text[], 34, true),
  ('spine-ink', 'Ink Spine', 'spine', 'Spine', 'Near-black spine with a brass hairline. Design-forward, still formal.', array['design','marketing','hr','it']::text[], array['Designer-grade header','Single metal accent','Memorable structure']::text[], '{"p":"#16181d","p2":"#1f2229","p3":"#292d36","pm":"#3d4350","a":"#b9964a"}'::jsonb, array[]::text[], 35, true),
  ('soft-slate', 'Slate Panels', 'soft', 'Soft', 'Rounded steel panels and pill skills. Modern, approachable, not playful.', array['it','data','hr','education']::text[], array['Approachable, still professional','Pills make skills scannable','Great early-career']::text[], '{"p":"#2f4358","p2":"#3b546e","p3":"#476585","pm":"#5f7d9b","a":"#c2d0dd"}'::jsonb, array[]::text[], 36, true),
  ('soft-sand', 'Sand Panels', 'soft', 'Soft', 'Rounded warm panels with taupe ink. The friendly client-facing look.', array['healthcare','education','design','marketing']::text[], array['Low-glare, warm tone','Kind and steady','Prints softly']::text[], '{"p":"#4a3628","p2":"#5c4534","p3":"#6f5541","pm":"#8a705c","a":"#ddccb9"}'::jsonb, array[]::text[], 37, true),
  ('banner-steel', 'Steel Banner', 'banner', 'Banner', 'Full-width steel banner, then the story left and the facts in a right rail.', array['it','operations','sales','data']::text[], array['Header does the work','Rail keeps facts visible','Good on a phone screen']::text[], '{"p":"#2f4358","p2":"#3b546e","p3":"#476585","pm":"#5f7d9b","a":"#c2d0dd"}'::jsonb, array[]::text[], 38, true),
  ('banner-indigo', 'Indigo Banner', 'banner', 'Banner', 'Deep indigo banner with a pale rail. Composed, a touch premium.', array['finance','hr','marketing','sales']::text[], array['Premium first impression','Quiet colour story','Senior-friendly']::text[], '{"p":"#232a52","p2":"#2e3767","p3":"#3a457d","pm":"#5560a0","a":"#c6cbe8"}'::jsonb, array[]::text[], 39, true),
  ('ledger-finance', 'Finance Ledger', 'ledger', 'Ledger', 'Ruled rows, dates against the left margin. An unsentimental dossier.', array['finance','data','operations','sales']::text[], array['Extremely easy to scan','Dates never get lost','Built for 10+ years']::text[], '{"p":"#12233f","a":"#c8d3e2"}'::jsonb, array[]::text[], 40, true),
  ('ledger-oxblood', 'Oxblood Ledger', 'ledger', 'Ledger', 'Wine rules and a double date column. Old-school precision.', array['finance','sales','hr','education']::text[], array['Traditional and confident','Reads distinguished','Partner-track CVs']::text[], '{"p":"#47182a","a":"#dcc0cb"}'::jsonb, array[]::text[], 41, true),
  ('ledger-ops', 'Operations Ledger', 'ledger', 'Ledger', 'Graphite rules, tighter leading, everything justified to the grid.', array['operations','data','it','finance']::text[], array['Grid-tight alignment','Fits maximum content','Plain and factual']::text[], '{"p":"#262b33","a":"#b3bcc9"}'::jsonb, array[]::text[], 42, true)
on conflict (id) do update set
  name = excluded.name, layout = excluded.layout, family_label = excluded.family_label, tagline = excluded.tagline,
  best_for = excluded.best_for, strengths = excluded.strengths, palette = excluded.palette, mods = excluded.mods,
  sort_order = excluded.sort_order, is_active = true;
