/**
 * Resume Score + Landing/SEO test — the "storefront" must stay honest:
 *  - the score is fair math on real signals (0 for empty, 100 for complete)
 *  - the score reacts to the exact things it claims to check
 *  - the landing page never ships fake testimonials
 *  - the FAQ in Landing.tsx never drifts from the FAQPage JSON-LD in index.html
 *  - the strict CSP is never weakened by the SEO work
 *
 *   node tests/test-score-landing.mjs
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { checks, root, tmpDir } from './_harness.mjs';

mkdirSync(tmpDir, { recursive: true });

// ---------------------------------------------------------------------------
// 1) Bundle the real production score lib (same pattern as test-ats)
// ---------------------------------------------------------------------------
const entry = join(tmpDir, 'score-entry.ts');
const outfile = join(tmpDir, 'score-bundle.js');
writeFileSync(entry, `
  export * from '../../src/lib/resumeScore';
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
const { resumeScore, resumeScoreChecks } = await import(pathToFileURL(outfile).href);
const { emptyResume } = await import(pathToFileURL(outfile).href);

/** A resume that passes every check — the "finished" resume. */
function completeResume() {
  const r = emptyResume();
  r.personal = {
    fullName: 'Asha Verma', headline: 'Data Analyst',
    email: 'asha@example.com', phone: '+91 90000 00000', city: 'Delhi',
    linkedin: 'linkedin.com/in/asha', website: '', photo: '',
  };
  r.summary = 'Three years of turning messy retail data into decisions with SQL, Python and Power BI dashboards that three hundred store managers actually use every single week.';
  r.fresher = false;
  r.experience = [{
    id: 'e1', role: 'Data Analyst', company: 'RetailMetrics', location: 'Delhi',
    start: 'Jan 2023', end: '', current: true,
    bullets: [
      'Built 12 Power BI dashboards used by 300 store managers every week',
      'Reduced stock-out incidents by 22% with a demand forecast the supply team still runs',
      'Automated the weekly sales report in Python, saving the merch team two days every month',
    ],
  }];
  r.education = [{ id: 'ed1', degree: 'B.Sc, Statistics', school: 'Delhi University', location: 'Delhi', year: '2022', note: '' }];
  r.skills = ['SQL', 'Python', 'Power BI'];
  r.projects = [{ id: 'p1', name: 'Demand forecast', link: '', points: 'Cut waste 15% in pilot stores' }];
  r.languages = [{ id: 'l1', name: 'Hindi', level: 'Native' }, { id: 'l2', name: 'English', level: 'Professional' }];
  r.achievements = ['Top intern, 2022 batch'];
  r.hobbies = ['Chess'];
  return r;
}

let pass = 0;
const results = [];
const check = (name, ok) => results.push([name, ok]);

// --- empty resume scores the floor -----------------------------------------
const empty = emptyResume();
const emptyScore = resumeScore(empty);
check('empty resume scores 0', emptyScore.score === 0);
check('empty resume fails every essentials check',
  resumeScoreChecks(empty).filter((c) => c.group === 'essentials').every((c) => !c.ok));

// --- complete resume scores the ceiling ------------------------------------
const full = completeResume();
const fullScore = resumeScore(full);
check('complete resume scores 100', fullScore.score === 100);
check('complete resume has no failing checks', fullScore.checks.every((c) => c.ok));

// --- the score reacts to each thing it claims to check ---------------------
const noNumbers = completeResume();
noNumbers.experience[0].bullets = noNumbers.experience[0].bullets.map((b) => b.replace(/\d+/g, 'many'));
check('quantified-bullets check fails without numbers',
  resumeScoreChecks(noNumbers).find((c) => c.id === 'bullets-quantified')?.ok === false);

const passive = completeResume();
passive.experience[0].bullets = [
  'Responsible for the weekly reporting deck',
  'Was tasked with dashboard maintenance',
];
check('passive bullets fail the action-verb check',
  resumeScoreChecks(passive).find((c) => c.id === 'action-verbs')?.ok === false);

const longWinded = completeResume();
longWinded.summary = Array(120).fill('word').join(' ');
check('200-word summary fails the summary-length check',
  resumeScoreChecks(longWinded).find((c) => c.id === 'summary-length')?.ok === false);
const terse = completeResume();
terse.summary = 'Analyst. SQL. Python.';
check('3-word summary fails the summary-length check',
  resumeScoreChecks(terse).find((c) => c.id === 'summary-length')?.ok === false);

