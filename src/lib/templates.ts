// The 105-template library: 5 core layout families × 10 variants + 11 studio
// families (portrait, studio, monogram, timeline, infographic, corporate,
// editorial, spine, soft, banner, ledger) × 5 variants.
// All designs are original code — inspired by the most popular resume styles.
// Every template is one row below — palette, structural mods, copy and fit.
// Palettes are applied as CSS custom properties (see Preview.tsx + templates.css),
// so a variant never forks the layout code; it re-skins and re-tunes it.
// Every template prints cleanly to A4 PDF.

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
  | 'editorial' | 'spine' | 'soft' | 'banner' | 'ledger';

/** Structural (non-palette) modifier classes applied to the sheet. */
export type Mod = 'mod-invert' | 'mod-serif' | 'mod-band-flat' | 'mod-band-tint' | 'mod-square' | 'mod-dark';

export interface Palette {
  /** primary — headings, rules, title bars, band base */
  p: string;
  /** gradient mid — dark surfaces */
  p2?: string;
  /** gradient end — dark surfaces */
  p3?: string;
  /** mid tone on dark — borders under titles, chip borders */
  pm?: string;
  /** accent — silver line / hairline / gold detail */
  a: string;
}

export interface Template {
  id: string;
  name: string;
  layout: LayoutId;
  pal: Palette;
  mods: Mod[];
  tagline: string;
  bestFor: string[]; // field ids where it is the top pick
  strengths: string[];
  collection?: 'resume-io' | 'canva' | 'core' | 'studio';
}

export const LAYOUT_META: Record<LayoutId, { label: string; blurb: string }> = {
  split: { label: 'Sidebar', blurb: 'A side column keeps skills and contacts in view' },
  classic: { label: 'Classic', blurb: 'Serif, centered, boardroom-ready' },
  minimal: { label: 'Minimal', blurb: 'Hairlines and air, quiet confidence' },
  metro: { label: 'Statement', blurb: 'Bold header band, memorable at a glance' },
  compact: { label: 'Dense', blurb: 'ATS-first, maximum content per page' },
  portrait: { label: 'Portrait', blurb: 'Photo header, letter-spaced name, airy two columns — the Canva classic' },
  studio: { label: 'Studio', blurb: 'Soft pastel side panel with a round photo — warm and modern' },
  monogram: { label: 'Monogram', blurb: 'Centered initials seal, elegant serif, magazine spacing' },
  timeline: { label: 'Timeline', blurb: 'Dates in the gutter, dotted career line — story at a glance' },
  infographic: { label: 'Infographic', blurb: 'Dark skills panel with level bars — visual and bold' },
  corporate: { label: 'Corporate', blurb: 'Label column on the left, content on the right — boardroom clean' },
  editorial: { label: 'Editorial', blurb: 'Numbered sections in the wide margin — magazine spacing, very legible' },
  spine: { label: 'Spine', blurb: 'A colour spine down the page edge with sideways section titles — gallery-style' },
  soft: { label: 'Soft', blurb: 'Rounded pastel panels and pill skills — the friendly modern look' },
  banner: { label: 'Banner', blurb: 'Full-width colour banner up top, then story left and facts in a right rail' },
  ledger: { label: 'Ledger', blurb: 'Dates in the left rule, ruled rows — the unsentimental finance dossier' },
};

const SPLIT_FIT = ['it', 'data', 'design', 'marketing'];
const CLASSIC_FIT = ['finance', 'operations', 'sales', 'hr'];
const MINIMAL_FIT = ['design', 'education', 'healthcare'];
const METRO_FIT = ['marketing', 'sales', 'it'];
const COMPACT_FIT = ['data', 'finance', 'healthcare', 'operations', 'education'];

/** Shared palettes (p, p2, p3, pm, a) — tuned per family where needed. */
const NAVY: Palette = { p: '#0f2148', p2: '#16305f', p3: '#1e4076', pm: '#33507e', a: '#c9d2de' };
const SLATE: Palette = { p: '#333d4d', p2: '#3f4b5e', p3: '#4d5b72', pm: '#5d6d87', a: '#b8c2d1' };
const CHARCOAL: Palette = { p: '#232833', p2: '#2c3341', p3: '#384152', pm: '#4a5468', a: '#a7b0bf' };
const ONYX_GOLD: Palette = { p: '#17181c', p2: '#202229', p3: '#2b2e37', pm: '#3a3e4a', a: '#c9a227' };
const FOREST: Palette = { p: '#17362a', p2: '#1e4534', p3: '#275541', pm: '#35684f', a: '#bdd5c6' };
const OCEAN: Palette = { p: '#0e3d46', p2: '#14505d', p3: '#1a6474', pm: '#27788a', a: '#b3d2d8' };
const WINE: Palette = { p: '#4d1828', p2: '#5f2135', p3: '#732c44', pm: '#8a3a56', a: '#d9b7c1' };
const PLUM: Palette = { p: '#37194d', p2: '#462361', p3: '#582f79', pm: '#6d4192', a: '#cdb4de' };
const BRONZE: Palette = { p: '#4d2f1c', p2: '#5f3c25', p3: '#72492f', pm: '#8a5c3d', a: '#ddc1a9' };
const COBALT: Palette = { p: '#1d3f94', p2: '#2551b8', p3: '#2f64d4', pm: '#4a76e0', a: '#c3d3f2' };
const GRAPHITE: Palette = { p: '#2e3138', p2: '#3a3e47', p3: '#474c57', pm: '#565c69', a: '#b4bac4' };
// studio families (editorial / spine / soft / banner / ledger) palettes
const SAGE: Palette = { p: '#5c6f5a', p2: '#6b7f68', p3: '#7d9179', pm: '#93a68f', a: '#cdd9c9' };
const ROSE: Palette = { p: '#8c4a5f', p2: '#a05a70', p3: '#b46d83', pm: '#c98a9d', a: '#eed3db' };
const SKY: Palette = { p: '#2b6cb0', p2: '#2f7ecb', p3: '#3a90e0', pm: '#5aa3ea', a: '#cfe3f7' };
const CLAY: Palette = { p: '#a05a3c', p2: '#b36848', p3: '#c47a58', pm: '#d49a7d', a: '#f0d9c8' };
const BOTTLE: Palette = { p: '#1f4d3f', p2: '#275e4d', p3: '#2f715c', pm: '#3d8770', a: '#bcd8cc' };
const INDIGO: Palette = { p: '#2f3676', p2: '#3b438c', p3: '#4851a4', pm: '#5c66bd', a: '#c8cdf0' };

// p + a only (light layouts: primary as ink, accent as hairline)
const mono = (p: string, a: string): Palette => ({ p, a });

type Spec = [id: string, name: string, tagline: string, bestFor: string[], strengths: string[], pal: Palette, mods?: Mod[]];

const SPLIT: Spec[] = [
  ['modern', 'Modern Split', 'Navy sidebar, silver accents. The safe, impressive choice.',
    SPLIT_FIT, ['Skills always visible', 'Great for 1-page scans', 'Strong first impression'], NAVY],
  ['slate-split', 'Slate Split', 'Cool slate sidebar with steel accents. Corporate-calm.',
    ['it', 'data', 'operations', 'sales'], ['Neutral for any industry', 'Reads sharp in print', 'Calm, zero distraction'], SLATE],
  ['charcoal-split', 'Charcoal Split', 'Soft black sidebar, warm gray details. Modern serious.',
    ['it', 'data', 'sales', 'finance'], ['High contrast, low noise', 'Good for dense skill lists', 'Ageless look'], CHARCOAL],
  ['onyx-gold', 'Onyx & Gold', 'Black sidebar with a single gold accent. Premium, confident.',
    ['design', 'it', 'marketing'], ['Stands out in a stack', 'One accent, zero clutter', 'Great for founders & creators'], ONYX_GOLD],
  ['forest-split', 'Forest Split', 'Deep green sidebar, sage accents. Steady and trustworthy.',
    ['finance', 'healthcare', 'operations', 'education'], ['Trustworthy for client-facing roles', 'Distinct without being loud', 'Prints cleanly on A4'], FOREST],
  ['ocean-split', 'Ocean Split', 'Teal-navy sidebar, cool accents. Fresh but professional.',
    ['it', 'marketing', 'data', 'design'], ['Fresh for startup resumes', 'Calm color, clear structure', 'Skills front and center'], OCEAN],
  ['bordeaux-split', 'Bordeaux Split', 'Deep wine sidebar, rose accents. Warm authority.',
    ['sales', 'finance', 'hr', 'marketing'], ['Warm, memorable, mature', 'Works for client-facing careers', 'Distinct in recruiter stacks'], WINE],
  ['plum-split', 'Plum Split', 'Deep purple sidebar, orchid accents. Creative but composed.',
    ['design', 'marketing', 'it'], ['Creative without candy colors', 'Strong first impression', 'Skills always visible'], PLUM],
  ['bronze-split', 'Bronze Split', 'Warm bronze sidebar, tan accents. Heritage tone.',
    ['operations', 'finance', 'hr', 'education'], ['Warm and grounded', 'Good for senior traditional roles', 'Distinct from navy stacks'], BRONZE],
  ['ivory-split', 'Ivory Split', 'Light sidebar, steel-navy ink. The quiet opposite of a dark resume.',
    ['education', 'healthcare', 'hr', 'finance'], ['Bright page, low ink use', 'Calm for long histories', 'Great for older reviewers'],
    { p: '#33507e', p2: '#44658f', p3: '#55779f', pm: '#6b89a8', a: '#9fb0c8' }, ['mod-invert']],
];

