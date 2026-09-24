# CraftCV — Professional Resume Studio

A resume builder for India with a navy-blue & silver theme. Login, fill your
details in 7 short steps (~10 minutes), pick from **50 professional templates across
20 layout families and 10 categories**, tuned for each of 10 career fields, and download a clean,
human-written-looking PDF. **100% free — no plans, no watermark, unlimited downloads.**
Resumes are stored in your own **Supabase** database (see `docs/SUPABASE.md`).

## Features

- **Login / Signup** — Supabase Auth (email + password, and Google via the standard redirect/PKCE flow). Google needs a one-time setup in the Supabase project *and* in Google Cloud (provider enabled, OAuth consent screen **published** — while it is in “Testing”, Google blocks everyone who is not a listed test user). The app probes all of it, names the cause (provider off, credentials mismatched, consent screen in Testing, address not whitelisted, `http://` page, iframe preview), shows the exact fix with deep links and copy-paste values, reports *“you left for Google and came back without finishing”* instead of failing silently, opens a real tab when the app is embedded in a frame, follows a sign-in finished in another tab, and has **“Test the connection”** in Settings (the browser twin of `npm run check:auth`) — see [`docs/GOOGLE-LOGIN.md`](docs/GOOGLE-LOGIN.md). Without Supabase env vars the app falls back to a browser-only demo account.
- **Cloud database** — every resume is saved to `public.resumes` in Supabase with row-level security; two-way sync with the offline copy, admin views for template usage & all resumes.
- **Dashboard** — resumes with live thumbnails, completion %, duplicate/delete, sample resume.
- **Import an existing resume — PDF, DOCX, TXT, JSON, and photos (JPG/PNG)** — real PDF text extraction with **pdf.js** (compressed streams, correct line & paragraph reconstruction). Pages without a text layer (scans, photos, image-only PDFs) are detected automatically and read by a **bundled, fully offline OCR engine** (Tesseract worker + wasm core + English model served from `/ocr/`, so no CDN and no CSP problems). Photos get desk-cropped, contrast-stretched and thresholded before recognition. A line-aware parser then pulls out contact info, headline, summary, experience (role / company / location / dates / bullets), education, skills, projects, certifications, achievements, languages and hobbies — and **fills every one of them straight into the form**, with the A4 resume rendered live beside it: type in the form, the resume changes with you. Nothing is uploaded — the file never leaves the tab. Pipeline: `src/lib/pdfExtract.ts` + `src/lib/ocr.ts` → `src/lib/resumeParser.ts` → `src/components/ResumeImporter.tsx` (draft bridge: `src/lib/importDraft.ts`).
- **7-step wizard** — Basics → Summary → Experience → Education → Skills → Extras → Design, autosave + live A4 preview.
- **Profile photo upload** — shown on all templates (auto-resized in-browser).
- **Mandatory fields enforced** — name, title, email, phone, city, summary, 1 job (or fresher toggle), 1 education entry, 3+ skills. Download unlocks at 100%.
- **10 career fields** — each ships 3 summary templates, 6 bullet templates, suggested skills (Communication & Decision Making in every field), project ideas.
- **50 professional templates · 20 layout families · 10 categories** — one original
  design per row in `src/lib/templates.ts`. Grouped by *how the page is built* and by
  *who it is for*, so the gallery filters on both axes:
  - **Families** — Dense/ATS, Sidebar, Classic, Minimal, Corporate grid, Statement band,
    Ledger, Timeline, Portrait, Studio panel, Monogram, Skills bars, Editorial, Spine,
    Soft panels, Banner, plus the four display families: **Masthead** (oversized name +
    facts rail), **Panel Band** (photo band over a tinted rail), **Tint Sheet** (page wash,
    one tracked name, boxed skills) and **Gradient Spine** (gradient rail, centred headings).
  - **Categories (5 each)** — ATS & Plain · Corporate & Finance · Tech & Product ·
    Design & Creative · Executive & Board · Academic & Research · Healthcare & Care ·
    Education & Teaching · Sales & Marketing · Fresher & Switch.
  - Palettes stay ink-led and restrained (navy, graphite, steel, petrol, pine, oxblood,
    mocha, brass); a variant re-skins and re-tunes a family, it never forks layout code.
  - Review them all on one page: `npm run preview:templates` → open
    `/template-preview.html` (renders every sheet through `Preview.tsx` itself).
  - Seeded into `public.template_catalog` by `npm run seed:templates`.
