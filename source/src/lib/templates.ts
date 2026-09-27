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
  | 'mod-square' | 'mod-dark' | 'mod-tint' | 'mod-numbered'
  /** global style flavors — work on top of any family, so no two designs read alike */
  | 'mod-caps'    /* tracked small-caps headings + uppercase display name */
  | 'mod-frame'   /* inset page frame with corner ticks — certificate presence */
  | 'mod-outline' /* ghost/outline display name, poster energy */
  | 'mod-plain';  /* zero-radius modernist: hairlines and right angles only */

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
  /** tuned with .mod-tight to be compact — a full career fits one A4,
   *  and a longer career flows onto page 2/3 without losing the design */
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
/**
 * Light-surface variants: a dark ink `p` with a pale `p2` surface. These are what
 * the families that paint a panel, rail or page wash need (Tint Sheet, Studio,
 * Panel Band) — with a dark `p2` their rail text would sit on a dark field.
 */
const TINT: Record<string, Palette> = {
  'Forest & Sand': { p: '#26402f', p2: '#f0ece1', p3: '#e0d8c6', pm: '#7b7460', a: '#9c8a63' },
  'Slate & Pearl': TINT_STEEL,
  'Deep Teal & Mist': { p: '#1d3b42', p2: '#e7f0f1', p3: '#d1e3e5', pm: '#6d8c91', a: '#8fb4b9' },
  'Ink & White': { p: '#1b1d21', p2: '#f1f2f4', p3: '#e0e2e6', pm: '#6f747d', a: '#a8adb6' },
  'Navy & Silver': { p: '#12233f', p2: '#eef2f8', p3: '#dbe4ef', pm: '#6b7f9c', a: '#9fb2ca' },
  'Charcoal & Gold': { p: '#22262e', p2: '#f2f3f5', p3: '#e2e5e9', pm: '#6f7683', a: '#c9a227' },
  'Burgundy & Cream': { p: '#47182a', p2: '#f8eef1', p3: '#eed9e0', pm: '#8b4a5e', a: '#c98fa3' },
  'Royal Blue & Slate': { p: '#1d3f94', p2: '#eaf0fb', p3: '#d7e2f6', pm: '#5a79c0', a: '#8fa6d8' },
  'Espresso & Beige': RAIL_SAND,
  'Midnight & Copper': { p: '#1a1f2c', p2: '#eef0f4', p3: '#dfe3ea', pm: '#6b7484', a: '#b06f3a' },
};

const pal = (name: keyof typeof SWATCHES | string, kind: 'mono' | 'ramp' | 'tint' = 'mono'): Palette => {
  const table = kind === 'ramp' ? RAMP : kind === 'tint' ? TINT : SWATCHES;
  const hit = (table as Record<string, Swatch | Palette>)[name];
  if (!hit) throw new Error(`Unknown palette: ${name}`);
  return Array.isArray(hit) ? (hit as Swatch)[1] : (hit as Palette);
};

/**
 * The catalogue: 50 original designs, 5 per category, spread over all 20 layout
 * families (no family repeats inside a category, so the chips never show a thin
 * list). Every row carries a photo frame and the one-page fit.
 *
 * Row shape: [id, name, family, category, tagline, bestFor, strengths, palette, opts]
 */
