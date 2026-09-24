// ============================================================================
// CraftCV template library — the Professional collection (50 designs).
//
// Every row is an original design written for this app: nothing here is a copy
// of a third-party product. A row never forks layout code — it picks one of the
// 20 families (markup in components/Preview.tsx, styling in templates.css) and
// applies a palette plus a few structural modifiers.
//
// The catalogue is organised in two axes:
//   • category — who it is for (ATS, corporate, tech, creative, …), 10 groups
//   • family   — how the page is built (sidebar, ledger, masthead, …), 20 groups
// 5 designs per category, every family used at least twice.
//
// Row shape: [id, name, family, category, tagline, bestFor, strengths, palette, mods?]
// Palettes: p = ink/primary, p2/p3 = dark ramp or surface tint, pm = mid tone on
// dark, a = accent (hairline, chip, rail). `mono()` = light families (ink + rule).
// ============================================================================

import type { Resume } from './types';

export type SectionId =
  | 'summary'
  | 'highlight'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certs'
  | 'languages'
  | 'achievements'
  | 'hobbies';

export type LayoutId =
  | 'split' | 'classic' | 'minimal' | 'metro' | 'compact'
  | 'portrait' | 'studio' | 'monogram' | 'timeline' | 'infographic' | 'corporate'
  | 'editorial' | 'spine' | 'soft' | 'banner' | 'ledger'
  | 'masthead' | 'panelband' | 'tintsheet' | 'spinegradient';

export type CategoryId =
  | 'ats' | 'it' | 'data' | 'corporate' | 'sales'
  | 'healthcare' | 'education' | 'creative' | 'leadership' | 'fresher';

/** Structural (non-palette) modifier classes applied to the sheet. */
export type Mod =
  | 'mod-invert' | 'mod-serif' | 'mod-band-flat' | 'mod-band-tint'
  | 'mod-square' | 'mod-dark' | 'mod-tint' | 'mod-numbered';

export interface Palette {
  /** primary — headings, rules, title bars, band base */
  p: string;
  /** gradient mid / tinted surface */
  p2?: string;
  /** gradient end */
  p3?: string;
  /** mid tone on dark — borders under titles, chip borders */
  pm?: string;
  /** accent — silver line / hairline / rail tint */
  a: string;
}

export interface Template {
  id: string;
  name: string;
  layout: LayoutId;
  category: CategoryId;
  pal: Palette;
  /** the palette's name — shown as swatches + a tooltip in the gallery */
  paletteName: string;
  mods: Mod[];
  tagline: string;
  bestFor: string[]; // field ids where it is the top pick
  strengths: string[];
  /** every family draws a photo frame (photo, or the placeholder box) */
  photo: boolean;
  /** tuned with .mod-tight to hold a full career on one A4 */
  onePage: boolean;
}

export const COLLECTION_NAME = 'Professional';

/** The design a brand-new resume starts on, and the fallback for a stale id. */
export const DEFAULT_TEMPLATE_ID = 'ats-sterling';