const CLASSIC: Spec[] = [
  ['classic', 'Executive Classic', 'Serif headings, generous spacing. Boardroom-ready.',
    CLASSIC_FIT, ['Loved by senior reviewers', 'Reads authoritative', 'Conservative industries'], mono(NAVY.p, NAVY.a)],
  ['oxford', 'Oxford Classic', 'Wine double rules, serif elegance. Old-school weight.',
    ['finance', 'sales', 'hr'], ['Authoritative for finance', 'Distinct from navy classics', 'Traditional, not boring'], mono(WINE.p, WINE.a)],
  ['ivy-league', 'Ivy League', 'Forest green rules, serif structure. Ivy without the varsity.',
    ['education', 'finance', 'operations'], ['Scholarly tone', 'Strong for academic paths', 'Calm and confident'], mono(FOREST.p, FOREST.a)],
  ['aubergine', 'Aubergine', 'Deep plum serif. Formal with a creative undertone.',
    ['design', 'hr', 'marketing', 'sales'], ['Formal yet distinctive', 'Good for creative management', 'Elegant on one page'], mono(PLUM.p, PLUM.a)],
  ['midnight-serif', 'Midnight Serif', 'Near-black ink, gold double rule. The most formal we make.',
    ['finance', 'operations', 'hr', 'sales'], ['Maximum gravitas', 'Gold rule reads premium', 'Boardroom-safe'], mono(ONYX_GOLD.p, ONYX_GOLD.a)],
  ['slate-classic', 'Slate Classic', 'Graphite rules, understated serif. Serious, current.',
    ['operations', 'finance', 'sales', 'data'], ['Modern take on classic', 'Neutral for any sector', 'Prints crisp'], mono(SLATE.p, SLATE.a)],
  ['copperplate', 'Copperplate', 'Bronze rules, warm serif. Heritage and warmth.',
    ['hr', 'operations', 'education', 'sales'], ['Warm, human tone', 'Good for people-facing roles', 'Distinct from navy'], mono(BRONZE.p, BRONZE.a)],
  ['marine', 'Marine Classic', 'Deep teal rules, serif formality. Navy’s cooler cousin.',
    ['sales', 'finance', 'it', 'operations'], ['Distinct among navy resumes', 'Calm, professional color', 'Serif structure scans well'], mono(OCEAN.p, OCEAN.a)],
  ['ivory-serif', 'Ivory Serif', 'Warm taupe rules, soft contrast. The quietest classic.',
    ['education', 'healthcare', 'hr', 'finance'], ['Gentle on the eye', 'Low-contrast, high readability', 'Works for long documents'], mono('#57493b', '#cfc4b2')],
  ['graphite-classic', 'Graphite Classic', 'Charcoal rules, sharp serif. Classic, but darker.',
    ['finance', 'operations', 'sales', 'data'], ['Darker, more modern classic', 'Strong name presence', 'Boardroom-safe'], mono(GRAPHITE.p, GRAPHITE.a)],
];

const MINIMAL: Spec[] = [
  ['minimal', 'Sharp Minimal', 'Airy, quiet, confident. Lets your numbers speak.',
    MINIMAL_FIT, ['Very clean scan', 'Works with less content', 'Timeless look'], mono('#76839a', '#e4e9f0')],
  ['ink-minimal', 'Ink Minimal', 'Near-black type, faint rules. Maximum quiet.',
    ['design', 'data', 'it'], ['Very modern, very calm', 'Great for 1-page designs', 'Type does the talking'], mono('#2b3446', '#dfe5ee')],
  ['steel-minimal', 'Steel Minimal', 'Soft blue-gray accents. Minimal with a cool cast.',
    ['it', 'data', 'design'], ['Cool, technical feel', 'Hairline structure', 'Easy to scan'], mono('#5b7699', '#d9e2ee')],
  ['sage-minimal', 'Sage Minimal', 'Muted green accents. Calm, natural, current.',
    ['healthcare', 'education', 'design'], ['Soft, approachable tone', 'Good for care & education', 'Very readable'], mono('#6d8a77', '#dfe9e2')],
  ['rust-minimal', 'Rust Minimal', 'Warm terracotta accents. Minimal with personality.',
    ['design', 'marketing', 'operations'], ['Warm without being loud', 'Distinct from gray stacks', 'Focus stays on content'], mono('#9a6a52', '#efe0d8')],
  ['orchid-minimal', 'Orchid Minimal', 'Dusty purple accents. Minimal, a touch creative.',
    ['design', 'marketing', 'it'], ['Creative, not candy', 'Quiet structure', 'Strong name presence'], mono('#7d5f92', '#e8dfee')],
  ['teal-minimal', 'Teal Minimal', 'Quiet teal accents. Fresh minimal.',
    ['it', 'data', 'healthcare'], ['Fresh, current feel', 'Hairline clarity', 'ATS-safe single column'], mono('#4f828c', '#d8e8ea')],
  ['graphite-minimal', 'Graphite Minimal', 'Darker gray, tighter air. Minimal for serious content.',
    ['data', 'operations', 'finance', 'education'], ['Denser than typical minimal', 'Serious tone', 'Scans fast'], mono('#4a505c', '#dde1e7')],
  ['editorial', 'Editorial', 'Serif headings, hairline rules. The magazine look.',
    ['design', 'education', 'marketing'], ['Magazine-grade typography', 'Distinct on the page', 'Timeless pairing'],
    mono('#33507e', '#d5dce6'), ['mod-serif']],
  ['champagne-minimal', 'Champagne Minimal', 'Soft gold accents. Minimal that feels premium.',
    ['design', 'finance', 'marketing'], ['Premium feel, zero clutter', 'Gold stays subtle', 'Great one-pager'], mono('#9c7c3c', '#ece2cc')],
];

const METRO: Spec[] = [
  ['metro', 'Metro Two-Tone', 'Bold navy header band with silver section chips.',
    METRO_FIT, ['Memorable at a glance', 'Energetic but tidy', 'Good for startups'], NAVY],
  ['cobalt-metro', 'Cobalt Metro', 'Brighter blue band. Bolder, more energetic.',
    ['marketing', 'sales', 'it', 'design'], ['High energy, high polish', 'Stands out in stacks', 'Chips keep it organized'], COBALT],
  ['petrol-metro', 'Petrol Metro', 'Deep teal band, cool chips. Modern industrial.',
    ['it', 'data', 'marketing'], ['Distinct from navy', 'Strong header presence', 'Tidy section chips'], OCEAN],
  ['charcoal-metro', 'Charcoal Metro', 'Soft black band, gray chips. Bold, but sober.',
    ['sales', 'it', 'operations', 'finance'], ['Bold without color noise', 'Very modern feel', 'Strong first line of sight'], CHARCOAL],
  ['bordeaux-metro', 'Bordeaux Metro', 'Wine band, rose chips. Warm and confident.',
    ['marketing', 'sales', 'hr'], ['Warm, memorable header', 'Distinct from blue stacks', 'Confident tone'], WINE],
  ['forest-metro', 'Forest Metro', 'Green band, sage chips. Grounded energy.',
    ['operations', 'finance', 'marketing', 'sales'], ['Trustworthy with energy', 'Distinct color, tidy layout', 'Good for field roles'], FOREST],
  ['plum-metro', 'Plum Metro', 'Purple band, orchid chips. Creative energy.',
    ['design', 'marketing', 'it'], ['Creative, memorable', 'Strong statement header', 'Keeps content tidy'], PLUM],
  ['bronze-metro', 'Bronze Metro', 'Bronze band, tan chips. Heritage with punch.',
    ['sales', 'operations', 'hr', 'finance'], ['Warm and distinctive', 'Punchy but professional', 'Great for senior roles'], BRONZE],
  ['silver-metro', 'Silver Metro', 'Light band, navy ink. The inverted statement.',
    ['hr', 'finance', 'education', 'healthcare'], ['Light, airy, modern', 'Still makes a statement', 'Low ink, bright page'], NAVY, ['mod-band-tint']],
  ['noir-metro', 'Noir Metro', 'Flat black band, gold details. Statement, monochrome.',
    ['marketing', 'design', 'sales'], ['Maximum contrast, monochrome', 'Gold details read premium', 'Unforgettable header'], ONYX_GOLD, ['mod-band-flat']],
];

