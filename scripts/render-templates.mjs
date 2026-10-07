#!/usr/bin/env node
/**
 * Renders the whole template catalogue into a single static HTML sheet:
 *
 *   node scripts/render-templates.mjs        → public/template-preview.html
 *   npm run dev  →  open /template-preview.html
 *
 * Why: every card in the design step is produced by components/Preview.tsx with
 * the palettes from src/lib/templates.ts and the styles from src/templates.css.
 * This script runs that *same* code path server-side (react-dom/server) and
 * inlines the real stylesheets, so the output is exactly what the app prints —
 * no second "design source of truth", nothing hand-drawn to drift.
 *
 * Useful for reviewing all 50 designs side by side, and for a visual diff after
 * touching a layout family or a palette.
 */

import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, 'tests', '.tmp');
const outFile = join(root, 'public', 'template-preview.html');
mkdirSync(tmp, { recursive: true });
mkdirSync(dirname(outFile), { recursive: true });

// ---- bundle the renderer + the catalogue so Node can import them -----------
const entry = join(tmp, 'preview-entry.tsx');
const bundle = join(tmp, 'preview-bundle.mjs');
writeFileSync(entry, `
  import { renderToStaticMarkup } from 'react-dom/server';
  import Preview from '../../src/components/Preview';
  import * as lib from '../../src/lib/templates';
  export { lib };
  export const render = (resume: any, tpl: any) => renderToStaticMarkup(<Preview r={resume} tpl={tpl} />);
`);
await build({
  entryPoints: [entry],
  bundle: true, format: 'esm', platform: 'node', target: 'node20',
  jsx: 'automatic', outfile: bundle, logLevel: 'error',
  external: ['react', 'react-dom'],
});
const { lib, render } = await import(pathToFileURL(bundle).href);
const { TEMPLATES, LAYOUT_META, CATEGORY_META, CATEGORY_ORDER, COLLECTION_NAME, templateById } = lib;

// ---- fixture: a full, realistic resume (every section populated) ----------
const resume = {
  id: 'preview', name: 'Preview', fieldId: 'marketing', templateId: '',
  createdAt: 0, updatedAt: 0, step: 6, fresher: false,
  personal: {
    fullName: 'Ananya Iyer',
    headline: 'Senior Marketing Manager',
    email: 'ananya.iyer@example.com',
    phone: '+91 98450 22117',
    city: 'Bengaluru',
    linkedin: 'linkedin.com/in/ananyaiyer',
    website: 'ananya.marketing',
    photo: '',
  },
  summary:
    'Marketing manager with nine years across D2C and B2B SaaS. Built demand engines that took two products from launch to ₹40 Cr ARR, and hired and led the four-person team that keeps them running.',
  bestExperience:
    'Rebuilt the onboarding funnel end to end in one quarter — activation went from 31% to 47% and the paid CAC payback window dropped from 11 months to 6.',
  experience: [
    {
      id: 'e1', role: 'Senior Marketing Manager', company: 'Kite Software', location: 'Bengaluru',
      start: 'Jul 2021', end: '', current: true,
      bullets: [
        'Own demand generation across paid, content and lifecycle: pipeline up 62% YoY on a flat budget',
        'Launched the customer research programme that reprioritised the roadmap around 3 real jobs',
        'Lead two marketers and one designer; run weekly experimentation reviews with product',
      ],
    },
    {
      id: 'e2', role: 'Marketing Manager', company: 'Saffron Foods', location: 'Pune',
      start: 'Aug 2017', end: 'Jun 2021', current: false,
      bullets: [
        'Took a D2C skincare line from ₹2 Cr to ₹28 Cr in four years across Amazon, Flipkart and own site',
        'Negotiated retailer listings into 340 stores; sell-through held above 71% every quarter',
      ],
    },
  ],
  education: [
    { id: 'd1', degree: 'MBA, Marketing', school: 'Symbiosis Institute of Business Management', location: 'Pune', year: '2017', note: 'Gold medal, batch top 5%' },
    { id: 'd2', degree: 'B.Com', school: 'Christ University', location: 'Bengaluru', year: '2015', note: '' },
  ],
  skills: [
    'Demand Generation', 'Brand Strategy', 'Google Ads', 'SEO', 'Marketing Analytics',
    'Content Strategy', 'SQL', 'Team Leadership', 'Budget Ownership', 'Positioning',
  ],
  projects: [
    { id: 'p1', name: 'Lifecycle Rebuild', link: 'case study available', points: 'Cut email churn 24% with a new 6-touch onboarding sequence\nRebuilt segmentation in HubSpot around activation cohorts' },
    { id: 'p2', name: 'Category Entry Playbook', link: 'internal, 18 pages', points: 'Documented the pricing and listing test we now run before every new SKU' },
  ],
  certs: [
    { id: 'c1', name: 'Google Analytics 4 Certification', issuer: 'Google', year: '2023' },
    { id: 'c2', name: 'HubSpot Inbound Marketing', issuer: 'HubSpot Academy', year: '2021' },
  ],
  languages: [
    { id: 'l1', name: 'English', level: 'Professional' },
    { id: 'l2', name: 'Hindi', level: 'Fluent' },
    { id: 'l3', name: 'Tamil', level: 'Native' },
  ],
  achievements: ['Marketer of the Year (internal), Kite Software 2024', 'Guest lecturer, Symbiosis — 3 cohorts'],
  hobbies: ['Trekking', 'Carnatic violin', 'Cricket'],
};

