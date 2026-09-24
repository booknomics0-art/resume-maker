# CraftCV — Professional Resume Studio

A resume builder for India with a navy-blue & silver theme. Login, fill your
details in 7 short steps (~10 minutes), pick from **165 templates across 16
layout families (including 36 Resume.io templates and 24 Canva designs), tuned for each of 10 career fields**, and download a clean,
human-written-looking PDF. **100% free — no plans, no watermark, unlimited downloads.**
Resumes are stored in your own **Supabase** database (see `docs/SUPABASE.md`).

## Features

- **Login / Signup** — Supabase Auth (email + password, and Google via the standard redirect/PKCE flow). Google needs the provider enabled once in the Supabase project; the app probes it, explains exactly what to fix (deep links + copy-paste values) and never dead-ends on Supabase's raw JSON error — see [`docs/GOOGLE-LOGIN.md`](docs/GOOGLE-LOGIN.md) and `npm run check:auth`. Without Supabase env vars the app falls back to a browser-only demo account.
- **Cloud database** — every resume is saved to `public.resumes` in Supabase with row-level security; two-way sync with the offline copy, admin views for template usage & all resumes.
- **Dashboard** — resumes with live thumbnails, completion %, duplicate/delete, sample resume.
- **Import an existing resume — PDF, DOCX, TXT, JSON, and photos (JPG/PNG)** — real PDF text extraction with **pdf.js** (compressed streams, correct line & paragraph reconstruction). Pages without a text layer (scans, photos, image-only PDFs) are detected automatically and read by a **bundled, fully offline OCR engine** (Tesseract worker + wasm core + English model served from `/ocr/`, so no CDN and no CSP problems). Photos get desk-cropped, contrast-stretched and thresholded before recognition. A line-aware parser then pulls out contact info, headline, summary, experience (role / company / location / dates / bullets), education, skills, projects, certifications, achievements, languages and hobbies — and **fills every one of them straight into the form**, with the A4 resume rendered live beside it: type in the form, the resume changes with you. Nothing is uploaded — the file never leaves the tab. Pipeline: `src/lib/pdfExtract.ts` + `src/lib/ocr.ts` → `src/lib/resumeParser.ts` → `src/components/ResumeImporter.tsx` (draft bridge: `src/lib/importDraft.ts`).
- **7-step wizard** — Basics → Summary → Experience → Education → Skills → Extras → Design, autosave + live A4 preview.
- **Profile photo upload** — shown on all templates (auto-resized in-browser).
- **Mandatory fields enforced** — name, title, email, phone, city, summary, 1 job (or fresher toggle), 1 education entry, 3+ skills. Download unlocks at 100%.
- **10 career fields** — each ships 3 summary templates, 6 bullet templates, suggested skills (Communication & Decision Making in every field), project ideas.
- **165 templates across 16 families**:
  - **36 official Resume.io templates** (London, Santiago, Dublin, Helsinki, Seoul, Specialist, Berlin, Athens, New York, Vienna, Prague, Brussels, Sydney, Shanghai, Stockholm, Paris, Madrid, Rome, Milan, Toronto, Singapore, Amsterdam, Barcelona, Oslo, Chicago, Copenhagen, Boston, Geneva, Tokyo, Lisbon, Moscow, Rio, Vancouver, Cape Town, Academic, Entry Level).
  - **24 Canva-style resume templates** (White Modern Business Admin, B&W Corporate, Clean Minimalist, Gray & White Clean, Freelancer, Elegant Classic, Monogrammed, Blue Professional, Student Simple, White Gold Luxury, Abu-Abu Minimalist, Dark Orange Banner, Copywriter Editorial, Science & Engineering Ledger, White Beige Studio, Blue Minimal ATS, Pink Pastel Creative, Blue & Gray Split, Green & Black Metro, Orange Gray Spine, Minimalist Photographer, Infographic Skills, Navy Modern, Teal Engineer).
  - **105 Core & Studio templates** across 16 layout families (Sidebar, Classic, Minimal, Statement, Dense, Portrait, Studio, Monogram, Timeline, Infographic, Corporate, Editorial, Spine, Soft, Banner, Ledger).
  - Offline catalog and schema exported in `downloaded_templates/` (`resume_io_templates.json`, `canva_templates.json`, `README.md`).
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

## Importer tests

End-to-end tests for the upload pipeline. They run the **real** extraction and
parsing code in Node (esbuild bundles `src/lib/*.ts`; `@napi-rs/canvas` stands in
for the browser canvas, and the tests skip politely if it is missing):

```bash
npm test              # all four suites (Google auth, OCR, PDF, autofill)
npm run test:ocr      # photo of a resume → OCR → fields   (tests/scan-resume.jpg)
npm run test:pdf      # text PDF (no OCR) + image-only PDF (the reported bug)
npm run test:autofill # extracted data → form → live resume → editor hand-over
npm run test:auth     # Google callback parsing, error mapping, provider probe, redirect flow
node tests/test-image-ocr.mjs path/to/your-scan.jpg   # try any file
```

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