const COMPACT: Spec[] = [
  ['compact', 'Compact Pro', 'Dense single column, ATS-first. Maximum content, no fuss.',
    COMPACT_FIT, ['Most ATS-friendly', 'Fits long histories', 'Recruiter-speed scanning'], mono(NAVY.p, NAVY.a)],
  ['slate-compact', 'Slate Compact', 'Same density, cooler tone. Dense but modern.',
    ['data', 'operations', 'it', 'finance'], ['ATS-first density', 'Cool, current look', 'Fits 10+ years of work'], mono(SLATE.p, SLATE.a)],
  ['forest-compact', 'Forest Compact', 'Green rules, dense layout. Serious and steady.',
    ['finance', 'healthcare', 'operations', 'education'], ['Dense and trustworthy', 'Distinct from blue dense resumes', 'Recruiter-speed scanning'], mono(FOREST.p, FOREST.a)],
  ['bordeaux-compact', 'Bordeaux Compact', 'Wine rules, dense columns. Formal density.',
    ['sales', 'finance', 'operations', 'hr'], ['Formal tone at full density', 'Warm, memorable rules', 'Fits long histories'], mono(WINE.p, WINE.a)],
  ['graphite-compact', 'Graphite Compact', 'Charcoal rules, tight and modern. The sober workhorse.',
    ['operations', 'data', 'finance', 'it'], ['Sober, modern, dense', 'Strong title bars', 'Great for big histories'], mono(GRAPHITE.p, GRAPHITE.a)],
  ['teal-compact', 'Teal Compact', 'Teal rules, dense layout. Fresh density.',
    ['it', 'data', 'healthcare', 'finance'], ['Fresh take on ATS layout', 'Clear section bars', 'Maximum content'], mono(OCEAN.p, OCEAN.a)],
  ['plum-compact', 'Plum Compact', 'Purple rules, dense structure. Dense with character.',
    ['it', 'design', 'data', 'marketing'], ['Dense but distinctive', 'Modern purple, not loud', 'Keeps everything visible'], mono(PLUM.p, PLUM.a)],
  ['bronze-compact', 'Bronze Compact', 'Bronze rules, dense grid. Heritage density.',
    ['operations', 'finance', 'hr', 'education'], ['Warm, grounded tone', 'Dense and readable', 'Senior-friendly look'], mono(BRONZE.p, BRONZE.a)],
  ['onyx-compact', 'Onyx Compact', 'Black rules, gold title bars. Dense and premium.',
    ['finance', 'data', 'operations', 'sales'], ['Premium, high contrast', 'Gold bars read sharp', 'Maximum content, ATS-first'], mono(ONYX_GOLD.p, ONYX_GOLD.a)],
  ['ivory-compact', 'Ivory Compact', 'Warm gray rules, soft density. Gentle on the eye.',
    ['education', 'healthcare', 'hr', 'finance'], ['Soft, readable density', 'Low-contrast, low-fatigue', 'Long-history friendly'], mono('#57493b', '#cfc4b2')],
];

/* ---------- Canva-style families (original code, inspired by popular styles) ---------- */

// pastel panel tones for Studio: p = ink, p2 = panel bg, p3 = panel border, a = accent
const PORTRAIT: Spec[] = [
  ['portrait', 'Portrait Ink', 'Letter-spaced black name, square photo, hairline columns. The Canva classic.',
    ['design', 'marketing', 'hr', 'education'], ['Instantly recognisable style', 'Photo without heaviness', 'Very readable columns'], mono('#17181c', '#d9dde3')],
  ['portrait-navy', 'Portrait Navy', 'Navy name and rules, warm white page.',
    ['finance', 'it', 'operations', 'sales'], ['Professional and current', 'Photo-friendly', 'Prints crisp'], mono(NAVY.p, '#cfd7e2')],
  ['portrait-taupe', 'Portrait Taupe', 'Warm taupe ink, soft rules. Quiet luxury.',
    ['design', 'hr', 'education', 'healthcare'], ['Soft and premium', 'Great with a photo', 'Calm for reviewers'], mono('#5a4d42', '#e2dad1')],
  ['portrait-sage', 'Portrait Sage', 'Muted green headings, airy page. Fresh and calm.',
    ['healthcare', 'education', 'operations'], ['Calm, natural tone', 'Distinct from gray stacks', 'Readable columns'], mono('#4f6b5a', '#d7e2da')],
  ['portrait-rose', 'Portrait Rosé', 'Dusty rose accents on ink type. Creative, composed.',
    ['design', 'marketing', 'hr'], ['Creative without noise', 'Memorable accent', 'Photo-first header'], mono('#2b2a2e', '#e6cdd0')],
];

const STUDIO: Spec[] = [
  ['studio', 'Studio Beige', 'Soft beige panel, round photo, small-caps sections. Warm modern.',
    ['design', 'marketing', 'hr', 'education'], ['Warm and friendly', 'Photo front and center', 'Skills always visible'],
    { p: '#2b2622', p2: '#f2ece3', p3: '#e3d9cb', pm: '#8a7d6e', a: '#b8977a' }],
  ['studio-blush', 'Studio Blush', 'Blush panel, charcoal ink. Soft creative.',
    ['design', 'marketing', 'healthcare'], ['Gentle, creative tone', 'Distinct in a stack', 'Photo-friendly'],
    { p: '#2d262a', p2: '#f6e9ea', p3: '#ead4d6', pm: '#8f7478', a: '#c2848c' }],
  ['studio-mint', 'Studio Mint', 'Mint panel, deep green ink. Fresh professional.',
    ['healthcare', 'education', 'operations'], ['Fresh and calm', 'Great for care roles', 'Readable at a glance'],
    { p: '#1e3a30', p2: '#e8f2ec', p3: '#d2e4d9', pm: '#6b8a7a', a: '#5f9b7f' }],
  ['studio-sky', 'Studio Sky', 'Pale blue panel, navy ink. Corporate soft.',
    ['it', 'finance', 'data', 'sales'], ['Corporate but warm', 'Photo without darkness', 'Prints light'],
    { p: '#14264a', p2: '#e9eff8', p3: '#d3ddef', pm: '#6d7f9f', a: '#4c6fae' }],
  ['studio-lavender', 'Studio Lavender', 'Lavender panel, plum ink. Creative calm.',
    ['design', 'marketing', 'it'], ['Creative, composed', 'Distinct color story', 'Skills column stays visible'],
    { p: '#2f2340', p2: '#efeaf6', p3: '#ded4ec', pm: '#83729c', a: '#7d5f92' }],
];

const MONOGRAM: Spec[] = [
  ['monogram', 'Monogram Black', 'Boxed initials, wide-tracked serif name, centered rules. Editorial.',
    ['design', 'marketing', 'hr', 'sales'], ['Magazine look', 'Strong personal brand', 'Works without a photo'], mono('#17181c', '#cfd2d8')],
  ['monogram-navy', 'Monogram Navy', 'Navy seal and rules. Formal with flair.',
    ['finance', 'sales', 'operations', 'it'], ['Formal yet memorable', 'Great for senior roles', 'Photo optional'], mono(NAVY.p, NAVY.a)],
  ['monogram-wine', 'Monogram Bordeaux', 'Wine seal, serif elegance. Warm authority.',
    ['sales', 'hr', 'marketing', 'finance'], ['Warm and distinguished', 'Distinct from black stacks', 'Elegant spacing'], mono(WINE.p, WINE.a)],
  ['monogram-forest', 'Monogram Forest', 'Deep green seal. Scholarly and calm.',
    ['education', 'healthcare', 'finance'], ['Scholarly tone', 'Calm authority', 'Clean centered structure'], mono(FOREST.p, FOREST.a)],
  ['monogram-gold', 'Monogram Gold', 'Black type, gold seal. The premium monogram.',
    ['design', 'marketing', 'sales', 'finance'], ['Premium single accent', 'Unforgettable header', 'Boardroom-safe'], { p: '#17181c', a: '#c9a227' }],
];

const TIMELINE: Spec[] = [
  ['timeline', 'Timeline Navy', 'Dates in the gutter, dotted career line, tinted header. Story at a glance.',
    ['it', 'sales', 'operations', 'marketing'], ['Career progression is obvious', 'Great for 5+ years', 'Recruiters love the scan'], NAVY],
  ['timeline-teal', 'Timeline Teal', 'Teal line and dots. Fresh chronology.',
    ['it', 'data', 'healthcare'], ['Fresh, modern color', 'Clear progression', 'Tidy dates column'], OCEAN],
  ['timeline-charcoal', 'Timeline Charcoal', 'Charcoal line, warm gray dates. Sober story.',
    ['finance', 'operations', 'data', 'sales'], ['Serious and clear', 'Neutral for any sector', 'Prints sharp'], CHARCOAL],
  ['timeline-wine', 'Timeline Bordeaux', 'Wine line and dots. Warm chronology.',
    ['sales', 'hr', 'marketing'], ['Warm and memorable', 'Progression reads instantly', 'Distinct color'], WINE],
  ['timeline-cobalt', 'Timeline Cobalt', 'Bright blue line. Energetic, startup-ready.',
    ['marketing', 'it', 'design', 'sales'], ['High energy', 'Clear scan', 'Modern feel'], COBALT],
];

