import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checks, root } from './_harness.mjs';

const app = readFileSync(join(root, 'src', 'App.tsx'), 'utf8');
const landing = readFileSync(join(root, 'src', 'components', 'SeoLanding.tsx'), 'utf8');
const seo = readFileSync(join(root, 'src', 'lib', 'seo.ts'), 'utf8');
const prerender = readFileSync(join(root, 'scripts', 'prerender-seo.mjs'), 'utf8');
const sitemap = readFileSync(join(root, 'public', 'sitemap.xml'), 'utf8');

const routes = [
  '/job-description-resume-match',
  '/ats-keyword-checker',
  '/resume-score-checker',
];

const out = [];
const ok = (name, condition) => out.push([name, !!condition]);

for (const route of routes) {
  ok(`${route} routed for logged-out visitors`, app.includes(`'${route}'`));
  ok(`${route} has rendered landing content`, landing.includes(`'${route}':`));
  ok(`${route} has runtime SEO metadata`, seo.includes(`'${route}':`));
  ok(`${route} has static prerender content`, prerender.includes(`'${route}':`));
  ok(`${route} is listed in sitemap`, sitemap.includes(`https://www.resumemakery.com${route}`));
}

ok('ATS page describes two separate scores',
  landing.includes('Job Match measures') && landing.includes('Resume Readiness checks'));
ok('ATS page ships priority Issue → Why → Fix language',
  landing.includes('Issue → Why → Fix'));
ok('ATS page preserves the no-guarantee disclaimer',
  landing.includes('not an employer-specific ATS simulation or an interview guarantee'));
ok('keyword page tells users not to invent claims',
  landing.includes('not instructions to add claims you cannot support'));
ok('resume-score page separates readiness from job match',
  landing.includes('Readiness is not job match'));
ok('fresher guidance does not require formal work history',
  landing.includes('does not require formal work history'));
ok('prerender related-links set includes every ATS growth route',
  routes.every((route) => prerender.includes(route)));
ok('sitemap contains no duplicate URLs', (() => {
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return urls.length === new Set(urls).size;
})());

process.exit(checks(out) ? 0 : 1);
