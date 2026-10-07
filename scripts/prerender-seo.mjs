#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const rootFile = path.join(dist, 'index.html');
const ORIGIN = 'https://www.resumemakery.com';

const pages = {
  '/resume-builder': {
    title: 'Free Resume Builder & ATS Resume Maker | ResumeMakery',
    description: 'Create an ATS-friendly resume free with 50 templates, live preview, existing-resume import and clean PDF downloads.',
    kicker: 'FREE RESUME BUILDER',
    h1: 'Build an ATS-friendly resume without paywalls',
    intro: 'Create a professional resume from scratch or import your existing one. Use 50 templates, a live A4 preview, ATS job matching and clean PDF export without a watermark.',
    points: ['50 professional templates, all unlocked', 'Import PDF, DOCX, TXT or a resume photo', 'Unlimited clean PDF downloads'],
  },
  '/ats-resume-checker': {
    title: 'Free ATS Resume Checker & Job Match | ResumeMakery',
    description: 'Compare your resume against a real job description, find missing terms and improve the same resume in ResumeMakery.',
    kicker: 'ATS RESUME CHECKER',
    h1: 'Compare your resume with the job you actually want',
    intro: 'Paste a real job description and see which important terms your resume already covers and which relevant terms may be missing.',
    points: ['Job-description keyword comparison', 'Missing-term visibility without fake guarantees', 'Edit and re-check in the same resume workflow'],
  },
  '/resume-editor': {
    title: 'Edit Existing Resume Online — PDF & DOCX | ResumeMakery',
    description: 'Upload a PDF, DOCX, TXT or resume photo, extract the content, edit it and export a clean professional PDF.',
    kicker: 'ONLINE RESUME EDITOR',
    h1: 'Upload your existing resume and keep editing instead of starting over',
    intro: 'Bring your existing PDF, DOCX, TXT file or a photo of a printed resume. ResumeMakery extracts usable content into editable resume fields.',
    points: ['PDF and DOCX resume import', 'On-device OCR for scanned text and photos', 'Switch templates without retyping your content'],
  },
  '/resume-templates': {
    title: '50 Free Professional Resume Templates | ResumeMakery',
    description: 'Browse 50 unlocked resume templates including ATS-friendly, professional and fresher layouts. No watermark or template paywall.',
    kicker: 'PROFESSIONAL RESUME TEMPLATES',
    h1: '50 resume templates, unlocked from the start',
    intro: 'Choose from ATS-friendly classics and professional layouts across multiple career fields. Your content stays intact when you switch designs.',
    points: ['ATS-friendly and professional layouts', 'Dedicated fresher options', 'A4 and multi-page resume support'],
  },
  '/resume-for-freshers': {
    title: 'Free Resume Maker for Freshers & Students | ResumeMakery',
    description: 'Create a focused fresher resume with templates for projects, education, internships and skills, plus free ATS job matching.',
    kicker: 'RESUME FOR FRESHERS',
    h1: 'Make a strong first-job resume even without years of experience',
    intro: 'Present education, projects, internships, certifications, skills and achievements clearly with fresher-focused resume layouts and ATS job matching.',
    points: ['Fresher-focused templates', 'Projects and education-first structure', 'Tailor different resume versions for real job descriptions'],
  },
  '/about': { title: 'About ResumeMakery', description: 'Learn why ResumeMakery exists and how the free resume builder is designed for job seekers.', kicker: 'ABOUT RESUMEMAKERY', h1: 'A resume builder designed to stay genuinely useful', intro: 'ResumeMakery combines resume creation, existing-resume import, ATS matching, templates and clean PDF export in one free workflow.', points: ['No template paywall', 'No watermark on downloaded resumes', 'Privacy-focused resume editing'] },
  '/faq': { title: 'ResumeMakery FAQ — Resume Builder, ATS & Downloads', description: 'Answers about ResumeMakery templates, resume imports, ATS matching, privacy and clean PDF downloads.', kicker: 'FREQUENTLY ASKED QUESTIONS', h1: 'ResumeMakery questions and answers', intro: 'Find clear answers about resume creation, imports, ATS matching, templates, privacy and PDF downloads.', points: ['Resume creation and downloads are free', 'Existing resumes can be imported and edited', 'ATS matching is guidance, not an interview guarantee'] },
  '/privacy': { title: 'Privacy Policy | ResumeMakery', description: 'How ResumeMakery handles account data, resume content, imports, analytics and user privacy.', kicker: 'PRIVACY', h1: 'ResumeMakery Privacy Policy', intro: 'Learn what data ResumeMakery uses to operate the service, how resume imports are processed, and what controls users have over their information.', points: ['Resume files are processed for the features you choose', 'No resume content is sent to Google Analytics', 'Account and resume deletion controls are described in the full policy'] },
  '/terms': { title: 'Terms of Service | ResumeMakery', description: 'Terms for using the ResumeMakery free resume builder.', kicker: 'TERMS', h1: 'ResumeMakery Terms of Service', intro: 'The terms governing use of ResumeMakery and its resume-building, import, ATS and export features.', points: ['Use the service lawfully', 'Review generated or imported resume content before applying', 'Product guidance is not a hiring guarantee'] },
  '/contact': { title: 'Contact ResumeMakery', description: 'Contact ResumeMakery about the resume builder, privacy or product support.', kicker: 'CONTACT', h1: 'Contact ResumeMakery', intro: 'Get in touch about product support, privacy questions or issues using the resume builder.', points: ['Product support', 'Privacy questions', 'Technical issue reporting'] },
  '/cookies': { title: 'Cookie Policy | ResumeMakery', description: 'Cookie and analytics information for ResumeMakery.', kicker: 'COOKIES', h1: 'ResumeMakery Cookie Policy', intro: 'Information about cookies, authentication storage and aggregate analytics used to operate and understand ResumeMakery.', points: ['Authentication and service storage', 'Aggregate GA4 traffic measurement', 'No resume content in analytics events'] },
  '/disclaimer': { title: 'Disclaimer | ResumeMakery', description: 'Important limitations and disclaimers for ResumeMakery and ATS guidance.', kicker: 'DISCLAIMER', h1: 'ResumeMakery Disclaimer', intro: 'ResumeMakery helps users prepare and evaluate resumes, but no tool can guarantee ATS passage, interviews or hiring outcomes.', points: ['ATS scores are diagnostic guidance', 'Always verify imported content', 'Hiring decisions remain with employers'] },
  '/eula': { title: 'EULA | ResumeMakery', description: 'End-user licence terms for ResumeMakery.', kicker: 'END-USER LICENCE', h1: 'ResumeMakery End-User Licence Agreement', intro: 'Licence terms for accessing and using ResumeMakery software and related resume-building features.', points: ['Personal use of the service', 'Respect applicable laws and rights', 'Service availability may evolve over time'] },
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function replaceMetaName(html, name, value) {
  const re = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["'][^"']*["']\\s*\\/?>`, 'i');
  return html.replace(re, `<meta name="${name}" content="${escapeHtml(value)}" />`);
}

function replaceMetaProperty(html, property, value) {
  const re = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["'][^"']*["']\\s*\\/?>`, 'i');
  return html.replace(re, `<meta property="${property}" content="${escapeHtml(value)}" />`);
}