// ---- stylesheets: exactly what the app ships --------------------------------
const css = [
  join(root, 'src', 'styles.css'),
  join(root, 'src', 'templates.css'),
].map((f) => readFileSync(f, 'utf8')).join('\n');

const A4 = { w: 794, h: 1123 };
const SCALE = 0.34;

const card = (t) => {
  const html = render({ ...resume, templateId: t.id }, t);
  const fam = LAYOUT_META[t.layout];
  return `
    <article class="cell">
      <div class="cell-cap">
        <b>${t.name}</b>
        <span class="cell-fam">${fam.label}</span>
        <p>${t.tagline}</p>
        <ul>${t.strengths.map((s) => `<li>${s}</li>`).join('')}</ul>
      </div>
      <div class="cell-frame" style="width:${Math.round(A4.w * SCALE)}px;height:${Math.round(A4.h * SCALE)}px">
        <div class="cell-scale" style="transform:scale(${SCALE})">${html}</div>
      </div>
    </article>`;
};

const sections = CATEGORY_ORDER.map((c) => {
  const list = TEMPLATES.filter((t) => t.category === c);
  return `
  <section id="${c}">
    <header class="sec-head">
      <h2>${CATEGORY_META[c].label} <span>${list.length}</span></h2>
      <p>${CATEGORY_META[c].blurb}</p>
      <nav class="jump">${[...new Set(list.map((t) => t.layout))].map((l) => `<i>${LAYOUT_META[l].label}</i>`).join('')}</nav>
    </header>
    <div class="grid">${list.map(card).join('')}</div>
  </section>`;
}).join('\n');

