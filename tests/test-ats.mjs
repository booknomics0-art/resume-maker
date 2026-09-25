/**
 * ATS keyword check test — the job-description matcher must be honest:
 *  - find the real skills in a realistic JD (multi-word terms included)
 *  - never match filler words ("the", "strong", "experience")
 *  - report what the resume actually has, and only that
 *  - survive garbage input (empty JD, a job title alone)
 *
 *   node tests/test-ats.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { checks, tmpDir } from './_harness.mjs';

mkdirSync(tmpDir, { recursive: true });

const entry = join(tmpDir, 'ats-entry.ts');
const outfile = join(tmpDir, 'ats-bundle.js');
writeFileSync(entry, `
  export * from '../../src/lib/ats';
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

const ats = await import(pathToFileURL(outfile).href);
const { extractJdKeywords, matchKeywords, resumeToText, emptyResume } = ats;

const out = [];
const ok = (name, cond) => out.push([name, !!cond]);

const JD = `Senior Software Engineer — Bengaluru

We are looking for a Senior Software Engineer to join our payments team.
You will own features end to end in a fast-paced, collaborative environment.

Responsibilities:
- Design and build microservices in Node.js and TypeScript
- Work with PostgreSQL, Redis and AWS (EC2, S3, Lambda)
- Improve CI/CD pipelines (GitHub Actions, Docker)
- Mentor junior engineers and drive technical decision making

Requirements:
- 5+ years of experience with JavaScript and React
- Strong knowledge of system design and REST APIs
- Experience with Kubernetes and monitoring (Grafana, Prometheus)
- Excellent communication and problem solving skills`;

const resume = emptyResume();
resume.personal = {
  fullName: 'Amit Shukla', headline: 'Senior Software Engineer',
  email: 'amit@example.com', phone: '+91 98200 12345', city: 'Bengaluru',
  linkedin: '', website: '', photo: '',
};
resume.skills = ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'AWS', 'Kubernetes', 'Docker', 'CI/CD', 'System Design', 'REST APIs'];
resume.experience = [{
  id: 'e1', role: 'Senior Software Engineer', company: 'FinEdge', location: 'Bengaluru',
  start: 'Jul 2021', end: '', current: true,
  bullets: ['Designed a Node.js microservice on AWS with EC2 and S3', 'Mentored four engineers', 'Moved CI/CD to GitHub Actions and Docker'],
}];

const keys = extractJdKeywords(JD);
ok('JD keywords found (≥ 8)', keys.length >= 8);
ok('multi-word "kubernetes" present', keys.includes('kubernetes'));
ok('multi-word "ci/cd" present', keys.some((k) => k === 'ci/cd' || k === 'cicd'));
ok('multi-word "github actions" present', keys.includes('github actions'));
ok('multi-word "system design" present', keys.includes('system design'));
ok('no stop-word noise (the/strong/experience/looking)',
  !keys.some((k) => ['the', 'strong', 'experience', 'looking', 'you', 'will'].includes(k)));
ok('no single-letter or junk tokens', keys.every((k) => k.length >= 3 && /^[\w+#./-]+(\s+[\w+#./-]+)*$/.test(k)));

const resumeText = resumeToText(resume);
const rep = matchKeywords(JD, resumeText);
ok('report has a score in 0–100', rep.score >= 0 && rep.score <= 100);
ok('covered ⊆ keywords and missing ⊆ keywords, disjoint',
  [...rep.covered, ...rep.missing].every((k) => keys.includes(k)) &&
  rep.covered.every((k) => !rep.missing.includes(k)));
ok('score is consistent with the counts',
  rep.total === 0 ? rep.score === 0 : rep.score === Math.round((rep.covered.length / rep.total) * 100));
ok('known-covered term is covered (typescript)', rep.covered.includes('typescript'));
ok('absent term is missing (grafana — not on the resume)', rep.missing.includes('grafana'));

// honesty: a resume that has nothing of the JD gets a low score
const empty2 = emptyResume();
empty2.personal.fullName = 'Someone Else';
const rep2 = matchKeywords(JD, resumeToText(empty2));
ok('empty resume → low score (< 40)', rep2.score < 40);

// garbage input never crashes and never invents keywords
ok('empty JD → no keywords', extractJdKeywords('').length === 0);
ok('job title alone → 0 or very few keywords', extractJdKeywords('Senior Manager').length <= 2);
const rep3 = matchKeywords('', resumeText);
ok('empty JD → score 0', rep3.score === 0);

process.exit(checks(out) ? 0 : 1);