/** Each family is one way of organising an A4 page. */
export const LAYOUT_META: Record<LayoutId, { label: string; blurb: string }> = {
  split: { label: 'Sidebar', blurb: 'A side column keeps skills and contacts in view' },
  classic: { label: 'Classic', blurb: 'Serif, centered, boardroom-ready' },
  minimal: { label: 'Minimal', blurb: 'Hairlines and air, quiet confidence' },
  metro: { label: 'Statement', blurb: 'Solid header band, memorable at a glance' },
  compact: { label: 'Dense', blurb: 'ATS-first, maximum content per page' },
  portrait: { label: 'Portrait', blurb: 'Photo header, letter-spaced name, airy two columns' },
  studio: { label: 'Studio', blurb: 'Soft tinted side panel with a round photo' },
  monogram: { label: 'Monogram', blurb: 'Centered initials seal, elegant serif, wide spacing' },
  timeline: { label: 'Timeline', blurb: 'Dates in the gutter, dotted career line' },
  infographic: { label: 'Infographic', blurb: 'Tinted skills panel with level bars' },
  corporate: { label: 'Corporate', blurb: 'Label column on the left, content on the right' },
  editorial: { label: 'Editorial', blurb: 'Numbered sections in the wide margin' },
  spine: { label: 'Spine', blurb: 'A colour spine down the page edge with sideways titles' },
  soft: { label: 'Soft', blurb: 'Rounded panels and pill skills' },
  banner: { label: 'Banner', blurb: 'Full-width banner, story left, facts in a right rail' },
  ledger: { label: 'Ledger', blurb: 'Dates in the left rule, ruled rows' },
  masthead: {
    label: 'Masthead',
    blurb: 'Oversized display name, contact strip, facts rail on the right',
  },
  panelband: {
    label: 'Panel Band',
    blurb: 'Dark photo header over a tinted facts rail',
  },
  tintsheet: {
    label: 'Tint Sheet',
    blurb: 'Full-page tint, one giant tracked name, boxed skill grid',
  },
  spinegradient: {
    label: 'Gradient Spine',
    blurb: 'Gradient rail carrying the name, centered headings on a hairline grid',
  },
};

/**
 * The 10 categories candidates actually ask for. First chip row in the
 * gallery; every design belongs to exactly one.
 */
export const CATEGORY_META: Record<CategoryId, { label: string; blurb: string }> = {
  ats: { label: 'ATS & General', blurb: 'Tracker-safe single column, plain headings, maximum parse rate' },
  it: { label: 'IT & Software', blurb: 'Stack high on the page, ships and metrics, one clean scan' },
  data: { label: 'Data & Analytics', blurb: 'Tools, models and business impact — numbered, dense, legible' },
  corporate: { label: 'Corporate & Finance', blurb: 'Grids, labels and ledgers for conservative hiring' },
  sales: { label: 'Sales & Marketing', blurb: 'Quotas, campaigns and revenue first, photo where it helps' },
  healthcare: { label: 'Healthcare & Care', blurb: 'Licences, units, shifts and patient detail, calmly aligned' },
  education: { label: 'Education & Teaching', blurb: 'Curriculum, boards, faculty roles and classroom outcomes' },
  creative: { label: 'Design & Creative', blurb: 'Display type and one deliberate accent — portfolio-forward' },
  leadership: { label: 'Leadership & Admin', blurb: 'Serif gravitas, restrained metal accents, senior tone' },
  fresher: { label: 'Fresher & Entry', blurb: 'Projects, coursework and internships carry the page' },
};

export const CATEGORY_ORDER: CategoryId[] = [
  'ats', 'it', 'data', 'corporate', 'sales',
  'healthcare', 'education', 'creative', 'leadership', 'fresher',
];

/** p + a only — light families, primary doubles as the ink colour. */
const mono = (p: string, a: string): Palette => ({ p, a });

