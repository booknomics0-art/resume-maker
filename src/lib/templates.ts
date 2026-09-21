// 5 hand-tuned templates, each tuned per field (section order + emphasis).
// Navy & silver palette throughout; every template prints cleanly to A4 PDF.

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

export interface Template {
  id: string;
  name: string;
  layout: 'classic' | 'split' | 'minimal' | 'metro' | 'compact';
  tagline: string;
  bestFor: string[]; // field ids where it is the top pick
  strengths: string[];
}

export const TEMPLATES: Template[] = [
  {
    id: 'modern',
    name: 'Modern Split',
    layout: 'split',
    tagline: 'Navy sidebar, silver accents. The safe, impressive choice.',
    bestFor: ['it', 'data', 'design', 'marketing'],
    strengths: ['Skills always visible', 'Great for 1-page scans', 'Strong first impression'],
  },
  {
    id: 'classic',
    name: 'Executive Classic',
    layout: 'classic',
    tagline: 'Serif headings, generous spacing. Boardroom-ready.',
    bestFor: ['finance', 'operations', 'sales', 'hr'],
    strengths: ['Loved by senior reviewers', 'Reads authoritative', 'Conservative industries'],
  },
  {
    id: 'minimal',
    name: 'Sharp Minimal',
    layout: 'minimal',
    tagline: 'Airy, quiet, confident. Lets your numbers speak.',
    bestFor: ['design', 'education', 'healthcare'],
    strengths: ['Very clean scan', 'Works with less content', 'Timeless look'],
  },
  {
    id: 'metro',
    name: 'Metro Two-Tone',
    layout: 'metro',
    tagline: 'Bold navy header band with silver section chips.',
    bestFor: ['marketing', 'sales', 'it'],
    strengths: ['Memorable at a glance', 'Energetic but tidy', 'Good for startups'],
  },
  {
    id: 'compact',
    name: 'Compact Pro',
    layout: 'compact',
    tagline: 'Dense single column, ATS-first. Maximum content, no fuss.',
    bestFor: ['data', 'finance', 'healthcare', 'operations', 'education'],
    strengths: ['Most ATS-friendly', 'Fits long histories', 'Recruiter-speed scanning'],
  },
];

export const templateById = (id: string): Template => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

const TECH_FIELDS = new Set(['it', 'data', 'design']);

/** Section order per template + field. Keeps "5 templates, tuned for each field" real. */
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

export function recommendedTemplates(fieldId: string): Template[] {
  return [...TEMPLATES].sort((a, b) => {
    const ai = a.bestFor.includes(fieldId) ? 0 : 1;
    const bi = b.bestFor.includes(fieldId) ? 0 : 1;
    return ai - bi;
  });
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