const fresher = completeResume();
fresher.fresher = true;
fresher.experience = [];
check('fresher mode passes the experience check with no jobs',
  resumeScoreChecks(fresher).find((c) => c.id === 'experience')?.ok === true);

const unlinked = completeResume();
unlinked.personal.linkedin = '';
unlinked.personal.website = '';
check('missing links fail the links check but do not nuke the score',
  resumeScoreChecks(unlinked).find((c) => c.id === 'links')?.ok === false && resumeScore(unlinked).score >= 90);

// --- the math is sane ------------------------------------------------------
const allChecks = resumeScoreChecks(completeResume());
check('every check has a positive weight', allChecks.every((c) => c.weight > 0));
check('every check belongs to a known group',
  allChecks.every((c) => ['essentials', 'content', 'extras'].includes(c.group)));
check('every failing check ships an actionable tip',
  allChecks.every((c) => c.ok || (c.tip && c.tip.length > 10)));
const mid = completeResume();
mid.skills = []; mid.hobbies = []; mid.languages = [];
const midScore = resumeScore(mid);
check('removing three things strictly lowers the score', midScore.score > 0 && midScore.score < 100);

// ---------------------------------------------------------------------------
// 2) Landing / SEO drift guards (file-level, like the catalog drift test)
// ---------------------------------------------------------------------------
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const landingSrc = readFileSync(join(root, 'src', 'components', 'Landing.tsx'), 'utf8');
const appSrc = readFileSync(join(root, 'src', 'App.tsx'), 'utf8');

check('strict CSP is intact in index.html (script-src stays self)',
  indexHtml.includes("script-src 'self'"));
check('JSON-LD SoftwareApplication offers ₹0 INR',
  /"offers"[^}]*"price":\s*"0"[^}]*"priceCurrency":\s*"INR"/s.test(indexHtml));
check('JSON-LD FAQPage present', indexHtml.includes('"FAQPage"'));

const ldFaqCount = (indexHtml.match(/"@type":\s*"Question"/g) || []).length;
const landingFaqCount = (landingSrc.match(/\n    q: '/g) || []).length;
check(`FAQ count matches between Landing.tsx (${landingFaqCount}) and JSON-LD (${ldFaqCount})`,
  ldFaqCount > 0 && ldFaqCount === landingFaqCount);

const testimonialsEmpty = !/const TESTIMONIALS[^=]*=\s*\[\s*\]/.test(landingSrc) === false;
check('TESTIMONIALS ships empty (no invented reviews)', testimonialsEmpty);
check('landing requires an account and offers no guest start',
  landingSrc.includes('Sign in or create a free account') && !landingSrc.includes('onStartGuest') && !landingSrc.includes('no signup'));
check('logged-out home renders Landing instead of the login wall',
  (appSrc.includes('import Landing') || appSrc.includes("import('./components/Landing')")) &&
  appSrc.includes('<Landing'));
check('landing actions navigate through the authentication gate',
  appSrc.includes("onStart={(target) => navigate(target || '/editor/new')}") &&
  appSrc.includes('if (!user)') && appSrc.includes('<AuthPage') && !appSrc.includes('guest_start'));
const authSrc = readFileSync(join(root, 'src/lib/auth.ts'), 'utf8');
check('legacy guest sessions are rejected',
  authSrc.includes("u.provider !== 'email' && u.provider !== 'google'") &&
  authSrc.includes('localStorage.removeItem(SESSION_KEY)'));
check('SEO no longer advertises guest access', !indexHtml.includes('Start as a guest'));

const robots = join(root, 'public', 'robots.txt');
const sitemap = join(root, 'public', 'sitemap.xml');
const og = join(root, 'public', 'og-image.jpg');
check('robots.txt exists', existsSync(robots));
check('sitemap.xml exists', existsSync(sitemap));
check('og-image.jpg exists and is a real file (> 5 KB)',
  existsSync(og) && statSync(og).size > 5 * 1024);
check('static SEO content block present for crawlers', indexHtml.includes('id="seo-content"'));
check('twitter card tags present', indexHtml.includes('twitter:card'));

// ---------------------------------------------------------------------------

pass = results.filter(([, ok]) => ok).length;
for (const [name, ok] of results) console.log(`${ok ? '✅' : '❌'} ${name}`);
console.log(`\n${pass}/${results.length} checks passed`);
process.exit(pass === results.length ? 0 : 1);