const INFOGRAPHIC: Spec[] = [
  ['infographic', 'Infographic Navy', 'Dark right panel with skill bars and language dots. Visual, bold.',
    ['it', 'design', 'marketing', 'data'], ['Skills visualised', 'Bold first impression', 'Photo-friendly'], NAVY],
  ['infographic-onyx', 'Infographic Onyx', 'Black panel, gold bars. Premium visual.',
    ['design', 'marketing', 'sales'], ['Premium contrast', 'Gold bars pop', 'Memorable in stacks'], ONYX_GOLD],
  ['infographic-forest', 'Infographic Forest', 'Green panel, sage bars. Grounded visual.',
    ['operations', 'healthcare', 'education'], ['Trustworthy tone', 'Skills visualised', 'Distinct color'], FOREST],
  ['infographic-plum', 'Infographic Plum', 'Purple panel, orchid bars. Creative visual.',
    ['design', 'marketing', 'it'], ['Creative energy', 'Bars read at a glance', 'Strong header'], PLUM],
  ['infographic-slate', 'Infographic Slate', 'Slate panel, steel bars. Corporate visual.',
    ['it', 'data', 'finance', 'operations'], ['Neutral corporate', 'Skills visualised', 'Calm palette'], SLATE],
];

const CORPORATE: Spec[] = [
  ['corporate', 'Corporate Ink', 'Section labels in a left column, content on the right. Boardroom clean.',
    ['finance', 'operations', 'hr', 'sales'], ['Extremely scannable', 'Conservative industries', 'ATS-friendly structure'], mono('#17181c', '#d9dde3')],
  ['corporate-navy', 'Corporate Navy', 'Navy labels and rules. The classic corporate CV.',
    ['finance', 'it', 'operations', 'data'], ['Classic corporate look', 'Reads authoritative', 'Prints crisp'], mono(NAVY.p, NAVY.a)],
  ['corporate-graphite', 'Corporate Graphite', 'Graphite labels. Modern corporate.',
    ['operations', 'data', 'finance', 'sales'], ['Modern and sober', 'Neutral for any sector', 'Clear label column'], mono(GRAPHITE.p, GRAPHITE.a)],
  ['corporate-forest', 'Corporate Forest', 'Forest labels. Steady and trustworthy.',
    ['finance', 'healthcare', 'education', 'operations'], ['Trustworthy tone', 'Distinct from navy', 'Very scannable'], mono(FOREST.p, FOREST.a)],
  ['corporate-bronze', 'Corporate Bronze', 'Bronze labels, warm rules. Heritage corporate.',
    ['hr', 'operations', 'sales', 'education'], ['Warm and grounded', 'Senior-friendly', 'Clean structure'], mono(BRONZE.p, BRONZE.a)],
];

/* ======================================================================
   Studio families — the second wave of Canva-style designs.
   Same idea as the rest of the file: one row per template, palette + a few
   structural modifiers, layout code lives in Preview.tsx/templates.css.
   ====================================================================== */

const EDITORIAL: Spec[] = [
  ['editorial-wide', 'Editorial Wide', 'Numbered sections in the wide margin. Magazine spacing, very easy to scan.',
    ['design', 'marketing', 'education', 'hr'], ['Reads like a profile piece', 'Huge white space, zero clutter', 'Great for portfolio careers'], mono(ONYX_GOLD.p, ONYX_GOLD.a)],
  ['editorial-navy', 'Editorial Navy', 'Navy serif headings over hairline rules. Boardroom magazine.',
    ['finance', 'operations', 'sales', 'it'], ['Quiet authority', 'Scans fast for long histories', 'Prints beautifully on laser'], mono(NAVY.p, NAVY.a)],
  ['editorial-sage', 'Editorial Sage', 'Soft green headings, calm margins. Considered and human.',
    ['healthcare', 'hr', 'education', 'operations'], ['Gentle, low-contrast look', 'Good for people-facing roles', 'Distinct from blue resumes'], mono(SAGE.p, SAGE.a)],
  ['editorial-plum', 'Editorial Plum', 'Deep plum headings, wide margin numerals. Creative but composed.',
    ['design', 'marketing', 'hr', 'sales'], ['Creative without loud colour', 'Strong typographic rhythm', 'Memorable section numbers'], mono(PLUM.p, PLUM.a)],
  ['editorial-graphite', 'Editorial Graphite', 'Charcoal headings, near-paper white. The sober editorial.',
    ['finance', 'operations', 'data'], ['Neutral for any sector', 'Excellent for 2-page histories', 'No colour distractions'], mono(GRAPHITE.p, GRAPHITE.a)],
];

const SPINE: Spec[] = [
  ['spine', 'Spine Navy', 'A navy spine down the margin with sideways section titles.',
    ['it', 'data', 'design', 'operations'], ['Strong visual identity', 'Keeps the page edge clean', 'Photo sits in the spine'], mono(NAVY.p, NAVY.a)],
  ['spine-forest', 'Spine Forest', 'Deep green spine, sage rules. Steady and distinctive.',
    ['finance', 'healthcare', 'operations', 'education'], ['Trustworthy for client-facing roles', 'Distinct from navy stacks', 'Calm colour fields'], mono(BOTTLE.p, BOTTLE.a)],
  ['spine-wine', 'Spine Bordeaux', 'Wine spine, rose rules. Warm authority.',
    ['sales', 'finance', 'hr', 'marketing'], ['Warm and memorable', 'Good for senior client work', 'Stands out in a stack'], mono(WINE.p, WINE.a)],
  ['spine-ink', 'Spine Ink', 'Near-black spine, gold hairline. Gallery-style confidence.',
    ['design', 'marketing', 'it', 'hr'], ['Design-forward, still formal', 'Single gold accent', 'Great for creatives'], ONYX_GOLD],
  ['spine-sky', 'Spine Sky', 'Bright blue spine, light panels. Friendly and current.',
    ['it', 'marketing', 'education', 'data'], ['Modern and optimistic', 'Good for startups', 'Friendly without being casual'], SKY],
];

const SOFT: Spec[] = [
  ['soft', 'Soft Navy', 'Rounded navy panels, pill skills. Friendly and modern.',
    ['it', 'data', 'hr', 'education'], ['Approachable, still professional', 'Pills make skills scannable', 'Great for early-career'], NAVY],
  ['soft-rose', 'Soft Rose', 'Blush panels and rounded rules. Warm and human.',
    ['hr', 'healthcare', 'design', 'education'], ['Nurturing tone', 'Good for care and teaching roles', 'Soft on the eye'], ROSE],
  ['soft-sage', 'Soft Sage', 'Sage panels, rounded chips. Calm and grounded.',
    ['healthcare', 'education', 'operations', 'hr'], ['Calm, low-glare look', 'Reads kind and steady', 'Prints softly'], SAGE],
  ['soft-sky', 'Soft Sky', 'Light blue panels with rounded corners. Fresh and tidy.',
    ['it', 'marketing', 'data', 'sales'], ['Fresh and current', 'Friendly for product teams', 'Clear hierarchy'], SKY],
  ['soft-clay', 'Soft Clay', 'Warm clay panels, terracotta rules. Earthy and grounded.',
    ['design', 'sales', 'marketing', 'operations'], ['Warm and distinctive', 'Good for creative sales', 'Comfortable long read'], CLAY],
];

const BANNER: Spec[] = [
  ['banner', 'Banner Navy', 'Full-width navy banner, facts in a right rail. Confident header.',
    ['it', 'operations', 'sales', 'data'], ['Header does the hard work', 'Rail keeps facts visible', 'Great for mobile PDF viewing'], NAVY],
  ['banner-cobalt', 'Banner Cobalt', 'Bright cobalt banner, energetic rail. Modern product look.',
    ['it', 'marketing', 'design', 'sales'], ['High energy, high polish', 'Stands out from plain pages', 'Good for startups'], COBALT],
  ['banner-ocean', 'Banner Ocean', 'Teal banner with a light rail. Cool and clean.',
    ['data', 'it', 'finance', 'operations'], ['Calm colour, clear structure', 'Good for analytics roles', 'Distinct from navy'], OCEAN],
  ['banner-graphite', 'Banner Graphite', 'Charcoal banner, hairline rail. The unsentimental one.',
    ['finance', 'data', 'operations', 'sales'], ['Maximum signal, no colour noise', 'Ages well', 'Boardroom-neutral'], GRAPHITE],
  ['banner-indigo', 'Banner Indigo', 'Deep indigo banner, silver rail. Premium and composed.',
    ['finance', 'hr', 'marketing', 'sales'], ['Premium first impression', 'Quiet luxury palette', 'Works for senior roles'], INDIGO],
];

