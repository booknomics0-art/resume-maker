# Competitors — what we saw and what we built about it

Researched June–September 2026 (pricing verified on the vendors' own sites).
The file is the working record for "notice competitors and solve for them" —
each gap below has a CraftCV answer, and the answers are all **free, in the
basic flow, on-device**.

## Who we compared

| Builder | Free tier | Paid | What the free tier *actually* gives you |
|---|---|---|---|
| **Zety** | build in-app | $1.95 trial → $25.95 / 4 wks | **TXT-only** export; the formatted PDF is the paywall |
| **Novoresume** | 1 resume, 1 page, 3 fonts | ~$19.99–21.99/mo | downloads **carry a watermark**; the editor is guided and good |
| **Resume.io** | build in-app | $2.95 trial → $29.95 / 4 wks | **TXT-only** download; formatted export is paid |
| **Rezi** | 1 resume, **3 PDF downloads** | $29/mo or $149 lifetime | the standout: **live ATS score + keyword targeting from a pasted job description** |
| **Kickresume** | 3 resumes, 1 PDF | ~$20/mo | AI drafting + design |
| **Canva / Teal / ResuFit** | small free AI allowances | credit packs | AI drafting / per-job tailoring |

The industry "trap" pattern: trial auto-renews, the pretty PDF is paywalled,
or the free file arrives watermarked. Every paid feature we care about is one
of four: (1) a clean PDF, (2) watermark removal, (3) ATS scoring vs a JD,
(4) upload-and-edit an existing resume.

## The four traps — and CraftCV's answer

1. **Watermark / branded free files** (Novoresume): CraftCV's free PDF is the
   final file — `tests/test-clean-export.mjs` SSR-renders **all 50 templates**
   plus the sample and fails if any app branding string, `<a>`/`href`, or the
   photo-placeholder box survives into the print output. The print root is
   exactly `<Preview r={r} />` (asserted in the same test), and `.ph`
   placeholders are `display: none` on paper.
2. **Formatted-export paywall** (Zety, Resume.io): no export exists in
   CraftCV that is not a clean A4 PDF. **Unlimited** downloads.
3. **ATS scoring behind a plan** (Rezi's core): `src/lib/ats.ts` +
   `AtsCheck.tsx` — paste a JD and get a live score with covered/missing
   keyword chips, re-computed on every keystroke of the JD *or the resume*,
   stored per resume in local storage, never uploaded. `tests/test-ats.mjs`
   covers extraction and scoring (16 checks).
4. **Upload & edit as an afterthought**: ours is a first-class citizen —
   PDF text layer via pdf.js, image-only PDFs/photos via the bundled offline
   OCR engine, DOCX XML text runs, plain text by file *or paste*, and JSON
   round-trip of our own exports. Everything lands in the editor as editable
   fields with the resume rendered live beside the form, and the result can
   be re-downloaded clean.

## Design decisions taken from the research

- **Template categories like Novoresume's classified browser**: 50 templates
  grouped by *layout family* (20) **and** *audience* (10 categories) — the
  gallery filters on both axes.
- **Rezi's live re-score**: the ATS card sits above every editing step, so the
  score reacts to edits anywhere in the resume, not just when you re-run it.
- **Honest copy on keyword gaps**: "add them if (and only if) it is true" —
  we point users at the Skills section, never pad for them.
- **On-device privacy as a selling point**: parsing, OCR, ATS scoring and
  backups all run in the tab; the only server call is the user's own resume
  sync.
- **Length is the user's call** (Novoresume's free tier is capped at 1 page):
  1, 2 or 3 A4 pages work through the exact same flow — live page-break
  guides + a page-count badge in the editor, and clean pagination in the PDF
  (entries never split, headings never orphaned).

## What we deliberately did NOT copy

- Trial pricing, credit packs, per-download metering.
- AI "improve my bullet" buttons as the main product (kept optional/hidden,
  n8n blueprint in `docs/N8N-INTEGRATION.md`).
- Template families that are re-skins pretending to be new designs.
