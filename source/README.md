> **Studio upgrade:** See [deployment, Google sign-in setup and verification](docs/STUDIO-UPGRADE.md) for the new dashboard, full template preview and reliability fixes.

# CraftCV — Professional Resume Studio

A resume builder for India with a navy-blue & silver theme. Login, fill your
details in 7 short steps (~10 minutes), pick from **50 professional templates across
20 layout families and 10 categories**, tuned for each of 10 career fields, and download a clean,
human-written-looking PDF. **100% free — no plans, no watermark, unlimited downloads.**
Resumes are stored in your own **Supabase** database (see `docs/SUPABASE.md`).

## Features

- **Public landing page** — visitors see the storefront (hero, live A4 preview,
  comparison table, template strip, FAQ) before signing in. “Start free” and
  import actions require login or a free account before opening the app.
  Signed-in users never see the landing.
  Crawlable static content + `SoftwareApplication`/`FAQPage` JSON-LD,
  `robots.txt`, `sitemap.xml` and an OG image ship in `index.html`/`public/`.
- **Resume Score (free “expert review”)** — a live 0–100 score card beside the
  ATS check: essentials, content quality (quantified bullets, action verbs,
  summary length) and human touches, each with an honest one-line tip.
  `src/lib/resumeScore.ts` + `src/components/ResumeScore.tsx`; tested by
  `npm run test:score`.
- **Cover letter builder (`#/cover-letter`)** — pick a resume, name the
  company and role, and the letter drafts itself from facts already on the
  resume (quantified bullets, tenure, skills); missing company becomes an
  explicit `[Company name]` placeholder, freshers never get invented years.
  Three layouts, fully editable body, live A4 preview, clean print pipeline.
  `src/lib/coverLetter.ts` + `src/components/CoverLetter.tsx`; tested by
  `npm run test:letter`.
- **AI always visible, honest by design** — the summary/bullet “Improve with
  AI” buttons now work even without the n8n webhook: an on-device fallback
  (`localPolish`, `localSummaryDraft` in `src/lib/ai.ts`) tidies the user’s
  own lines or drafts strictly from resume facts, labelled
  “Quick polish (offline)”. With a webhook configured it is a full model
  rewrite through `callAi`, humanized as before.
- **PWA (installable)** — `manifest.webmanifest` + generated icons +
  `public/sw.js` (network-first navigations, cache-first hashed assets,
  OCR/Supabase untouched). Registered **only in production builds** so dev
  never serves stale modules.
- **Private usage stats** — `src/lib/track.ts` counts signups,
  PDF downloads and cover letters in localStorage only; shown in Settings →
  “Usage on this device”. No third-party analytics, CSP untouched.
- **Login / Signup** — Supabase Auth (email + password, and Google via the standard redirect/PKCE flow). Google needs a one-time setup in the Supabase project *and* in Google Cloud (provider enabled, OAuth consent screen **published** — while it is in “Testing”, Google blocks everyone who is not a listed test user). The app probes all of it, names the cause (provider off, credentials mismatched, consent screen in Testing, address not whitelisted, `http://` page, iframe preview), shows the exact fix with deep links and copy-paste values, reports *“you left for Google and came back without finishing”* instead of failing silently, opens a real tab when the app is embedded in a frame, follows a sign-in finished in another tab, and has **“Test the connection”** in Settings (the browser twin of `npm run check:auth`) — see [`docs/GOOGLE-LOGIN.md`](docs/GOOGLE-LOGIN.md). Without Supabase env vars the app falls back to a browser-only demo account.
- **Cloud database** — every resume is saved to `public.resumes` in Supabase with row-level security; two-way sync with the offline copy, admin views for template usage & all resumes.
- **Dashboard** — resumes with live thumbnails, completion %, duplicate/delete, sample resume.
- **Import an existing resume — PDF, DOCX, TXT, JSON, and photos (JPG/PNG)** — real PDF text extraction with **pdf.js** (compressed streams, correct line & paragraph reconstruction). Pages without a text layer (scans, photos, image-only PDFs) are detected automatically and read by a **bundled, fully offline OCR engine** (Tesseract worker + wasm core + English model served from `/ocr/`, so no CDN and no CSP problems). Photos get desk-cropped, contrast-stretched and thresholded before recognition. A line-aware parser then pulls out contact info, headline, summary, experience (role / company / location / dates / bullets), education, skills, projects, certifications, achievements, languages and hobbies — and **fills every one of them straight into the form**, with the A4 resume rendered live beside it: type in the form, the resume changes with you. Nothing is uploaded — the file never leaves the tab. Pipeline: `src/lib/pdfExtract.ts` + `src/lib/ocr.ts` → `src/lib/resumeParser.ts` → `src/components/ResumeImporter.tsx` (draft bridge: `src/lib/importDraft.ts`).
- **Paste-to-import** — no file handy? Paste your resume text straight into the
  upload page ("No file? Paste your resume text instead") and the same line-aware
  parser structures it into the form — identical result to a `.txt` file.
