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
  | 'ats' | 'corporate' | 'tech' | 'creative' | 'executive'
  | 'academic' | 'healthcare' | 'education' | 'sales' | 'fresher';

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
  mods: Mod[];
  tagline: string;
  bestFor: string[]; // field ids where it is the top pick
  strengths: string[];
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

/** What each category is for — drives the gallery's first chip row. */
export const CATEGORY_META: Record<CategoryId, { label: string; blurb: string }> = {
  ats: { label: 'ATS & Plain', blurb: 'Tracker-safe single column, no decoration, maximum parse rate' },
  corporate: { label: 'Corporate & Finance', blurb: 'Grids, ledgers and label columns for conservative hiring' },
  tech: { label: 'Tech & Product', blurb: 'Skills high on the page, room for stacks, ships and metrics' },
  creative: { label: 'Design & Creative', blurb: 'Display type, wide margins, colour used once and on purpose' },
  executive: { label: 'Executive & Board', blurb: 'Serif gravitas, restrained metal accents, senior tone' },
  academic: { label: 'Academic & Research', blurb: 'Publications, teaching and credentials with scholarly order' },
  healthcare: { label: 'Healthcare & Care', blurb: 'Clinical clarity: licences, units, shift and patient detail' },
  education: { label: 'Education & Teaching', blurb: 'Curriculum, boards, faculty roles and classroom outcomes' },
  sales: { label: 'Sales & Marketing', blurb: 'Numbers first — quotas, campaigns, revenue, pipeline' },
  fresher: { label: 'Fresher & Switch', blurb: 'Projects, coursework and internships carry the page' },
};

export const CATEGORY_ORDER: CategoryId[] = [
  'ats', 'corporate', 'tech', 'creative', 'executive',
  'academic', 'healthcare', 'education', 'sales', 'fresher',
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
  mods?: Mod[],
];