function staticBlock(page) {
  return `<div id="seo-content" style="font-family:'Segoe UI',system-ui,sans-serif;color:#1c2434;max-width:880px;margin:0 auto;padding:32px 20px;">
    <p style="font-weight:700;color:#0f2148;letter-spacing:.4px;">${escapeHtml(page.kicker)}</p>
    <h1>${escapeHtml(page.h1)}</h1>
    <p>${escapeHtml(page.intro)}</p>
    <h2>What you can do with ResumeMakery</h2>
    <ul>${page.points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>
    <p><a href="/resume-builder">Build a resume</a> · <a href="/ats-resume-checker">Check ATS match</a> · <a href="/resume-templates">Browse templates</a></p>
  </div>`;
}

if (!fs.existsSync(rootFile)) throw new Error('dist/index.html not found; run after Vite build');
let rootHtml = fs.readFileSync(rootFile, 'utf8');
rootHtml = rootHtml
  .replaceAll('www.resumemakery.com/#/privacy', 'www.resumemakery.com/privacy')
  .replace(
    'No third-party analytics cookies, no advertising trackers, no fingerprinting.',
    'Google Analytics 4 is used for aggregate traffic measurement. No resume content is sent to Google Analytics; no advertising trackers or fingerprinting.',
  );
fs.writeFileSync(rootFile, rootHtml);

for (const [route, page] of Object.entries(pages)) {
  const url = `${ORIGIN}${route}`;
  let html = rootHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = replaceMetaName(html, 'description', page.description);
  html = replaceMetaName(html, 'robots', 'index, follow');
  html = replaceMetaProperty(html, 'og:title', page.title);
  html = replaceMetaProperty(html, 'og:description', page.description);
  html = replaceMetaProperty(html, 'og:url', url);
  html = replaceMetaName(html, 'twitter:title', page.title);
  html = replaceMetaName(html, 'twitter:description', page.description);
  html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i, `<link rel="canonical" href="${url}" />`);
  html = html.replace(/<div id="seo-content"[\s\S]*?<div id="root"><\/div>/i, `${staticBlock(page)}\n    <div id="root"></div>`);

  const folder = path.join(dist, route.slice(1));
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'index.html'), html);
}

console.log(`✓ SEO prerender: ${Object.keys(pages).length} clean public routes + homepage metadata`);
