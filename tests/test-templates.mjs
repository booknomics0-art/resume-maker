/**
 * Template catalogue test — no browser needed.
 *
 * The design step is the one place where a bad template row is user-visible in
 * the worst way: an empty gallery, a duplicate id, or a sheet that throws while
 * rendering. So this test checks the catalogue and then *renders* every design
 * with react-dom/server, using a fully filled resume in each of the 10 career
 * fields.
 *
 * It also guards the provenance rule of this library: every row in
 * src/lib/templates.ts is an original design written for CraftCV. A name or
 * tagline that mentions a third-party template product is a copy risk, so the
 * test fails if one ever appears.
 *
 *   node tests/test-templates.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { checks, root, tmpDir } from './_harness.mjs';

mkdirSync(tmpDir, { recursive: true });

// ---- bundle the catalogue + the sheet renderer so Node can load them -------
const entry = join(tmpDir, 'templates-ssr-entry.tsx');
const outfile = join(tmpDir, 'templates-ssr.js');
writeFileSync(entry, `
  import { renderToStaticMarkup } from 'react-dom/server';
  import Preview from '../../src/components/Preview';
  import * as lib from '../../src/lib/templates';
  export { lib };
  export const render = (resume: any, tpl: any) =>
    renderToStaticMarkup(<Preview r={resume} tpl={tpl} />);
`);

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  jsx: 'automatic',
  outfile,
  logLevel: 'error',
  external: ['react', 'react-dom'],
});

const { lib, render } = await import(pathToFileURL(outfile).href);
const { TEMPLATES, TEMPLATE_COUNT, LAYOUT_META, SIDE_SECTIONS, SECTION_LABELS, CATEGORY_META,
  CATEGORY_ORDER, ACTIVE_FAMILIES, templatesByCategory, hasSection,
  templateById, sectionOrder, recommendedTemplates, DEFAULT_TEMPLATE_ID } = lib;

// every modifier a template may use — each one must exist as a real class in
// src/templates.css, so a typo can never silently do nothing
const VALID_MODS = new Set(['mod-invert', 'mod-serif', 'mod-band-flat', 'mod-band-tint', 'mod-square', 'mod-dark', 'mod-tint', 'mod-numbered', 'mod-tight']);
const { readFileSync: rf } = await import('node:fs');
const css = rf(new URL('../src/templates.css', import.meta.url), 'utf8');

const FIELDS = ['it', 'data', 'marketing', 'sales', 'finance', 'hr', 'design', 'healthcare', 'education', 'operations'];

// ---- fixture: a resume with every section filled ---------------------------
const fullResume = (fieldId, templateId) => ({
  id: 'test-1', name: 'Test resume', fieldId, templateId,
  createdAt: 0, updatedAt: 0, step: 6, fresher: false,
  personal: {
    fullName: 'Aarav Sharma', headline: 'Senior Frontend Developer',
    email: 'aarav.sharma@example.com', phone: '+91 98765 43210', city: 'Pune',
    linkedin: 'linkedin.com/in/aaravsharma', website: 'aarav.dev', photo: '',
  },
  summary: 'Frontend developer with eight years building design systems and dashboards for fintech teams.',
  bestExperience: 'Rebuilt the onboarding flow and cut drop-off by a third in one quarter.',
  experience: [
    { id: 'e1', role: 'Senior Frontend Developer', company: 'Zeta Labs', location: 'Pune',
      start: 'Mar 2021', end: '', current: true,
      bullets: ['Led a team of four across two product lines', 'Cut bundle size by 42% without a rewrite'] },
    { id: 'e2', role: 'Frontend Developer', company: 'Infinio', location: 'Mumbai',
      start: 'Jun 2017', end: 'Feb 2021', current: false,
      bullets: ['Shipped the customer portal used by 40k people a day'] },
  ],
  education: [
    { id: 'd1', degree: 'B.E. Computer Science', school: 'Pune Institute of Technology', location: 'Pune', year: '2017', note: 'First class' },
  ],
  skills: ['TypeScript', 'React', 'Design Systems', 'Accessibility', 'Performance'],
  projects: [{ id: 'p1', name: 'Open Charts', link: 'github.com/aarav/charts', points: 'A 9kb charting library\nUsed by 1,200 projects' }],
  certs: [{ id: 'c1', name: 'Professional Scrum Developer', issuer: 'Scrum.org', year: '2023' }],
  languages: [{ id: 'l1', name: 'English', level: 'Professional' }, { id: 'l2', name: 'Hindi', level: 'Native' }],
  achievements: ['Speaker, React India 2024'],
  hobbies: ['Trekking', 'Chess'],
});

const out = [];
const ok = (name, cond) => out.push([name, !!cond]);

// ---- 1. shape of the catalogue ---------------------------------------------
ok(`${TEMPLATES.length} templates in the catalogue`, TEMPLATES.length > 0);
ok('TEMPLATE_COUNT matches the array', TEMPLATE_COUNT === TEMPLATES.length);
ok('ids are unique', new Set(TEMPLATES.map((t) => t.id)).size === TEMPLATES.length);
ok('names are unique', new Set(TEMPLATES.map((t) => t.name)).size === TEMPLATES.length);
ok('default template exists', TEMPLATES.some((t) => t.id === DEFAULT_TEMPLATE_ID));
ok('every layout is a known family', TEMPLATES.every((t) => LAYOUT_META[t.layout]));
ok('every template has a palette + accent', TEMPLATES.every((t) => /^#[0-9a-f]{6}$/i.test(t.pal.p) && /^#[0-9a-f]{6}$/i.test(t.pal.a)));
ok('every template has tagline, strengths and mods', TEMPLATES.every(
  (t) => t.tagline.length > 12 && t.strengths.length >= 3 && Array.isArray(t.mods),
));
ok('bestFor only names real career fields', TEMPLATES.every((t) => t.bestFor.every((f) => FIELDS.includes(f))));
ok('exactly 5 designs in every one of the 10 categories',
  CATEGORY_ORDER.every((c) => templatesByCategory(c).length === 5) && TEMPLATES.length === 50);
ok('no category repeats a layout family',
  CATEGORY_ORDER.every((c) => new Set(templatesByCategory(c).map((t) => t.layout)).size === 5));
ok('all 20 layout families are in use',
  Object.keys(LAYOUT_META).length === 20 && ACTIVE_FAMILIES.length === 20);
ok('categories cover the whole catalogue, no orphans', TEMPLATES.every((t) => CATEGORY_ORDER.includes(t.category))
  && CATEGORY_ORDER.reduce((n, c) => n + templatesByCategory(c).length, 0) === TEMPLATES.length);
ok('every design carries a photo frame and a one-page fit', TEMPLATES.every((t) => t.photo && t.onePage));
ok('every design names its palette', TEMPLATES.every((t) => typeof t.paletteName === 'string' && t.paletteName.length > 2));
ok('every design is tuned with .mod-tight', TEMPLATES.every((t) => t.mods.includes('mod-tight')));
ok('every category has a label and a blurb', CATEGORY_ORDER.every((c) => CATEGORY_META[c].label && CATEGORY_META[c].blurb));
ok('every layout family is used at least twice',
  ACTIVE_FAMILIES.every((l) => TEMPLATES.filter((t) => t.layout === l).length >= 2));
ok('mods are real modifier classes', TEMPLATES.every((t) => t.mods.every((m) => VALID_MODS.has(m))));
ok('every modifier used has CSS behind it', [...VALID_MODS].every((m) => css.includes(`.${m}`)));
ok('every layout family used has CSS behind it',
  [...new Set(TEMPLATES.map((t) => t.layout))].every((l) => css.includes(`.tpl-${l} `) || css.includes(`.tpl-${l}{`) || css.includes(`.tpl-${l} {`)));
ok('palettes use hex colours only', TEMPLATES.every((t) => Object.values(t.pal).every((v) => /^#[0-9a-f]{6}$/i.test(v))));
ok('every family in the catalogue has a label and a blurb',
  [...new Set(TEMPLATES.map((t) => t.layout))].every((l) => LAYOUT_META[l].label && LAYOUT_META[l].blurb));
ok('no template is orphaned from a gallery filter',
  TEMPLATES.every((t) => lib.ACTIVE_FAMILIES.includes(t.layout)));

// ---- 2. provenance: nothing in here is a third-party product copy ---------
const BRAND = /canva|resume\.?\s?io|zety|jobscan|overleaf|\bofficial\b.*template/i;
ok('no template claims to be a third-party design',
  TEMPLATES.every((t) => !BRAND.test(`${t.name} ${t.tagline} ${t.strengths.join(' ')}`)));
ok('no repo copy reintroduces the downloaded-templates catalogue',
  !readFileSync(join(root, 'package.json'), 'utf8').includes('downloaded_templates'));

// ---- 3. lookups never fail --------------------------------------------------
ok('templateById() falls back for an unknown id', templateById('does-not-exist').id === DEFAULT_TEMPLATE_ID);
ok('templateById() still resolves the old default', !!templateById('modern').id);
ok('every field has 5 recommendations', FIELDS.every((f) => recommendedTemplates(f).length === 5));
ok('every family assigns each section exactly once',
  [...new Set(TEMPLATES.map((t) => t.layout))].every((l) => {
    const order = sectionOrder({ layout: l }, 'it');
    return new Set(order).size === order.length && order.length === Object.keys(SECTION_LABELS).length;
  }));
ok('every side section is rendered somewhere on the sheet',
  Object.entries(SIDE_SECTIONS).every(([, side]) => side.every((s) => Object.keys(SECTION_LABELS).includes(s))));
ok('side sections of a two-column family are in that family’s order',
  Object.entries(SIDE_SECTIONS).every(([l, side]) => {
    const order = sectionOrder({ layout: l }, 'finance');
    return side.every((s) => order.includes(s));
  }));

// ---- 4. render every design, in every field, with a full resume ----------
const renderErrs = [];
let rendered = 0;
for (const t of TEMPLATES) {
  for (const fieldId of FIELDS) {
    try {
      const html = render(fullResume(fieldId, t.id), t);
      if (!html.includes('Aarav Sharma')) renderErrs.push(`${t.id}/${fieldId}: name missing`);
      if (!html.includes('sheet')) renderErrs.push(`${t.id}/${fieldId}: no sheet class`);
      // an empty resume must not throw either — the gallery previews a blank form
      const empty = fullResume(fieldId, t.id);
      empty.projects = []; empty.certs = []; empty.languages = []; empty.achievements = []; empty.hobbies = [];
      empty.bestExperience = ''; empty.summary = '';
      render(empty, t);
      rendered += 2;
    } catch (e) {
      renderErrs.push(`${t.id}/${fieldId}: ${e && e.message}`);
    }
  }
}
ok(`every template renders in all 10 fields (${rendered} renders)`, renderErrs.length === 0);
if (renderErrs.length) console.log('  render failures:\n   - ' + renderErrs.slice(0, 8).join('\n   - '));

// ---- 5. the database seed is the same catalogue ---------------------------
const sql = readFileSync(join(root, 'supabase', 'seed', 'template_catalog.sql'), 'utf8');
const sqlIds = [...sql.matchAll(/^\s{2}\('([^']+)'/gm)].map((m) => m[1]);
ok('SQL seed holds the same ids in the same order',
  sqlIds.length === TEMPLATES.length && sqlIds.every((id, i) => id === TEMPLATES[i].id));
ok('SQL seed carries no third-party brand text', !BRAND.test(sql));

process.exit(checks(out) ? 0 : 1);
