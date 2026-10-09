import type { AtsReport } from './ats';
import { resumeScoreChecks, type ScoreCheck } from './resumeScore';
import type { Resume } from './types';

export type AtsPriority = 'high' | 'medium' | 'low';

export interface AtsDiagnostic {
  id: string;
  priority: AtsPriority;
  title: string;
  why: string;
  fix: string;
  terms?: string[];
}

export interface AtsDiagnosticsReport {
  readinessScore: number;
  passedChecks: number;
  totalChecks: number;
  issues: AtsDiagnostic[];
  skillsOnly: string[];
  evidencedTerms: string[];
  passedSignals: string[];
}

const PRIORITY_ORDER: Record<AtsPriority, number> = { high: 0, medium: 1, low: 2 };

function norm(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function termHit(text: string, term: string): boolean {
  const haystack = norm(text);
  const escaped = norm(term)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9+#/.])${escaped}($|[^a-z0-9+#])`, 'i').test(haystack);
}

function evidenceText(r: Resume): string {
  const parts: string[] = [r.personal.headline, r.summary, r.bestExperience];
  for (const item of r.experience) parts.push(item.role, item.company, ...item.bullets);
  for (const item of r.projects) parts.push(item.name, item.points);
  for (const item of r.certs) parts.push(item.name, item.issuer);
  parts.push(...r.achievements);
  return parts.join('\n');
}

function scoreApplicableChecks(checks: ScoreCheck[]): number {
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  if (!total) return 0;
  const earned = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0);
  return Math.round((earned / total) * 100);
}

function findCheck(checks: ScoreCheck[], id: string): ScoreCheck | undefined {
  return checks.find((check) => check.id === id);
}

function addIssue(issues: AtsDiagnostic[], issue: AtsDiagnostic | null): void {
  if (issue) issues.push(issue);
}

/**
 * Build actionable ATS/job-match diagnostics without changing the underlying
 * keyword score. This stays deterministic and on-device: no AI/API and no
 * invented experience. Advice always tells the user to add a term only when it
 * truthfully describes their background.
 */
