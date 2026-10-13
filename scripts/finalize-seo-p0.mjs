#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const ORIGIN = 'https://www.resumemakery.com';

const metadata = {
  '/ats-resume-checker': {
    title: 'Free ATS Resume Checker & Job Match | ResumeMakery',
    description: 'Check job-description match and resume readiness separately, then get prioritized Issue → Why → Fix guidance while you edit.',
  },
  '/ats-keyword-checker': {
    title: 'Free ATS Keyword Checker for Resumes | ResumeMakery',
    description: 'Extract relevant job-description terms, see covered and missing resume keywords, and identify matched skills that still need evidence.',
  },
  '/resume-for-freshers': {
    title: 'Free Resume Maker for Freshers India | ResumeMakery',
    description: 'Create a focused fresher resume with education, projects, internships and skills, then compare it with real job descriptions before applying.',
  },
  '/guides/resume-format-india': {
    title: 'Resume Format for India: Guide & Examples | ResumeMakery',
    description: 'Use a clear India-ready resume structure with practical section order, formatting guidance and examples for freshers and experienced applicants.',
  },
  '/guides/resume-summary-examples': {
    title: 'Resume Summary Examples for Jobs | ResumeMakery',
    description: 'See practical resume summary examples for freshers, experienced professionals and career switchers, with guidance for adapting them truthfully.',
  },
  '/guides/resume-skills-guide': {
    title: 'Best Resume Skills: Examples & Guide | ResumeMakery',
    description: 'Choose relevant resume skills, group them clearly and support important skills with truthful evidence from projects, internships or work experience.',
  },
  '/guides/fresher-resume-guide': {
    title: 'Fresher Resume Guide India: Examples | ResumeMakery',
    description: 'Build a strong fresher resume for India using education, projects, internships, skills and measurable achievements, with practical examples.',
  },
  '/about': {
    title: 'About ResumeMakery | Free ATS Resume Builder',
    description: 'Learn why ResumeMakery exists, how the free ATS resume builder works, and the principles behind its templates, import, matching and PDF tools.',
  },
  '/privacy': {
    title: 'ResumeMakery Privacy Policy | Data & Resume Privacy',
    description: 'How ResumeMakery handles account data, resume content, imports, analytics, storage, retention and user privacy controls.',
  },
  '/terms': {
    title: 'Terms of Service | ResumeMakery',
    description: 'Terms for using ResumeMakery, including account use, resume tools, imports, ATS guidance, PDF exports and responsible use of the service.',
  },
  '/contact': {
    title: 'Contact ResumeMakery | Product & Privacy Support',
    description: 'Contact ResumeMakery for resume-builder support, technical issues, privacy questions, account concerns or feedback about the product.',
  },
  '/cookies': {
    title: 'ResumeMakery Cookie Policy | Analytics & Storage',
    description: 'How ResumeMakery uses essential browser storage, authentication data and aggregate analytics, including the controls available to users.',
  },
  '/disclaimer': {
    title: 'ATS & Resume Disclaimer | ResumeMakery',
    description: 'Important limits of ResumeMakery ATS scores, resume guidance, imports and exports, including why no tool can guarantee interviews or hiring outcomes.',
  },
  '/eula': {
    title: 'ResumeMakery End-User Licence Agreement',
    description: 'End-user licence terms covering permitted access to ResumeMakery software, resume-building features, ATS tools, imports and PDF exports.',
  },
};

const growthRoutes = [
  '/',
  '/resume-builder',
  '/ats-resume-checker',
  '/job-description-resume-match',
  '/ats-keyword-checker',
  '/resume-score-checker',
  '/resume-editor',
  '/resume-templates',
  '/resume-for-freshers',
  '/guides',
  '/guides/resume-format-india',
  '/guides/resume-summary-examples',
  '/guides/resume-skills-guide',
  '/guides/fresher-resume-guide',
];

