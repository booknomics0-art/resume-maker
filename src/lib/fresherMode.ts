import { emptyResume, type Resume, type StepId } from './types';

export interface FresherReadinessItem {
  id: string;
  step: StepId;
  label: string;
  passed: boolean;
  weight: number;
  guidance: string;
}

export interface FresherReadinessReport {
  score: number;
  passed: number;
  total: number;
  nextStep: StepId | null;
  nextAction: string;
  items: FresherReadinessItem[];
}

function hasValidEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

function hasEducation(r: Resume): boolean {
  return r.education.some((item) => item.degree.trim() && item.school.trim() && item.year.trim());
}

function hasProjectProof(r: Resume): boolean {
  return r.projects.some((project) => project.name.trim() && project.points.trim());
}

function hasExtraProof(r: Resume): boolean {
  return !!r.personal.website.trim()
    || !!r.personal.linkedin.trim()
    || r.certs.some((cert) => cert.name.trim())
    || r.achievements.some((item) => item.trim());
}

/**
 * Creates a clean entry-level master resume without inventing any experience.
 * Existing editor/storage/PDF behavior is reused unchanged.
 */
export function createFresherResume(): Resume {
  const resume = emptyResume();
  return {
    ...resume,
    name: 'Fresher master resume',
    fresher: true,
    templateId: 'fresher-timeline',
  };
}

/**
 * A deterministic readiness guide for entry-level candidates.
 * Formal work experience is intentionally not part of the score.
 */
export function buildFresherReadiness(r: Resume): FresherReadinessReport {
  const skills = r.skills.filter((skill) => skill.trim());
  const items: FresherReadinessItem[] = [
    {
      id: 'target-role',
      step: 'basics',
      label: 'Target role',
      passed: !!r.personal.headline.trim(),
      weight: 15,
      guidance: 'Add the exact role you want, such as Frontend Developer or Data Analyst.',
    },
    {
      id: 'contact',
      step: 'basics',
      label: 'Contact basics',
      passed: hasValidEmail(r.personal.email) && !!r.personal.phone.trim() && !!r.personal.city.trim(),
      weight: 15,
      guidance: 'Add a valid email, phone number and city so recruiters can act immediately.',
    },
    {
      id: 'education',
      step: 'education',
      label: 'Education',
      passed: hasEducation(r),
      weight: 20,
      guidance: 'Add your highest degree, institute and completion year.',
    },
    {
      id: 'skills',
      step: 'skills',
      label: 'Role-relevant skills',
      passed: skills.length >= 5,
      weight: 15,
      guidance: 'Add at least 5 truthful skills you can explain in an interview.',
    },
    {
      id: 'project-proof',
      step: 'extras',
      label: 'Project proof',
      passed: hasProjectProof(r),
      weight: 25,
      guidance: 'Add one real project with what you built, used and achieved. Do not invent metrics.',
    },
    {
      id: 'extra-proof',
      step: 'extras',
      label: 'Extra proof',
      passed: hasExtraProof(r),
      weight: 10,
      guidance: 'Add a portfolio/LinkedIn link, certification or real achievement.',
    },
  ];

  const score = items.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0);
  const next = items.find((item) => !item.passed) ?? null;
  return {
    score,
    passed: items.filter((item) => item.passed).length,
    total: items.length,
    nextStep: next?.step ?? null,
    nextAction: next?.guidance ?? 'Core fresher signals are ready. Tailor this resume to each job description next.',
    items,
  };
}