const NAVY: Palette = { p: '#12233f', p2: '#1b3258', p3: '#24416f', pm: '#3d5e8c', a: '#c8d3e2' };
const GRAPHITE: Palette = { p: '#262b33', p2: '#313841', p3: '#3d4650', pm: '#59636f', a: '#b3bcc9' };
const STEEL: Palette = { p: '#2f4358', p2: '#3b546e', p3: '#476585', pm: '#5f7d9b', a: '#c2d0dd' };
const PETROL: Palette = { p: '#0d3b45', p2: '#124e5b', p3: '#186272', pm: '#2c7c8e', a: '#b9d6dc' };
const PINE: Palette = { p: '#183a2c', p2: '#214a38', p3: '#2b5b45', pm: '#3f7059', a: '#c0d6c8' };
const OXBLOOD: Palette = { p: '#47182a', p2: '#5a2036', p3: '#6e2a44', pm: '#8b4760', a: '#dcc0cb' };
const MOCHA: Palette = { p: '#4a3628', p2: '#5c4534', p3: '#6f5541', pm: '#8a705c', a: '#ddccb9' };
const SLATE_INK: Palette = { p: '#333d4d', p2: '#3f4b5e', p3: '#4d5b72', pm: '#67788f', a: '#bcc7d6' };
const INDIGO_STEEL: Palette = { p: '#232a52', p2: '#2e3767', p3: '#3a457d', pm: '#5560a0', a: '#c6cbe8' };
const NOIR_GOLD: Palette = { p: '#16181d', p2: '#1f2229', p3: '#292d36', pm: '#3d4350', a: '#b9964a' };
const INK: Palette = { p: '#171a1f', p2: '#20242b', p3: '#2a2f38', pm: '#3d4450', a: '#d3d8e0' };
/** Tinted surfaces for the display families (page wash / rail tint). */
const TINT_STEEL: Palette = { p: '#243044', p2: '#eaeef4', p3: '#d8e0ec', pm: '#6b7f9c', a: '#9fb2ca' };
const TINT_SAGE: Palette = { p: '#33402f', p2: '#eceee7', p3: '#dcdcd2', pm: '#7d8a76', a: '#a9b6a2' };
const TINT_CHALK: Palette = { p: '#1f3a35', p2: '#e7efeb', p3: '#d2e2d9', pm: '#6d8e83', a: '#9dc0b1' };
const RAIL_NAVY: Palette = { p: '#20364a', p2: '#eef2f7', p3: '#d5dfec', pm: '#6f86a3', a: '#8fb2d6' };
const RAIL_SAND: Palette = { p: '#1d2b3a', p2: '#f2e8de', p3: '#e2d0c0', pm: '#94765c', a: '#c99a63' };
const SPINE_CLAY: Palette = { p: '#5a3a24', p2: '#7a4f2f', p3: '#98633c', pm: '#c08b60', a: '#f0dcc6' };
const SPINE_PETROL: Palette = { p: '#0c3540', p2: '#14505d', p3: '#1d6a79', pm: '#3d8b99', a: '#a9d6de' };

type Row = [
  id: string,
  name: string,
  layout: LayoutId,
  category: CategoryId,
  tagline: string,
  bestFor: string[],
  strengths: string[],
  pal: Palette,
  /** palette name + one-page fit + structural mods */
  opts?: { mods?: Mod[]; swatch?: string },
];

const ATS_FIELDS = ['it', 'data', 'finance', 'operations', 'healthcare', 'education'];

/* --------------------------------------------------------------------------
   Named palettes. Each is one of the colour pairings people recognise as
   "professional" — a deep, low-saturation primary with a single quiet accent.
   They are applied aesthetically, not decoratively: accent for rules, chips
   and hairlines only; never more than one accent on a sheet.
   -------------------------------------------------------------------------- */

type Swatch = readonly [label: string, pal: Palette];

const SWATCHES: Record<string, Swatch> = {
  'Navy & Silver': ['Navy & Silver', mono('#12233f', '#c8d3e2')],
  'Charcoal & Gold': ['Charcoal & Gold', mono('#22262e', '#c9a227')],
  'Deep Teal & Mist': ['Deep Teal & Mist', mono('#0e4b56', '#b6d7dd')],
  'Burgundy & Cream': ['Burgundy & Cream', mono('#4d1828', '#e3cfd4')],
  'Forest & Sand': ['Forest & Sand', mono('#1d4032', '#d9c9a8')],
  'Royal Blue & Slate': ['Royal Blue & Slate', mono('#1d3f94', '#bccbe4')],
  'Espresso & Beige': ['Espresso & Beige', mono('#3f2a1d', '#dcc9b0')],
  'Midnight & Copper': ['Midnight & Copper', mono('#151a2b', '#b06f3a')],
  'Slate & Pearl': ['Slate & Pearl', mono('#334155', '#e2e8f0')],
  'Ink & White': ['Ink & White', mono('#101114', '#d7dade')],
};