const byFamily = {};
for (const t of TEMPLATES) byFamily[t.layout] = (byFamily[t.layout] ?? 0) + 1;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ResumeMakery — ${COLLECTION_NAME} collection, all ${TEMPLATES.length} templates</title>
<style>${css}</style>
<style>
  /* preview chrome only — the sheets below use the app's own styles */
  body { background: #eef1f6; color: #16202f; margin: 0; padding: 0 0 60px;
         font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
  .pv-top { background: linear-gradient(135deg, #0f2148, #1e4076); color: #fff; padding: 26px 30px 22px; }
  .pv-top h1 { margin: 0 0 6px; font-size: 25px; letter-spacing: .3px; }
  .pv-top p { margin: 0; color: #c9d6ea; font-size: 13px; max-width: 78ch; line-height: 1.6; }
  .pv-meta { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
  .pv-meta a, .pv-meta span { font-size: 11.5px; padding: 4px 10px; border-radius: 99px;
      background: rgba(255,255,255,.13); color: #fff; text-decoration: none; border: 1px solid rgba(255,255,255,.2); }
  .pv-meta a:hover { background: rgba(255,255,255,.24); }
  section { padding: 26px 30px 6px; }
  .sec-head { border-bottom: 2px solid #cfd8e6; margin-bottom: 18px; padding-bottom: 10px; }
  .sec-head h2 { margin: 0; font-size: 19px; letter-spacing: .3px; display: flex; align-items: baseline; gap: 9px; }
  .sec-head h2 span { font-size: 12px; color: #5a6a84; background: #e2e8f2; padding: 2px 8px; border-radius: 99px; }
  .sec-head p { margin: 5px 0 0; color: #55637b; font-size: 12.8px; }
  .jump { margin: 8px 0 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .jump i { font-style: normal; font-size: 10.5px; text-transform: uppercase; letter-spacing: .8px;
            color: #33415c; background: #e6ebf4; border: 1px solid #d3dbe9; padding: 2px 7px; border-radius: 4px; font-weight: 700; }
  .grid { display: flex; flex-wrap: wrap; gap: 22px; }
  .cell { width: ${Math.round(A4.w * SCALE)}px; background: #fff; border: 1px solid #dbe2ec; border-radius: 10px;
          padding: 12px 12px 14px; box-shadow: 0 6px 18px rgba(15, 33, 72, .07); }
  .cell-cap b { font-size: 14px; display: block; }
  .cell-cap p { margin: 4px 0 6px; font-size: 11.6px; color: #55637b; line-height: 1.5; min-height: 3.1em; }
  .cell-cap ul { margin: 0 0 9px; padding-left: 15px; font-size: 11px; color: #6a7791; line-height: 1.5; }
  .cell-fam { display: inline-block; margin-top: 3px; font-size: 10px; font-weight: 800; letter-spacing: 1px;
              text-transform: uppercase; color: #1e4076; background: #e7edf8; padding: 2px 7px; border-radius: 4px; }
  .cell-frame { position: relative; overflow: hidden; border: 1px solid #e6ebf3; border-radius: 4px; background: #fff; }
  .cell-scale { transform-origin: 0 0; position: absolute; inset: 0 auto auto 0; }
  .cell:hover .cell-frame { outline: 2px solid #1e4076; outline-offset: 1px; }
</style></head>
<body>
  <div class="pv-top">
    <h1>ResumeMakery — ${COLLECTION_NAME} collection</h1>
    <p>${TEMPLATES.length} original designs across ${Object.keys(byFamily).length} layout families and ${CATEGORY_ORDER.length} categories.
       Rendered by the app's own <code>Preview.tsx</code> with the real stylesheets inlined — this is what the
       design step prints, and what the PDF prints. Every design is written for ResumeMakery; none of them copies another product.</p>
    <div class="pv-meta">
      ${CATEGORY_ORDER.map((c) => `<a href="#${c}">${CATEGORY_META[c].label} ${TEMPLATES.filter((t) => t.category === c).length}</a>`).join('')}
      <span>${Object.keys(byFamily).length} families: ${Object.entries(byFamily).map(([l, n]) => `${LAYOUT_META[l].label} ${n}`).join(' · ')}</span>
    </div>
  </div>
  ${sections}
  <script>
    // A card is a review aid, not a button: the builder is where designs get applied.
    document.querySelectorAll('.cell').forEach(function (el) { el.title = 'Open the builder → Design step to apply this design'; });
    console.log('ResumeMakery preview: ${TEMPLATES.length} sheets, default design = ' + ${JSON.stringify(templateById('').id)});
  </script>
</body></html>
`;

writeFileSync(outFile, html);
console.log(`✓ wrote public/template-preview.html — ${TEMPLATES.length} sheets, ${Object.keys(byFamily).length} families, ${CATEGORY_ORDER.length} categories`);