function fileFor(route) {
  return route === '/' ? path.join(dist, 'index.html') : path.join(dist, route.slice(1), 'index.html');
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(title)}</title>`);
}

function setMetaName(html, name, value) {
  const re = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["'][^"']*["']\\s*\\/?>`, 'i');
  const tag = `<meta name="${name}" content="${escapeAttr(value)}" />`;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n</head>`);
}

function setMetaProperty(html, property, value) {
  const re = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["'][^"']*["']\\s*\\/?>`, 'i');
  const tag = `<meta property="${property}" content="${escapeAttr(value)}" />`;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n</head>`);
}

function removeNoscriptH1(html) {
  return html.replace(
    /<h1>ResumeMakery requires JavaScript<\/h1>/g,
    '<p style="font-size:1.5rem;font-weight:700">ResumeMakery requires JavaScript</p>',
  );
}

function alignStructuredMetadata(html, route, values) {
  const url = `${ORIGIN}${route === '/' ? '/' : route}`;
  return html.replace(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi, (full, raw) => {
    try {
      const data = JSON.parse(raw.trim());
      const nodes = Array.isArray(data?.['@graph']) ? data['@graph'] : [data];
      let changed = false;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
        const id = String(node['@id'] || '');
        const nodeUrl = String(node.url || '');
        const mainEntityId = String(node.mainEntityOfPage?.['@id'] || '');
        const belongsToRoute = nodeUrl === url || id.startsWith(`${url}#`) || mainEntityId === url;
        if (!belongsToRoute) continue;
        if (types.includes('WebPage')) {
          node.name = values.title;
          node.description = values.description;
          changed = true;
        }
        if (types.includes('Article')) {
          node.headline = values.title;
          node.description = values.description;
          changed = true;
        }
      }
      return changed ? `<script type="application/ld+json">${JSON.stringify(data)}</script>` : full;
    } catch {
      return full;
    }
  });
}

function addWebPageSchema(html, route, type = 'WebPage') {
  if (/application\/ld\+json/i.test(html)) return html;
  const url = `${ORIGIN}${route === '/' ? '/' : route}`;
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const title = titleMatch?.[1]?.replace(/&amp;/g, '&') || 'ResumeMakery';
  const description = descMatch?.[1]?.replace(/&amp;/g, '&') || '';
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': type,
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: 'en-IN',
        isPartOf: { '@id': `${ORIGIN}/#website` },
        about: { '@id': `${ORIGIN}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ResumeMakery', item: `${ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: title.replace(/\s*\|\s*ResumeMakery.*$/i, ''), item: url },
        ],
      },
    ],
  };
  return html.replace('</head>', `  <script type="application/ld+json">${JSON.stringify(schema)}</script>\n</head>`);
}

const htmlFiles = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name === 'index.html') htmlFiles.push(file);
  }
}
walk(dist);

let duplicateHeadingFixes = 0;
for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  const updated = removeNoscriptH1(html);
  if (updated !== html) duplicateHeadingFixes += 1;
  fs.writeFileSync(file, updated);
}

for (const [route, values] of Object.entries(metadata)) {
  const file = fileFor(route);
  if (!fs.existsSync(file)) throw new Error(`[finalize-seo-p0] Missing expected route: ${route}`);
  let html = fs.readFileSync(file, 'utf8');
  html = setTitle(html, values.title);
  html = setMetaName(html, 'description', values.description);
  html = setMetaName(html, 'twitter:title', values.title);
  html = setMetaName(html, 'twitter:description', values.description);
  html = setMetaProperty(html, 'og:title', values.title);
  html = setMetaProperty(html, 'og:description', values.description);
  html = alignStructuredMetadata(html, route, values);
  fs.writeFileSync(file, html);
}

for (const [route, type] of [['/guides', 'CollectionPage'], ['/privacy', 'WebPage'], ['/cookies', 'WebPage']]) {
  const file = fileFor(route);
  if (!fs.existsSync(file)) throw new Error(`[finalize-seo-p0] Missing schema route: ${route}`);
  const html = addWebPageSchema(fs.readFileSync(file, 'utf8'), route, type);
  fs.writeFileSync(file, html);
}

const failures = [];
for (const route of growthRoutes) {
  const file = fileFor(route);
  if (!fs.existsSync(file)) {
    failures.push(`${route}: missing HTML`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length;
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/&amp;/g, '&') || '';
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1] || '';
  const expectedCanonical = `${ORIGIN}${route === '/' ? '/' : route}`;
  if (h1Count !== 1) failures.push(`${route}: expected 1 H1, found ${h1Count}`);
  if (!title || title.length > 60) failures.push(`${route}: title length ${title.length}`);
  if (/noindex/i.test(html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i)?.[1] || '')) failures.push(`${route}: noindex present`);
  if (canonical !== expectedCanonical) failures.push(`${route}: canonical ${canonical || 'missing'}`);
  if (metadata[route] && !html.includes(`\"name\":\"${metadata[route].title.replace(/"/g, '\\"')}\"`) && !html.includes(`\"headline\":\"${metadata[route].title.replace(/"/g, '\\"')}\"`)) {
    failures.push(`${route}: final title missing from structured data`);
  }
}

if (failures.length) {
  console.error('[finalize-seo-p0] SEO guard failed:\n' + failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(`[finalize-seo-p0] ✅ ${growthRoutes.length} growth pages guarded · ${Object.keys(metadata).length} metadata sets · ${duplicateHeadingFixes} duplicate-noscript H1 fixes · structured metadata aligned`);
