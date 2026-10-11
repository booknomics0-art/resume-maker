#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const PUBLISHER_ID = 'ca-pub-3415243304589225';
const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
const ADSENSE_TAG = `<script async src="${ADSENSE_SRC}" crossorigin="anonymous"></script>`;
const ADSENSE_META = `<meta name="google-adsense-account" content="${PUBLISHER_ID}" />`;
const HOMEPAGE_LOADER = `<script>(function(){var p=(location.pathname||'/').replace(/\\/$/,'')||'/';if(p!=='/')return;var s=document.createElement('script');s.async=true;s.src='${ADSENSE_SRC}';s.crossOrigin='anonymous';document.head.appendChild(s);}());</script>`;

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}

function injectMeta(html) {
  if (html.includes('name="google-adsense-account"')) return html;
  return html.replace('</head>', `  ${ADSENSE_META}\n</head>`);
}

function injectDirectPublisherScript(html) {
  let out = injectMeta(html);
  if (!out.includes(ADSENSE_TAG)) {
    out = out.replace('</head>', `  ${ADSENSE_TAG}\n</head>`);
  }
  return out;
}

function injectHomepageVerifier(html) {
  let out = injectMeta(html);
  if (!out.includes('document.createElement(\'script\')') || !out.includes(ADSENSE_SRC)) {
    out = out.replace('</head>', `  ${HOMEPAGE_LOADER}\n</head>`);
  }
  return out;
}

function allowAdsenseInCsp(html) {
  if (!html.includes('Content-Security-Policy')) return html;
  let out = html;
  out = out.replace(
    "https://analytics.ahrefs.com; worker-src",
    "https://analytics.ahrefs.com https://pagead2.googlesyndication.com https://tpc.googlesyndication.com; worker-src",
  );
  out = out.replace(
    "https://analytics.ahrefs.com; frame-src 'self';",
    "https://analytics.ahrefs.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.doubleclick.net; frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.doubleclick.net;",
  );
  return out;
}

function patch(file, transform) {
  if (!fs.existsSync(file)) throw new Error(`Missing expected build output: ${file}`);
  const before = read(file);
  const after = transform(before);
  if (after === before) return false;
  write(file, after);
  return true;
}

// The SPA fallback serves editor/auth/dashboard routes too, so do NOT load the
// AdSense library globally from index.html. The homepage still gets the supplied
// publisher library at runtime for site verification, while /editor, /login,
// /signup, /import and dashboard routes never load it.
patch(path.join(DIST, 'index.html'), (html) => injectHomepageVerifier(allowAdsenseInCsp(html)));

// Publisher-content pages are the only pages currently eligible for ad units.
// They receive the exact publisher tag supplied by the AdSense account.
const guideFiles = [
  'guides/index.html',
  'guides/resume-format-india/index.html',
  'guides/resume-summary-examples/index.html',
  'guides/resume-skills-guide/index.html',
  'guides/fresher-resume-guide/index.html',
];
for (const rel of guideFiles) {
  patch(path.join(DIST, rel), injectDirectPublisherScript);
}

// Keep production legal disclosures aligned with the fact that the publisher
// verification/library code is now present even though ad units are not yet live.
patch(path.join(DIST, 'privacy/index.html'), (html) => html
  .replace(
    '<b>Google AdSense advertising is not currently active on ResumeMakery.</b>',
    '<b>Google AdSense ad units are not currently active on ResumeMakery.</b> The Google AdSense publisher verification/library code is installed so Google can verify the site and prepare the account for review.',
  )
);
patch(path.join(DIST, 'cookies/index.html'), (html) => html
  .replace(
    '<b>Google AdSense ads are not currently served on ResumeMakery.</b>',
    '<b>Google AdSense ad units are not currently served on ResumeMakery.</b> The AdSense publisher verification/library code is installed, which can make a request to Google on the homepage and publisher-content pages even before ad units are enabled.',
  )
);

const adsTxt = path.join(DIST, 'ads.txt');
if (!fs.existsSync(adsTxt)) throw new Error('dist/ads.txt missing');
const adsLine = `google.com, pub-3415243304589225, DIRECT, f08c47fec0942fa0`;
if (!read(adsTxt).includes(adsLine)) throw new Error('dist/ads.txt does not contain the expected Google publisher line');

console.log(`✓ AdSense publisher installed: ${PUBLISHER_ID}; homepage verification + editorial guides + ads.txt ready`);
