# CraftCV — Professional Resume Studio

A resume builder for India with a navy-blue & silver theme. Login, fill your
details in 7 short steps (~10 minutes), pick from **50 templates across 5
layout families, tuned for each of 10 career fields**, and download a clean,
human-written-looking PDF.

## Features

- **Login / Signup** — email + password and a Google button (demo mode runs fully in-browser; `src/config.ts` holds the Google Client ID slot for real OAuth).
- **Dashboard** — resumes with live thumbnails, completion %, duplicate/delete, sample resume.
- **Import existing resume (PDF / DOCX / TXT / JSON)** — real PDF text extraction with **pdf.js** (compressed streams, correct line & paragraph reconstruction), automatic **in-browser OCR fallback (tesseract.js)** for scanned/image PDFs, then a line-aware parser that pulls out contact info, summary, experience (role / company / dates / bullets), education, skills, projects, certifications and achievements into an editable review screen. Everything runs locally in the browser — no server upload. Pipeline: `src/lib/pdfExtract.ts` → `src/lib/resumeParser.ts` → `src/components/ResumeImporter.tsx`.
- **7-step wizard** — Basics → Summary → Experience → Education → Skills → Extras → Design, autosave + live A4 preview.
- **Profile photo upload** — shown on all 50 templates (auto-resized in-browser).
- **Mandatory fields enforced** — name, title, email, phone, city, summary, 1 job (or fresher toggle), 1 education entry, 3+ skills. Download unlocks at 100%.
- **10 career fields** — each ships 3 summary templates, 6 bullet templates, suggested skills (Communication & Decision Making in every field), project ideas.
- **50 templates × 10 fields = 500 combos** — 5 layout families (Sidebar, Classic, Minimal, Statement, Dense) × 10 hand-tuned palette/structural variants each. Section order/emphasis re-tunes per field; best picks ★ starred.
- **Hobbies & Best Experience sections** — human touches that make the resume feel written, not generated.
- **PDF export** — print-perfect A4 via browser print.
- **AI assist (optional, hidden by default)** — can run through an n8n webhook; if not configured, no AI surfaces appear anywhere. Blueprint kept in `docs/N8N-INTEGRATION.md` for the owner.

## Plans

- **Free ₹0** — 1 resume, 2 templates, watermark-free PDFs.
- **Pro ₹20 one-time** — unlimited resumes, all 50 templates × 10 fields, all sections.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in dist/
```

## Importer tests

End-to-end tests for the upload pipeline (build a compressed PDF → extract with
pdf.js → parse; OCR a scanned-image resume → parse; DOCX parse):

```bash
npx esbuild tests/test-pdf-parse.mjs --bundle --platform=node --format=esm \
  --outfile=.tmptest/run.mjs --external:pdfjs-dist --external:tesseract.js && node .tmptest/run.mjs
node tests/test-ocr.mjs tests/scan-resume.jpg   # needs `npm i -D @tesseract.js-data/eng` in sandboxes without CDN access
```

Browsers load the OCR engine from the jsDelivr CDN at runtime (first OCR only);
no data ever leaves the device — only the engine files are downloaded.

## Docs (internal)

- [Frontend & UI/UX plan](docs/FRONTEND-PLAN.md)
- [n8n integration blueprint](docs/N8N-INTEGRATION.md)
- [Pricing research](docs/PRICING.md)