/** Full dark-surface ramp for the families that paint a band, rail or panel. */
const RAMP: Record<string, Palette> = {
  'Navy & Silver': NAVY,
  'Charcoal & Gold': { p: '#22262e', p2: '#2c313b', p3: '#373d49', pm: '#4d5563', a: '#c9a227' },
  'Deep Teal & Mist': { p: '#0c3540', p2: '#14505d', p3: '#1d6a79', pm: '#3d8b99', a: '#a9d6de' },
  'Burgundy & Cream': { p: '#3d1220', p2: '#54192c', p3: '#6c2339', pm: '#8a4258', a: '#e3cfd4' },
  'Forest & Sand': { p: '#1d4032', p2: '#255242', p3: '#2e6453', pm: '#457a66', a: '#d9c9a8' },
  'Royal Blue & Slate': { p: '#1d3f94', p2: '#2551b8', p3: '#2f64d4', pm: '#4a76e0', a: '#bccbe4' },
  'Espresso & Beige': { p: '#1d2b3a', p2: '#f2e8de', p3: '#e2d0c0', pm: '#94765c', a: '#c99a63' },
  'Midnight & Copper': { p: '#15181f', p2: '#20242d', p3: '#2b303b', pm: '#414a5a', a: '#b06f3a' },
  'Slate & Pearl': SLATE_INK,
  'Ink & White': INK,
};

/** light tint for the Tint Sheet family, per palette */
const TINT: Record<string, Palette> = {
  'Forest & Sand': { p: '#26402f', p2: '#f0ece1', p3: '#e0d8c6', pm: '#7b7460', a: '#9c8a63' },
  'Slate & Pearl': TINT_STEEL,
  'Deep Teal & Mist': { p: '#1d3b42', p2: '#e7f0f1', p3: '#d1e3e5', pm: '#6d8c91', a: '#8fb4b9' },
  'Ink & White': { p: '#1b1d21', p2: '#f1f2f4', p3: '#e0e2e6', pm: '#6f747d', a: '#a8adb6' },
};

const pal = (name: keyof typeof SWATCHES | string, kind: 'mono' | 'ramp' | 'tint' = 'mono'): Palette => {
  const table = kind === 'ramp' ? RAMP : kind === 'tint' ? TINT : SWATCHES;
  const hit = (table as Record<string, Swatch | Palette>)[name];
  if (!hit) throw new Error(`Unknown palette: ${name}`);
  return Array.isArray(hit) ? (hit as Swatch)[1] : (hit as Palette);
};

/**
 * REVIEW BATCH — 12 flagship designs, one per category (two for the three
 * biggest), each with a photo frame and a one-page-tight fit on the 20 layout
 * families. The rest of the 50 come after this batch is signed off.
 *
 * Row shape: [id, name, family, category, tagline, bestFor, strengths, palette, opts]
 */
