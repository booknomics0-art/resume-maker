# Deployment guide — CraftCV

CraftCV is a fully static site. `npm run build` runs the `prebuild` step first
(it vendors the offline OCR engine into `public/ocr/`, ~11 MB, see README) and
then produces a `dist/` folder that
runs on any static host. No backend, no database, no environment variables needed
for the current feature set. Hash routing (`#/dashboard`, `#/editor/...`) means
**zero server configuration** — no redirects, no 404 handling.

```bash
npm install
npm run build      # outputs dist/
```

## Option 1 — Netlify (fastest, recommended)

1. Go to https://app.netlify.com/drop
2. Drag the `dist/` folder onto the page
3. Done — you get a live HTTPS URL in ~30 seconds

`netlify.toml` is already in the repo, so if you connect the Git repo instead
(New site from Git), Netlify auto-runs `npm run build` and publishes `dist/`
on every push.

Free tier: 100 GB bandwidth/month — plenty for launch.

## Option 2 — Vercel

1. Push this repo to GitHub
2. https://vercel.com → New Project → import the repo
3. Vercel auto-detects Vite → Deploy

Every push to the branch auto-deploys. Free hobby tier is enough.

## Option 3 — GitHub Pages

1. `npm run build` (base is already set to `./` so sub-path hosting works)
2. Push `dist/` contents to a `gh-pages` branch (or use the `gh-pages` npm package)
3. Repo Settings → Pages → select the branch

## Option 4 — Cloudflare Pages

Connect the repo; build command `npm run build`, output `dist`. Free, fast in India.

## Custom domain (when ready)

Buy a domain (GoDaddy/Namecheap/Hostinger, ~₹500–900/yr for a .in), then in
Netlify/Vercel → Domain settings → add it and point the DNS records they show.
HTTPS certificate is automatic and free.

## What works after deploy, as-is

- Login/signup (email + password; Google once the provider is enabled in Supabase — offline demo
  mode stores accounts in the visitor's browser only)
- Full resume builder, all templates, PDF download
- Settings, backup export/import, cloud sync status

## Production upgrades (phase 2, in order)

1. **Real accounts + data sync (done in code)** — create a Supabase project, run
   `supabase/migrations/0001_init.sql` + `supabase/seed/template_catalog.sql`,
   then set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as Netlify env vars.
   Full guide: `docs/SUPABASE.md`.
2. **Google login** — enable the Google provider in Supabase Auth and paste a Google Cloud
   OAuth *Web application* client ID + secret (Google redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`); **publish the OAuth consent
   screen** (while it is in “Testing”, Google blocks everyone except the listed test users
   and never redirects back to the app); add the site to Supabase →
   Authentication → URL Configuration. The app no longer needs a client ID in the repo
   (`src/config.ts` is gone) and it detects + explains a missing/incorrect setup instead of
   dead-ending. Verify with `npm run check:auth -- --app-url=https://your-site`.
   Full guide: `docs/GOOGLE-LOGIN.md`.
3. **AI assist (optional)** — set up the n8n workflow from `docs/N8N-INTEGRATION.md`
   and paste the webhook in Settings.

## Rollback

Every deploy is immutable on Netlify/Vercel — the dashboard keeps previous
deploys you can roll back to with one click.
