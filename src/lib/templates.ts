// The 50-template library: 5 layout families × 10 hand-tuned variants each.
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

export type LayoutId = 'split' | 'classic' | 'minimal' | 'metro' | 'compact';

/** Structural (non-palette) modifier classes applied to the sheet. */
export type Mod = 'mod-invert' | 'mod-serif' | 'mod-band-flat' | 'mod-band-tint';

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
}

export const LAYOUT_META: Record<LayoutId, { label: string; blurb: string }> = {
  split: { label: 'Sidebar', blurb: 'A side column keeps skills and contacts in view' },
  classic: { label: 'Classic', blurb: 'Serif, centered, boardroom-ready' },
  minimal: { label: 'Minimal', blurb: 'Hairlines and air, quiet confidence' },
  metro: { label: 'Statement', blurb: 'Bold header band, memorable at a glance' },
  compact: { label: 'Dense', blurb: 'ATS-first, maximum content per page' },
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

export const TEMPLATES: Template[] = [...SPLIT, ...CLASSIC, ...MINIMAL, ...METRO, ...COMPACT].map(
  ([id, name, tagline, bestFor, strengths, pal, mods]) => ({
    id, name, tagline, bestFor, strengths, pal, mods: mods ?? [], layout: layoutOf(id),
  }),
);

function layoutOf(id: string): LayoutId {
  if (SPLIT.some((s) => s[0] === id)) return 'split';
  if (CLASSIC.some((s) => s[0] === id)) return 'classic';
  if (MINIMAL.some((s) => s[0] === id)) return 'minimal';
  if (METRO.some((s) => s[0] === id)) return 'metro';
  return 'compact';
}

export const TEMPLATE_COUNT = TEMPLATES.length; // 50

export const templateById = (id: string): Template => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

const TECH_FIELDS = new Set(['it', 'data', 'design']);

/** Section order per layout + field. All variants of a layout share it. */
export function sectionOrder(tpl: Template, fieldId: string): SectionId[] {
  const tech = TECH_FIELDS.has(fieldId);
  const tail: SectionId[] = ['achievements', 'hobbies'];
  switch (tpl.layout) {
    case 'split':
      // sidebar renders skills/languages/certs/hobbies; main column gets the rest
      return tech
        ? ['summary', 'highlight', 'skills', 'experience', 'projects', 'education', ...tail]
        : ['summary', 'highlight', 'experience', 'skills', 'education', 'projects', ...tail];
    case 'metro':
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