const ROWS: Row[] = [
  /* 1 ─ ATS & General ─────────────────────────────────────────────────────── */
  ['ats-sterling', 'Sterling ATS', 'compact', 'ats',
    'One clean column, plain headings, photo top-right. The safest file you can send.',
    ATS_FIELDS, ['Parses in every tracker', 'One A4 page, top to bottom', 'Photo frame, no clutter'],
    pal('Navy & Silver'), { swatch: 'Navy & Silver' }],
  ['ats-ink', 'Ink ATS', 'minimal', 'ats',
    'Hairlines and air in pure black and white — an ATS sheet that still looks designed.',
    ['design', 'data', 'education', 'operations'], ['Zero decoration to break', 'Reads calm and fast', 'Prints on any printer'],
    pal('Ink & White'), { swatch: 'Ink & White' }],

  /* 2 ─ IT & Software ─────────────────────────────────────────────────────── */
  ['it-sidebar', 'Navy Sidebar', 'split', 'it',
    'Navy column for stack, links and photo; story on the right, one page, no waste.',
    ['it', 'data', 'operations', 'design'], ['Skills always visible', 'Photo in the rail', 'Tuned to hold one page'],
    { ...RAMP['Navy & Silver'] }, { swatch: 'Navy & Silver' }],
  ['it-masthead', 'Dev Masthead', 'masthead', 'it',
    'Oversized name, numbered sections, facts rail for your stack and links.',
    ['it', 'data', 'design'], ['Numbered sections scan fast', 'Stack stays in the rail', 'Engineer-grade density'],
    pal('Slate & Pearl'), { mods: ['mod-numbered'], swatch: 'Slate & Pearl' }],

  /* 3 ─ Data & Analytics ──────────────────────────────────────────────────── */
  ['data-bars', 'Skills Bars', 'infographic', 'data',
    'Tinted panel with proficiency bars, language dots and your photo up top.',
    ['data', 'it', 'finance', 'operations'], ['Skills read at a glance', 'Photo + facts in one panel', 'Bold but tidy'],
    RAMP['Royal Blue & Slate'], { swatch: 'Royal Blue & Slate' }],
  ['data-grid', 'Analytics Grid', 'corporate', 'data',
    'Label rail on the left, metrics on the right — a dashboard on paper.',
    ['data', 'finance', 'operations'], ['Every number aligned', 'Formal, ultra-scannable', 'Two pages if you need them'],
    pal('Charcoal & Gold'), { swatch: 'Charcoal & Gold' }],

  /* 4 ─ Corporate & Finance ───────────────────────────────────────────────── */
  ['corp-boardroom', 'Boardroom Grid', 'corporate', 'corporate',
    'Section labels in a left rail, content on the right, photo in the header.',
    ['finance', 'operations', 'hr', 'sales'], ['Instant section finding', 'Formal by default', 'ATS-friendly structure'],
    pal('Ink & White'), { swatch: 'Ink & White' }],
  ['corp-tint', 'Steel Memo', 'tintsheet', 'corporate',
    'A pale steel page, one wide-tracked name, boxed competencies in a grid.',
    ['operations', 'finance', 'hr'], ['One colour story, no noise', 'Skills read in one sweep', 'Great on screen and paper'],
    TINT['Slate & Pearl'], { swatch: 'Slate & Pearl' }],

  /* 5 ─ Sales & Marketing ─────────────────────────────────────────────────── */
  ['sales-panelband', 'Photo Panel CV', 'panelband', 'sales',
    'Espresso band with a round photo, then a beige rail of numbers and tools.',
    ['sales', 'marketing', 'hr'], ['Photo-forward, not flashy', 'Rail keeps quota and reach', 'Confident header'],
    { ...RAMP['Espresso & Beige'] }, { swatch: 'Espresso & Beige' }],
  ['sales-band', 'Burgundy Band', 'metro', 'sales',
    'A single burgundy band with cream chips — warm authority, one page.',
    ['sales', 'marketing', 'operations'], ['Memorable at a glance', 'One accent, used once', 'Prints beautifully in colour'],
    RAMP['Burgundy & Cream'], { mods: ['mod-band-flat'], swatch: 'Burgundy & Cream' }],

  /* 6 ─ Healthcare & Care ─────────────────────────────────────────────────── */
  ['care-sidebar', 'Petrol Sidebar', 'split', 'healthcare',
    'Deep teal rail for licences, units and photo; clinical detail in the main column.',
    ['healthcare', 'it', 'operations'], ['Licences never get lost', 'Calm, trustworthy colour', 'One page, dense but kind'],
    { ...RAMP['Deep Teal & Mist'] }, { swatch: 'Deep Teal & Mist' }],

  /* 7 ─ Education & Teaching ──────────────────────────────────────────────── */
  ['edu-chalk', 'Chalk Tint', 'tintsheet', 'education',
    'Chalkboard-green wash, centred name, boxed subjects and a framed photo.',
    ['education', 'healthcare', 'hr'], ['Distinctive but neat', 'Subjects as a grid', 'Prints softly, reads sharp'],
    TINT['Forest & Sand'], { swatch: 'Forest & Sand' }],

  /* 8 ─ Design & Creative ─────────────────────────────────────────────────── */
  ['creative-spine', 'Copper Spine', 'spinegradient', 'creative',
    'Midnight gradient rail carrying the name, copper hairlines in the body.',
    ['design', 'marketing', 'data'], ['Rail holds the identity', 'Centred headings, calm body', 'Stands out in a stack'],
    { ...RAMP['Midnight & Copper'] }, { swatch: 'Midnight & Copper' }],

  /* 9 ─ Leadership & Admin ────────────────────────────────────────────────── */
  ['lead-serif', 'Executive Serif', 'classic', 'leadership',
    'Centred serif name with a photo frame over double rules — boardroom formal.',
    ['finance', 'operations', 'sales', 'hr'], ['Reads authoritative', 'Loved by senior reviewers', 'Nothing to apologise for'],
    pal('Charcoal & Gold'), { mods: ['mod-serif'], swatch: 'Charcoal & Gold' }],

  /* 10 ─ Fresher & Entry ──────────────────────────────────────────────────── */
  ['fresher-portrait', 'Graduate Portrait', 'portrait', 'fresher',
    'Photo header, tracked name, education and internships in the side column.',
    ['it', 'sales', 'education', 'hr'], ['Photo where it belongs', 'Internships up front', 'Clean two-column balance'],
    pal('Royal Blue & Slate'), { mods: ['mod-square'], swatch: 'Royal Blue & Slate' }],
];

