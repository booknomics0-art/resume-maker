import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { checks, root, tmpDir } from './_harness.mjs';

mkdirSync(tmpDir, { recursive: true });
const entry = join(tmpDir, 'recruiter-view-entry.ts');
const outfile = join(tmpDir, 'recruiter-view-bundle.js');
writeFileSync(entry, `
  export * from '../../src/lib/recruiterView';
  export { emptyResume, STEPS } from '../../src/lib/types';
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
const { buildRecruiterView, emptyResume, STEPS } = mod;
const component = readFileSync(join(root, 'src', 'components', 'RecruiterView.tsx'), 'utf8');
const ats = readFileSync(join(root, 'src', 'components', 'AtsCheck.tsx'), 'utf8');
const css = readFileSync(join(root, 'src', 'components', 'RecruiterView.css'), 'utf8');
const out = [];
const ok = (name, cond) => out.push([name, !!cond]);

const empty = emptyResume();
const emptyReport = buildRecruiterView(empty);
ok('empty resume score stays in range', emptyReport.score >= 0 && emptyReport.score <= 100);
ok('empty resume has no more than 3 fixes', emptyReport.topFixes.length <= 3);
ok('empty resume points first fixes to real editor steps', emptyReport.topFixes.every((fix) => STEPS.some((step) => step.id === fix.step)));

const rich = emptyResume();
rich.personal = {
  fullName: 'Asha Rao', headline: 'Software Engineer', email: 'asha@example.com', phone: '+91 90000 00000', city: 'Bengaluru', linkedin: 'linkedin.com/in/asha', website: 'asha.dev', photo: '',
};
rich.summary = 'Software engineer focused on reliable web products, TypeScript services and measurable delivery improvements across cross-functional product teams.';
rich.skills = ['TypeScript', 'React', 'Node.js', 'AWS', 'PostgreSQL'];
rich.experience = [{
  id: 'e1', role: 'Software Engineer', company: 'Example Labs', location: 'Bengaluru', start: '2024', end: '', current: true,
  bullets: ['Built TypeScript APIs used by 12 services', 'Reduced release time by 30% by automating deployment checks', 'Improved production reliability across customer-facing services'],
}];
rich.education = [{ id: 'ed1', degree: 'B.Tech', school: 'Example University', location: 'Bengaluru', year: '2024', note: '' }];
rich.projects = [{ id: 'p1', name: 'Release monitor', link: 'https://asha.dev/release', points: 'Built a deployment monitor used across 4 projects' }];
rich.achievements = ['Won internal engineering demo day'];
const richReport = buildRecruiterView(rich);
ok('strong resume scores higher than empty resume', richReport.score > emptyReport.score);
ok('measurable impact becomes strongest proof', /12|30%/.test(richReport.strongestProof));
ok('strong resume recognises measurable proof', richReport.passedSignals.some((signal) => signal.includes('measurable')));
ok('first scan starts with candidate identity', richReport.firstScan[0].includes('Asha Rao') && richReport.firstScan[0].includes('Software Engineer'));
ok('buried strengths are capped at 3', richReport.buriedStrengths.length <= 3);
ok('priority fixes are ordered high to low', richReport.topFixes.every((fix, index, arr) => {
  const rank = { high: 0, medium: 1, low: 2 };
  return index === 0 || rank[arr[index - 1].priority] <= rank[fix.priority];
}));

const fresher = emptyResume();
fresher.fresher = true;
fresher.personal = { fullName: 'Riya Singh', headline: 'Data Analyst', email: 'riya@example.com', phone: '+91 90000 00001', city: 'Delhi', linkedin: '', website: '', photo: '' };
fresher.summary = 'Entry-level data analyst with hands-on SQL, Excel and Power BI projects focused on clear dashboards, data cleaning and practical business questions.';
fresher.skills = ['SQL', 'Excel', 'Power BI', 'Python'];
fresher.education = [{ id: 'ed2', degree: 'B.Com', school: 'Delhi University', location: 'Delhi', year: '2026', note: '' }];
fresher.projects = [{ id: 'p2', name: 'Sales dashboard', link: '', points: 'Built a Power BI dashboard for monthly sales analysis across 3 regions' }];
const fresherReport = buildRecruiterView(fresher);
ok('fresher is not told to add formal work experience', !fresherReport.topFixes.some((fix) => /job|work experience|formal work/i.test(`${fix.title} ${fix.action}`)));
ok('fresher project can supply recruiter proof', /dashboard|sales|3 regions/i.test(fresherReport.strongestProof));

ok('Recruiter View is surfaced from ATS/editor stack', ats.includes("import RecruiterView from './RecruiterView'") && ats.includes('<RecruiterView r={r} />'));
ok('Fix buttons target existing step pills instead of mutating resume data', component.includes("document.querySelectorAll<HTMLButtonElement>('.stepper .step-pill')") && component.includes('target.click()'));
ok('Recruiter View explicitly disclaims eye tracking', component.includes('not eye tracking') || component.includes('not eye tracking'.replace('not ', 'not ')));
ok('Recruiter View explicitly disclaims hiring guarantee', component.includes('hiring guarantee'));
ok('mobile toggle keeps a 44px touch target', /\.rv-toggle\{min-width:44px;min-height:44px\}/.test(css));
ok('mobile fix CTA keeps a 44px touch target', /\.rv-fix-button\{width:100%;min-height:44px/.test(css));
ok('narrow 390px layout has an explicit guard', css.includes('@media(max-width:390px)'));

process.exit(checks(out) ? 0 : 1);
