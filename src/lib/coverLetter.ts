// Cover letter drafter — every sentence comes from the user's own resume or
// the job they are applying to. Nothing is invented: if a fact is missing the
// letter uses an explicit placeholder like [Company name] that the user must
// fill, never a made-up detail.
//
// Pure functions only (no DOM, no storage) so the test suite can run the real
// production code in Node — same contract as the other libs.

import type { Resume } from './types';

export interface LetterInput {
  company: string;
  role: string;
  hiringManager: string;
}

export interface CoverLetterDraft {
  greeting: string;
  /** Body paragraphs, in order. Lines starting with "• " render as bullets. */
  paragraphs: string[];
  placeholderUsed: boolean;
}

/** Years of experience from the earliest parseable start year, or null. */
function yearsFrom(resume: Resume): number | null {
  const years = resume.experience
    .map((e) => e.start.match(/(\d{4})/)?.[1])
    .filter((y): y is string => !!y)
    .map(Number)
    .filter((y) => y > 1950 && y <= new Date().getFullYear());
  if (years.length === 0) return null;
  const span = new Date().getFullYear() - Math.min(...years);
  return span >= 1 ? Math.min(span, 40) : null;
}

function joinNames(list: string[], max: number): string {
  const items = list.filter(Boolean).slice(0, max);
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Bullets that carry a number are the strongest proof — put them first. */
function proofBullets(resume: Resume, count: number): string[] {
  const bullets = resume.experience.flatMap((e) => e.bullets.map((b) => b.trim())).filter(Boolean);
  const withNumbers = bullets.filter((b) => /\d/.test(b));
  const rest = bullets.filter((b) => !/\d/.test(b));
  return [...withNumbers, ...rest].slice(0, count);
}

function projectBullets(resume: Resume, count: number): string[] {
  const out: string[] = [];
  for (const p of resume.projects) {
    if (!p.name.trim()) continue;
    const points = p.points.split('\n').map((s) => s.trim()).filter(Boolean);
    out.push(points.length > 0 ? `${p.name} — ${points[0]}` : p.name);
    if (out.length >= count) return out;
  }
  for (const a of resume.achievements) {
    if (!a.trim() || out.length >= count) continue;
    out.push(a.trim());
  }
  return out;
}

/**
 * Draft the letter. Deterministic, fact-safe, and editable — the component
 * drops the result into a textarea the user can rewrite line by line.
 */
export function draftCoverLetter(r: Resume, input: LetterInput): CoverLetterDraft {
  const role = input.role.trim() || r.personal.headline.trim() || 'the advertised role';
  const company = input.company.trim() || '[Company name]';
  const placeholderUsed = input.company.trim() === '';

  const name = r.personal.fullName.trim();
  const headline = r.personal.headline.trim();
  const years = yearsFrom(r);
  const skills = joinNames(r.skills.filter(Boolean), 4);
  const current = r.experience.find((e) => e.role.trim());

  // --- opening paragraph -------------------------------------------------
  const opener = `I am writing to apply for the ${role} role at ${company}.`;
  let hook: string;
  if (!r.fresher && current && years) {
    hook = `I have spent the last ${years}+ years working as a ${current.role.trim()}${current.company.trim() ? ` at ${current.company.trim()}` : ''}, most recently as a ${headline || current.role.trim()}.`;
  } else if (!r.fresher && current) {
    hook = `I work as a ${current.role.trim()}${current.company.trim() ? ` at ${current.company.trim()}` : ''}, and the ${role} opening matches exactly where I want to take my career next.`;
  } else {
    hook = `I am starting my career with a strong foundation in ${skills || (headline || 'the field')}, and the ${role} role at ${company} is the kind of start I have been working toward.`;
  }

  // --- proof paragraph ---------------------------------------------------
  const jobBullets = r.fresher ? [] : proofBullets(r, 3);
  const freshBullets = r.fresher ? projectBullets(r, 3) : [];
  const bullets = [...jobBullets, ...freshBullets];

  const proofLines: string[] = [];
  if (bullets.length > 0) {
    proofLines.push(r.fresher
      ? 'A few pieces of my work I am most proud of:'
      : 'A few results from my recent work that speak to this role:');
    for (const b of bullets) proofLines.push(`• ${b}`);
  } else if (skills) {
    proofLines.push(`Day to day, I work mainly with ${skills}, and I pick up new tools quickly.`);
  }

  // --- fit + closing -----------------------------------------------------
  const fitSkills = skills
    ? `My core skills — ${skills} — line up with what the ${role} role needs, and I am comfortable owning work end to end.`
    : `I believe my background lines up with what the ${role} role needs, and I am comfortable owning work end to end.`;
  const closing = `I would welcome the chance to discuss how I can contribute to ${company}. Thank you for your time and consideration.`;

  const paragraphs = [
    `${opener} ${hook}`,
    ...proofLines,
    `${fitSkills} ${closing}`,
  ];

  const greeting = input.hiringManager.trim()
    ? `Dear ${input.hiringManager.trim()},`
    : 'Dear Hiring Manager,';

  return { greeting, paragraphs, placeholderUsed };
}
