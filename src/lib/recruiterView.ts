import type { Resume, StepId } from './types';

export type RecruiterPriority = 'high' | 'medium' | 'low';

export interface RecruiterFix {
  id: string;
  step: StepId;
  priority: RecruiterPriority;
  title: string;
  why: string;
  action: string;
}

export interface RecruiterViewReport {
  score: number;
  verdict: string;
  firstScan: string[];
  strongestProof: string;
  biggestConcern: string;
  buriedStrengths: string[];
  topFixes: RecruiterFix[];
  passedSignals: string[];
}

const ACTION_VERBS = [
  'led', 'built', 'designed', 'launched', 'improved', 'reduced', 'increased',
  'managed', 'created', 'delivered', 'automated', 'migrated', 'optimized',
  'optimised', 'implemented', 'owned', 'drove', 'grew', 'cut', 'saved',
  'trained', 'mentored', 'shipped', 'negotiated', 'streamlined', 'resolved',
  'developed', 'achieved', 'organized', 'organised', 'coordinated', 'analysed',
  'analyzed', 'maintained', 'scaled', 'configured', 'tested', 'deployed',
];

function words(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function short(value: string, max = 132): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function bulletsOf(r: Resume): string[] {
  return r.experience.flatMap((item) => item.bullets.map((bullet) => bullet.trim())).filter(Boolean);
}

function projectPointsOf(r: Resume): string[] {
  return r.projects
    .flatMap((project) => project.points.split(/\n+/).map((point) => point.trim()))
    .filter(Boolean);
}

function startsWithActionVerb(value: string): boolean {
  const first = value.toLowerCase().replace(/^[^a-z]+/, '').split(/\s+/)[0] ?? '';
  return ACTION_VERBS.includes(first);
}

function hasMetric(value: string): boolean {
  return /(?:\d|%|₹|\$|\b(?:k|m|million|crore|lakh)\b)/i.test(value);
}

function proofCandidates(r: Resume): string[] {
  const bullets = bulletsOf(r);
  const projectPoints = projectPointsOf(r);
  const candidates = [
    ...bullets.filter(hasMetric),
    ...projectPoints.filter(hasMetric),
    ...bullets.filter(startsWithActionVerb),
    ...projectPoints,
    ...r.achievements.map((value) => value.trim()).filter(Boolean),
    ...bullets,
  ];
  return [...new Set(candidates.map((value) => short(value)).filter(Boolean))];
}

function addFix(fixes: RecruiterFix[], fix: RecruiterFix | null): void {
  if (fix) fixes.push(fix);
}

function priorityRank(priority: RecruiterPriority): number {
  return priority === 'high' ? 0 : priority === 'medium' ? 1 : 2;
}

/**
 * A deterministic content-first approximation of a recruiter's initial scan.
 * This is not eye tracking and does not claim to predict a hiring decision.
 */
export function buildRecruiterView(r: Resume): RecruiterViewReport {
  const p = r.personal;
  const bullets = bulletsOf(r);
  const projectPoints = projectPointsOf(r);
  const evidence = r.fresher && bullets.length === 0 ? projectPoints : bullets;
  const summaryWords = words(r.summary);
  const validEmail = /^\S+@\S+\.\S+$/.test(p.email);
  const contactComplete = validEmail && !!p.phone.trim() && !!p.city.trim();
  const strongIdentity = !!p.fullName.trim() && !!p.headline.trim();
  const summaryStrong = summaryWords >= 25 && summaryWords <= 90;
  const hasProof = proofCandidates(r).length > 0;
  const hasMeasuredProof = [...bullets, ...projectPoints, ...r.achievements].some(hasMetric);
  const scanableEvidence = evidence.length === 0
    ? r.fresher
    : evidence.every((value) => words(value) <= 25);
  const skillCount = r.skills.filter(Boolean).length;
  const hasEducation = r.education.some((item) => item.degree.trim() && item.school.trim());
  const hasLink = !!p.linkedin.trim() || !!p.website.trim();
  const hasExtraProof = r.projects.length > 0 || r.achievements.some(Boolean) || r.certs.length > 0;

  let score = 0;
  score += p.fullName.trim() ? 6 : 0;
  score += p.headline.trim() ? 9 : 0;
  score += validEmail ? 4 : 0;
  score += p.phone.trim() ? 4 : 0;
  score += p.city.trim() ? 4 : 0;
  score += summaryStrong ? 18 : r.summary.trim().length >= 40 ? 10 : 0;
  score += hasMeasuredProof ? 20 : hasProof ? 14 : 0;
  score += scanableEvidence ? 15 : evidence.length > 0 ? 7 : 0;
  score += skillCount >= 5 ? 10 : skillCount >= 3 ? 7 : skillCount > 0 ? 3 : 0;
  score += hasEducation ? 4 : 0;
  score += hasExtraProof ? 3 : 0;
  score += hasLink ? 3 : 0;
  score = Math.max(0, Math.min(100, score));

  const firstScan: string[] = [];
  firstScan.push(strongIdentity
    ? `${p.fullName.trim()} · ${p.headline.trim()}`
    : [p.fullName.trim() || 'Name missing', p.headline.trim() || 'Target role missing'].join(' · '));

  if (r.summary.trim()) firstScan.push(short(r.summary, 118));
  else firstScan.push('No professional summary is visible yet.');

  const firstExperience = r.experience.find((item) => item.role.trim() || item.company.trim());
  const firstProject = r.projects.find((item) => item.name.trim() || item.points.trim());
  if (!r.fresher && firstExperience) {
    firstScan.push(short(`${firstExperience.role || 'Role'}${firstExperience.company ? ` at ${firstExperience.company}` : ''}`, 96));
  } else if (firstProject) {
    firstScan.push(short(`Project: ${firstProject.name || firstProject.points}`, 96));
  } else if (hasEducation) {
    const education = r.education.find((item) => item.degree.trim() && item.school.trim());
    if (education) firstScan.push(short(`${education.degree} · ${education.school}`, 96));
  }

  if (skillCount > 0) firstScan.push(`Skills: ${r.skills.filter(Boolean).slice(0, 4).join(', ')}`);

  const fixes: RecruiterFix[] = [];

  if (!strongIdentity) {
    addFix(fixes, {
      id: 'identity', step: 'basics', priority: 'high',
      title: 'Your name or target role is not immediately clear',
      why: 'A recruiter should understand who you are and which role you fit in the first line of the resume.',
      action: 'Add your full name and a specific target job title in Basics.',
    });
  }

  if (!contactComplete) {
    addFix(fixes, {
      id: 'contact', step: 'basics', priority: 'high',
      title: 'Contact details create avoidable friction',
      why: 'A recruiter should not have to hunt for a valid email, phone number or location.',
      action: 'Add a valid email, phone number and city in Basics.',
    });
  }

  if (!summaryStrong) {
    addFix(fixes, {
      id: 'summary', step: 'summary', priority: r.summary.trim() ? 'medium' : 'high',
      title: r.summary.trim() ? 'Your opening summary needs a tighter first scan' : 'Your resume opens without a professional summary',
      why: 'The top summary is prime space to communicate target role, strongest evidence and practical value quickly.',
      action: 'Write a 25–90 word summary with your role, strongest relevant evidence and one concrete strength.',
    });
  }

  if (!hasProof) {
    addFix(fixes, {
      id: 'proof', step: r.fresher ? 'extras' : 'experience', priority: 'high',
      title: 'The resume does not show a concrete proof point yet',
      why: r.fresher
        ? 'For a fresher, projects and achievements often carry the strongest evidence of real ability.'
        : 'Job titles alone do not show what you delivered, improved or owned.',
      action: r.fresher
        ? 'Add one real project or achievement that explains what you built, analysed, improved or delivered.'
        : 'Add concise achievement bullets under your experience.',
    });
  } else if (!hasMeasuredProof) {
    addFix(fixes, {
      id: 'metrics', step: r.fresher && bullets.length === 0 ? 'extras' : 'experience', priority: 'medium',
      title: 'Your strongest proof is not measurable yet',
      why: 'A real number can make scope or impact easier to understand during a quick scan.',
      action: 'Where a real number exists, add it to one project, achievement or experience bullet. Do not invent metrics.',
    });
  }

  if (!scanableEvidence && evidence.length > 0) {
    addFix(fixes, {
      id: 'scanability', step: r.fresher && bullets.length === 0 ? 'extras' : 'experience', priority: 'medium',
      title: 'Some proof points are too long for a quick scan',
      why: 'Long bullets bury the action and result, especially on mobile or during a fast recruiter review.',
      action: 'Keep one achievement per line and aim for roughly 25 words or fewer.',
    });
  }

  if (skillCount < 3) {
    addFix(fixes, {
      id: 'skills', step: 'skills', priority: 'medium',
      title: 'The target-skill signal is too thin',
      why: 'A recruiter should be able to identify your core practical skills without reading the entire resume.',
      action: 'Add at least 3 truthful skills that support the role you are targeting.',
    });
  }

  if (!hasEducation) {
    addFix(fixes, {
      id: 'education', step: 'education', priority: r.fresher ? 'high' : 'low',
      title: 'Education information is incomplete',
      why: r.fresher ? 'For freshers, education is often one of the first credibility signals recruiters scan.' : 'A concise education entry completes the recruiter context.',
      action: 'Add your highest relevant degree, institute and year.',
    });
  }

  fixes.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  const strengths: string[] = [];
  const measuredBullet = bullets.find(hasMetric);
  const measuredProject = projectPoints.find(hasMetric);
  if (measuredBullet) strengths.push(`Measured impact: ${short(measuredBullet, 108)}`);
  else if (measuredProject) strengths.push(`Measured project proof: ${short(measuredProject, 108)}`);

  const achievement = r.achievements.map((value) => value.trim()).find(Boolean);
  if (achievement) strengths.push(`Achievement worth surfacing: ${short(achievement, 108)}`);

  const project = r.projects.find((item) => item.name.trim() && item.points.trim());
  if (project && !r.fresher) strengths.push(`Project proof: ${short(project.name, 72)}`);

  const cert = r.certs.find((item) => item.name.trim());
  if (cert) strengths.push(`Certification: ${short(cert.name, 72)}`);

  if (hasLink) strengths.push(p.website.trim() ? 'Portfolio link is available' : 'LinkedIn profile is available');

  const passedSignals: string[] = [];
  if (strongIdentity) passedSignals.push('Name and target role are immediately clear');
  if (contactComplete) passedSignals.push('Contact details are complete');
  if (summaryStrong) passedSignals.push('Summary is in a recruiter-friendly length range');
  if (hasMeasuredProof) passedSignals.push('At least one measurable proof point is visible');
  else if (hasProof) passedSignals.push('At least one concrete proof point is visible');
  if (scanableEvidence) passedSignals.push(r.fresher && evidence.length === 0 ? 'Fresher mode is not penalized for missing formal work history' : 'Evidence lines are quick to scan');

  const strongestProof = proofCandidates(r)[0] || (r.fresher
    ? 'No project or achievement proof is visible yet.'
    : 'No achievement or evidence bullet is visible yet.');

  const biggestConcern = fixes[0]?.title ?? 'No high-impact first-scan concern detected by these checks.';
  const verdict = score >= 85
    ? 'Strong first scan'
    : score >= 70
      ? 'Good, but sharpen the top'
      : score >= 50
        ? 'Mixed first impression'
        : 'Needs a clearer first scan';

  return {
    score,
    verdict,
    firstScan: firstScan.slice(0, 4),
    strongestProof,
    biggestConcern,
    buriedStrengths: [...new Set(strengths)].slice(0, 3),
    topFixes: fixes.slice(0, 3),
    passedSignals,
  };
}
