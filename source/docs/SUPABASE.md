# Supabase setup — CraftCV database

Every user's resumes live in **your** Supabase project (PostgreSQL). The browser keeps an
offline copy, but the database is the source of truth, and you (as admin) can see everything.

## 1. Create the project (5 min)

1. Go to <https://supabase.com/dashboard> → **New project**.
   Region: `ap-south-1 (Mumbai)` for Indian users. Save the database password somewhere safe.
2. **Authentication → Providers → Email**: keep enabled.
   *Confirm email* — turn **off** for the smoothest sign-up, or keep on if you want verified emails.
3. **Authentication → Providers → Google** (needed for “Continue with Google”): toggle Google on
   and paste the *Client ID* + *Client secret* of a Google Cloud OAuth client of type
   *Web application*. In Google Cloud Console add exactly this Authorized redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`.
   Skipping this step is the reason users see
   *“Provider (issuer "https://accounts.google.com") is not enabled”* — Supabase keeps the
   client secret on the server, so the app cannot enable it. Full guide:
   [`docs/GOOGLE-LOGIN.md`](GOOGLE-LOGIN.md), and `npm run check:auth` verifies it.
4. **Authentication → URL configuration**: set *Site URL* to your Netlify URL
   (e.g. `https://craftcv.netlify.app`) and add the redirect URLs your app uses —
   `https://craftcv.netlify.app/**` and `http://localhost:5173/**`.
   Google returns to `<origin>/` (PKCE code in the **query string**, so the hash router keeps working).

## 2. Create the tables

**SQL Editor → New query**, paste the whole file **`supabase/SETUP_ALL_IN_ONE.sql`** (migration + 80-template seed in one), **Run**. Safe to re-run.

> Alternatively with the CLI: `supabase link --project-ref <ref>` then `supabase db push`,
> and `npm run seed:templates:push` with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set.

## 3. Connect the app

**Project Settings → API** → copy *Project URL* and the *anon public* key.

Local: create `.env` (never commit it):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
Netlify: already set in `netlify.toml` under `[build.environment]` — nothing to add; just deploy.

Without these two variables the app runs in offline mode (browser-only accounts).
With them, sign-up/login goes through Supabase Auth and every save syncs.

## 4. Make yourself admin

Sign up in the app once, then in SQL Editor:
```sql
update public.profiles set role = 'admin' where lower(email) = 'you@example.com';
```
Admins can read every row and the dashboards below.

## What's in the database

| Table | What it holds |
|---|---|
| `profiles` | one row per user — name, email, provider, role, last seen |
| `resumes` | **every resume of every user** — full JSON in `data`, plus `name`, `field_id`, `template_id`, `completeness` for filtering; soft-delete with `is_deleted` |
| `resume_downloads` | one row per PDF download (who, which resume, which template) |
| `events` | generic product events |
| `template_catalog` | the template library (id, family, palette, tagline…) — join target for stats |

Views for you (admin only): `admin_overview` (totals), `admin_template_usage`
(which templates people pick/download), `admin_resumes` (every resume with owner + candidate name).

Handy queries:
```sql
select * from admin_overview;
select * from admin_template_usage limit 20;
select owner, email, candidate_name, headline, template_id, completeness, updated_at from admin_resumes limit 50;

-- full resume JSON of one user
select data from resumes where user_id = (select id from profiles where email = 'someone@example.com');

-- all resumes in a given field/template
select count(*) from resumes where field_id = 'it' and template_id like 'portrait%';
```

## Google login (troubleshooting)

`npm run check:auth -- --app-url=https://your-site` reports the provider state from the public
`GET /auth/v1/settings` endpoint, starts (without following) the Google handshake to confirm the
Google client + callback URI, and prints the exact values to paste into Google Cloud Console and
Supabase (exit codes: 0 enabled · 1 disabled or broken handshake · 2 could not check). The in-app equivalents are the
walkthrough behind “Continue with Google” and the **Settings → Google login** card, both with a
“Check again” button. Error-by-error mapping: [`docs/GOOGLE-LOGIN.md`](GOOGLE-LOGIN.md).

## Security model

* Row-Level Security on every table: a user can only read/write rows where `user_id = auth.uid()`.
* The `anon` key in the browser is safe by design; the **service-role key must never ship to the browser**.
* `delete_my_account()` lets a user wipe everything (DPDP / GDPR).
* Soft-deleted resumes are purged after 30 days by `purge_deleted_resumes()` (schedule with pg_cron if you like).
* Photos are stored inside the resume JSON as data URLs. If storage grows, move them to a
  Supabase Storage bucket (`photos`, private) and keep only the path in JSON.

## Sync behaviour (how the app uses it)

* Every save in the editor → debounced upsert to `resumes` (1.2 s).
* On login / app start → `syncAll()` merges local and cloud copies, **newest `updatedAt` wins**.
* Delete → soft-delete in cloud, hard delete locally.
* Download → row in `resume_downloads` (never blocks printing).
* Status pill on Dashboard/Settings: *Cloud: saved / syncing / error*.