const LEDGER: Spec[] = [
  ['ledger', 'Ledger Navy', 'Dates in the left rule, ruled rows. An unsentimental dossier.',
    ['finance', 'data', 'operations', 'sales'], ['Extremely easy to scan', 'Dates never get lost', 'Great for 10+ year histories'], mono(NAVY.p, NAVY.a)],
  ['ledger-forest', 'Ledger Forest', 'Green rules, ruled date column. Steady and precise.',
    ['finance', 'operations', 'healthcare', 'education'], ['Precise and trustworthy', 'Distinct from navy dossiers', 'Prints crisp in black too'], mono(BOTTLE.p, BOTTLE.a)],
  ['ledger-ink', 'Ledger Ink', 'Near-black rules, gold hairline accents. Formal and dense.',
    ['finance', 'operations', 'data'], ['Most formal in the set', 'Handles long histories', 'Discreet gold accent'], mono(ONYX_GOLD.p, ONYX_GOLD.a)],
  ['ledger-oxford', 'Ledger Oxford', 'Wine rules, double date column. Old-school precision.',
    ['finance', 'sales', 'hr', 'education'], ['Traditional and confident', 'Reads authoritative', 'Great for partner-track CVs'], mono(WINE.p, WINE.a)],
  ['ledger-slate', 'Ledger Slate', 'Cool graphite rules, tight leading. Modern dossier.',
    ['data', 'it', 'operations', 'finance'], ['Cool and current', 'Fits maximum content', 'ATS-friendly structure'], mono(SLATE.p, SLATE.a)],
];

