// ============================================================================
// CraftCV template library — the Professional collection.
//
// 32 original designs, written from scratch for this app. Nothing here is a
// copy of a third-party product: every row is a palette + a few structural
// modifiers on top of one of the 16 layout families. The family markup lives
// in components/Preview.tsx, its styling in styles/templates.css, and a
// template never forks that code — it re-skins and re-tunes it.
//
// A row is: [id, name, tagline, bestFor (field ids), strengths, palette, mods?]
// Every template is A4-exact and prints cleanly to PDF.
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
}

/**
 * Every design in this file belongs to one shared collection. The constant
 * exists so the UI copy and the database seed stay honest about what the
 * catalogue is: original, professional resume layouts.
 */
export const COLLECTION_NAME = 'Professional';

/** The design a brand-new resume starts on, and the fallback for a bad id. */
export const DEFAULT_TEMPLATE_ID = 'ats-sterling';

/**
 * Each family is one way of organising an A4 page. `LAYOUT_META` is the
 * single source of truth for the family label + blurb used by the gallery
 * chips, the design step and the importer.
 */
export const LAYOUT_META: Record<LayoutId, { label: string; blurb: string }> = {
  split: { label: 'Sidebar', blurb: 'A side column keeps skills and contacts in view' },
  classic: { label: 'Classic', blurb: 'Serif, centered, boardroom-ready' },
  minimal: { label: 'Minimal', blurb: 'Hairlines and air, quiet confidence' },
  metro: { label: 'Statement', blurb: 'Solid header band, memorable at a glance' },
  compact: { label: 'Dense', blurb: 'ATS-first, maximum content per page' },
  portrait: { label: 'Portrait', blurb: 'Photo header, letter-spaced name, airy two columns' },
  studio: { label: 'Studio', blurb: 'Soft tinted side panel with a round photo — warm and modern' },
  monogram: { label: 'Monogram', blurb: 'Centered initials seal, elegant serif, wide spacing' },
  timeline: { label: 'Timeline', blurb: 'Dates in the gutter, dotted career line — progression at a glance' },
  infographic: { label: 'Infographic', blurb: 'Tinted skills panel with level bars — visual but tidy' },
  corporate: { label: 'Corporate', blurb: 'Label column on the left, content on the right' },
  editorial: { label: 'Editorial', blurb: 'Numbered sections in the wide margin — very legible' },
  spine: { label: 'Spine', blurb: 'A colour spine down the page edge with sideways section titles' },
  soft: { label: 'Soft', blurb: 'Rounded panels and pill skills — the friendly modern look' },
  banner: { label: 'Banner', blurb: 'Full-width colour banner up top, story left, facts in a right rail' },
  ledger: { label: 'Ledger', blurb: 'Dates in the left rule, ruled rows — the unsentimental dossier' },
};

/* --------------------------------------------------------------------------
   Palettes. Ink-led and deliberately restrained: the professional look comes
   from rhythm and contrast, not from colour noise. Each is a full dark-surface
   ramp (p → p2 → p3, with pm for borders); light families use `mono()`.
   -------------------------------------------------------------------------- */

/** p + a only — light layouts, primary doubles as the ink colour. */
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

/** Family-level fit hints — which career fields a structure suits best. */
const ALL_FIELDS = [
  'it', 'data', 'marketing', 'sales', 'finance',
  'hr', 'design', 'healthcare', 'education', 'operations',
];
const ATS_FIELDS = ['it', 'data', 'finance', 'operations', 'healthcare', 'education'];
const SIDEBAR_FIELDS = ['it', 'data', 'design', 'marketing', 'operations'];
const BOARDROOM_FIELDS = ['finance', 'operations', 'sales', 'hr', 'education'];

type Spec = [
  id: string,
  name: string,
  tagline: string,
  bestFor: string[],
  strengths: string[],
  pal: Palette,
  mods?: Mod[],
];

