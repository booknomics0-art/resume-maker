#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const ORIGIN = 'https://www.resumemakery.com';
const routes = [
  'resume-builder', 'ats-resume-checker', 'resume-editor', 'resume-templates', 'resume-for-freshers',
  'about', 'faq', 'privacy', 'terms', 'contact', 'cookies', 'disclaimer', 'eula',
];

const entityPrefix = [
  { '@type': 'Organization', '@id': `${ORIGIN}/#organization`, name: 'ResumeMakery', url: `${ORIGIN}/`, logo: { '@type': 'ImageObject', url: `${ORIGIN}/icon.svg` } },
  { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: `${ORIGIN}/`, name: 'ResumeMakery', publisher: { '@id': `${ORIGIN}/#organization` }, inLanguage: 'en-IN' },
];

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

for (const route of routes) {
  const file = path.join(dist, route, 'index.html');
  if (!fs.existsSync(file)) continue;
  fs.writeFileSync(file, cleanRouteHtml(fs.readFileSync(file, 'utf8')));
}

console.log('✓ SEO schema cleanup: route FAQ context + Organization/WebSite entities');
