#!/usr/bin/env node
import fs from 'node:fs';

const mustContain = (file, needles) => {
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) throw new Error(`${file} is missing: ${needle}`);
  }
  return text;
};

const sitemap = mustContain('public/sitemap.xml', [
  '/guides/resume-format-india',
  '/guides/resume-summary-examples',
  '/guides/resume-skills-guide',
  '/guides/fresher-resume-guide',
]);

const routes = [
  'public/guides/index.html',
  'public/guides/resume-format-india/index.html',
  'public/guides/resume-summary-examples/index.html',
  'public/guides/resume-skills-guide/index.html',
  'public/guides/fresher-resume-guide/index.html',
];
for (const file of routes) {
  mustContain(file, ['<h1>', 'rel="canonical"', 'name="description"', 'ResumeMakery']);
  const words = fs.readFileSync(file, 'utf8').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  if (file !== 'public/guides/index.html' && words < 700) throw new Error(`${file} is too thin (${words} words)`);
}

mustContain('public/legal/privacy.html', [
  'Google Analytics',
  'Microsoft Clarity',
  'Ahrefs Web Analytics',
  'Google AdSense advertising is not currently active',
]);
mustContain('public/legal/cookies.html', [
  'Google Analytics',
  'Microsoft Clarity',
  'Google AdSense ads are not currently served',
]);

const vercel = mustContain('vercel.json', [
  '"/guides"',
  '"/legal/privacy.html"',
  '"/legal/cookies.html"',
]);

const adGuard = mustContain('src/lib/adPlacement.ts', [
  "'/guides/resume-format-india'",
  'canShowContentAds',
]);
if (adGuard.includes("'/editor/")) throw new Error('Editor routes must never be ad-eligible.');

if ((sitemap.match(/<loc>/g) || []).length < 22) throw new Error('Expected expanded public sitemap.');
if (!vercel.includes('/job-description-resume-match')) throw new Error('Missing dedicated SEO rewrite.');

console.log('✓ AdSense readiness: editorial depth, legal disclosure, sitemap and ad-placement boundary verified');