export function buildAtsDiagnostics(r: Resume, report: AtsReport): AtsDiagnosticsReport {
  const allChecks = resumeScoreChecks(r);
  const hasExperienceEvidence = r.experience.some((item) =>
    item.role.trim() || item.company.trim() || item.bullets.some((bullet) => bullet.trim()),
  );

  // A fresher with no formal work history should not lose readiness points for
  // experience-bullet checks that do not apply to them.
  const inapplicableForFresher = new Set(['bullets-exist', 'bullets-quantified', 'action-verbs', 'bullet-length']);
  const applicableChecks = allChecks.filter((check) =>
    !(r.fresher && !hasExperienceEvidence && inapplicableForFresher.has(check.id)),
  );

  const skillsBlob = r.skills.join('\n');
  const evidenceBlob = evidenceText(r);
  const skillsOnly = report.covered.filter((term) => termHit(skillsBlob, term) && !termHit(evidenceBlob, term));
  const evidencedTerms = report.covered.filter((term) => termHit(evidenceBlob, term));
  const issues: AtsDiagnostic[] = [];

  if (report.missing.length > 0) {
    const sample = report.missing.slice(0, 8);
    addIssue(issues, {
      id: 'missing-job-keywords',
      priority: report.score < 50 ? 'high' : 'medium',
      title: `${report.missing.length} job-description keyword${report.missing.length === 1 ? '' : 's'} missing`,
      why: 'These terms appear in the job description but not in your resume, so a recruiter or keyword-based screen may not see that match.',
      fix: `Review these first: ${sample.join(', ')}. Add a term only when it truthfully describes your skills or experience; use the employer's spelling where it is accurate.`,
      terms: sample,
    });
  }

  if (skillsOnly.length > 0) {
    const sample = skillsOnly.slice(0, 6);
    addIssue(issues, {
      id: 'skills-without-evidence',
      priority: 'medium',
      title: `${skillsOnly.length} matched skill${skillsOnly.length === 1 ? '' : 's'} appear only in the Skills list`,
      why: 'A skill is stronger when the resume also shows where you used it. A bare keyword can look less credible than a project or achievement with evidence.',
      fix: `For skills you actually used, add one concise proof point in Summary, Experience or Projects. Good candidates here: ${sample.join(', ')}. Do not force every keyword into a bullet.`,
      terms: sample,
    });
  }

  const contact = findCheck(applicableChecks, 'contact');
  if (contact && !contact.ok) {
    addIssue(issues, {
      id: 'contact-details',
      priority: 'high',
      title: 'Contact details are incomplete',
      why: 'Even a strong job match is not useful if a recruiter cannot reliably reach you or identify your location.',
      fix: contact.tip,
    });
  }

  const summary = findCheck(applicableChecks, 'summary');
  const summaryLength = findCheck(applicableChecks, 'summary-length');
  if ((summary && !summary.ok) || (summaryLength && !summaryLength.ok)) {
    addIssue(issues, {
      id: 'summary-quality',
      priority: 'medium',
      title: 'Your summary needs a clearer recruiter scan',
      why: 'The summary is prime space for your target role, strongest evidence and genuinely relevant job-description language.',
      fix: summary && !summary.ok
        ? summary.tip
        : (summaryLength?.tip ?? 'Keep the summary concise and role-specific.'),
    });
  }

  const bulletsExist = findCheck(applicableChecks, 'bullets-exist');
  if (bulletsExist && !bulletsExist.ok) {
    addIssue(issues, {
      id: 'experience-evidence',
      priority: 'high',
      title: 'Experience needs evidence bullets',
      why: 'Job titles alone do not show what you delivered. Recruiters scan bullets for ownership, scope and outcomes.',
      fix: bulletsExist.tip,
    });
  }

  const quantified = findCheck(applicableChecks, 'bullets-quantified');
  if (quantified && !quantified.ok) {
    addIssue(issues, {
      id: 'quantified-results',
      priority: 'medium',
      title: 'No measurable result is visible in your experience bullets',
      why: 'Specific numbers make impact easier to understand and help distinguish achievements from generic responsibilities.',
      fix: quantified.tip,
    });
  }

  const actionVerbs = findCheck(applicableChecks, 'action-verbs');
  if (actionVerbs && !actionVerbs.ok) {
    addIssue(issues, {
      id: 'action-verbs',
      priority: 'medium',
      title: 'Too many bullets read like duties instead of ownership',
      why: 'Recruiters usually scan the first words of a bullet. Strong action verbs make your contribution easier to see quickly.',
      fix: actionVerbs.tip,
    });
  }

  const bulletLength = findCheck(applicableChecks, 'bullet-length');
  if (bulletLength && !bulletLength.ok) {
    addIssue(issues, {
      id: 'bullet-length',
      priority: 'low',
      title: 'Some experience bullets are too long to scan quickly',
      why: 'Long bullets hide the result and are harder to skim on both desktop and mobile recruiter views.',
      fix: bulletLength.tip,
    });
  }

  if (r.fresher && r.projects.length === 0 && r.achievements.filter(Boolean).length === 0) {
    addIssue(issues, {
      id: 'fresher-proof',
      priority: 'medium',
      title: 'Fresher resume has no project or achievement proof yet',
      why: 'When formal experience is limited, projects, internships and achievements are often the strongest evidence of role-relevant skills.',
      fix: 'Add one real project or achievement that shows what you built, analysed, improved or delivered. Include tools and outcomes only when they are true.',
    });
  }

  issues.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const passedSignals: string[] = [];
  if (report.covered.length > 0) passedSignals.push(`${report.covered.length} job-description keywords matched`);
  if (evidencedTerms.length > 0) passedSignals.push(`${evidencedTerms.length} matched terms backed by resume evidence`);
  if (contact?.ok) passedSignals.push('Contact details complete');
  if (summary?.ok && summaryLength?.ok) passedSignals.push('Summary length is recruiter-friendly');
  if (r.fresher && !hasExperienceEvidence) passedSignals.push('Fresher mode correctly avoids requiring formal work history');

  return {
    readinessScore: scoreApplicableChecks(applicableChecks),
    passedChecks: applicableChecks.filter((check) => check.ok).length,
    totalChecks: applicableChecks.length,
    issues: issues.slice(0, 6),
    skillsOnly,
    evidencedTerms,
    passedSignals,
  };
}
