/**
 * Cover letter + offline polish tests — the writing features must stay honest:
 *  - the letter only contains facts from the resume or the job inputs
 *  - a missing company becomes an explicit [Company name] placeholder
 *  - freshers never get invented "years of experience"
 *  - the offline polish never invents content, only tidies the user's lines
 *
 *   node tests/test-cover-letter.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { checks, tmpDir } from './_harness.mjs';

mkdirSync(tmpDir, { recursive: true });

const entry = join(tmpDir, 'letter-entry.ts');
const outfile = join(tmpDir, 'letter-bundle.js');
writeFileSync(entry, `
  export * from '../../src/lib/coverLetter';
  export { localPolish, localSummaryDraft } from '../../src/lib/ai';
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
const { draftCoverLetter, localPolish, localSummaryDraft, emptyResume } = await import(
  pathToFileURL(outfile).href
);

function analystResume() {
  const r = emptyResume();
  r.personal = {
    fullName: 'Asha Verma', headline: 'Data Analyst',
    email: 'asha@example.com', phone: '+91 90000 00000', city: 'Delhi',
    linkedin: 'linkedin.com/in/asha', website: '', photo: '',
  };
  r.summary = 'Data analyst with three years in retail analytics.';
  r.experience = [{
    id: 'e1', role: 'Data Analyst', company: 'RetailMetrics', location: 'Delhi',
    start: 'Jan 2023', end: '', current: true,
    bullets: [
      'Built 12 Power BI dashboards used by 300 store managers every week',
      'Reduced stock-out incidents by 22% with a demand forecast',
    ],
  }];
  r.education = [{ id: 'ed1', degree: 'B.Sc, Statistics', school: 'Delhi University', location: 'Delhi', year: '2022', note: '' }];
  r.skills = ['SQL', 'Python', 'Power BI', 'Excel'];
  return r;
}

const letterText = (d) => [d.greeting, ...d.paragraphs].join('\n');

let pass = 0;
const results = [];
const check = (name, ok) => results.push([name, ok]);

// --- company & role handling ------------------------------------------------
const d1 = draftCoverLetter(analystResume(), { company: 'Infosys', role: 'Analytics Specialist', hiringManager: '' });
check('letter names the company from the input', letterText(d1).includes('Infosys'));
check('letter uses the requested role', letterText(d1).includes('Analytics Specialist'));
check('generic greeting without a manager name', d1.greeting === 'Dear Hiring Manager,');

const d2 = draftCoverLetter(analystResume(), { company: '', role: '', hiringManager: 'Priya Sharma' });
check('missing company becomes an explicit placeholder', letterText(d2).includes('[Company name]') && d2.placeholderUsed);
check('manager name is used in the greeting', d2.greeting === 'Dear Priya Sharma,');
check('missing role falls back to the resume headline', letterText(d2).includes('Data Analyst'));

// --- facts come from the resume, never from thin air -------------------------
const r3 = analystResume();
const d3 = draftCoverLetter(r3, { company: 'Infosys', role: '', hiringManager: '' });
check('quantified bullet carried into the letter', letterText(d3).includes('22%'));
check('experience years derived from resume dates', /\d\+ years/.test(letterText(d3)));
check('current employer named from the resume', letterText(d3).includes('RetailMetrics'));
check('skills line lists resume skills', /SQL/.test(letterText(d3)) && /Power BI/.test(letterText(d3)));

// --- fresher safety ----------------------------------------------------------
const fresh = analystResume();
fresh.fresher = true;
fresh.experience = [];
fresh.projects = [{ id: 'p1', name: 'Retail demand forecast', link: '', points: 'Cut waste 15% in pilot stores' }];
const d4 = draftCoverLetter(fresh, { company: 'TCS', role: '', hiringManager: '' });
check('fresher letter never claims years of experience', !/\d\+ years/.test(letterText(d4)));
check('fresher letter draws proof from projects', letterText(d4).includes('Retail demand forecast'));
check('fresher letter still names the company', letterText(d4).includes('TCS'));

// --- garbage in, no crash out -------------------------------------------------
const bare = emptyResume();
const d5 = draftCoverLetter(bare, { company: '', role: '', hiringManager: '' });
check('empty resume still produces a letter (no crash)', d5.paragraphs.length >= 2);
check('empty resume keeps the placeholder honest', letterText(d5).includes('[Company name]'));

// --- bullet formatting contract ------------------------------------------------
const d6 = draftCoverLetter(analystResume(), { company: 'Zomato', role: '', hiringManager: '' });
const bulletLines = d6.paragraphs.filter((p) => p.startsWith('•'));
check('proof bullets are marked with • for the renderer', bulletLines.length >= 2);

// --- offline polish: tidy, never invent -----------------------------------------
const polished = localPolish('responsible for the weekly reporting deck\nbuilt dashboards in power bi');
check('polish strips "Responsible for" and capitalises', polished.startsWith('The weekly reporting deck') && !polished.toLowerCase().includes('responsible'));
check('polish keeps the user\'s own words (no invention)', !polished.includes('spearheaded') && polished.toLowerCase().includes('reporting deck'));
const shortLine = localPolish('led team');
check('short lines are left bare (no forced period)', !shortLine.endsWith('.'));
const withNum = localPolish('reduced load time by 40%');
check('polish preserves numbers exactly', withNum.includes('40%'));

// --- offline summary draft: only resume facts ------------------------------------
check('summary draft refuses an empty resume (no fabrication)', localSummaryDraft(emptyResume()) === '');
const s1 = localSummaryDraft(analystResume());
check('summary draft uses the resume headline', s1.includes('Data Analyst'));
check('summary draft lists resume skills', s1.includes('SQL'));
check('summary draft carries a quantified result', /\d/.test(s1));

// ---------------------------------------------------------------------------

pass = results.filter(([, ok]) => ok).length;
for (const [name, ok] of results) console.log(`${ok ? '✅' : '❌'} ${name}`);
console.log(`\n${pass}/${results.length} checks passed`);
process.exit(pass === results.length ? 0 : 1);
