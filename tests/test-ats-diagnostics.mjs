import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { checks, tmpDir } from './_harness.mjs';

mkdirSync(tmpDir, { recursive: true });

const entry = join(tmpDir, 'ats-diagnostics-entry.ts');
const outfile = join(tmpDir, 'ats-diagnostics-bundle.js');
writeFileSync(entry, `
  export * from '../../src/lib/ats';
  export * from '../../src/lib/atsDiagnostics';
  export { emptyResume } from '../../src/lib/types';
`);

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile,
  logLevel: 'error',
});

const mod = await import(pathToFileURL(outfile).href);
const { emptyResume, matchKeywords, resumeToText, buildAtsDiagnostics } = mod;
const out = [];
const ok = (name, cond) => out.push([name, !!cond]);

const JD = `Software Engineer
We need TypeScript, React, AWS, Kubernetes, Grafana and PostgreSQL.
You will build APIs, improve monitoring and work with Docker.`;

const resume = emptyResume();
resume.personal = {
  fullName: 'Asha Rao',
  headline: 'Software Engineer',
  email: 'asha@example.com',
  phone: '+91 90000 00000',
  city: 'Bengaluru',
  linkedin: 'linkedin.com/in/asha',
  website: '',
  photo: '',
};
resume.summary = 'Software engineer building reliable TypeScript services for cloud products with practical ownership across delivery and operations.';
resume.skills = ['TypeScript', 'React', 'Kubernetes', 'Docker'];
resume.experience = [{
  id: 'e1',
  role: 'Software Engineer',
  company: 'Example Labs',
  location: 'Bengaluru',
  start: '2024',
  end: '',
  current: true,
  bullets: [
    'Built TypeScript APIs used by 12 internal services',
    'Deployed services with Docker and reduced release time by 30%',
    'Improved AWS operations for production workloads',
  ],
}];
resume.education = [{ id: 'ed1', degree: 'B.Tech', school: 'Example University', location: 'Bengaluru', year: '2024', note: '' }];
resume.projects = [{ id: 'p1', name: 'Cloud API', link: '', points: 'Built a TypeScript service with Docker' }];

const report = matchKeywords(JD, resumeToText(resume));
const diag = buildAtsDiagnostics(resume, report);

ok('diagnostic readiness score stays in 0–100', diag.readinessScore >= 0 && diag.readinessScore <= 100);
ok('diagnostic check count is internally consistent', diag.passedChecks >= 0 && diag.passedChecks <= diag.totalChecks && diag.totalChecks > 0);
ok('missing keywords produce a priority issue', diag.issues.some((issue) => issue.id === 'missing-job-keywords'));
ok('missing issue never invents terms', diag.issues
  .filter((issue) => issue.terms)
  .flatMap((issue) => issue.terms)
  .every((term) => report.missing.includes(term) || report.covered.includes(term)));
ok('skills-only match is detected (Kubernetes)', diag.skillsOnly.includes('kubernetes'));
ok('evidence-backed match is detected (TypeScript)', diag.evidencedTerms.includes('typescript'));
ok('AWS is missing or evidence-backed, never falsely skills-only', !diag.skillsOnly.includes('aws'));
ok('priority issues are sorted high → medium → low', diag.issues.every((issue, index, arr) => {
  const rank = { high: 0, medium: 1, low: 2 };
  return index === 0 || rank[arr[index - 1].priority] <= rank[issue.priority];
}));

const brokenContact = structuredClone(resume);
brokenContact.personal.email = '';
brokenContact.personal.phone = '';
const brokenDiag = buildAtsDiagnostics(brokenContact, matchKeywords(JD, resumeToText(brokenContact)));
ok('bad contact details are a high-priority fix', brokenDiag.issues.some((issue) => issue.id === 'contact-details' && issue.priority === 'high'));

const fresher = emptyResume();
fresher.fresher = true;
fresher.personal = {
  fullName: 'Riya Singh', headline: 'Data Analyst', email: 'riya@example.com', phone: '+91 90000 00001', city: 'Delhi', linkedin: '', website: '', photo: '',
};
fresher.summary = 'Entry-level data analyst with hands-on SQL and Power BI projects focused on clear dashboards, data cleaning and practical business questions.';
fresher.skills = ['SQL', 'Power BI', 'Excel'];
fresher.education = [{ id: 'ed2', degree: 'B.Com', school: 'Delhi University', location: 'Delhi', year: '2026', note: '' }];
fresher.projects = [{ id: 'p2', name: 'Sales dashboard', link: '', points: 'Built a Power BI dashboard using SQL and Excel for monthly sales analysis' }];
const fresherJd = 'Data Analyst role requiring SQL, Power BI, Excel and Tableau.';
const fresherReport = matchKeywords(fresherJd, resumeToText(fresher));
const fresherDiag = buildAtsDiagnostics(fresher, fresherReport);
ok('fresher without formal work history does not get experience-bullet issue', !fresherDiag.issues.some((issue) => ['experience-evidence', 'quantified-results', 'action-verbs', 'bullet-length'].includes(issue.id)));
ok('fresher mode explicitly records formal work history as non-required', fresherDiag.passedSignals.some((signal) => signal.includes('Fresher mode')));

process.exit(checks(out) ? 0 : 1);