const FAMILY: Record<LayoutId, Spec[]> = {
  /* ============ Dense — single column, built to be parsed by an ATS ======== */
  compact: [
    ['ats-sterling', 'Sterling ATS', 'One clean column, plain headings, zero decoration. The safest file you can send.',
      ATS_FIELDS, ['Parses in every tracker', 'Fits a long career history', 'Prints in pure black and white'],
      mono('#1c2430', '#c4cddb')],
    ['ats-executive', 'Executive ATS', 'Navy title bars over a dense single column. Same parse, more authority.',
      ['finance', 'operations', 'sales', 'hr'], ['Section bars guide the eye', 'Senior-candidate tone', 'One or two pages, both clean'],
      mono(NAVY.p, NAVY.a)],
    ['ats-technical', 'Technical ATS', 'Graphite rules, tight leading, skills listed first for keyword matching.',
      ['it', 'data', 'operations'], ['Skills high on the page', 'Handles a big tool list', 'Maximum content per page'],
      mono(GRAPHITE.p, GRAPHITE.a)],
    ['ats-entry', 'Entry Level ATS', 'Education and projects sit above experience — for freshers and career switchers.',
      ['education', 'hr', 'it', 'sales'], ['Coursework gets the top slot', 'Still one clean column', 'Honest for a short CV'],
      mono(STEEL.p, STEEL.a)],
  ],

  /* ============ Sidebar — tinted left column for facts, story on the right = */
  split: [
    ['sidebar-navy', 'Navy Sidebar', 'Deep navy column, silver detail. Contacts and skills never scroll out of view.',
      SIDEBAR_FIELDS, ['Skills always visible', 'Strong first impression', 'Great for a one-page scan'],
      NAVY],
    ['sidebar-graphite', 'Graphite Sidebar', 'Soft black column with cool gray detail — modern, serious, quiet.',
      ['it', 'data', 'sales', 'finance'], ['High contrast, low noise', 'Roomy for a long skill list', 'Ages well'],
      GRAPHITE],
    ['sidebar-petrol', 'Petrol Sidebar', 'Deep teal-blue column. Fresh without looking like a startup pitch deck.',
      ['it', 'healthcare', 'data', 'design'], ['Distinct but calm', 'Clear two-zone structure', 'Good in print and on screen'],
      PETROL],
    ['sidebar-ivory', 'Ivory Sidebar', 'The inverse: a pale column, steel-navy ink. Bright page, easy on the eye.',
      ['education', 'healthcare', 'hr', 'finance'], ['Light on printer ink', 'Comfortable for a long read', 'Unusual in a good way'],
      STEEL, ['mod-invert']],
  ],

  /* ============ Classic — centered serif header, formal section rules ===== */
  classic: [
    ['classic-serif', 'Executive Serif', 'Centred serif name over double rules. The formal choice for conservative hiring.',
      BOARDROOM_FIELDS, ['Reads authoritative', 'Loved by senior reviewers', 'Nothing to apologise for'],
      mono(NAVY.p, NAVY.a), ['mod-serif']],
    ['classic-hairline', 'Hairline Classic', 'Thin rules, wide margins, restrained ink. Classic with the volume turned down.',
      ['hr', 'education', 'finance', 'operations'], ['Very legible', 'Soft on the eye', 'Two-page friendly'],
      mono('#2b3442', '#cfd6e0'), ['mod-serif']],
    ['classic-academic', 'Academic CV', 'Serif throughout, publications-and-education ordering for research and teaching.',
      ['education', 'healthcare', 'data'], ['Scholarly structure', 'Room for publications', 'Conference-ready'],
      mono('#3a2230', '#cbb8c2'), ['mod-serif']],
    ['classic-luxe', 'Gold Rule Classic', 'Near-black serif with a single brass rule. Formal, a shade warm.',
      ['finance', 'sales', 'hr', 'design'], ['Quiet premium detail', 'Memorable without colour', 'Boardroom-safe'],
      mono(NOIR_GOLD.p, NOIR_GOLD.a), ['mod-serif']],
  ],

  /* ============ Minimal — air, hairlines, type doing the work ============== */
  minimal: [
    ['minimal-quiet', 'Quiet Minimal', 'Small caps over hairlines, generous air. Lets the numbers speak.',
      ['design', 'data', 'education'], ['Very clean scan', 'Works with less content', 'Timeless'],
      mono('#6c7789', '#dde3ec')],
    ['minimal-slate', 'Slate Minimal', 'Graphite ink, tighter spacing. Minimal for people with a lot to say.',
      ['it', 'data', 'finance', 'operations'], ['Denser than most minimals', 'Cool, current tone', 'Fast to read'],
      mono(SLATE_INK.p, '#d5dbe4')],
    ['minimal-ink', 'Ink Minimal', 'Near-black type, no rules at all except one under the name.',
      ['design', 'marketing', 'data'], ['Zero decoration', 'Type sets the hierarchy', 'Excellent one-pager'],
      mono('#1a1d23', '#d9dde3')],
  ],

  /* ============ Statement — solid header band, then a tidy body ============ */
  metro: [
    ['band-navy', 'Navy Band', 'Full-width navy header, silver section chips. Confident, still corporate.',
      ['marketing', 'sales', 'it'], ['Memorable header', 'Chips keep it organised', 'Good for startups and agencies'],
      NAVY],
    ['band-slate', 'Slate Band', 'Steel band with a flat finish — the statement with the colour dialled down.',
      ['operations', 'finance', 'data', 'it'], ['Neutral for any sector', 'Sharp on a laser printer', 'Strong name presence'],
      STEEL, ['mod-band-flat']],
    ['band-noir', 'Noir Band', 'Flat black header with brass detail. The boldest thing in the pile, quietly.',
      ['design', 'marketing', 'sales'], ['Maximum contrast', 'One metal accent', 'Stands out without colour'],
      NOIR_GOLD, ['mod-band-flat']],
    ['band-tinted', 'Tinted Band', 'Pale navy wash instead of a dark block — for reviewers who print in colour.',
      ['hr', 'education', 'healthcare', 'finance'], ['Bright page, clear header', 'Lower ink cost', 'Calm but structured'],
      NAVY, ['mod-band-tint']],
  ],

  /* ============ Corporate — a label column on the left ==================== */
  corporate: [
    ['corporate-boardroom', 'Boardroom Grid', 'Section labels in a left rail, content on the right. Extremely scannable.',
      ['finance', 'operations', 'hr', 'sales'], ['Instant section finding', 'ATS-friendly structure', 'Formal by default'],
      mono('#1a1d23', '#d6dae1')],
    ['corporate-navy', 'Navy Grid', 'The same rail in navy ink with a rule under every block.',
      ['finance', 'it', 'data', 'operations'], ['Classic corporate grid', 'Reads authoritative', 'Prints crisp'],
      mono(NAVY.p, NAVY.a)],
    ['corporate-pine', 'Pine Grid', 'Deep green labels — grounded, easy on the eye, distinct in a navy stack.',
      ['healthcare', 'education', 'operations', 'finance'], ['Trustworthy tone', 'Clear label column', 'Comfortable long read'],
      mono(PINE.p, '#c6d8cd')],
  ],

  /* ============ Timeline — dates in the gutter ============================ */
  timeline: [
    ['timeline-navy', 'Career Timeline', 'Dates in the left gutter, a dotted line down the page. Progression is obvious.',
      ['it', 'sales', 'operations', 'marketing'], ['Progression reads instantly', 'Great for 5+ years', 'Recruiter-friendly scan'],
      NAVY],
    ['timeline-graphite', 'Graphite Timeline', 'Charcoal line and dots, warm gray dates. Sober storytelling.',
      ['finance', 'operations', 'data', 'sales'], ['Neutral for any sector', 'Dates never get lost', 'Prints sharp'],
      GRAPHITE],
  ],

  /* ============ Portrait — photo header, letter-spaced name =============== */
  portrait: [
    ['portrait-ink', 'Portrait Ink', 'Letter-spaced name, square photo, hairline columns. The clean photo resume.',
      ['marketing', 'hr', 'design', 'education'], ['Photo without heaviness', 'Very readable columns', 'Recognisable structure'],
      mono('#16181d', '#d9dde3'), ['mod-square']],
    ['portrait-steel', 'Portrait Steel', 'Navy ink on a warm white page, round photo. Photo CV, corporate edition.',
      ['sales', 'operations', 'finance', 'it'], ['Professional and current', 'Photo-friendly', 'Crisp in print'],
      mono(NAVY.p, '#ccd6e3'), ['mod-square']],
  ],

  /* ============ Studio — soft tinted panel with a round photo ============== */
  studio: [
    ['studio-mist', 'Mist Panel', 'Pale steel panel, round photo, small-caps sections. Warm but working.',
      ['hr', 'marketing', 'education', 'design'],
      ['Friendly, still formal', 'Photo front and centre', 'Skills stay in view'],
      { p: '#243042', p2: '#eaeff5', p3: '#d6dee9', pm: '#7d8da3', a: '#4f6b8c' }],
    ['studio-clay', 'Clay Panel', 'Warm sand panel with taupe ink. The soft corporate look.',
      ['design', 'education', 'healthcare', 'hr'],
      ['Warm, human tone', 'Reads gentle, not casual', 'Great with a photo'],
      { p: '#3c2f24', p2: '#f3ece3', p3: '#e3d7c8', pm: '#8d7a66', a: '#9a7550' }],
  ],

  /* ============ Monogram — initials seal, centered ======================== */
  monogram: [
    ['monogram-seal', 'Initials Seal', 'Boxed initials, tracked serif name, centered rules. Strong without a photo.',
      ['design', 'marketing', 'hr', 'sales'], ['Personal-brand header', 'Works with no photo', 'Editorial spacing'],
      mono('#16181d', '#cfd2d8')],
    ['monogram-navy', 'Navy Seal', 'Navy seal and rules — formal, with a little flair.',
      ['finance', 'sales', 'operations', 'it'], ['Formal yet memorable', 'Good for senior roles', 'Clean centered block'],
      NAVY],
  ],

  /* ============ Infographic — tinted panel with skill bars ================ */
  infographic: [
    ['skills-bars', 'Skills Bars', 'Tinted right panel with proficiency bars and language dots. Visual, kept tidy.',
      ['it', 'design', 'data', 'marketing'], ['Skills read at a glance', 'Bold first impression', 'Photo-friendly'],
      NAVY],
    ['skills-slate', 'Slate Skills Panel', 'The same panel in graphite for a corporate environment.',
      ['it', 'data', 'finance', 'operations'], ['Neutral corporate tone', 'Bars, not badges', 'Calm palette'],
      SLATE_INK],
  ],

  /* ============ Editorial — numbered sections in a wide margin ============ */
  editorial: [
    ['editorial-wide', 'Wide Margin', 'Numbered sections in a broad left margin, magazine spacing down the page.',
      ['design', 'marketing', 'education', 'hr'], ['Reads like a profile piece', 'Huge margins, zero clutter', 'Portfolio careers'],
      mono('#16181d', '#c9ccd3')],
    ['editorial-navy', 'Navy Editorial', 'Serif headings over hairlines with numbered margins. Boardroom magazine.',
      ['finance', 'operations', 'sales', 'it'], ['Quiet authority', 'Long histories scan fast', 'Prints beautifully'],
      mono(NAVY.p, NAVY.a), ['mod-serif']],
  ],

  /* ============ Spine — colour spine with sideways titles ================= */
  spine: [
    ['spine-navy', 'Navy Spine', 'A navy spine down the page edge, section titles turned sideways inside it.',
      ['it', 'data', 'design', 'operations'], ['Strong visual identity', 'Photo sits in the spine', 'Clean page edge'],
      NAVY],
    ['spine-ink', 'Ink Spine', 'Near-black spine with a brass hairline. Design-forward, still formal.',
      ['design', 'marketing', 'hr', 'it'], ['Designer-grade header', 'Single metal accent', 'Memorable structure'],
      NOIR_GOLD],
  ],

  /* ============ Soft — rounded panels, pill skills ======================== */
  soft: [
    ['soft-slate', 'Slate Panels', 'Rounded steel panels and pill skills. Modern, approachable, not playful.',
      ['it', 'data', 'hr', 'education'], ['Approachable, still professional', 'Pills make skills scannable', 'Great early-career'],
      STEEL],
    ['soft-sand', 'Sand Panels', 'Rounded warm panels with taupe ink. The friendly client-facing look.',
      ['healthcare', 'education', 'design', 'marketing'], ['Low-glare, warm tone', 'Kind and steady', 'Prints softly'],
      MOCHA],
  ],

  /* ============ Banner — full-width banner plus a right rail ============== */
  banner: [
    ['banner-steel', 'Steel Banner', 'Full-width steel banner, then the story left and the facts in a right rail.',
      ['it', 'operations', 'sales', 'data'], ['Header does the work', 'Rail keeps facts visible', 'Good on a phone screen'],
      STEEL],
    ['banner-indigo', 'Indigo Banner', 'Deep indigo banner with a pale rail. Composed, a touch premium.',
      ['finance', 'hr', 'marketing', 'sales'], ['Premium first impression', 'Quiet colour story', 'Senior-friendly'],
      INDIGO_STEEL],
  ],

  /* ============ Ledger — ruled rows, dates in the left rule =============== */
  ledger: [
    ['ledger-finance', 'Finance Ledger', 'Ruled rows, dates against the left margin. An unsentimental dossier.',
      ['finance', 'data', 'operations', 'sales'], ['Extremely easy to scan', 'Dates never get lost', 'Built for 10+ years'],
      mono(NAVY.p, NAVY.a)],
    ['ledger-oxblood', 'Oxblood Ledger', 'Wine rules and a double date column. Old-school precision.',
      ['finance', 'sales', 'hr', 'education'], ['Traditional and confident', 'Reads distinguished', 'Partner-track CVs'],
      mono(OXBLOOD.p, OXBLOOD.a)],
    ['ledger-ops', 'Operations Ledger', 'Graphite rules, tighter leading, everything justified to the grid.',
      ['operations', 'data', 'it', 'finance'], ['Grid-tight alignment', 'Fits maximum content', 'Plain and factual'],
      mono(GRAPHITE.p, GRAPHITE.a)],
  ],
};

