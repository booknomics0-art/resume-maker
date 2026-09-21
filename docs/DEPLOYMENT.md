# Deployment guide — CraftCV

CraftCV is a fully static site. `npm run build` produces a `dist/` folder that
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

- Login/signup (demo mode — accounts stored in the visitor's browser)
- Full resume builder, all templates, PDF download
- Pricing page, settings, backup export

## Production upgrades (phase 2, in order)

1. **Real accounts + data sync** — add Supabase (free tier): swap the functions in
   `src/lib/auth.ts` and `src/lib/store.ts` for Supabase calls. Signatures are
   already backend-shaped, so it is mostly copy-paste.
2. **Google login** — create OAuth Client ID in Google Cloud Console, paste in
   `src/config.ts` (`GOOGLE_CLIENT_ID`).
3. **₹20 Pro payments** — Razorpay Payment Link (no code needed to start):
   after payment, unlock all templates for the user. Later, Razorpay webhooks +
   Supabase for proper entitlements.
4. **AI assist (optional)** — set up the n8n workflow from `docs/N8N-INTEGRATION.md`
   and paste the webhook in Settings.

## Rollback

Every deploy is immutable on Netlify/Vercel — the dashboard keeps previous
deploys you can roll back to with one click.
