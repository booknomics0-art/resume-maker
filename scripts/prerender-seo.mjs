#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const rootFile = path.join(dist, 'index.html');
const ORIGIN = 'https://www.resumemakery.com';
const WEBSITE_ID = `${ORIGIN}/#website`;
const ORG_ID = `${ORIGIN}/#organization`;

const pages = {
  '/resume-builder': {
    title: 'Free ATS Resume Builder for India | ResumeMakery',
    description: 'Create an ATS-friendly resume free with 50 templates, live preview, existing-resume import and clean PDF downloads with no watermark.',
    kicker: 'FREE ATS RESUME BUILDER FOR INDIA',
    h1: 'Build an ATS-friendly resume without paywalls',
    intro: 'Create a professional resume from scratch or import your existing one. Use 50 templates, a live A4 preview, ATS job matching and clean PDF export without a watermark.',
    answer: 'ResumeMakery is a free online resume builder for students, freshers and professionals. You can create or import a resume, edit structured sections, compare it with a real job description, switch among 50 templates and download a clean PDF without a watermark.',
    sections: [
      ['Start fast', 'Seven guided sections keep the form focused while the live preview updates beside you. Add contact details, education, experience, projects, skills and supporting sections without formatting the document manually.'],
      ['Stay ATS-readable', 'Use clean resume structure and compare the finished resume with the exact job description you plan to apply for. ResumeMakery highlights important terms that are present or missing without claiming to guarantee an interview.'],
      ['Download cleanly', 'Export a professional PDF without ResumeMakery branding or a watermark on the resume. Reuse the same content across templates and tailor multiple resume versions for different roles.'],
    ],
    steps: ['Start with a blank resume or import an existing PDF, DOCX, TXT file or resume photo.', 'Review each section, improve measurable bullets, keep claims truthful and choose a template appropriate for the role.', 'Compare the resume with the target job description, fix relevant gaps and download the final PDF.'],
    faqs: [
      ['Is ResumeMakery really free?', 'Yes. Resume creation, all 50 templates, ATS job-description matching and PDF downloads are free in the current product. There is no paid plan or watermark.'],
      ['Can I import my old resume?', 'Yes. PDF, DOCX, TXT and image or photo import are supported, including OCR for scanned text. Always review imported names, dates and section boundaries before applying.'],
      ['Is ResumeMakery useful for Indian freshers?', 'Yes. Freshers can emphasize education, projects, internships, certifications and skills, and compare each resume version against a real job description before applying.'],
      ['Does it work on mobile?', 'Yes. The editor and download flow include mobile-specific handling, although a larger screen can be more convenient for detailed resume editing.'],
    ],
  },
  '/ats-resume-checker': {
    title: 'Free ATS Resume Checker 2.0 — Job Match + Resume Score | ResumeMakery',
    description: 'Check job-description match and resume readiness separately, then get prioritized Issue → Why → Fix guidance while you edit.',
    kicker: 'FREE ATS RESUME CHECKER 2.0',
    h1: 'Get a job match score, resume readiness score and priority fixes',
    intro: 'Paste the job description you want and review two separate signals: how well your resume matches the role and how ready the resume itself is.',
    answer: 'ResumeMakery ATS 2.0 separates job-description match from resume readiness. Job Match measures covered versus missing terms from the job description. Resume Readiness checks practical resume signals such as contact details, summary quality, evidence bullets, measurable results, action verbs and readability. Problems are turned into prioritized Issue → Why → Fix guidance. The results are deterministic guidance, not an employer-specific ATS simulation or an interview guarantee.',
    sections: [
      ['Separate match from quality', 'A resume can contain many job keywords and still be weakly written. ResumeMakery keeps job-description coverage separate from structural and content readiness instead of hiding both ideas inside one opaque number.'],
      ['Show evidence, not keyword stuffing', 'If a matched skill appears only in the Skills list, ATS 2.0 can flag the lack of supporting evidence in your summary, experience or projects. Add proof only when it is true.'],
      ['Fix the highest-impact issue first', 'Problems are ordered as Fix first, Improve or Polish. The report explains why each issue matters and gives a concrete next action before you re-check the resume.'],
    ],
    steps: ['Build or import the resume you actually plan to send.', 'Paste the full responsibilities and requirements from the target job description.', 'Work through the priority fixes, keep every claim truthful and re-check as the resume changes.'],
    faqs: [
      ['What does ResumeMakery ATS 2.0 check?', 'It checks job-description keyword coverage plus resume-readiness signals such as contact completeness, summary quality, evidence bullets, measurable results, action verbs and readability. It can also identify some matched skills that appear only in the Skills list without supporting evidence elsewhere.'],
      ['Does a high ATS score guarantee an interview?', 'No. Employers use different systems, rules and human judgment. ResumeMakery reports deterministic signals from the resume and job description you provide; it does not know an employer’s private ATS configuration.'],
      ['What should I do with a missing keyword?', 'Add it only when it accurately reflects your real background. When possible, show truthful evidence in a project, summary or experience bullet instead of copying a requirement into a keyword list.'],
      ['Is the readiness score fair for freshers?', 'Fresher mode does not require formal work history when none exists. It focuses on the applicable checks and encourages real projects or achievements as evidence.'],
    ],
  },
  '/job-description-resume-match': {
    title: 'Resume vs Job Description Match Checker | ResumeMakery',
    description: 'Compare your resume with a real job description, see covered and missing role terms, identify evidence gaps and re-check while editing.',
    kicker: 'RESUME VS JOB DESCRIPTION MATCH',
    h1: 'Compare your resume with a job description before you apply',
    intro: 'Use the exact job posting to see which role-specific terms are already represented in your resume, which are missing and which matched skills still need evidence.',
    answer: 'A resume-to-job-description match compares the language of your resume with the actual role you are targeting. ResumeMakery extracts relevant job terms, reports the terms already covered, highlights missing terms and separates simple keyword presence from stronger evidence in summaries, projects and experience. The goal is to tailor truthfully for one application — not to copy the job description.',
    sections: [
      ['Match the exact role', 'Two jobs with the same title can emphasize different tools, methods and responsibilities. Matching against the actual posting gives you a more relevant signal than a generic resume grade.'],
      ['Find what is genuinely missing', 'The report surfaces terms present in the posting but absent from your resume. Review them manually and add only the ones you can honestly support.'],
      ['Strengthen proof for matched skills', 'A term in a Skills list shows presence; a concise project or achievement shows evidence. ResumeMakery distinguishes these cases so you know where stronger support may help.'],
    ],
    steps: ['Open the resume version for the specific job.', 'Paste the full posting, including responsibilities and requirements.', 'Adjust truthful emphasis, improve evidence and re-check before applying.'],
    faqs: [
      ['What is a good resume-to-job-description match?', 'There is no universal percentage that guarantees success. Use the score as a directional coverage signal, then inspect the actual missing terms, evidence and resume quality before applying.'],
      ['Should I copy every keyword from the job description?', 'No. Copying unsupported skills or qualifications creates an inaccurate resume. Use employer wording only where it truthfully describes your background.'],
      ['Why can two jobs with the same title get different match scores?', 'Because each job description can prioritize different tools, responsibilities, qualifications and terminology. The comparison should reflect the specific posting.'],
      ['Can I re-check after editing?', 'Yes. In the ResumeMakery editor the match updates as the resume or pasted job description changes.'],
    ],
  },
  '/ats-keyword-checker': {
    title: 'Free ATS Keyword Checker — Find Missing Resume Keywords | ResumeMakery',
    description: 'Extract relevant job-description terms, see covered and missing resume keywords, and identify matched skills that still need evidence.',
    kicker: 'FREE ATS KEYWORD CHECKER',
    h1: 'Find covered and missing resume keywords from a real job description',
    intro: 'Paste a job description to identify relevant terms, see which ones are already on your resume and review missing terms without turning the resume into a keyword-stuffed list.',
    answer: 'An ATS keyword checker looks for important job-description terms and compares them with your resume. ResumeMakery reports covered and missing terms and can also highlight matched skills that appear only in the Skills list without supporting evidence elsewhere. Missing terms are suggestions to review, not instructions to add claims you cannot support.',
    sections: [
      ['Extract role-specific terms', 'The checker looks for relevant skills, tools and multi-word terms from the job description rather than treating every common word as an important keyword.'],
      ['Review missing terms safely', 'A missing term is useful only if it reflects something you actually know or have done. ResumeMakery explicitly tells users not to invent skills, metrics or experience.'],
      ['Move from keyword to evidence', 'When a skill is present only in the Skills section, add a real example in a project or work bullet if you genuinely used it. Evidence is more credible than repetition.'],
    ],
    steps: ['Paste the responsibilities and requirements from the target job.', 'Review covered and missing terms instead of chasing only a percentage.', 'Add truthful context in projects, achievements or experience and re-check.'],
    faqs: [
      ['What counts as an ATS keyword?', 'Common examples include tools, technologies, certifications, methods, role-specific skills and some multi-word competencies explicitly present in a job description.'],
      ['Should I repeat keywords many times?', 'No. Repetition without useful evidence can make a resume harder to read. Use accurate terminology naturally where it belongs.'],
      ['Why does ResumeMakery flag a skill that is already in my Skills section?', 'It may be flagging an evidence gap, not a missing keyword. The skill can be present while still lacking a project, summary or experience example that shows where you used it.'],
      ['Does the checker upload my job description?', 'The ATS matching workflow is designed to run on-device in the current product; the pasted job description is used for the local comparison and stored per resume in browser storage for convenience.'],
    ],
  },
  '/resume-score-checker': {
    title: 'Free Resume Score Checker — Resume Readiness | ResumeMakery',
    description: 'Check contact completeness, summary quality, evidence bullets, measurable results, action verbs and readability separately from job match.',
    kicker: 'FREE RESUME SCORE CHECKER',
    h1: 'Check resume readiness without confusing it with job match',
    intro: 'Review practical resume-quality signals recruiters can scan quickly: contact completeness, summary quality, evidence bullets, measurable results, action verbs and readability.',
    answer: 'ResumeMakery’s Resume Readiness score evaluates practical content and structure checks that apply to the resume itself. It is intentionally separate from the Job Match score. A resume can be well written but poorly targeted to one role, or highly keyword-matched but weakly evidenced. Seeing both signals makes the next edit clearer.',
    sections: [
      ['Check the basics recruiters need', 'A missing email, phone, city, useful summary or education entry can weaken an otherwise promising resume. Readiness checks surface these practical gaps.'],
      ['Turn duties into evidence', 'The checker looks for experience bullets, measurable outcomes and stronger action-led phrasing. The goal is clearer evidence, not exaggerated claims.'],
      ['Keep fresher scoring applicable', 'When fresher mode has no formal work history, ResumeMakery does not require the same work-experience bullet checks. Projects and achievements become more important evidence.'],
    ],
    steps: ['Open or import the resume you actually plan to use.', 'Fix failed readiness checks, starting with contact information, summary and evidence.', 'Add the target job description separately to measure Job Match for that role.'],
    faqs: [
      ['Is a resume score the same as an ATS match score?', 'No. Resume readiness measures quality and completeness signals of the resume itself. Job Match compares the resume with a specific job description. ResumeMakery shows them separately.'],
      ['Can a resume score 100 and still be wrong for a job?', 'Yes. A structurally strong resume can still be poorly targeted to a specific role. That is why a separate job-description match is useful.'],
      ['Does the score judge design taste?', 'The readiness score focuses on deterministic content and structure checks rather than pretending to know a recruiter’s personal design preference.'],
      ['Do freshers need work experience to get a useful score?', 'No. Fresher mode avoids requiring formal experience when it does not exist and instead rewards applicable evidence such as education, projects and achievements.'],
    ],
  },
  '/resume-editor': {
    title: 'Edit Existing Resume Online — PDF & DOCX | ResumeMakery',
    description: 'Upload a PDF, DOCX, TXT or resume photo, extract the content into editable fields, improve it and export a clean professional PDF.',
    kicker: 'EDIT AN EXISTING RESUME ONLINE',
    h1: 'Upload your existing resume and keep editing instead of starting over',
    intro: 'Bring a PDF, DOCX, TXT file or a photo of a printed resume. ResumeMakery extracts usable content into editable fields so you can redesign, correct and export it.',
    answer: 'ResumeMakery can use an existing PDF, DOCX, TXT file or resume photo as the starting point. Imported content is placed into editable resume fields so you can correct text, reorganize sections, switch templates and export a fresh PDF instead of rebuilding everything manually.',
    sections: [
      ['Preserve your work', 'Use your current resume as the starting point instead of manually re-entering every date, company, project and qualification.'],
      ['Edit structurally', 'Imported content becomes editable resume fields rather than a flat screenshot, making it possible to update wording, section order and presentation.'],
      ['Switch presentation', 'Try a different layout while keeping the underlying resume information. Your career content stays separate from the visual template.'],
    ],
    steps: ['Choose a supported PDF, DOCX, TXT file or image or photo. Scanned text can be read with OCR.', 'Check names, dates, headings, bullet boundaries and contact information because no parser is perfect.', 'Improve the structured fields, choose a suitable template and download the updated resume as a clean PDF.'],
    faqs: [
      ['Can ResumeMakery edit a scanned resume?', 'It includes on-device OCR for photo and scanned-text extraction. OCR quality depends on image clarity, so review the extracted content carefully.'],
      ['Will resume import always be perfect?', 'No parser is perfect. Review names, dates, section boundaries, bullets and special characters after importing any resume.'],
      ['Can I change templates after import?', 'Yes. The imported information is stored as resume content, so you can test other templates without retyping everything.'],
      ['Can I export again after editing?', 'Yes. The edited resume can be downloaded as a clean PDF after you review the final layout.'],
    ],
  },
  '/resume-templates': {
    title: '50 Free ATS-Friendly Resume Templates | ResumeMakery',
    description: 'Browse 50 unlocked professional and fresher resume templates. Switch layouts without retyping and download clean PDFs with no watermark.',
    kicker: 'FREE PROFESSIONAL RESUME TEMPLATES',
    h1: '50 resume templates, unlocked from the start',
    intro: 'Choose from ATS-friendly classics and professional layouts across multiple career fields. Switch designs without re-entering your resume.',
    answer: 'ResumeMakery includes 50 resume templates across multiple layout families and career use cases. All templates are unlocked in the current product, and switching designs does not require re-entering the resume content. For ATS-heavy applications, prefer clean layouts with clear headings and readable text.',
    sections: [
      ['Choose for the role', 'Use conservative, text-first layouts for ATS-heavy applications and more distinctive designs only when the employer or role makes visual presentation relevant.'],
      ['A4-first output', 'Templates are designed around a real resume page rather than a generic web card, with multi-page handling for longer professional histories.'],
      ['Change anytime', 'Your resume content remains separate from the visual template, so trying a new design does not require retyping your work history or education.'],
    ],
    steps: ['Consider the industry, seniority and whether the employer is likely to rely heavily on applicant tracking systems.', 'Make sure name, role, section headings, dates and bullet points are easy to scan at normal size.', 'Review every page break and section boundary in the live A4 preview before exporting.'],
    faqs: [
      ['Are all 50 templates free?', 'Yes. The current product does not lock templates behind a paid tier.'],
      ['Which resume template is best for ATS?', 'A clean template with standard headings, readable text and straightforward section order is usually the safer choice for ATS-heavy applications. ResumeMakery includes multiple layouts designed around that approach.'],
      ['Can a resume be more than one page?', 'Yes. The editor supports multi-page resumes and page-break handling. Length should be driven by useful content rather than an arbitrary page target.'],
      ['Do templates add a watermark?', 'No. The downloaded PDF is intended to be clean and application-ready without ResumeMakery branding on the resume itself.'],
    ],
  },
  '/resume-for-freshers': {
    title: 'Free Resume Maker for Freshers & Students India | ResumeMakery',
    description: 'Create a focused fresher resume with education, projects, internships and skills, then compare it with real job descriptions before applying.',
    kicker: 'RESUME MAKER FOR FRESHERS AND STUDENTS',
    h1: 'Make a strong first-job resume even without years of experience',
    intro: 'Present education, projects, internships, certifications, skills and achievements clearly with fresher-focused resume layouts and ATS job matching.',
    answer: 'A strong fresher resume should not imitate a senior professional resume with an empty experience section. Lead with evidence you actually have: education, relevant projects, internships, practical skills, certifications, competitions, volunteering and measurable achievements.',
    sections: [
      ['Lead with evidence', 'Projects, internships, certifications, competitions and measurable achievements can carry more weight than an empty work-experience section.'],
      ['Keep it focused', 'For many freshers, a clear one-page resume is easier for recruiters to scan. Do not shrink fonts or remove useful evidence simply to hit one page.'],
      ['Tailor each application', 'Duplicate your resume and adjust truthful skills, project emphasis and wording for each real job description rather than sending one generic version everywhere.'],
    ],
    steps: ['Put education, projects or internships near the top when they are more relevant than formal work history.', 'Explain what you built, analysed, improved or delivered and include measurable results where they are real.', 'Compare the finished resume with the job description and adjust emphasis only where your actual background supports it.'],
    faqs: [
      ['What should a fresher put in experience?', 'Use internships, projects, freelance or volunteer work and relevant responsibilities when they truthfully demonstrate skills. Do not invent employment.'],
      ['Should a fresher resume be one page?', 'Often yes when the content fits comfortably. Do not shrink text or remove important evidence only to force a one-page limit.'],
      ['What sections are most useful for an Indian fresher?', 'Education, relevant projects, internships, practical skills, certifications and achievements are often more useful than an empty experience section. The order should match the target role.'],
      ['Can I make different resumes for different jobs?', 'Yes. ResumeMakery supports multiple resumes so you can tailor truthful versions for different roles.'],
    ],
  },
  '/about': { title: 'About ResumeMakery', description: 'Learn why ResumeMakery exists and how the free resume builder is designed for job seekers.', kicker: 'ABOUT RESUMEMAKERY', h1: 'A resume builder designed to stay genuinely useful', intro: 'ResumeMakery combines resume creation, existing-resume import, ATS matching, templates and clean PDF export in one free workflow.', sections: [['Why it exists', 'ResumeMakery is designed to make practical resume creation and editing available without locking core templates or downloads behind a paywall.']], steps: [], faqs: [] },
  '/faq': { title: 'ResumeMakery FAQ — Resume Builder, ATS & Downloads', description: 'Answers about ResumeMakery templates, resume imports, ATS matching, privacy and clean PDF downloads.', kicker: 'FREQUENTLY ASKED QUESTIONS', h1: 'ResumeMakery questions and answers', intro: 'Find clear answers about resume creation, imports, ATS matching, templates, privacy and PDF downloads.', sections: [['What ResumeMakery covers', 'Resume creation, import and editing, ATS job-description matching, templates and PDF downloads are part of the current product.']], steps: [], faqs: [] },
  '/privacy': { title: 'Privacy Policy | ResumeMakery', description: 'How ResumeMakery handles account data, resume content, imports, analytics and user privacy.', kicker: 'PRIVACY', h1: 'ResumeMakery Privacy Policy', intro: 'Learn what data ResumeMakery uses to operate the service, how resume imports are processed, and what controls users have over their information.', sections: [['Privacy controls', 'The full policy explains account data, resume content, analytics, storage, retention, deletion and user rights.']], steps: [], faqs: [] },
  '/terms': { title: 'Terms of Service | ResumeMakery', description: 'Terms for using the ResumeMakery free resume builder.', kicker: 'TERMS', h1: 'ResumeMakery Terms of Service', intro: 'The terms governing use of ResumeMakery and its resume-building, import, ATS and export features.', sections: [['Use responsibly', 'Review generated or imported resume content before applying and use the service lawfully.']], steps: [], faqs: [] },
  '/contact': { title: 'Contact ResumeMakery', description: 'Contact ResumeMakery about the resume builder, privacy or product support.', kicker: 'CONTACT', h1: 'Contact ResumeMakery', intro: 'Get in touch about product support, privacy questions or issues using the resume builder.', sections: [['Support topics', 'Contact ResumeMakery for product support, privacy questions and technical issue reporting.']], steps: [], faqs: [] },
  '/cookies': { title: 'Cookie Policy | ResumeMakery', description: 'Cookie and analytics information for ResumeMakery.', kicker: 'COOKIES', h1: 'ResumeMakery Cookie Policy', intro: 'Information about cookies, authentication storage and aggregate analytics used to operate and understand ResumeMakery.', sections: [['Analytics and service storage', 'The policy describes authentication and service storage plus aggregate traffic measurement.']], steps: [], faqs: [] },
  '/disclaimer': { title: 'Disclaimer | ResumeMakery', description: 'Important limitations and disclaimers for ResumeMakery and ATS guidance.', kicker: 'DISCLAIMER', h1: 'ResumeMakery Disclaimer', intro: 'ResumeMakery helps users prepare and evaluate resumes, but no tool can guarantee ATS passage, interviews or hiring outcomes.', sections: [['ATS guidance is diagnostic', 'Always verify imported content and remember that hiring decisions remain with employers.']], steps: [], faqs: [] },
  '/eula': { title: 'EULA | ResumeMakery', description: 'End-user licence terms for ResumeMakery.', kicker: 'END-USER LICENCE', h1: 'ResumeMakery End-User Licence Agreement', intro: 'Licence terms for accessing and using ResumeMakery software and related resume-building features.', sections: [['Licence scope', 'The agreement covers permitted use of ResumeMakery software and related features.']], steps: [], faqs: [] },
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
function replaceMetaName(html, name, value) {
  const re = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["'][^"']*["']\\s*\\/?>`, 'i');
  const tag = `<meta name="${name}" content="${escapeHtml(value)}" />`;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n</head>`);
}
function replaceMetaProperty(html, property, value) {
  const re = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["'][^"']*["']\\s*\\/?>`, 'i');
  const tag = `<meta property="${property}" content="${escapeHtml(value)}" />`;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n</head>`);
}
const relatedToolRoutes = [
  '/resume-builder',
  '/ats-resume-checker',
  '/job-description-resume-match',
  '/ats-keyword-checker',
  '/resume-score-checker',
  '/resume-editor',
  '/resume-templates',
  '/resume-for-freshers',
];
function relatedLinks(route) {
  return Object.entries(pages)
    .filter(([path]) => path !== route && relatedToolRoutes.includes(path))
    .map(([path, page]) => `<a href="${path}">${escapeHtml(page.kicker.toLowerCase())}</a>`)
    .join(' · ');
}
function staticBlock(route, page) {
  const quick = page.answer ? `<h2>Quick answer</h2><p>${escapeHtml(page.answer)}</p>` : '';
  const sections = (page.sections || []).map(([title, body]) => `<section><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`).join('');
  const steps = page.steps?.length ? `<section><h2>How it works</h2><ol>${page.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol></section>` : '';
  const faqs = page.faqs?.length ? `<section><h2>Frequently asked questions</h2>${page.faqs.map(([q,a]) => `<h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p>`).join('')}</section>` : '';
  const related = relatedLinks(route);
  return `<div id="seo-content" style="font-family:'Segoe UI',system-ui,sans-serif;color:#1c2434;max-width:880px;margin:0 auto;padding:32px 20px;">
    <p style="font-weight:700;color:#0f2148;letter-spacing:.4px;">${escapeHtml(page.kicker)}</p>
    <h1>${escapeHtml(page.h1)}</h1>
    <p>${escapeHtml(page.intro)}</p>
    ${quick}${sections}${steps}${faqs}
    ${related ? `<section><h2>Related ResumeMakery tools</h2><p>${related}</p></section>` : ''}
  </div>`;
}
function structuredData(route, page) {
  const url = `${ORIGIN}${route}`;
  const graph = [
    {
      '@type': 'WebPage', '@id': `${url}#webpage`, url, name: page.title, description: page.description,
      isPartOf: { '@id': WEBSITE_ID }, about: { '@id': ORG_ID }, inLanguage: 'en-IN',
    },
    {
      '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ResumeMakery', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: page.h1, item: url },
      ],
    },
  ];
  if (page.faqs?.length) {
    graph.push({
      '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: page.faqs.map(([q,a]) => ({
        '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
  }
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

if (!fs.existsSync(rootFile)) throw new Error('dist/index.html not found; run after Vite build');
let rootHtml = fs.readFileSync(rootFile, 'utf8');
rootHtml = rootHtml
  .replaceAll('www.resumemakery.com/#/privacy', 'www.resumemakery.com/privacy')
  .replaceAll('href="./manifest.webmanifest"', 'href="/manifest.webmanifest"')
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
  html = replaceMetaName(html, 'twitter:title', page.title);
  html = replaceMetaName(html, 'twitter:description', page.description);
  html = replaceMetaName(html, 'twitter:image:alt', 'ResumeMakery free ATS resume builder');
  html = replaceMetaProperty(html, 'og:title', page.title);
  html = replaceMetaProperty(html, 'og:description', page.description);
  html = replaceMetaProperty(html, 'og:url', url);
  html = replaceMetaProperty(html, 'og:locale', 'en_IN');
  html = replaceMetaProperty(html, 'og:image:alt', 'ResumeMakery free ATS resume builder');
  html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i, `<link rel="canonical" href="${url}" />`);
  html = html.replace(/<div id="seo-content"[\s\S]*?<div id="root"><\/div>/i, `${staticBlock(route, page)}\n    <div id="root"></div>`);
  html = html.replace('</head>', `  ${structuredData(route, page)}\n</head>`);

  const folder = path.join(dist, route.slice(1));
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'index.html'), html);
}

console.log(`✓ SEO prerender: ${Object.keys(pages).length} clean public routes + answer/schema metadata`);
