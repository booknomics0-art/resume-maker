// Core data model for CraftCV

export interface PersonalInfo {
  fullName: string;
  headline: string; // target job title, e.g. "Frontend Developer"
  email: string;
  phone: string;
  city: string;
  linkedin: string;
  website: string;
  photo: string; // data URL, optional
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  start: string; // e.g. "Mar 2022"
  end: string; // e.g. "Present" / "Aug 2024"
  current: boolean;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  location: string;
  year: string;
  note: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  link: string;
  points: string; // one point per line
}

export interface CertItem {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

export interface LanguageItem {
  id: string;
  name: string;
  level: string;
}

export interface Resume {
  id: string;
  name: string;
  fieldId: string;
  templateId: string;
  createdAt: number;
  updatedAt: number;
  step: number; // last completed step index
  fresher: boolean; // no work experience yet
  personal: PersonalInfo;
  summary: string;
  bestExperience: string; // one short story the candidate is proud of
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects: ProjectItem[];
  certs: CertItem[];
  languages: LanguageItem[];
  achievements: string[];
  hobbies: string[];
}

export type StepId =
  | 'basics'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'extras'
  | 'design';

export interface StepDef {
  id: StepId;
  title: string;
  short: string;
  minutes: number; // typical minutes to complete
}

export const STEPS: StepDef[] = [
  { id: 'basics', title: 'Basics', short: 'Basics', minutes: 1.5 },
  { id: 'summary', title: 'Professional summary', short: 'Summary', minutes: 1.5 },
  { id: 'experience', title: 'Work experience', short: 'Experience', minutes: 2.5 },
  { id: 'education', title: 'Education', short: 'Education', minutes: 1 },
  { id: 'skills', title: 'Skills', short: 'Skills', minutes: 1 },
  { id: 'extras', title: 'Projects, hobbies & extras', short: 'Extras', minutes: 1.5 },
  { id: 'design', title: 'Template & finish', short: 'Design', minutes: 1 },
];

export const uid = () => Math.random().toString(36).slice(2, 10);

export function emptyResume(): Resume {
  const now = Date.now();
  return {
    id: uid(),
    name: 'Untitled resume',
    fieldId: 'it',
    templateId: 'modern',
    createdAt: now,
    updatedAt: now,
    step: 0,
    fresher: false,
    personal: {
      fullName: '',
      headline: '',
      email: '',
      phone: '',
      city: '',
      linkedin: '',
      website: '',
      photo: '',
    },
    summary: '',
    bestExperience: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certs: [],
    languages: [],
    achievements: [],
    hobbies: [],
  };
}

/** All mandatory checks, used by progress meter and step validation. */
export interface Missing {
  step: StepId;
  label: string;
}

export function missingRequirements(r: Resume): Missing[] {
  const m: Missing[] = [];
  const p = r.personal;
  if (!p.fullName.trim()) m.push({ step: 'basics', label: 'Full name' });
  if (!p.headline.trim()) m.push({ step: 'basics', label: 'Target job title' });
  if (!p.email.trim() || !/^\S+@\S+\.\S+$/.test(p.email)) m.push({ step: 'basics', label: 'Valid email' });
  if (!p.phone.trim()) m.push({ step: 'basics', label: 'Phone number' });
  if (!p.city.trim()) m.push({ step: 'basics', label: 'City' });
  if (!r.summary.trim() || r.summary.trim().length < 40) m.push({ step: 'summary', label: 'Summary (at least 2–3 lines)' });
  if (!r.fresher) {
    const okExp = r.experience.some((e) => e.role.trim() && e.company.trim() && e.start.trim());
    if (!okExp) m.push({ step: 'experience', label: 'At least one job entry' });
  }
  const okEdu = r.education.some((e) => e.degree.trim() && e.school.trim() && e.year.trim());
  if (!okEdu) m.push({ step: 'education', label: 'At least one education entry' });
  if (r.skills.filter(Boolean).length < 3) m.push({ step: 'skills', label: 'At least 3 skills' });
  return m;
}

export function completeness(r: Resume): number {
  const total = 9; // number of mandatory checks above
  return Math.round(((total - Math.min(total, missingRequirements(r).length)) / total) * 100);
}
