#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const PUBLISHER_ID = 'ca-pub-3415243304589225';
const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
const ADSENSE_TAG = `<script async src="${ADSENSE_SRC}" crossorigin="anonymous"></script>`;
const ADSENSE_META = `<meta name="google-adsense-account" content="${PUBLISHER_ID}" />`;

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}

function injectHead(html) {
  let out = html;
  if (!out.includes(`name="google-adsense-account"`)) {
    out = out.replace('</head>', `  ${ADSENSE_META}\n</head>`);
  }
  if (!out.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')) {
    out = out.replace('</head>', `  ${ADSENSE_TAG}\n</head>`);
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

// Main SPA/homepage: required for AdSense ownership/site-code verification.
// No ad units are inserted into editor/auth/dashboard UI here; this only loads
// the publisher library. Actual ad placement remains governed separately.
patch(path.join(DIST, 'index.html'), (html) => injectHead(allowAdsenseInCsp(html)));

// Publisher-content pages are the only pages currently eligible for ad units.
const guideFiles = [
  'guides/index.html',
  'guides/resume-format-india/index.html',
  'guides/resume-summary-examples/index.html',
  'guides/resume-skills-guide/index.html',
  'guides/fresher-resume-guide/index.html',
];
for (const rel of guideFiles) {
  patch(path.join(DIST, rel), injectHead);
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
    '<b>Google AdSense ad units are not currently served on ResumeMakery.</b> The AdSense publisher verification/library code is installed, which can make a request to Google even before ad units are enabled.',
  )
);

const adsTxt = path.join(DIST, 'ads.txt');
if (!fs.existsSync(adsTxt)) throw new Error('dist/ads.txt missing');
const adsLine = `google.com, pub-3415243304589225, DIRECT, f08c47fec0942fa0`;
if (!read(adsTxt).includes(adsLine)) throw new Error('dist/ads.txt does not contain the expected Google publisher line');

console.log(`✓ AdSense publisher installed: ${PUBLISHER_ID}; homepage + editorial guides + ads.txt ready`);