export const RESUME_IO_TEMPLATES: Template[] = [
  {
    id: 'london',
    name: 'London',
    layout: 'classic',
    pal: mono('#1a202c', '#4a5568'),
    mods: ['mod-serif'],
    tagline: 'Resume.io Classic: Classically structured resume template with clean divider rules, for a robust career history.',
    bestFor: ['finance', 'operations', 'sales', 'hr'],
    strengths: ['ATS Gold Standard', 'Clean divider rules', 'Authoritative serif'],
    collection: 'resume-io',
  },
  {
    id: 'santiago',
    name: 'Santiago',
    layout: 'classic',
    pal: mono('#111827', '#9ca3af'),
    mods: ['mod-serif'],
    tagline: 'Resume.io Traditional: Classic full-page monochrome resume template with sizable resume sections.',
    bestFor: ['finance', 'education', 'hr', 'operations'],
    strengths: ['100% Monochrome ink', 'Sizable career sections', 'Conservative & formal'],
    collection: 'resume-io',
  },
  {
    id: 'dublin',
    name: 'Dublin',
    layout: 'split',
    pal: { p: '#0d9488', p2: '#115e59', p3: '#134e4a', pm: '#2dd4bf', a: '#99f6e4' },
    mods: [],
    tagline: 'Resume.io Professional: A touch of personality with vibrant teal accents and a well-organized two-column structure.',
    bestFor: ['healthcare', 'it', 'marketing', 'design'],
    strengths: ['Vibrant teal accents', 'Two-column sidebar structure', 'Skills & Education in view'],
    collection: 'resume-io',
  },
  {
    id: 'helsinki',
    name: 'Helsinki',
    layout: 'compact',
    pal: mono('#1e293b', '#94a3b8'),
    mods: [],
    tagline: 'Resume.io Prime ATS: Streamlined single-column resume template optimized for maximum ATS compatibility.',
    bestFor: ['it', 'data', 'finance', 'operations'],
    strengths: ['Prime ATS compatibility', 'Ultra-clean single column', 'Zero parsing bottlenecks'],
    collection: 'resume-io',
  },
  {
    id: 'seoul',
    name: 'Seoul',
    layout: 'minimal',
    pal: mono('#18181b', '#a1a1aa'),
    mods: [],
    tagline: 'Resume.io Pure ATS: Minimalist single-column format that lets your achievements speak.',
    bestFor: ['it', 'data', 'finance'],
    strengths: ['Pure ATS layout', 'Laser-printer optimized', 'Crisp reading flow'],
    collection: 'resume-io',
  },
  {
    id: 'specialist',
    name: 'Specialist',
    layout: 'corporate',
    pal: mono('#1e3a5f', '#cbd5e1'),
    mods: [],
    tagline: 'Resume.io Specialist: Label column on the left, clear content on the right. Formatted for specialist careers.',
    bestFor: ['it', 'data', 'healthcare', 'operations'],
    strengths: ['Structured label-content grid', 'Clear career milestones', 'Executive scan speed'],
    collection: 'resume-io',
  },
  {
    id: 'berlin',
    name: 'Berlin',
    layout: 'split',
    pal: { p: '#111827', p2: '#1f2937', p3: '#374151', pm: '#4b5563', a: '#d1d5db' },
    mods: ['mod-invert'],
    tagline: 'Resume.io Clean: Modern two-column resume template with bold clean monochrome formatting.',
    bestFor: ['design', 'marketing', 'it'],
    strengths: ['High-contrast monochrome', 'Clean 2-column balance', 'Modern aesthetic'],
    collection: 'resume-io',
  },
  {
    id: 'athens',
    name: 'Athens',
    layout: 'classic',
    pal: mono('#422006', '#fde047'),
    mods: [],
    tagline: 'Resume.io Simple ATS: Clean, modern template design that is easily read by ATS scanners.',
    bestFor: ['finance', 'sales', 'operations'],
    strengths: ['Gold standard ATS', 'Timeless structure', 'High recruiter readability'],
    collection: 'resume-io',
  },
  {
    id: 'new-york',
    name: 'New York',
    layout: 'corporate',
    pal: mono('#1f2937', '#9ca3af'),
    mods: ['mod-serif'],
    tagline: 'Resume.io Corporate: Professional and elegant corporate resume template with a timeline structure.',
    bestFor: ['finance', 'operations', 'sales', 'hr'],
    strengths: ['Wall Street corporate look', 'Timeline alignment', 'Authoritative serif'],
    collection: 'resume-io',
  },
  {
    id: 'vienna',
    name: 'Vienna',
    layout: 'banner',
    pal: { p: '#0f766e', p2: '#115e59', p3: '#134e4a', pm: '#2dd4bf', a: '#99f6e4' },
    mods: [],
    tagline: 'Resume.io Clear: Striking modern teal header, professional two column template structure with skill bars.',
    bestFor: ['it', 'design', 'marketing', 'sales'],
    strengths: ['Full-width teal banner', 'Two-column rail structure', 'Modern eye-catching header'],
    collection: 'resume-io',
  },
  {
    id: 'prague',
    name: 'Prague',
    layout: 'compact',
    pal: mono('#1e3a8a', '#93c5fd'),
    mods: [],
    tagline: 'Resume.io Precision ATS: Showcase career skills through a highlighted skills section.',
    bestFor: ['data', 'it', 'finance'],
    strengths: ['Dedicated skill highlights', 'Tight ATS hierarchy', 'Fast recruiter scan'],
    collection: 'resume-io',
  },
  {
    id: 'brussels',
    name: 'Brussels',
    layout: 'split',
    pal: { p: '#1e40af', p2: '#1d4ed8', p3: '#2563eb', pm: '#60a5fa', a: '#bfdbfe' },
    mods: [],
    tagline: 'Resume.io Two-Column ATS: A simple two-tone resume template that highlights your experience.',
    bestFor: ['it', 'operations', 'sales'],
    strengths: ['Two-tone split', 'Clear career progression', 'ATS-friendly'],
    collection: 'resume-io',
  },
  {
    id: 'sydney',
    name: 'Sydney',
    layout: 'split',
    pal: { p: '#0369a1', p2: '#0284c7', p3: '#0ea5e9', pm: '#38bdf8', a: '#bae6fd' },
    mods: ['mod-invert'],
    tagline: 'Resume.io Balanced: Modern and eye-catching resume template with beautiful contrasting structure.',
    bestFor: ['marketing', 'sales', 'design'],
    strengths: ['Contrasting sidebar', 'Fresh ocean palette', 'Clean typography'],
    collection: 'resume-io',
  },
  {
    id: 'shanghai',
    name: 'Shanghai',
    layout: 'metro',
    pal: { p: '#991b1b', p2: '#b91c1c', p3: '#dc2626', pm: '#f87171', a: '#fecaca' },
    mods: [],
    tagline: 'Resume.io Header ATS: Dedicated achievements section to highlight successes with a bold header band.',
    bestFor: ['sales', 'marketing', 'operations'],
    strengths: ['Bold statement header', 'Prominent achievements display', 'High energy'],
    collection: 'resume-io',
  },
  {
    id: 'stockholm',
    name: 'Stockholm',
    layout: 'minimal',
    pal: mono('#334155', '#e2e8f0'),
    mods: [],
    tagline: 'Resume.io Essential: Perfect balance of fresh Scandinavian minimalism and functional resume design.',
    bestFor: ['design', 'it', 'education'],
    strengths: ['Scandinavian minimalism', 'Generous whitespace', 'Crisp reading flow'],
    collection: 'resume-io',
  },
  {
    id: 'paris',
    name: 'Paris',
    layout: 'portrait',
    pal: mono('#374151', '#fbcfe8'),
    mods: [],
    tagline: 'Resume.io Polished: A great blend of personal charm, readability, and elegance with photo header.',
    bestFor: ['marketing', 'hr', 'design', 'sales'],
    strengths: ['Elegance & charm', 'Photo-forward layout', 'Airy two columns'],
    collection: 'resume-io',
  },
  {
    id: 'madrid',
    name: 'Madrid',
    layout: 'metro',
    pal: { p: '#c2410c', p2: '#ea580c', p3: '#f97316', pm: '#fb923c', a: '#fed7aa' },
    mods: [],
    tagline: 'Resume.io Vivid: Powerful modern resume template with bold section highlights and warm energy.',
    bestFor: ['marketing', 'sales', 'design'],
    strengths: ['Bold section highlights', 'Energetic colorway', 'Stands out in stacks'],
    collection: 'resume-io',
  },
  {
    id: 'rome',
    name: 'Rome',
    layout: 'editorial',
    pal: mono('#9a3412', '#ffedd5'),
    mods: ['mod-serif'],
    tagline: 'Resume.io Calligraphic: Charming resume template with eye-catching section titles and calligraphic typography.',
    bestFor: ['education', 'design', 'marketing'],
    strengths: ['Classical Italian typography', 'Numbered editorial sections', 'Distinctive serif'],
    collection: 'resume-io',
  },
  {
    id: 'milan',
    name: 'Milan',
    layout: 'portrait',
    pal: mono('#18181b', '#ca8a04'),
    mods: [],
    tagline: 'Resume.io Harmonized: Streamlined professional resume template with fashion-forward polish and a human touch.',
    bestFor: ['design', 'marketing', 'sales', 'hr'],
    strengths: ['High-fashion polish', 'Clean photo header', 'Gold accents'],
    collection: 'resume-io',
  },
  {
    id: 'toronto',
    name: 'Toronto',
    layout: 'soft',
    pal: { p: '#1d4ed8', p2: '#2563eb', p3: '#3b82f6', pm: '#60a5fa', a: '#dbeafe' },
    mods: [],
    tagline: 'Resume.io Defined: Web-inspired resume template with soft rounded cards, perfect for charting achievements.',
    bestFor: ['it', 'data', 'marketing'],
    strengths: ['Modern web cards', 'Rounded skill pills', 'Friendly UI feel'],
    collection: 'resume-io',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    layout: 'compact',
    pal: mono('#27272a', '#e4e4e7'),
    mods: [],
    tagline: 'Resume.io Minimalist: Clean, orderly template structure with stylish Asian minimalism and single column efficiency.',
    bestFor: ['finance', 'data', 'it'],
    strengths: ['Ultra-clean single column', 'Dense yet airy', 'Recruiter speed'],
    collection: 'resume-io',
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    layout: 'minimal',
    pal: mono('#1f2937', '#cbd5e1'),
    mods: ['mod-serif'],
    tagline: 'Resume.io Industrial: Modern minimalist resume structure with architectural clarity and graceful typography.',
    bestFor: ['design', 'education', 'it'],
    strengths: ['Architectural clarity', 'Clean hairlines', 'Sophisticated spacing'],
    collection: 'resume-io',
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    layout: 'studio',
    pal: { p: '#0284c7', p2: '#f0f9ff', p3: '#bae6fd', pm: '#0369a1', a: '#bae6fd' },
    mods: [],
    tagline: 'Resume.io Elegant: Attractive, friendly template design with creative pastel two-column structure.',
    bestFor: ['marketing', 'hr', 'design', 'education'],
    strengths: ['Pastel side panel', 'Warm approachable tone', 'Round photo avatar'],
    collection: 'resume-io',
  },
  {
    id: 'oslo',
    name: 'Oslo',
    layout: 'compact',
    pal: mono('#065f46', '#a7f3d0'),
    mods: [],
    tagline: 'Resume.io Bold: Reliable and elegant image with minimalist single column outline.',
    bestFor: ['finance', 'operations', 'healthcare'],
    strengths: ['Single column outline', 'Deep pine green tone', 'High trust factor'],
    collection: 'resume-io',
  },
  {
    id: 'chicago',
    name: 'Chicago',
    layout: 'ledger',
    pal: mono('#0f172a', '#94a3b8'),
    mods: [],
    tagline: 'Resume.io Authority: Bold and forward structure with dates in the gutter that is impossible to ignore.',
    bestFor: ['sales', 'operations', 'finance'],
    strengths: ['Authority date gutter', 'Ruled chronological flow', 'Executive dossier'],
    collection: 'resume-io',
  },
  {
    id: 'copenhagen',
    name: 'Copenhagen',
    layout: 'split',
    pal: { p: '#3f6212', p2: '#4d7c0f', p3: '#65a30d', pm: '#84cc16', a: '#d9f99d' },
    mods: ['mod-invert'],
    tagline: 'Resume.io Half Tone: Emphasizes personal story above all else, blending Danish design with strong typography.',
    bestFor: ['design', 'education', 'hr'],
    strengths: ['Storytelling focus', 'Light calm sidebar', 'Thoughtful typography'],
    collection: 'resume-io',
  },
  {
    id: 'boston',
    name: 'Boston',
    layout: 'corporate',
    pal: mono('#881337', '#fecdd3'),
    mods: [],
    tagline: 'Resume.io Executive: Streamlined multi-column structure gives this resume template an executive Ivy feel.',
    bestFor: ['finance', 'education', 'hr', 'sales'],
    strengths: ['Executive label grid', 'Distinguished crimson tone', 'Senior authority'],
    collection: 'resume-io',
  },
  {
    id: 'geneva',
    name: 'Geneva',
    layout: 'metro',
    pal: { p: '#0c4a6e', p2: '#0369a1', p3: '#0284c7', pm: '#0ea5e9', a: '#38bdf8' },
    mods: ['mod-band-flat'],
    tagline: 'Resume.io Statement: Minimalist font styling contrasts with an electric header background in this edgy template.',
    bestFor: ['it', 'data', 'marketing'],
    strengths: ['Electric header band', 'Precision Swiss style', 'High contrast'],
    collection: 'resume-io',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    layout: 'infographic',
    pal: { p: '#312e81', p2: '#4338ca', p3: '#4f46e5', pm: '#6366f1', a: '#c7d2fe' },
    mods: [],
    tagline: 'Resume.io Modern: Tech-inspired design, skill-point visuals, and language dots for technical careers.',
    bestFor: ['it', 'data', 'design'],
    strengths: ['Skill proficiency bars', 'Language level dots', 'Tech-forward dark panel'],
    collection: 'resume-io',
  },
  {
    id: 'lisbon',
    name: 'Lisbon',
    layout: 'soft',
    pal: { p: '#b45309', p2: '#d97706', p3: '#f59e0b', pm: '#fbbf24', a: '#fef3c7' },
    mods: [],
    tagline: 'Resume.io Creative: A beautiful way to showcase your expertise with artistic touches and sunlit ochre tones.',
    bestFor: ['design', 'marketing', 'education'],
    strengths: ['Artistic warmth', 'Rounded pill badges', 'Approachable creative feel'],
    collection: 'resume-io',
  },
  {
    id: 'moscow',
    name: 'Moscow',
    layout: 'minimal',
    pal: mono('#3730a3', '#e0e7ff'),
    mods: [],
    tagline: 'Resume.io Pastel: Open white-space template with excellent readability and subtle pastel accents.',
    bestFor: ['education', 'healthcare', 'design'],
    strengths: ['Generous white space', 'Subtle pastel accents', 'High reading comfort'],
    collection: 'resume-io',
  },
  {
    id: 'rio',
    name: 'Rio',
    layout: 'spine',
    pal: mono('#047857', '#a7f3d0'),
    mods: [],
    tagline: 'Resume.io Visionary: Fluid and energetic, making a confident statement with creativity and sideways spine titles.',
    bestFor: ['marketing', 'sales', 'design'],
    strengths: ['Sideways spine titles', 'Energetic emerald green', 'Dynamic layout'],
    collection: 'resume-io',
  },
  {
    id: 'vancouver',
    name: 'Vancouver',
    layout: 'monogram',
    pal: mono('#0f766e', '#99f6e4'),
    mods: [],
    tagline: 'Resume.io Confetti: Creative, light-hearted resume template with clean monogram seal and Pacific fresh tones.',
    bestFor: ['it', 'education', 'marketing'],
    strengths: ['Initials seal badge', 'Pacific teal palette', 'Balanced spacing'],
    collection: 'resume-io',
  },
  {
    id: 'cape-town',
    name: 'Cape Town',
    layout: 'metro',
    pal: { p: '#c2410c', p2: '#9a3412', p3: '#7c2d12', pm: '#ea580c', a: '#ffedd5' },
    mods: [],
    tagline: 'Resume.io Color Splash: Strong font accented by playful pops of warm sunset color.',
    bestFor: ['sales', 'marketing', 'design'],
    strengths: ['Pops of sunset color', 'Strong name header', 'High visual recall'],
    collection: 'resume-io',
  },
  {
    id: 'academic',
    name: 'Academic',
    layout: 'classic',
    pal: mono('#4a0404', '#e2d8d8'),
    mods: ['mod-serif'],
    tagline: 'Resume.io Academic: Comprehensive scholarly format tailored for researchers, professors, and academic fellows.',
    bestFor: ['education', 'healthcare', 'data'],
    strengths: ['Scholarly gravitas', 'Publication-ready serif', 'Dense academic structure'],
    collection: 'resume-io',
  },
  {
    id: 'entry-level',
    name: 'Entry Level',
    layout: 'soft',
    pal: { p: '#0284c7', p2: '#0369a1', p3: '#075985', pm: '#38bdf8', a: '#e0f2fe' },
    mods: [],
    tagline: 'Resume.io Entry Level: Formatted specifically for fresh graduates and students to emphasize education and projects.',
    bestFor: ['it', 'education', 'sales', 'hr'],
    strengths: ['Fresher/student friendly', 'Highlights coursework & projects', 'Welcoming aesthetic'],
    collection: 'resume-io',
  },
];

