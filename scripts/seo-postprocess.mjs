#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const ORIGIN = 'https://www.resumemakery.com';
const routes = [
  'resume-builder',
  'ats-resume-checker',
  'job-description-resume-match',
  'ats-keyword-checker',
  'resume-score-checker',
  'resume-editor',
  'resume-templates',
  'resume-for-freshers',
  'about',
  'faq',
  'privacy',
  'terms',
  'contact',
  'cookies',
  'disclaimer',
  'eula',
];

const entityPrefix = [
  { '@type': 'Organization', '@id': `${ORIGIN}/#organization`, name: 'ResumeMakery', url: `${ORIGIN}/`, logo: { '@type': 'ImageObject', url: `${ORIGIN}/icon.svg` } },
  { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: `${ORIGIN}/`, name: 'ResumeMakery', publisher: { '@id': `${ORIGIN}/#organization` }, inLanguage: 'en-IN' },
];

function syncGuestFirstCopy(html) {
  const replacements = [
    [
      'ResumeMakery — Advanced resume maker: upload existing PDF/DOCX, edit with high-tech editor, 100% free, unlimited downloads, no watermark. 50 professional templates, cloud-saved resumes.',
      'ResumeMakery — Free resume builder: create your first resume and first PDF without sign-up. 50 professional templates, ATS tools and no watermark. Sign up free to save and continue downloading.',
    ],
    [
      'Advanced resume maker: upload PDF/DOCX, edit with high-tech editor, 100% free, unlimited downloads. 50 professional templates.',
      'Build your first resume and download the first PDF without sign-up. 50 professional templates, ATS tools, no watermark; sign up free to save and continue.',
    ],
    [
      'Upload your old resume or build one in 10 minutes. 50 templates, free ATS score, unlimited PDFs. ₹0 forever.',
      'Build your first resume and first PDF without sign-up. 50 templates, free ATS tools, no watermark. Create a free account to save and continue.',
    ],
    [
      'Free online resume builder: upload and edit an existing resume (PDF, DOCX, photo OCR) or build one in 7 guided steps. 50 professional templates, free ATS match score, unlimited clean PDF downloads, no watermark.',
      'Free online resume builder: build your first resume and first PDF without sign-up, or upload and edit an existing resume. 50 professional templates, free ATS match tools and no watermark. A free account saves your work and unlocks future downloads.',
    ],
    [
      'Unlimited resumes and unlimited watermark-free PDF downloads',
      'First resume and first PDF without sign-up; unlimited saved resumes and future watermark-free downloads with a free account',
    ],
    [
      'Yes. Every template, the ATS match score, upload & edit, and unlimited PDF downloads are free. There is no paid plan, no trial, no credit card and no watermark — the product has no billing at all.',
      'Yes. Building, templates, ATS tools and PDF downloads are free. Your first resume and first PDF need no account; a free account is required only to save your work and continue downloading after that. There is no paid plan, trial, credit card or watermark.',
    ],
    [
      'Unlimited. Duplicate a resume and tailor one version per job application — something most builders restrict to a single resume even on paid plans.',
      'Unlimited with a free account. You can also build your first resume as a guest before signing up, then save it to your account and create job-specific versions later.',
    ],
    [
      'No. The PDF you download is the final file: no watermark, no “made with” link, no hidden paywall pages. It is even saved under your resume’s own name.',
      'No. The PDF you download is the final file: no watermark, no “made with” link and no hidden payment page. Your first guest PDF is available without an account, and future downloads only require a free account.',
    ],
    [
      'In your browser by default, and optionally in your own cloud database when you sign in. Parsing, OCR and ATS scoring all run on your device — we never sell or share your data.',
      'As a guest, your draft is temporary in the current browser session and is not saved to your ResumeMakery account or cloud. After you sign in, resumes can be saved and synced. Parsing, OCR and ATS scoring still run on your device — we never sell or share your data.',
    ],
    [
      'Yes. Sign in or create a free account to build or import your resume. Resume building and downloads are completely free.',
      'No. You can build your first resume and download the first PDF without signing up. Guest work is temporary; create a free account to save the resume, return to it later and make future downloads.',
    ],
    [
      'Unlimited resumes, unlimited watermark-free PDF\n        downloads, no credit card, no paid plan.',
      'Your first resume and first watermark-free PDF need no sign-up. Create a free account to save your work, return later and keep downloading — no credit card or paid plan.',
    ],
    [
      '<li><b>Unlimited resumes</b> — duplicate and tailor one version per job application.</li>',
      '<li><b>First resume without sign-up</b> — create and download once as a guest; a free account saves your work and unlocks unlimited job-specific versions.</li>',
    ],
    [
      '<p>Unlimited. Duplicate a resume and tailor one version per job application.</p>',
      '<p>Unlimited with a free account. You can build the first resume as a guest, then save it and create job-specific versions after signing in.</p>',
    ],
    [
      '<p>No. The PDF you download is the final file: no watermark, no made-with link, no hidden paywall pages.</p>',
      '<p>No. The PDF has no watermark or branding. Your first guest PDF needs no account; future downloads only require a free account.</p>',
    ],
    [
      '<p>Yes. Sign in or create a free account to build or import your resume. Resume building and downloads are completely free.</p>',
      '<p>No. Build your first resume and download the first PDF without signing up. Guest drafts are temporary; create a free account to save your work and continue downloading.</p>',
    ],
  ];

  for (const [from, to] of replacements) html = html.split(from).join(to);
  return html;
}

function cleanRouteHtml(html) {
  // Deep pages inherit the homepage source before prerendering. Remove only the
  // pretty-printed homepage FAQPage script; the route-specific FAQ lives inside
  // the minified @graph added by prerender-seo.mjs.
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, (script) => {
    if (script.includes('"@type": "FAQPage"')) return '';
    return script;
  });

  // Complete the @id references emitted by prerender-seo.mjs with explicit
  // ResumeMakery Organization and WebSite entities.
  const marker = '{"@context":"https://schema.org","@graph":[';
  if (html.includes(marker)) {
    const prefix = `${marker}${entityPrefix.map((item) => JSON.stringify(item)).join(',')},`;
    html = html.replace(marker, prefix);
  }
  return html;
}

const homeFile = path.join(dist, 'index.html');
if (fs.existsSync(homeFile)) {
  fs.writeFileSync(homeFile, syncGuestFirstCopy(fs.readFileSync(homeFile, 'utf8')));
}

for (const route of routes) {
  const file = path.join(dist, route, 'index.html');
  if (!fs.existsSync(file)) continue;
  fs.writeFileSync(file, cleanRouteHtml(fs.readFileSync(file, 'utf8')));
}

console.log('✓ SEO schema cleanup + guest-first homepage copy sync');
