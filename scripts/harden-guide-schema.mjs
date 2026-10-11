#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://www.resumemakery.com';
const PUBLISHED = '2026-10-11';
const detailedGuides = [
  'dist/guides/resume-format-india/index.html',
  'dist/guides/resume-summary-examples/index.html',
  'dist/guides/resume-skills-guide/index.html',
  'dist/guides/fresher-resume-guide/index.html',
];
const faviconTargets = [
  'dist/guides/index.html',
  ...detailedGuides,
  'dist/privacy/index.html',
  'dist/cookies/index.html',
];

const logo = { '@type': 'ImageObject', url: `${ORIGIN}/icon.svg` };

function addFavicon(html) {
  if (html.includes('rel="icon"')) return html;
  return html.replace('</head>', `<link rel="icon" type="image/svg+xml" href="/icon.svg"></head>`);
}

for (const file of detailedGuides) {
  if (!fs.existsSync(file)) throw new Error(`Missing guide output: ${file}`);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, raw) => {
    try {
      const data = JSON.parse(raw);
      if (data?.['@type'] !== 'Article') return full;
      data.image = `${ORIGIN}/og-image.jpg`;
      data.datePublished = PUBLISHED;
      data.dateModified = PUBLISHED;
      if (data.author && typeof data.author === 'object') data.author.logo = logo;
      if (data.publisher && typeof data.publisher === 'object') data.publisher.logo = logo;
      return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
    } catch {
      return full;
    }
  });
  fs.writeFileSync(file, addFavicon(html));
}

for (const file of faviconTargets) {
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, addFavicon(html));
}

console.log('✓ Guide Article schema hardened: image, dates, publisher/author logos + favicons');