const ROWS: Row[] = [
  /* 1 ─ ATS & General ─────────────────────────────────────────────────────── */
  ['ats-sterling', 'Sterling ATS', 'compact', 'ats',
    'One clean column, plain headings, photo top-right. The safest file you can send.',
    ATS_FIELDS, ['Parses in every tracker', 'One A4 page, top to bottom', 'Photo frame, no clutter'],
    pal('Navy & Silver'), { mods: ['mod-plain'], swatch: 'Navy & Silver' }],
  ['ats-ink', 'Ink ATS', 'minimal', 'ats',
    'Hairlines and air in pure black and white — an ATS sheet that still looks designed.',
    ['design', 'data', 'education', 'operations'], ['Zero decoration to break', 'Reads calm and fast', 'Prints on any printer'],
    pal('Ink & White'), { mods: ['mod-caps'], swatch: 'Ink & White' }],

  /* 2 ─ IT & Software ─────────────────────────────────────────────────────── */
  ['it-sidebar', 'Navy Sidebar', 'split', 'it',
    'Navy column for stack, links and photo; story on the right, tight and no waste.',
    ['it', 'data', 'operations', 'design'], ['Skills always visible', 'Photo in the rail', 'Tuned to stay compact'],
    { ...RAMP['Navy & Silver'] }, { swatch: 'Navy & Silver' }],
  ['it-masthead', 'Dev Masthead', 'masthead', 'it',
    'Oversized name, numbered sections, facts rail for your stack and links.',
    ['it', 'data', 'design'], ['Numbered sections scan fast', 'Stack stays in the rail', 'Engineer-grade density'],
    pal('Slate & Pearl'), { mods: ['mod-numbered', 'mod-caps'], swatch: 'Slate & Pearl' }],

  /* 3 ─ Data & Analytics ──────────────────────────────────────────────────── */
  ['data-bars', 'Skills Bars', 'infographic', 'data',
    'Tinted panel with proficiency bars, language dots and your photo up top.',
    ['data', 'it', 'finance', 'operations'], ['Skills read at a glance', 'Photo + facts in one panel', 'Bold but tidy'],
    RAMP['Royal Blue & Slate'], { swatch: 'Royal Blue & Slate' }],
  ['data-grid', 'Analytics Grid', 'corporate', 'data',
    'Label rail on the left, metrics on the right — a dashboard on paper.',
    ['data', 'finance', 'operations'], ['Every number aligned', 'Formal, ultra-scannable', 'Two pages if you need them'],
    pal('Charcoal & Gold'), { mods: ['mod-plain'], swatch: 'Charcoal & Gold' }],

  /* 4 ─ Corporate & Finance ───────────────────────────────────────────────── */
  ['corp-boardroom', 'Boardroom Grid', 'corporate', 'corporate',
    'Section labels in a left rail, content on the right, photo in the header.',
    ['finance', 'operations', 'hr', 'sales'], ['Instant section finding', 'Formal by default', 'ATS-friendly structure'],
    pal('Ink & White'), { mods: ['mod-plain'], swatch: 'Ink & White' }],
  ['corp-tint', 'Steel Memo', 'tintsheet', 'corporate',
    'A pale steel page, one wide-tracked name, boxed competencies in a grid.',
    ['operations', 'finance', 'hr'], ['One colour story, no noise', 'Skills read in one sweep', 'Great on screen and paper'],
    TINT['Slate & Pearl'], { mods: ['mod-plain'], swatch: 'Slate & Pearl' }],

  /* 5 ─ Sales & Marketing ─────────────────────────────────────────────────── */
  ['sales-panelband', 'Photo Panel CV', 'panelband', 'sales',
    'Espresso band with a round photo, then a beige rail of numbers and tools.',
    ['sales', 'marketing', 'hr'], ['Photo-forward, not flashy', 'Rail keeps quota and reach', 'Confident header'],
    { ...RAMP['Espresso & Beige'] }, { swatch: 'Espresso & Beige' }],
  ['sales-band', 'Burgundy Band', 'metro', 'sales',
    'A single burgundy band with cream chips — warm authority, clean layout.',
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
    TINT['Forest & Sand'], { mods: ['mod-frame'], swatch: 'Forest & Sand' }],

  /* 8 ─ Design & Creative ─────────────────────────────────────────────────── */
  ['creative-spine', 'Copper Spine', 'spinegradient', 'creative',
    'Midnight gradient rail carrying the name, copper hairlines in the body.',
    ['design', 'marketing', 'data'], ['Rail holds the identity', 'Centred headings, calm body', 'Stands out in a stack'],
    { ...RAMP['Midnight & Copper'] }, { mods: ['mod-outline'], swatch: 'Midnight & Copper' }],

  /* 9 ─ Leadership & Admin ────────────────────────────────────────────────── */
  ['lead-serif', 'Executive Serif', 'classic', 'leadership',
    'Centred serif name with a photo frame over double rules — boardroom formal.',
    ['finance', 'operations', 'sales', 'hr'], ['Reads authoritative', 'Loved by senior reviewers', 'Nothing to apologise for'],
    pal('Charcoal & Gold'), { mods: ['mod-serif', 'mod-frame'], swatch: 'Charcoal & Gold' }],

  /* 10 ─ Fresher & Entry ──────────────────────────────────────────────────── */
  ['fresher-portrait', 'Graduate Portrait', 'portrait', 'fresher',
    'Photo header, tracked name, education and internships in the side column.',
    ['it', 'sales', 'education', 'hr'], ['Photo where it belongs', 'Internships up front', 'Clean two-column balance'],
    pal('Royal Blue & Slate'), { mods: ['mod-square'], swatch: 'Royal Blue & Slate' }],
  /* ── ATS & General ──────────────────────────────────────────────────────── */
  ['ats-ledger', 'Ledger ATS', 'ledger', 'ats',
    'Dates in the left rule and one clean column of facts — parses, prints and reads like a sheet.',
    ATS_FIELDS, ['Ruled rows, no ambiguity', 'Long histories stay legible', 'Photo in the header, still plain'],
    pal('Slate & Pearl'), { mods: ['mod-plain'], swatch: 'Slate & Pearl' }],
  ['ats-numbered', 'Numbered ATS', 'editorial', 'ats',
    'Numbered sections in a wide margin, so a recruiter can quote your page back to you.',
    ['operations', 'finance', 'hr', 'data'], ['Sections name themselves', 'Calm, considered rhythm', 'Two columns of air, one column of text'],
    pal('Charcoal & Gold'), { mods: ['mod-plain'], swatch: 'Charcoal & Gold' }],
  ['ats-grid', 'Grid ATS', 'corporate', 'ats',
    'Label rail on the left, plain text on the right — no tables for a parser to trip over.',
    ['finance', 'operations', 'it', 'hr'], ['Label-aligned sections', 'Formal and dry', 'Prints identically in mono'],
    pal('Deep Teal & Mist'), { swatch: 'Deep Teal & Mist' }],

  /* ── IT & Software ──────────────────────────────────────────────────────── */
  ['it-timeline', 'Engineering Timeline', 'timeline', 'it',
    'Roles on a dotted line with dates in the gutter; photo up top, stack beside it.',
    ['it', 'data', 'operations'], ['Progression is the headline', 'Promotions read instantly', 'Photo frame in the header'],
    pal('Navy & Silver'), { mods: ['mod-plain'], swatch: 'Navy & Silver' }],
  ['it-soft', 'Product Panels', 'soft', 'it',
    'Rounded pale-teal panels and pill skills — for engineers who also talk to customers.',
    ['it', 'design', 'hr', 'marketing'], ['Approachable, still technical', 'Skills scannable as pills', 'Kind to a long tool list'],
    pal('Deep Teal & Mist'), { swatch: 'Deep Teal & Mist' }],
  ['it-monogram', 'Initials Mark', 'monogram', 'it',
    'Boxed initials, tracked serif name, one gold rule. Quiet senior-engineer presence.',
    ['it', 'data', 'operations', 'finance'], ['Works with or without a photo', 'Memorable header', 'Serif without the age'],
    RAMP['Charcoal & Gold'], { mods: ['mod-dark'], swatch: 'Charcoal & Gold' }],

  /* ── Data & Analytics ───────────────────────────────────────────────────── */
  ['data-spine', 'Analyst Spine', 'spine', 'data',
    'A teal spine down the page edge with sideways titles; every metric stays on its rule.',
    ['data', 'it', 'finance'], ['Strong visual identity', 'One accent, used once', 'Great for dashboard-heavy work'],
    pal('Deep Teal & Mist'), { swatch: 'Deep Teal & Mist' }],
  ['data-banner', 'Impact Banner', 'banner', 'data',
    'Full-width midnight banner, story on the left, reach and revenue in a right rail.',
    ['data', 'marketing', 'operations'], ['Numbers never scroll away', 'Confident header', 'Good on a phone screen'],
    RAMP['Midnight & Copper'], { swatch: 'Midnight & Copper' }],
  ['data-soft', 'Reporting Panels', 'soft', 'data',
    'Rounded grey panels with pill skills for analysts who present as much as they model.',
    ['data', 'finance', 'hr'], ['Soft look, hard numbers', 'Pills keep the stack readable', 'One page by design'],
    pal('Ink & White'), { mods: ['mod-plain'], swatch: 'Ink & White' }],

  /* ── Corporate & Finance ────────────────────────────────────────────────── */
  ['corp-classic', 'Corporate Serif', 'classic', 'corporate',
    'Centred serif header, framed photo and double rules — the page audit committees expect.',
    ['finance', 'operations', 'hr', 'sales'], ['Reads authoritative', 'Conservative by default', 'Prints beautifully'],
    pal('Navy & Silver'), { mods: ['mod-serif'], swatch: 'Navy & Silver' }],
  ['corp-metro', 'Corporate Band', 'metro', 'corporate',
    'A flat slate band with pearl chips: formal, but not from 1998.',
    ['operations', 'finance', 'it'], ['One band, then business', 'Chips organise the page', 'Sharp in laser print'],
    RAMP['Slate & Pearl'], { mods: ['mod-band-flat'], swatch: 'Slate & Pearl' }],
  ['corp-portrait', 'Client Portrait', 'portrait', 'corporate',
    'Photo header with a burgundy accent and airy columns — client-facing consulting CV.',
    ['sales', 'operations', 'finance', 'hr'], ['Face, then evidence', 'Warm accent, cold structure', 'Two clear columns'],
    pal('Burgundy & Cream'), { mods: ['mod-square'], swatch: 'Burgundy & Cream' }],

  /* ── Sales & Marketing ──────────────────────────────────────────────────── */
  ['sales-masthead', 'Quota Masthead', 'masthead', 'sales',
    'Oversized name, gold rules, and a facts rail built to carry quota and territory.',
    ['sales', 'marketing'], ['Numbers where eyes land first', 'Big name, bigger targets', 'Photo optional, frame present'],
    pal('Charcoal & Gold'), { mods: ['mod-numbered', 'mod-outline'], swatch: 'Charcoal & Gold' }],
  ['sales-timeline', 'Pipeline Timeline', 'timeline', 'sales',
    'Attainment climbing down a dotted line — the growth curve is the layout.',
    ['sales', 'marketing', 'operations'], ['Growth is visible at a glance', 'Dates always clear', 'Calm teal, no hype'],
    pal('Deep Teal & Mist'), { swatch: 'Deep Teal & Mist' }],
  ['sales-studio', 'Brand Studio', 'studio', 'sales',
    'Beige panel, round photo, small-caps sections — warm for agency and brand roles.',
    ['marketing', 'sales', 'design'], ['Friendly without being casual', 'Panel keeps the basics', 'Photo front and centre'],
    TINT['Espresso & Beige'], { swatch: 'Espresso & Beige' }],

  /* ── Healthcare & Care ──────────────────────────────────────────────────── */
  ['care-compact', 'Clinical ATS', 'compact', 'healthcare',
    'Plain single column with licences, units and patient ratios first — hospital-portal safe.',
    ['healthcare', 'operations'], ['No layout risk at intake', 'Credentials at the top', 'One dense, honest page'],
    pal('Ink & White'), { mods: ['mod-caps'], swatch: 'Ink & White' }],
  ['care-spine', 'Ward Spine', 'spine', 'healthcare',
    'A forest-green spine with sideways titles; shifts and wards stay aligned down the page.',
    ['healthcare', 'education'], ['Sections marked on the edge', 'Calm, trustworthy colour', 'Prints well in mono'],
    pal('Forest & Sand'), { swatch: 'Forest & Sand' }],
  ['care-panelband', 'Care Panel', 'panelband', 'healthcare',
    'Photo in a petrol band, registrations and skills in the pale rail under it.',
    ['healthcare', 'hr', 'operations'], ['Photo without the flash', 'Rail holds credentials', 'Two zones, no overlap'],
    TINT['Deep Teal & Mist'], { swatch: 'Deep Teal & Mist' }],
  ['care-monogram', 'Physician Seal', 'monogram', 'healthcare',
    'Centred seal and serif name for consultant, academic-medical and board-certified CVs.',
    ['healthcare', 'education'], ['Formal and unhurried', 'Works with no photo', 'Fellowships get their own block'],
    RAMP['Navy & Silver'], { mods: ['mod-frame'], swatch: 'Navy & Silver' }],

  /* ── Education & Teaching ───────────────────────────────────────────────── */
  ['edu-minimal', 'Quiet Academic', 'minimal', 'education',
    'Hairlines and air for syllabi, board results and research interests.',
    ['education', 'data', 'design'], ['Nothing competes with the content', 'Long lists read calmly', 'Prints light'],
    pal('Slate & Pearl'), { mods: ['mod-tint'], swatch: 'Slate & Pearl' }],
  ['edu-editorial', 'Faculty Editorial', 'editorial', 'education',
    'Numbered margin, framed photo, and room for papers, clubs and curriculum work.',
    ['education', 'hr', 'healthcare'], ['Every section numbered', 'Magazine pacing', 'Handles a long record'],
    pal('Burgundy & Cream'), { mods: ['mod-caps'], swatch: 'Burgundy & Cream' }],
  ['edu-banner', 'Principal Banner', 'banner', 'education',
    'Navy banner up top, results and departments in a right rail — leadership in schools.',
    ['education', 'operations', 'hr'], ['Header carries the title', 'Rail keeps the outcomes', 'Confident, not loud'],
    RAMP['Navy & Silver'], { swatch: 'Navy & Silver' }],
  ['edu-soft', 'Primary Panels', 'soft', 'education',
    'Rounded pale-blue panels and pill skills — warm for early-years and school roles.',
    ['education', 'healthcare', 'design'], ['Approachable by design', 'Skills stay scannable', 'Great with a photo'],
    pal('Royal Blue & Slate'), { swatch: 'Royal Blue & Slate' }],

  /* ── Design & Creative ──────────────────────────────────────────────────── */
  ['creative-masthead', 'Studio Masthead', 'masthead', 'creative',
    'Giant uppercase name with a framed photo; the portfolio link lives in the rail.',
    ['design', 'marketing'], ['Type does the branding', 'Rail keeps links and tools', 'One accent, no decoration'],
    pal('Ink & White'), { mods: ['mod-outline'], swatch: 'Ink & White' }],
  ['creative-classic', 'Editorial Serif', 'classic', 'creative',
    'Copper rules under a serif header, for copy, editing and brand writing.',
    ['design', 'marketing', 'education'], ['Reads like a masthead', 'Formal with a pulse', 'Prints elegantly'],
    pal('Charcoal & Gold'), { mods: ['mod-serif'], swatch: 'Charcoal & Gold' }],
  ['creative-tint', 'Poster Tint', 'tintsheet', 'creative',
    'A washed poster page: one tracked name, boxed tools in two columns, framed photo.',
    ['design', 'marketing'], ['Poster presence', 'Tools as a grid', 'Calm, low-glare field'],
    TINT['Forest & Sand'], { mods: ['mod-outline'], swatch: 'Forest & Sand' }],
  ['creative-panelband', 'Portfolio Band', 'panelband', 'creative',
    'Copper-framed photo band, then exhibits and tools in a pale rail.',
    ['design', 'marketing', 'data'], ['Portfolio-first header', 'Rail keeps the craft list', 'Strong but restrained'],
    TINT['Midnight & Copper'], { swatch: 'Midnight & Copper' }],

  /* ── Leadership & Admin ─────────────────────────────────────────────────── */
  ['lead-metro', 'Board Band', 'metro', 'leadership',
    'A flat navy band with silver chips for CXO, head and director roles.',
    ['operations', 'finance', 'sales', 'hr'], ['Gravitas in one band', 'Chips keep it tidy', 'Memorable at a glance'],
    RAMP['Navy & Silver'], { mods: ['mod-band-flat'], swatch: 'Navy & Silver' }],
  ['lead-ledger', 'Director Ledger', 'ledger', 'leadership',
    'Board tenures, P&L and mandates in ruled rows — dry, formal, unarguable.',
    ['finance', 'operations', 'hr'], ['Every mandate on a line', 'Dates never get lost', 'Reads like a dossier'],
    pal('Burgundy & Cream'), { mods: ['mod-caps'], swatch: 'Burgundy & Cream' }],
  ['lead-portrait', 'Chair Portrait', 'portrait', 'leadership',
    'Square framed photo, letter-spaced name, warm beige rules — a calm senior page.',
    ['operations', 'hr', 'sales'], ['Composed and senior', 'Hairline structure', 'Photo where it belongs'],
    pal('Espresso & Beige'), { mods: ['mod-square', 'mod-frame'], swatch: 'Espresso & Beige' }],
  ['lead-split', 'Executive Sidebar', 'split', 'leadership',
    'Board seats, mandates and links in a slate rail; achievements take the main column.',
    ['finance', 'operations', 'marketing'], ['Rail keeps the roles', 'Story gets the space', 'Prints crisply'],
    RAMP['Slate & Pearl'], { mods: ['mod-invert'], swatch: 'Slate & Pearl' }],

  /* ── Fresher & Entry ────────────────────────────────────────────────────── */
  ['fresher-timeline', 'First Line', 'timeline', 'fresher',
    'College to first role on a dotted line, so a short history still looks structured.',
    ['it', 'sales', 'operations'], ['Progress, however early', 'Dates always clear', 'Photo in the header'],
    RAMP['Deep Teal & Mist'], { swatch: 'Deep Teal & Mist' }],
  ['fresher-studio', 'Junior Studio', 'studio', 'fresher',
    'Sand panel with a round photo; kind to internships, trainees and projects.',
    ['education', 'hr', 'design', 'marketing'], ['Warm, not childish', 'Panel holds the basics', 'Projects get the main column'],
    TINT['Forest & Sand'], { swatch: 'Forest & Sand' }],
  ['fresher-spine', 'Graduate Spine', 'spinegradient', 'fresher',
    'A copper gradient rail carrying your name, body kept to three tight blocks.',
    ['design', 'it', 'data'], ['Bold rail, disciplined body', 'Name reads from the edge', 'Photo optional, frame ready'],
    RAMP['Midnight & Copper'], { swatch: 'Midnight & Copper' }],
  ['fresher-bars', 'Starter Skills', 'infographic', 'fresher',
    'Skill bars and language dots for a first CV — evidence replaces tenure.',
    ['it', 'data', 'marketing'], ['Skills visualised honestly', 'Photo up top', 'Projects sit beside them'],
    RAMP['Slate & Pearl'], { swatch: 'Slate & Pearl' }],
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
  highlight: 'Key Highlights',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certs: 'Certifications',
  languages: 'Languages',
  achievements: 'Achievements',
  hobbies: 'Hobbies & Interests',
};