export const CANVA_TEMPLATES: Template[] = [
  {
    id: 'canva-modern-biz',
    name: 'Canva Modern Business',
    layout: 'portrait',
    pal: mono('#111827', '#e5e7eb'),
    mods: [],
    tagline: 'Canva #1 Bestseller: Bold sans-serif name, photo header, airy two columns.',
    bestFor: ['operations', 'sales', 'it', 'marketing'],
    strengths: ['Canva iconic layout', 'Modern portrait photo', 'Clean two-column balance'],
    collection: 'canva',
  },
  {
    id: 'canva-bw-corporate',
    name: 'Canva B&W Corporate',
    layout: 'corporate',
    pal: mono('#0f172a', '#cbd5e1'),
    mods: [],
    tagline: 'Canva classic corporate: Solid dark section headings, grid-aligned career history.',
    bestFor: ['finance', 'operations', 'sales', 'hr'],
    strengths: ['High-contrast corporate', 'Boardroom scannable', 'Black & white elegance'],
    collection: 'canva',
  },
  {
    id: 'canva-clean-minimal',
    name: 'Canva Clean Minimalist',
    layout: 'minimal',
    pal: mono('#475569', '#e2e8f0'),
    mods: [],
    tagline: 'Canva minimalist: Subtle gray category dividers and generous breathing room.',
    bestFor: ['design', 'it', 'data'],
    strengths: ['Ultra-clean typography', 'Zero distraction', 'Fits any experience level'],
    collection: 'canva',
  },
  {
    id: 'canva-gray-clean',
    name: 'Canva Gray & White Clean',
    layout: 'soft',
    pal: { p: '#374151', p2: '#4b5563', p3: '#6b7280', pm: '#9ca3af', a: '#f3f4f6' },
    mods: [],
    tagline: 'Soft light gray section panels, structured chronological hierarchy.',
    bestFor: ['operations', 'hr', 'finance'],
    strengths: ['Soft gray panels', 'Easy on the eyes', 'Gentle reading flow'],
    collection: 'canva',
  },
  {
    id: 'canva-freelancer',
    name: 'Canva Minimalist Freelancer',
    layout: 'split',
    pal: { p: '#262626', p2: '#404040', p3: '#525252', pm: '#737373', a: '#e5e5e5' },
    mods: ['mod-invert'],
    tagline: 'Two-column freelance dossier with skills and client projects front-and-center.',
    bestFor: ['design', 'it', 'marketing'],
    strengths: ['Great for project portfolios', 'Light clean sidebar', 'Modern freelancer vibe'],
    collection: 'canva',
  },
  {
    id: 'canva-elegant-classic',
    name: 'Canva Elegant Classic',
    layout: 'classic',
    pal: mono('#14532d', '#dcfce7'),
    mods: ['mod-serif'],
    tagline: 'Classic serif typography with rich forest green rules and balanced margins.',
    bestFor: ['education', 'healthcare', 'finance'],
    strengths: ['Timeless serif style', 'Warm forest green tones', 'Loved by senior reviewers'],
    collection: 'canva',
  },
  {
    id: 'canva-monogram',
    name: 'Canva Monogram Executive',
    layout: 'monogram',
    pal: mono('#0f172a', '#f1f5f9'),
    mods: [],
    tagline: 'Centered monogram seal with candidate initials, magazine-grade typography.',
    bestFor: ['sales', 'operations', 'hr', 'finance'],
    strengths: ['Personal initials seal', 'Magazine-grade spacing', 'High executive presence'],
    collection: 'canva',
  },
  {
    id: 'canva-blue-pro',
    name: 'Canva Blue Professional',
    layout: 'split',
    pal: { p: '#1d4ed8', p2: '#1e40af', p3: '#1e3a8a', pm: '#60a5fa', a: '#bfdbfe' },
    mods: [],
    tagline: 'Canva top-rated professional blue sidebar with silver skill tags.',
    bestFor: ['it', 'marketing', 'sales'],
    strengths: ['Striking royal blue sidebar', 'Skills always visible', 'High recruiter engagement'],
    collection: 'canva',
  },
  {
    id: 'canva-student',
    name: 'Canva Student Simple',
    layout: 'soft',
    pal: { p: '#0891b2', p2: '#0e7490', p3: '#155e75', pm: '#22d3ee', a: '#cffafe' },
    mods: [],
    tagline: 'Lightweight and friendly layout designed to highlight education, coursework, and skills.',
    bestFor: ['education', 'it', 'sales'],
    strengths: ['Tailored for fresh grads', 'Coursework & projects first', 'Friendly pill badges'],
    collection: 'canva',
  },
  {
    id: 'canva-white-gold',
    name: 'Canva White Gold Luxury',
    layout: 'classic',
    pal: mono('#171717', '#d97706'),
    mods: ['mod-serif'],
    tagline: 'Black typography with rich metallic gold double rules. Confident and luxury.',
    bestFor: ['finance', 'marketing', 'sales'],
    strengths: ['Warm gold accents', 'Luxury executive tone', 'High visual distinction'],
    collection: 'canva',
  },
  {
    id: 'canva-abu-abu',
    name: 'Canva Abu-Abu Minimalist',
    layout: 'minimal',
    pal: mono('#52525b', '#f4f4f5'),
    mods: [],
    tagline: 'The viral Indonesian Abu-Abu minimalist aesthetic: subtle gray hairlines and airy text.',
    bestFor: ['design', 'it', 'marketing'],
    strengths: ['Viral Abu-Abu aesthetic', 'Extremely easy to scan', 'Modern creative'],
    collection: 'canva',
  },
  {
    id: 'canva-dark-orange',
    name: 'Canva Marketing Dark Orange',
    layout: 'banner',
    pal: { p: '#c2410c', p2: '#9a3412', p3: '#7c2d12', pm: '#ea580c', a: '#ffedd5' },
    mods: [],
    tagline: 'High-impact dark orange banner header designed for marketing and sales leaders.',
    bestFor: ['marketing', 'sales'],
    strengths: ['Impactful header banner', 'Energetic colorway', 'Strong commercial tone'],
    collection: 'canva',
  },
  {
    id: 'canva-copywriter',
    name: 'Canva Simple Copywriter',
    layout: 'editorial',
    pal: mono('#262626', '#e5e5e5'),
    mods: ['mod-serif'],
    tagline: 'Words-first editorial layout with numbered section headers and spacious margins.',
    bestFor: ['marketing', 'education', 'design'],
    strengths: ['Typography-driven', 'Numbered section flow', 'Reads like a published article'],
    collection: 'canva',
  },
  {
    id: 'canva-science-eng',
    name: 'Canva Science & Engineering',
    layout: 'ledger',
    pal: mono('#0f172a', '#94a3b8'),
    mods: [],
    tagline: 'Technical precision dossier with dates in the gutter and ruled specification rows.',
    bestFor: ['it', 'data', 'operations'],
    strengths: ['Technical dossier format', 'Left-aligned date gutter', 'ATS-optimized density'],
    collection: 'canva',
  },
  {
    id: 'canva-white-beige',
    name: 'Canva White Beige Minimal',
    layout: 'studio',
    pal: { p: '#57493b', p2: '#faf7f2', p3: '#e8e0d5', pm: '#786857', a: '#e8e0d5' },
    mods: [],
    tagline: 'Gentle warm beige side panel with round avatar. Calming and contemporary.',
    bestFor: ['hr', 'healthcare', 'education'],
    strengths: ['Warm beige aesthetic', 'Soft round avatar', 'Low eye fatigue'],
    collection: 'canva',
  },
  {
    id: 'canva-blue-ats',
    name: 'Canva Blue Minimal ATS',
    layout: 'compact',
    pal: mono('#1e3a8a', '#bfdbfe'),
    mods: [],
    tagline: 'Maximum information density, ATS-ready typography with crisp blue title bars.',
    bestFor: ['it', 'data', 'finance'],
    strengths: ['ATS certified density', 'Blue section rule bars', 'Zero fluff'],
    collection: 'canva',
  },
  {
    id: 'canva-pink-pastel',
    name: 'Canva Pink Pastel Creative',
    layout: 'soft',
    pal: { p: '#9d174d', p2: '#be185d', p3: '#db2777', pm: '#f472b6', a: '#fce7f3' },
    mods: [],
    tagline: 'Delicate blush pink panels and rounded skill pills. Warm, creative, and memorable.',
    bestFor: ['design', 'marketing', 'hr'],
    strengths: ['Soft pastel blush', 'Modern rounded pills', 'Creative and friendly'],
    collection: 'canva',
  },
  {
    id: 'canva-blue-gray',
    name: 'Canva Blue and Gray',
    layout: 'split',
    pal: { p: '#2563eb', p2: '#3b82f6', p3: '#60a5fa', pm: '#93c5fd', a: '#e0e7ff' },
    mods: ['mod-invert'],
    tagline: 'Light slate-blue sidebar with crisp steel accents. Clean corporate balance.',
    bestFor: ['it', 'operations', 'sales'],
    strengths: ['Light-tinted sidebar', 'Steel blue accents', 'Corporate calm'],
    collection: 'canva',
  },
  {
    id: 'canva-green-black',
    name: 'Canva Green & Black Modern',
    layout: 'metro',
    pal: { p: '#064e3b', p2: '#065f46', p3: '#047857', pm: '#10b981', a: '#6ee7b7' },
    mods: [],
    tagline: 'Modern emerald green statement header band with high contrast dark typography.',
    bestFor: ['finance', 'operations', 'sales'],
    strengths: ['Emerald header band', 'High contrast black ink', 'Energetic structure'],
    collection: 'canva',
  },
  {
    id: 'canva-orange-gray',
    name: 'Canva Orange Gray Creative',
    layout: 'spine',
    pal: mono('#ea580c', '#ffedd5'),
    mods: [],
    tagline: 'Creative sideways section titles with a warm tangerine margin spine.',
    bestFor: ['marketing', 'design', 'sales'],
    strengths: ['Creative margin spine', 'Sideways section labels', 'Bold pop of color'],
    collection: 'canva',
  },
  {
    id: 'canva-photographer',
    name: 'Canva Minimal Photographer',
    layout: 'portrait',
    pal: mono('#0a0a0a', '#d4d4d4'),
    mods: [],
    tagline: 'Portfolio-grade portrait header with stark monochrome contrast and spacious text.',
    bestFor: ['design', 'marketing'],
    strengths: ['Large photo display', 'Portfolio style', 'Gallery monochrome'],
    collection: 'canva',
  },
  {
    id: 'canva-infographic',
    name: 'Canva Infographic Skills',
    layout: 'infographic',
    pal: { p: '#1e293b', p2: '#334155', p3: '#475569', pm: '#64748b', a: '#94a3b8' },
    mods: [],
    tagline: 'Visual proficiency bars for skills and dot meters for languages. Highly engaging.',
    bestFor: ['it', 'data', 'design'],
    strengths: ['Skill percentage bars', 'Language proficiency dots', 'Dark visual panel'],
    collection: 'canva',
  },
  {
    id: 'canva-navy-modern',
    name: 'Canva Navy & White Modern',
    layout: 'split',
    pal: { p: '#0f172a', p2: '#1e293b', p3: '#334155', pm: '#0284c7', a: '#38bdf8' },
    mods: [],
    tagline: 'Canva navy two-tone layout with electric cyan highlights and clean white body.',
    bestFor: ['it', 'sales', 'finance'],
    strengths: ['Two-tone navy sidebar', 'Cyan highlights', 'Modern corporate'],
    collection: 'canva',
  },
  {
    id: 'canva-teal-engineer',
    name: 'Canva Teal Network Engineer',
    layout: 'compact',
    pal: mono('#0f766e', '#99f6e4'),
    mods: [],
    tagline: 'Engineering-grade dense layout with crisp teal section accents and compact spacing.',
    bestFor: ['it', 'data', 'operations'],
    strengths: ['Engineered density', 'Teal section markers', 'High information bandwidth'],
    collection: 'canva',
  },
];

