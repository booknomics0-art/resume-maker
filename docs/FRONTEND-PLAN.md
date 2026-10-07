# ResumeMakery — Frontend & UI/UX Plan (detailed)

Theme: **navy blue with silver** throughout (design tokens in `src/styles.css`).

## 1. Product goal

A person lands on the site, fills their details in **under 10 minutes**, picks a
template tuned to their field, and downloads a clean PDF that looks written by a
human professional — not generated.

## 2. Information architecture

```
Dashboard ──────── list of resumes, stats, new/sample entry point
 ├─ Editor ─────── 7-step wizard + live A4 preview (sticky)
 │    ├─ 1 Basics (mandatory fields enforced)
 │    ├─ 2 Summary (field example + AI rewrite)
 │    ├─ 3 Experience (fresher toggle, bullets)
 │    ├─ 4 Education
 │    ├─ 5 Skills (click-to-add suggestions per field)
 │    ├─ 6 Extras (projects, certs, languages, achievements)
 │    └─ 7 Design (5 templates, starred per field)
 ├─ Pricing ────── plans + competitor comparison table
 ├─ n8n + AI setup ─ step-by-step webhook guide
 └─ Settings ───── webhook URL, key, test connection, backup/export
```

Routing is hash-based (`#/editor/:id`) so it works on any static host with zero
server config.

## 3. The 10-minute flow (point-by-point)

| Step | Time budget | Why it's fast |
|---|---|---|
| Basics | 1.5 min | 8 small inputs, field selector as one-click chips |
| Summary | 1.5 min | one-click "field example" + AI rewrite |
| Experience | 2.5 min | structured cards, fresher toggle, example bullets as placeholders |
| Education | 1 min | 5 inputs per entry |
| Skills | 1 min | tap suggested chips, no typing needed |
| Extras | 1.5 min | everything optional |
| Design | 1 min | click a thumbnail, done |

Enablers:
- **Per-field example content** (`src/lib/fields.ts`): each of the 10 fields ships
  realistic summary text, bullet examples, suggested skills and project ideas.
  Placeholders show real sentences, not "enter text here".
- **Autosave** after every keystroke (debounced 350ms → localStorage). Closing the
  tab never loses work.
- **Live preview** on the right updates per keystroke, so users see the finished
  resume while typing — motivation to finish.
- Progress meter shows **% complete and minutes left**.

## 4. Mandatory fields (requirement #1)

Validation is defined once in `missingRequirements()` (`src/lib/types.ts`) and used
by the stepper, the progress meter, the download gate and step-level gating:

Mandatory: full name · target title · valid email · phone · city · 2-3 line summary ·
≥1 job entry (or "fresher" toggle) · ≥1 education entry · ≥3 skills.

Rules:
- "Next" button blocks with inline, itemized errors (no silent disables).
- Download PDF unlocks only at 100% — guarantees no resume goes out incomplete.
- Everything else is optional, keeping the happy path short.

## 5. Templates (requirements #2 & #3) — 5 designs × 10 fields = 50 combos

Five base designs in navy/silver, each genuinely re-tuned per field via
`sectionOrder()` in `src/lib/templates.ts`:

| Template | Character | Fields that star it |
|---|---|---|
| Modern Split | navy sidebar, silver accents | IT, Data, Design, Marketing |
| Executive Classic | serif, centered, boardroom tone | Finance, Operations, Sales, HR |
| Sharp Minimal | airy, quiet, silver section labels | Design, Education, Healthcare |
| Metro Two-Tone | navy header band, silver chips | Marketing, Sales, IT |
| Compact Pro | dense single column, ATS-first | Data, Finance, Healthcare, Ops, Education |

Per-field tuning changes **section order and emphasis** (e.g. skills move directly
under the summary for IT/Data/Design; experience leads for Finance/HR). In the
Design step, templates best for the chosen field get a ★ badge and sort first.

All templates print pixel-perfect to A4 through a dedicated `@media print` layer
(hidden full-size sheet, `@page { size: A4; margin: 0 }`), so "Download PDF" is just
`window.print()` — no heavy PDF library, works offline.

## 6. Visual language

- Palette tokens: navy 950→500 for surfaces/buttons, silver 100→500 for borders,
  dividers and accents; white paper for the sheet.
- Type: system UI stack for the app; Georgia serif for the Classic template only.
- Cards with 12px radius, soft navy-tinted shadows; pill stepper; chip selectors.
- Dark navy sidebar (sticky) keeps the product chrome on-brand while the content
  area stays light and readable.

## 7. AI without AI smell

Three layers of defense (requirement: "bilkul AI-generated na lage"):

1. **Prompt rules** — the n8n system prompt bans buzzwords, forbids inventing
   facts, forces plain verbs and the user's own numbers (`HUMAN_WRITING_RULES`).
2. **n8n cleanup node** — strips markdown, chat preamble, banned words server-side.
3. **Client humanizer** — `humanize()` in `src/lib/ai.ts` runs the same banned-word
   replacements on everything returned, as a final filter.

AI is always **assist, not author**: buttons rewrite the user's own text; one-click
field examples are the no-AI path.

## 8. State & persistence

- localStorage keys: `craftcv.resumes.v1`, `craftcv.ai.v1`.
- JSON backup export in Settings; duplicate/delete on dashboard cards.
- No accounts needed for v1 — zero friction. (Path to accounts: same JSON blob
  moves to a backend table unchanged.)

## 9. Responsiveness

- ≥1180px: two-pane editor (form + sticky preview).
- <1180px: preview drops below the form; sidebar becomes a top bar.
- Sheet thumbnails scale via a `ResizeObserver`-driven transform, never reflowed.

## 10. Tech stack

Vite + React 18 + TypeScript, hand-written CSS design system (no framework lock-in),
zero backend required. Deployable to Netlify/Vercel/any static host as-is.