- **Hobbies & Best Experience sections** — human touches that make the resume feel written, not generated.
- **PDF export** — print-perfect A4 via browser print.
- **AI assist (optional, hidden by default)** — can run through an n8n webhook; if not configured, no AI surfaces appear anywhere. Blueprint kept in `docs/N8N-INTEGRATION.md` for the owner.

## Pricing

None. CraftCV is completely free — there is no billing code in the app.

## Database (Supabase)

1. Create a project, run `supabase/migrations/0001_init.sql` then `supabase/seed/template_catalog.sql` in the SQL editor.
2. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (local) / Netlify env vars.
3. Full guide with admin queries: `docs/SUPABASE.md`. Regenerate the catalog seed with `npm run seed:templates`.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static build in dist/
npm run check:auth   # is Google login ready on the Supabase project?
```

`predev`/`prebuild` run `scripts/predev.mjs`, which best-effort regenerates the two
things that are not in git — the offline OCR engine (`public/ocr/`) and
`public/template-preview.html` (every template rendered through `Preview.tsx`).
If either fails the dev server still starts.

## Importer tests

End-to-end tests for the upload pipeline. They run the **real** extraction and
parsing code in Node (esbuild bundles `src/lib/*.ts`; `@napi-rs/canvas` stands in
for the browser canvas, and the tests skip politely if it is missing):

```bash
npm test              # all five suites (Google auth, templates, OCR, PDF, autofill)
npm run test:templates # catalogue shape + every design rendered in all 10 fields
npm run test:ocr      # photo of a resume → OCR → fields   (tests/scan-resume.jpg)
npm run test:pdf      # text PDF (no OCR) + image-only PDF (the reported bug)
npm run test:autofill # extracted data → form → live resume → editor hand-over
npm run test:auth     # Google callback parsing, error mapping, provider probe, redirect flow
node tests/test-image-ocr.mjs path/to/your-scan.jpg   # try any file
```

`npm run test:templates` renders every template with `react-dom/server` in each career
field, and fails if the catalogue and `supabase/seed/template_catalog.sql` drift, or if a
template row ever claims to be a copy of someone else's product — every design in
`src/lib/templates.ts` is written for CraftCV.

`@napi-rs/canvas` is a dev-only dependency for these tests
(`npm i -D @napi-rs/canvas`); the app itself never imports it.

## Offline OCR engine

Scanned pages and photos are read on the device. The engine's three files —
`worker.min.js`, `tesseract-core-*-lstm.wasm.js` and `eng.traineddata.gz`
(~11 MB total) — are **vendored from `node_modules` into `public/ocr/`** by
`scripts/copy-ocr-assets.mjs`, which runs automatically on `npm run dev` and
`npm run build`. They are fetched only when a user actually imports a scan, and
the English model is cached in the browser afterwards.

This is deliberate: tesseract.js defaults to jsDelivr, but CraftCV ships a strict
CSP (`script-src 'self'`, `connect-src 'self'`) plus
`Cross-Origin-Embedder-Policy: require-corp`, so CDN downloads are blocked — the
old build failed every scanned upload with *"OCR could not recover it"* for that
reason. `public/ocr/` is generated, not committed (see `.gitignore`), and the
CSP keeps `'wasm-unsafe-eval'` because WebAssembly compilation is CSP-gated too.
Never widen `script-src`/`connect-src` to a CDN — point the engine at our own
origin instead.

## Docs (internal)

- [Google login — setup & troubleshooting](docs/GOOGLE-LOGIN.md)
- [Frontend & UI/UX plan](docs/FRONTEND-PLAN.md)
- [n8n integration blueprint](docs/N8N-INTEGRATION.md)
- [Pricing research](docs/PRICING.md)