const ATS_FIELDS = ['it', 'data', 'finance', 'operations', 'healthcare', 'education'];
const ROWS: Row[] = [
  /* ── ATS & plain ───────────────────────────────────────────────────────── */
  ['ats-sterling', 'Sterling ATS', 'compact', 'ats',
    'One clean column, plain headings, zero decoration. The safest file you can send.',
    ATS_FIELDS, ['Parses in every tracker', 'Fits a long history', 'Prints in pure black and white'],
    mono('#1c2430', '#c4cddb')],
  ['ats-executive', 'Executive ATS', 'compact', 'ats',
    'Navy title bars over a dense single column — same parse, more authority.',
    ['finance', 'operations', 'sales', 'hr'], ['Section bars guide the eye', 'Senior-candidate tone', 'One or two pages, both clean'],
    mono(NAVY.p, NAVY.a)],
  ['ats-technical', 'Technical ATS', 'compact', 'ats',
    'Graphite rules, tight leading, skills listed first so keyword matching never misses.',
    ['it', 'data', 'operations'], ['Skills high on the page', 'Handles a big tool list', 'Maximum content per page'],
    mono(GRAPHITE.p, GRAPHITE.a)],
  ['ledger-dossier', 'Ruled Dossier', 'ledger', 'ats',
    'Dates in the left rule, ruled rows, nothing a parser has to guess about.',
    ['operations', 'finance', 'data', 'sales'], ['Extremely easy to scan', 'Dates never get lost', 'Built for 10+ years'],
    mono(SLATE_INK.p, SLATE_INK.a)],
  ['minimal-hairline', 'Hairline ATS', 'minimal', 'ats',
    'Air, hairlines and one accent. ATS-safe and still looks designed.',
    ['design', 'data', 'education'], ['Very clean scan', 'Works with less content', 'No decoration to break'],
    mono('#6c7789', '#dde3ec')],

  /* ── corporate & finance ───────────────────────────────────────────────── */
  ['grid-boardroom', 'Boardroom Grid', 'corporate', 'corporate',
    'Section labels in a left rail, content on the right. Extremely scannable.',
    ['finance', 'operations', 'hr', 'sales'], ['Instant section finding', 'Formal by default', 'ATS-friendly structure'],
    mono(INK.p, '#d6dae1')],
  ['grid-navy', 'Navy Grid', 'corporate', 'corporate',
    'The same rail in navy ink with a rule under every block.',
    ['finance', 'it', 'data', 'operations'], ['Classic corporate grid', 'Reads authoritative', 'Prints crisp'],
    mono(NAVY.p, NAVY.a)],
  ['classic-exec', 'Executive Serif', 'classic', 'corporate',
    'Centred serif name over double rules — the formal choice for conservative hiring.',
    ['finance', 'operations', 'sales', 'hr', 'education'], ['Loved by senior reviewers', 'Reads authoritative', 'Nothing to apologise for'],
    mono(NAVY.p, NAVY.a), ['mod-serif']],
  ['tint-steel', 'Steel Memo', 'tintsheet', 'corporate',
    'A pale steel page, one giant tracked name, boxed skills in a grid.',
    ['operations', 'finance', 'hr', 'design'],
    ['Distinct without colour noise', 'Skills read in one sweep', 'Great on screen and paper'],
    TINT_STEEL],
  ['metro-slate', 'Slate Band', 'metro', 'corporate',
    'Steel band with a flat finish — the statement with the colour dialled down.',
    ['operations', 'finance', 'data', 'it'], ['Neutral for any sector', 'Sharp on a laser printer', 'Strong name presence'],
    STEEL, ['mod-band-flat']],

  /* ── tech & product ────────────────────────────────────────────────────── */
  ['split-navy', 'Navy Sidebar', 'split', 'tech',
    'Deep navy column, silver detail. Contacts and skills never scroll out of view.',
    ['it', 'data', 'design', 'marketing', 'operations'], ['Skills always visible', 'Strong first impression', 'Great one-page scan'],
    NAVY],
  ['split-graphite', 'Graphite Sidebar', 'split', 'tech',
    'Soft black column with cool gray detail — modern, serious, quiet.',
    ['it', 'data', 'sales', 'finance'], ['High contrast, low noise', 'Roomy for a long stack list', 'Ages well'],
    GRAPHITE],
  ['bars-skills', 'Skills Bars', 'infographic', 'tech',
    'Tinted right panel with proficiency bars and language dots. Visual, kept tidy.',
    ['it', 'design', 'data', 'marketing'], ['Skills read at a glance', 'Bold first impression', 'Photo-friendly'],
    NAVY],
  ['mast-dev', 'Dev Masthead', 'masthead', 'tech',
    'Oversized name, contact strip, numbered sections and a facts rail for your stack.',
    ['it', 'data', 'design'], ['Numbered sections scan fast', 'Stack stays in the rail', 'Engineer-grade density'],
    mono('#1b2536', '#dbe3ee'), ['mod-numbered']],
  ['timeline-career', 'Career Timeline', 'timeline', 'tech',
    'Dates in the left gutter, a dotted line down the page. Progression is obvious.',
    ['it', 'sales', 'operations', 'marketing'], ['Progression reads instantly', 'Great for 5+ years', 'Recruiter-friendly scan'],
    NAVY],

  /* ── design & creative ─────────────────────────────────────────────────── */
  ['spine-ink', 'Ink Spine', 'spine', 'creative',
    'Near-black spine with a brass hairline and sideways titles. Design-forward, still formal.',
    ['design', 'marketing', 'hr', 'it'], ['Designer-grade header', 'Single metal accent', 'Memorable structure'],
    NOIR_GOLD],
  ['editorial-wide', 'Wide Margin', 'editorial', 'creative',
    'Numbered sections in a broad left margin, magazine spacing down the page.',
    ['design', 'marketing', 'education', 'hr'], ['Reads like a profile piece', 'Huge margins, zero clutter', 'Portfolio careers'],
    mono('#16181d', '#c9ccd3')],
  ['portrait-ink', 'Portrait Ink', 'portrait', 'creative',
    'Letter-spaced name, square photo, hairline columns. The clean photo CV.',
    ['marketing', 'hr', 'design', 'education'], ['Photo without heaviness', 'Very readable columns', 'Recognisable structure'],
    mono('#16181d', '#d9dde3'), ['mod-square']],
  ['spine-clay', 'Clay Gradient Spine', 'spinegradient', 'creative',
    'A warm gradient rail carrying an italic serif name, body on a hairline grid.',
    ['design', 'marketing', 'hr', 'education'],
    ['Rail holds the identity', 'Centred headings, calm body', 'Stands out in a stack'],
    SPINE_CLAY],
  ['mast-display', 'Display Masthead', 'masthead', 'creative',
    'Giant uppercase name, role on a filled tab, three-column contact strip.',
    ['design', 'marketing', 'sales', 'data'],
    ['Instant personal brand', 'Type does the talking', 'Photo optional, works either way'],
    mono(NOIR_GOLD.p, '#e2e5ea')],

  /* ── executive & board ─────────────────────────────────────────────────── */
  ['classic-luxe', 'Gold Rule Classic', 'classic', 'executive',
    'Near-black serif with a single brass rule. Formal, a shade warm.',
    ['finance', 'sales', 'hr', 'operations'], ['Quiet premium detail', 'Memorable without colour', 'Boardroom-safe'],
    mono(NOIR_GOLD.p, NOIR_GOLD.a), ['mod-serif']],
  ['band-noir', 'Noir Band', 'metro', 'executive',
    'Flat black header with brass detail — the boldest page in the pile, quietly.',
    ['marketing', 'design', 'sales'], ['Maximum contrast', 'One metal accent', 'Unforgettable header'],
    NOIR_GOLD, ['mod-band-flat']],
  ['mono-seal', 'Initials Seal', 'monogram', 'executive',
    'Boxed initials, tracked serif name, centered rules. Strong without a photo.',
    ['design', 'marketing', 'hr', 'sales'], ['Personal-brand header', 'Works with no photo', 'Editorial spacing'],
    mono('#16181d', '#cfd2d8')],
  ['banner-indigo', 'Indigo Banner', 'banner', 'executive',
    'Deep indigo banner with a pale rail. Composed, a touch premium.',
    ['finance', 'hr', 'marketing', 'sales'], ['Premium first impression', 'Quiet colour story', 'Senior-friendly'],
    INDIGO_STEEL],
  ['ledger-oxblood', 'Oxblood Ledger', 'ledger', 'executive',
    'Wine rules and a double date column. Old-school precision for partner tracks.',
    ['finance', 'sales', 'hr', 'operations'],
    ['Traditional and confident', 'Reads distinguished', 'Handles a long career'],
    mono(OXBLOOD.p, OXBLOOD.a)],

  /* ── academic & research ───────────────────────────────────────────────── */
  ['classic-academic', 'Academic CV', 'classic', 'academic',
    'Serif throughout, education-and-publications order for research and teaching.',
    ['education', 'healthcare', 'data'], ['Scholarly structure', 'Room for publications', 'Conference-ready'],
    mono('#3a2230', '#e0d3d9'), ['mod-serif']],
  ['ledger-research', 'Research Ledger', 'ledger', 'academic',
    'Ruled rows with a left date column — grants, papers and teaching in one grid.',
    ['education', 'data', 'healthcare'], ['Every row aligned', 'Two pages, no drift', 'Prints like a dossier'],
    mono(PINE.p, PINE.a)],
  ['editorial-navy', 'Navy Editorial', 'editorial', 'academic',
    'Serif headings over hairlines with numbered margins. Boardroom magazine.',
    ['finance', 'operations', 'sales', 'it'], ['Quiet authority', 'Long histories scan fast', 'Prints beautifully'],
    mono(NAVY.p, NAVY.a), ['mod-serif']],
  ['tint-scholar', 'Scholar Tint', 'tintsheet', 'academic',
    'A sage-washed page with one wide-tracked name and boxed research interests.',
    ['education', 'healthcare', 'data', 'design'], ['Calm, low-glare field', 'Interests as a grid', 'Reads considered'],
    TINT_SAGE],
  ['mono-navy', 'Navy Seal', 'monogram', 'academic',
    'Navy seal and rules — formal, with a little flair for fellowships and grants.',
    ['education', 'finance', 'hr'], ['Formal yet memorable', 'Clean centred block', 'Works for CV-length files'],
    NAVY],

  /* ── healthcare & care ─────────────────────────────────────────────────── */
  ['split-petrol', 'Petrol Sidebar', 'split', 'healthcare',
    'Deep teal-blue column. Fresh without looking like a pitch deck.',
    ['it', 'healthcare', 'data', 'design'], ['Distinct but calm', 'Clear two-zone structure', 'Good in print and on screen'],
    PETROL],
  ['soft-slate', 'Slate Panels', 'soft', 'healthcare',
    'Rounded steel panels and pill skills. Modern, approachable, not playful.',
    ['it', 'data', 'hr', 'education'], ['Approachable, still professional', 'Pills make skills scannable', 'Great early-career'],
    STEEL],
  ['studio-mist', 'Mist Panel', 'studio', 'healthcare',
    'Pale steel panel, round photo, small-caps sections. Warm but working.',
    ['hr', 'healthcare', 'education', 'operations'],
    ['Friendly, still formal', 'Photo front and centre', 'Licences stay visible'],
    { p: '#243042', p2: '#eaeff5', p3: '#d6dee9', pm: '#7d8da3', a: '#4f6b8c' }],
  ['grid-pine', 'Pine Grid', 'corporate', 'healthcare',
    'Deep green labels on a clean grid — grounded, readable for clinical detail.',
    ['healthcare', 'education', 'operations', 'finance'], ['Trustworthy tone', 'Clear label column', 'Comfortable long read'],
    mono(PINE.p, '#c6d8cd')],
  ['bars-slate', 'Slate Skills Panel', 'infographic', 'healthcare',
    'Graphite panel with level bars — shifts, units and competencies at a glance.',
    ['it', 'data', 'finance', 'operations', 'healthcare'], ['Neutral corporate tone', 'Bars, not badges', 'Calm palette'],
    SLATE_INK],

  /* ── education & teaching ──────────────────────────────────────────────── */
  ['minimal-quiet', 'Quiet Minimal', 'minimal', 'education',
    'Small caps over hairlines with a lot of air — the calm teacher CV.',
    ['design', 'data', 'education'], ['Very legible', 'Works with less content', 'Timeless'],
    mono('#76839a', '#e0e6ee')],
  ['tint-chalk', 'Chalk Tint', 'tintsheet', 'education',
    'Chalkboard-green wash, centred name, boxed subjects. Distinctive but neat.',
    ['education', 'healthcare', 'hr'], ['One colour story, no noise', 'Subjects read as a grid', 'Prints softly'],
    TINT_CHALK],
  ['soft-sand', 'Sand Panels', 'soft', 'education',
    'Rounded warm panels with taupe ink. The friendly client-facing look.',
    ['healthcare', 'education', 'design', 'marketing'], ['Low-glare, warm tone', 'Kind and steady', 'Great with a photo'],
    MOCHA],
  ['panelband-faculty', 'Faculty Panel Band', 'panelband', 'education',
    'Navy band with a round photo, then education, skills and languages in a tinted rail.',
    ['education', 'hr', 'operations'], ['Photo CV done properly', 'Rail keeps credentials up', 'Two clear zones'],
    RAIL_NAVY],
  ['spine-sage', 'Sage Spine', 'spine', 'education',
    'A green spine down the edge with sideways section titles — orderly and calm.',
    ['education', 'healthcare', 'operations'], ['Strong visual identity', 'Keeps the page edge clean', 'Photo sits in the spine'],
    PINE],

  /* ── sales & marketing ─────────────────────────────────────────────────── */
  ['band-navy', 'Navy Band', 'metro', 'sales',
    'Full-width navy header with silver section chips. Confident, still corporate.',
    ['marketing', 'sales', 'it'], ['Memorable header', 'Chips keep it organised', 'Good for startups and agencies'],
    NAVY],
  ['banner-steel', 'Steel Banner', 'banner', 'sales',
    'Full-width steel banner, story left, quotas and reach in a right rail.',
    ['it', 'operations', 'sales', 'data'], ['Header does the work', 'Rail keeps numbers visible', 'Good on a phone screen'],
    STEEL],
  ['panelband-photo', 'Photo Panel CV', 'panelband', 'sales',
    'Dark band, round photo, warm sand rail. The face-value CV that still reads formal.',
    ['sales', 'marketing', 'hr', 'operations'],
    ['Photo-forward, not flashy', 'Tinted rail for facts', 'Confident header'],
    RAIL_SAND],
  ['portrait-steel', 'Portrait Steel', 'portrait', 'sales',
    'Navy ink on a warm white page, square photo. Photo CV, corporate edition.',
    ['sales', 'operations', 'finance', 'it'], ['Professional and current', 'Photo-friendly', 'Crisp in print'],
    mono(NAVY.p, '#ccd6e3'), ['mod-square']],
  ['studio-clay', 'Clay Panel', 'studio', 'sales',
    'Warm sand panel with taupe ink — approachable for client-facing work.',
    ['design', 'education', 'healthcare', 'marketing'], ['Warm, human tone', 'Reads gentle, not casual', 'Great with a photo'],
    { p: '#3c2f24', p2: '#f3ece3', p3: '#e3d7c8', pm: '#8d7a66', a: '#9a7550' }],

  /* ── fresher & career switch ───────────────────────────────────────────── */
  ['ats-starter', 'Starter ATS', 'compact', 'fresher',
    'Education and projects above experience — for freshers and career switchers.',
    ['education', 'hr', 'it', 'sales'], ['Coursework gets the top slot', 'Still one clean column', 'Honest for a short CV'],
    mono(STEEL.p, STEEL.a)],
  ['mast-junior', 'Fresher Masthead', 'masthead', 'fresher',
    'Big name, role tab, and a skills rail — a first CV that looks intentional.',
    ['it', 'sales', 'marketing', 'education'], ['Looks senior, reads honest', 'Skills rail carries projects', 'No filler sections'],
    mono(PETROL.p, '#d7e7ea')],
  ['portrait-grad', 'Graduate Portrait', 'portrait', 'fresher',
    'Photo header, tracked name, education and internships in the side column.',
    ['hr', 'sales', 'education', 'it'], ['Photo where it belongs', 'Internships up front', 'Clean two-column balance'],
    mono('#2f4358', '#d5dde8')],
  ['timeline-first', 'First Role Timeline', 'timeline', 'fresher',
    'A dotted line from college to your first role — progress, even when it is short.',
    ['it', 'operations', 'sales', 'marketing'], ['Makes a short history look structured', 'Dates always clear', 'Fresh colour'],
    SPINE_PETROL],
  ['spine-grad', 'Graduate Spine', 'spinegradient', 'fresher',
    'Deep petrol gradient rail with your name in it, body kept to three tight blocks.',
    ['it', 'design', 'data'], ['Bold rail, disciplined body', 'Name reads from the edge', 'Great with or without a photo'],
    SPINE_PETROL],
];

export const TEMPLATES: Template[] = ROWS.map(
  ([id, name, layout, category, tagline, bestFor, strengths, pal, mods]) => ({
    id, name, layout, category, tagline, pal,
    mods: mods ?? [],
    bestFor, strengths,
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