- **ATS keyword check** — paste a job description and get a live match score:
  every JD keyword found on your resume (green) and the ones that are missing
  (amber), with a nudge to add them only if it is true. Runs 100% on-device,
  re-scores as you type, and remembers your JD per resume in local storage —
  the feature the paid builders gate behind a plan. `src/lib/ats.ts` +
  `src/components/AtsCheck.tsx`.
- **7-step wizard** — Basics → Summary → Experience → Education → Skills → Extras → Design, autosave + live A4 preview. Experience, education and project entries can be **reordered with ↑/↓** — most recent first, or however you want it to read.
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
  - **Categories (5 each)** — ATS & General · IT & Software · Data & Analytics ·
    Corporate & Finance · Sales & Marketing · Healthcare & Care · Education & Teaching ·
    Design & Creative · Leadership & Admin · Fresher & Entry.
  - Palettes stay ink-led and restrained (navy, graphite, steel, petrol, pine, oxblood,
    mocha, brass); a variant re-skins and re-tunes a family, it never forks layout code.
  - Review them all on one page: `npm run preview:templates` → open
    `/template-preview.html` (renders every sheet through `Preview.tsx` itself).
  - Seeded into `public.template_catalog` by `npm run seed:templates`.
- **Hobbies & Best Experience sections** — human touches that make the resume feel written, not generated.
- **PDF export** — print-perfect A4 via browser print, with **no watermark, no
  branding and no "generated by" link** in the file, and the file is saved under
  the resume's own name (`Amit Shukla — Senior Software Engineer.pdf`), never
  the app's title. The print stylesheet hides every app chrome element and the
  photo-placeholder box, and `npm run test:clean` renders all 50 templates to
  HTML and fails if any app string, link or placeholder survives into the PDF.
- **1, 2 or 3 pages — your call** — nothing in the editor caps the length.
  Add as many jobs, projects and bullets as you need; the live preview shows a
  page-break guide at every A4 boundary and an `A4 · N pages` badge counts the
  pages in real time. The printed PDF paginates exactly like the preview:
  entries (a job, a degree, a project) are never split across a page and a
  section heading is never stranded at the bottom of one.
- **JSON export** — one-click `.json` download of the full resume (the same
  file the importer reads back), for backup or moving machines.
- **Sample resume** — "Amit Shukla, Senior Software Engineer", a finished IT
  resume with quantified bullets and a real layout, loads into the editor from
  the dashboard ("Load the sample") with every field editable.
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
npm test              # all nine suites (auth, templates, score, letter, clean export, ATS, OCR, PDF, autofill)
npm run test:templates # catalogue shape + every design rendered in all 10 fields
npm run test:clean    # every template SSR'd: no branding/links/placeholders; print stays A4 & multi-page safe
npm run test:ats      # JD keyword extraction + match scoring + per-resume JD persistence
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

- [Competitor analysis & how CraftCV answers it](docs/COMPETITORS.md)
- [Google login — setup & troubleshooting](docs/GOOGLE-LOGIN.md)
- [Frontend & UI/UX plan](docs/FRONTEND-PLAN.md)
- [n8n integration blueprint](docs/N8N-INTEGRATION.md)
- [Pricing research](docs/PRICING.md)