const CORE_TEMPLATES: Template[] = [
  ...SPLIT, ...CLASSIC, ...MINIMAL, ...METRO, ...COMPACT,
].map(
  ([id, name, tagline, bestFor, strengths, pal, mods]) => ({
    id, name, tagline, bestFor, strengths, pal, mods: mods ?? [], layout: layoutOf(id), collection: 'core' as const,
  }),
);

const STUDIO_TEMPLATES: Template[] = [
  ...PORTRAIT, ...STUDIO, ...MONOGRAM, ...TIMELINE, ...INFOGRAPHIC, ...CORPORATE,
  ...EDITORIAL, ...SPINE, ...SOFT, ...BANNER, ...LEDGER,
].map(
  ([id, name, tagline, bestFor, strengths, pal, mods]) => ({
    id, name, tagline, bestFor, strengths, pal, mods: mods ?? [], layout: layoutOf(id), collection: 'studio' as const,
  }),
);

export const TEMPLATES: Template[] = [
  ...RESUME_IO_TEMPLATES,
  ...CANVA_TEMPLATES,
  ...CORE_TEMPLATES,
  ...STUDIO_TEMPLATES,
];

function layoutOf(id: string): LayoutId {
  const fromRio = RESUME_IO_TEMPLATES?.find((t) => t.id === id);
  if (fromRio) return fromRio.layout;
  const fromCanva = CANVA_TEMPLATES?.find((t) => t.id === id);
  if (fromCanva) return fromCanva.layout;
  if (SPLIT.some((s) => s[0] === id)) return 'split';
  if (CLASSIC.some((s) => s[0] === id)) return 'classic';
  if (MINIMAL.some((s) => s[0] === id)) return 'minimal';
  if (METRO.some((s) => s[0] === id)) return 'metro';
  if (PORTRAIT.some((s) => s[0] === id)) return 'portrait';
  if (STUDIO.some((s) => s[0] === id)) return 'studio';
  if (MONOGRAM.some((s) => s[0] === id)) return 'monogram';
  if (TIMELINE.some((s) => s[0] === id)) return 'timeline';
  if (INFOGRAPHIC.some((s) => s[0] === id)) return 'infographic';
  if (CORPORATE.some((s) => s[0] === id)) return 'corporate';
  if (EDITORIAL.some((s) => s[0] === id)) return 'editorial';
  if (SPINE.some((s) => s[0] === id)) return 'spine';
  if (SOFT.some((s) => s[0] === id)) return 'soft';
  if (BANNER.some((s) => s[0] === id)) return 'banner';
  if (LEDGER.some((s) => s[0] === id)) return 'ledger';
  return 'compact';
}

export const TEMPLATE_COUNT = TEMPLATES.length; // 105

/** Sections rendered in the side/panel column for two-column layouts. */
export const SIDE_SECTIONS: Partial<Record<LayoutId, SectionId[]>> = {
  split: ['skills', 'languages', 'certs', 'hobbies'],
  portrait: ['education', 'skills', 'languages', 'certs', 'hobbies'],
  studio: ['skills', 'languages', 'certs', 'hobbies'],
  infographic: ['skills', 'languages', 'certs', 'hobbies'],
  soft: ['skills', 'languages', 'certs', 'hobbies'],
  banner: ['skills', 'languages', 'certs', 'hobbies'],
};

export const templateById = (id: string): Template =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES.find((t) => t.id === 'modern') ?? TEMPLATES[0];

const TECH_FIELDS = new Set(['it', 'data', 'design']);

/** Section order per layout + field. All variants of a layout share it. */
export function sectionOrder(tpl: Template, fieldId: string): SectionId[] {
  const tech = TECH_FIELDS.has(fieldId);
  const tail: SectionId[] = ['achievements', 'hobbies'];
  switch (tpl.layout) {
    case 'split':
    case 'studio':
    case 'infographic':
      // sidebar renders skills/languages/certs/hobbies; main column gets the rest
      return tech
        ? ['summary', 'highlight', 'skills', 'experience', 'projects', 'education', 'certs', 'languages', ...tail]
        : ['summary', 'highlight', 'experience', 'skills', 'education', 'projects', 'certs', 'languages', ...tail];
    case 'portrait':
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
      // panel column: skills / languages / certs / hobbies (see SIDE_SECTIONS)
      return tech
        ? ['summary', 'highlight', 'experience', 'projects', 'education', 'skills', 'languages', 'certs', 'achievements', 'hobbies']
        : ['summary', 'highlight', 'experience', 'education', 'projects', 'skills', 'languages', 'certs', 'achievements', 'hobbies'];
    case 'banner':
      // right rail: skills / languages / certs / hobbies (see SIDE_SECTIONS)
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

/** Top picks for a field (max 5, out of 50). */
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