export const TEMPLATES: Template[] = ROWS.map(
  ([id, name, layout, category, tagline, bestFor, strengths, palette, opts]) => ({
    id, name, layout, category, tagline, bestFor, strengths,
    pal: palette,
    paletteName: opts?.swatch ?? 'House Ink',
    // every design in this collection carries a photo frame and the one-page
    // fit; .mod-tight is what makes "1 page" true rather than aspirational
    mods: ['mod-tight', ...(opts?.mods ?? [])] as Mod[],
    photo: true,
    onePage: true,
  }),
);

export const TEMPLATE_COUNT = TEMPLATES.length;

/** Families present in the catalogue, in catalogue order — drives the chips. */
export const ACTIVE_FAMILIES: LayoutId[] = (Object.keys(LAYOUT_META) as LayoutId[])
  .filter((l) => TEMPLATES.some((t) => t.layout === l));

/** Sections rendered in the side/panel column for the two-column families. */
export const SIDE_SECTIONS: Partial<Record<LayoutId, SectionId[]>> = {
  split: ['skills', 'languages', 'certs', 'hobbies'],
  portrait: ['education', 'skills', 'languages', 'certs', 'hobbies'],
  studio: ['skills', 'languages', 'certs', 'hobbies'],
  infographic: ['skills', 'languages', 'certs', 'hobbies'],
  soft: ['skills', 'languages', 'certs', 'hobbies'],
  banner: ['skills', 'languages', 'certs', 'hobbies'],
  masthead: ['skills', 'languages', 'certs', 'hobbies'],
  panelband: ['education', 'skills', 'languages', 'certs'],
  tintsheet: ['education', 'skills', 'certs', 'languages'],
  spinegradient: ['skills', 'languages', 'certs', 'hobbies'],
};

export const templateById = (id: string): Template =>
  TEMPLATES.find((t) => t.id === id)
  ?? TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)
  ?? TEMPLATES[0];

const TECH_FIELDS = new Set(['it', 'data', 'design']);