/** Flattened catalogue, families in a deliberate order: ATS first, then
 *  sidebar, then everything else by visual weight. */
const FAMILY_ORDER: LayoutId[] = [
  'compact', 'split', 'classic', 'minimal', 'corporate', 'metro', 'timeline',
  'portrait', 'studio', 'monogram', 'infographic', 'editorial', 'spine',
  'soft', 'banner', 'ledger',
];

export const TEMPLATES: Template[] = FAMILY_ORDER.flatMap((layout) =>
  FAMILY[layout].map(([id, name, tagline, bestFor, strengths, pal, mods]) => ({
    id,
    name,
    layout,
    pal,
    mods: mods ?? [],
    tagline,
    bestFor: bestFor.length ? bestFor : ALL_FIELDS,
    strengths,
  })),
);

export const TEMPLATE_COUNT = TEMPLATES.length;

/** Sections rendered in the side/panel column for the two-column families. */
export const SIDE_SECTIONS: Partial<Record<LayoutId, SectionId[]>> = {
  split: ['skills', 'languages', 'certs', 'hobbies'],
  portrait: ['education', 'skills', 'languages', 'certs', 'hobbies'],
  studio: ['skills', 'languages', 'certs', 'hobbies'],
  infographic: ['skills', 'languages', 'certs', 'hobbies'],
  soft: ['skills', 'languages', 'certs', 'hobbies'],
  banner: ['skills', 'languages', 'certs', 'hobbies'],
};

/** The families actually present in the catalogue, in gallery order. */
export const ACTIVE_FAMILIES: LayoutId[] = FAMILY_ORDER.filter((l) => FAMILY[l].length > 0);

export const templateById = (id: string): Template =>
  TEMPLATES.find((t) => t.id === id)
  ?? TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)
  ?? TEMPLATES[0];

const TECH_FIELDS = new Set(['it', 'data', 'design']);

/** Section order per layout + field. All variants of a layout share it. */
export function sectionOrder(tpl: Template, fieldId: string): SectionId[] {
  const tech = TECH_FIELDS.has(fieldId);
  const tail: SectionId[] = ['achievements', 'hobbies'];
  switch (tpl.layout) {
    case 'split':
    case 'studio':
    case 'infographic':
      // the side column carries skills/languages/certs/hobbies; main gets the rest
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
