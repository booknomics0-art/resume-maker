// Resume Score — the free, instant "expert review" card.
//
// Combines three signals into one 0–100 score:
//   1. Essentials  — the mandatory fields (mirrors `missingRequirements()`)
//   2. Content     — recruiter/ATS quality of the writing itself
//   3. Extras      — the human touches that make a resume feel written, not generated
//
// Pure functions only: no imports beyond `types.ts`, no side effects, no DOM.
// Consumed by `src/components/ResumeScore.tsx` in the editor (never printed).

import type { Resume } from './types';

export type ScoreGroup = 'essentials' | 'content' | 'extras';

export interface ScoreCheck {
  id: string;
  group: ScoreGroup;
  label: string;
  ok: boolean;
  tip: string;
  weight: number;
}

/** Verbs that read as ownership of results — used for the bullet-start check. */
const ACTION_VERBS = [
  'led', 'built', 'designed', 'launched', 'improved', 'reduced', 'increased',
  'managed', 'created', 'delivered', 'automated', 'migrated', 'optimized',
  'optimised', 'implemented', 'owned', 'drove', 'grew', 'cut', 'saved',
  'trained', 'mentored', 'shipped', 'negotiated', 'streamlined', 'resolved',
  'developed', 'achieved', 'organized', 'organised', 'coordinated', 'analysed',
  'analyzed', 'maintained', 'scaled', 'configured', 'tested', 'deployed',
  'taught', 'handled', 'established', 'introduced', 'spearheaded', 'processed',
];

function bulletsOf(r: Resume): string[] {
  return r.experience.flatMap((e) => e.bullets.map((b) => b.trim())).filter(Boolean);
}

function startsWithActionVerb(bullet: string): boolean {
  const first = bullet.toLowerCase().replace(/^[^a-z]+/, '').split(/\s+/)[0] ?? '';
  return ACTION_VERBS.includes(first);
}

/** All checks for one resume. Order = display order in the score card. */
export function resumeScoreChecks(r: Resume): ScoreCheck[] {
  const p = r.personal;
  const bullets = bulletsOf(r);
  const summaryWords = r.summary.trim().split(/\s+/).filter(Boolean).length;

  const essentials: ScoreCheck[] = [
    { id: 'name', group: 'essentials', label: 'Name & job title', ok: !!p.fullName.trim() && !!p.headline.trim(), tip: 'Add your full name and the role you are targeting.', weight: 2 },
    { id: 'contact', group: 'essentials', label: 'Email, phone & city', ok: /^\S+@\S+\.\S+$/.test(p.email) && !!p.phone.trim() && !!p.city.trim(), tip: 'Recruiters need a valid email, phone and your city.', weight: 2 },
    { id: 'summary', group: 'essentials', label: 'Summary (2–3 lines)', ok: r.summary.trim().length >= 40, tip: 'Write a 2–3 line summary — it is the first thing recruiters read.', weight: 2 },
    { id: 'experience', group: 'essentials', label: r.fresher ? 'Fresher mode on' : 'At least one job', ok: r.fresher || r.experience.some((e) => e.role.trim() && e.company.trim()), tip: 'Add a job entry (or switch on fresher mode).', weight: 2 },
    { id: 'education', group: 'essentials', label: 'Education entry', ok: r.education.some((e) => e.degree.trim() && e.school.trim()), tip: 'Add your highest degree with institute and year.', weight: 2 },
    { id: 'skills', group: 'essentials', label: 'At least 3 skills', ok: r.skills.filter(Boolean).length >= 3, tip: 'Pick the skills that match your target role.', weight: 2 },
  ];

  const content: ScoreCheck[] = [
    {
      id: 'summary-length', group: 'content', label: 'Summary length (25–90 words)', weight: 2,
      ok: summaryWords >= 25 && summaryWords <= 90,
      tip: 'Aim for 25–90 words: long enough to sell you, short enough to be read.',
    },
    {
      id: 'bullets-exist', group: 'content', label: 'Experience bullets written', weight: 2,
      ok: bullets.length >= 3,
      tip: 'Add 3–5 bullets under your job — achievements, not duties.',
    },
    {
      id: 'bullets-quantified', group: 'content', label: 'Numbers in bullets', weight: 2,
      ok: bullets.some((b) => /\d/.test(b)),
      tip: 'Quantify at least one bullet: “reduced load time by 40%”, “handled 50+ calls a day”.',
    },
    {
      id: 'action-verbs', group: 'content', label: 'Bullets start with action verbs', weight: 2,
      ok: bullets.length > 0 && bullets.filter(startsWithActionVerb).length >= Math.ceil(bullets.length / 2),
      tip: 'Start bullets with verbs like Led, Built, Reduced, Launched — not “Responsible for”.',
    },
    {
      id: 'bullet-length', group: 'content', label: 'Bullets stay readable (≤ 25 words)', weight: 1,
      ok: bullets.length > 0 && bullets.every((b) => b.split(/\s+/).length <= 25),
      tip: 'Split long bullets — one achievement per line reads best.',
    },
  ];

  const extras: ScoreCheck[] = [
    { id: 'projects', group: 'extras', label: 'A project or achievement', ok: r.projects.length > 0 || r.achievements.filter(Boolean).length > 0, tip: 'One strong project or achievement makes a resume memorable.', weight: 1 },
    { id: 'languages', group: 'extras', label: 'Languages listed', ok: r.languages.length > 0, tip: 'Languages matter to Indian recruiters — add yours.', weight: 1 },
    { id: 'hobbies', group: 'extras', label: 'A human touch (hobbies)', ok: r.hobbies.filter(Boolean).length > 0, tip: 'One real hobby gives interviewers something to ask about.', weight: 1 },
    { id: 'links', group: 'extras', label: 'LinkedIn or portfolio link', ok: !!p.linkedin.trim() || !!p.website.trim(), tip: 'Add your LinkedIn or portfolio — recruiters do click.', weight: 1 },
  ];

  return [...essentials, ...content, ...extras];
}

export interface ResumeScoreResult {
  /** 0–100, rounded. */
  score: number;
  checks: ScoreCheck[];
  /** Passed weight / total weight — the raw ratio behind the score. */
  ratio: number;
}

/** Weighted 0–100 score. Essentials weigh most, extras are the finishing polish. */
export function resumeScore(r: Resume): ResumeScoreResult {
  const checks = resumeScoreChecks(r);
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const earned = checks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0);
  return {
    score: Math.round((earned / total) * 100),
    checks,
    ratio: total > 0 ? earned / total : 0,
  };
}