/** Section order per layout + field. All designs in a family share it. */
export function sectionOrder(tpl: Template, fieldId: string): SectionId[] {
  const tech = TECH_FIELDS.has(fieldId);
  const tail: SectionId[] = ['achievements', 'hobbies'];
  switch (tpl.layout) {
    case 'split':
    case 'studio':
    case 'infographic':
    case 'masthead':
    case 'panelband':
    case 'spinegradient':
      // the side column carries skills/languages/certs/hobbies; main gets the rest
      return tech
        ? ['summary', 'highlight', 'skills', 'experience', 'projects', 'education', 'certs', 'languages', ...tail]
        : ['summary', 'highlight', 'experience', 'skills', 'education', 'projects', 'certs', 'languages', ...tail];
    case 'portrait':
    case 'tintsheet':
      // side column: education, skills, languages, certs, hobbies; main: story
      return ['summary', 'highlight', 'experience', 'projects', 'education', 'skills', 'languages', 'certs', 'achievements', 'hobbies'];
    case 'editorial':
    case 'ledger':
      // the wide left margin carries the section numbers / dates
      return tech
        ? ['summary', 'highlight', 'skills', 'experience', 'projects', 'education', 'certs', 'achievements', 'languages', 'hobbies']
        : ['summary', 'highlight', 'experience', 'skills', 'education', 'projects', 'certs', 'achievements', 'languages', 'hobbies'];
    case 'spine':
      // one flowing column beside the colour spine
      return tech
        ? ['summary', 'highlight', 'skills', 'experience', 'projects', 'education', 'certs', 'languages', ...tail]
        : ['summary', 'highlight', 'experience', 'education', 'skills', 'projects', 'certs', 'languages', ...tail];
    case 'soft':
    case 'banner':
      // panel / rail column: skills, languages, certs, hobbies (see SIDE_SECTIONS)
      return tech
        ? ['summary', 'highlight', 'experience', 'projects', 'education', 'skills', 'languages', 'certs', 'achievements', 'hobbies']
        : ['summary', 'highlight', 'experience', 'education', 'projects', 'skills', 'languages', 'certs', 'achievements', 'hobbies'];
    case 'metro':
    case 'timeline':
    case 'monogram':
    case 'corporate':
      return tech
        ? ['summary', 'highlight', 'skills', 'experience', 'projects', 'education', 'certs', 'languages', ...tail]
        : ['summary', 'highlight', 'experience', 'skills', 'projects', 'education', 'certs', 'languages', ...tail];
    case 'compact':
    case 'classic':
    case 'minimal':
    default:
      return tech
        ? ['summary', 'highlight', 'skills', 'experience', 'projects', 'education', 'certs', 'languages', ...tail]
        : ['summary', 'highlight', 'experience', 'education', 'skills', 'projects', 'certs', 'languages', ...tail];
  }
}

/** Designs of one category, in catalogue order. */
export function templatesByCategory(cat: CategoryId): Template[] {
  return TEMPLATES.filter((t) => t.category === cat);
}

/** Best-fit picks for a career field — at most 5, catalogue order otherwise. */
export function recommendedTemplates(fieldId: string): Template[] {
  return [...TEMPLATES]
    .sort((a, b) => {
      const ai = a.bestFor.includes(fieldId) ? 0 : 1;
      const bi = b.bestFor.includes(fieldId) ? 0 : 1;
      return ai - bi;
    })
    .slice(0, 5);
}

export function hasSection(r: Resume, id: SectionId): boolean {
  switch (id) {
    case 'summary': return (r.summary ?? '').trim().length > 0;
    case 'highlight': return (r.bestExperience ?? '').trim().length > 0;
    case 'experience': return (r.experience ?? []).length > 0;
    case 'education': return (r.education ?? []).length > 0;
    case 'skills': return (r.skills ?? []).filter(Boolean).length > 0;
    case 'projects': return (r.projects ?? []).length > 0;
    case 'certs': return (r.certs ?? []).length > 0;
    case 'languages': return (r.languages ?? []).length > 0;
    case 'achievements': return (r.achievements ?? []).filter(Boolean).length > 0;
    case 'hobbies': return (r.hobbies ?? []).filter(Boolean).length > 0;
  }
}

export const SECTION_LABELS: Record<SectionId, string> = {
  summary: 'Profile',
  highlight: 'Best Experience',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certs: 'Certifications',
  languages: 'Languages',
  achievements: 'Achievements',
  hobbies: 'Hobbies & Interests',
};
