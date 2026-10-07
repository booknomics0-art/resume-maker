import { navigate } from '../lib/navigation';

type Faq = { q: string; a: string };
type PageData = {
  kicker: string;
  title: string;
  description: string;
  answer: string;
  proof: string;
  bullets: string[];
  cards: { title: string; body: string }[];
  steps: { title: string; body: string }[];
  faqs: Faq[];
};

const PAGES: Record<string, PageData> = {
  '/resume-builder': {
    kicker: 'Free ATS resume builder for India',
    title: 'Build an ATS-friendly resume without paywalls',
    description: 'Create a professional resume from scratch or import your existing one. Use 50 templates, a live A4 preview and clean PDF export — without a watermark.',
    answer: 'ResumeMakery is a free online resume builder for students, freshers and professionals. You can create or import a resume, edit structured sections, compare it with a real job description, switch among 50 templates and download a clean PDF without a watermark.',
    proof: 'One workflow, start to finish',
    bullets: ['50 unlocked templates', 'Unlimited clean PDFs', 'Live A4 preview', 'Import PDF, DOCX, TXT or photo'],
    cards: [
      { title: 'Start fast', body: 'Seven guided sections keep the form focused while the live preview updates beside you. Add contact details, education, experience, projects, skills and supporting sections without formatting the document manually.' },
      { title: 'Stay ATS-readable', body: 'Use clean resume structure and compare the finished resume with the exact job description you plan to apply for. ResumeMakery highlights important terms that are present or missing without claiming to guarantee an interview.' },
      { title: 'Download cleanly', body: 'Export a professional PDF without ResumeMakery branding or a watermark on the resume. The same content can be reused across different templates and tailored into multiple resume versions.' },
    ],
    steps: [
      { title: 'Choose a starting point', body: 'Start with a blank resume or import an existing PDF, DOCX, TXT file or resume photo.' },
      { title: 'Edit the real content', body: 'Review each section, improve measurable bullets, keep claims truthful and use a template appropriate for the role.' },
      { title: 'Match the job and export', body: 'Compare the resume with the target job description, fix relevant gaps and download the final PDF.' },
    ],
    faqs: [
      { q: 'Is ResumeMakery really free?', a: 'Yes. Resume creation, all 50 templates, ATS job-description matching and PDF downloads are free in the current product. There is no paid plan or watermark.' },
      { q: 'Can I import my old resume?', a: 'Yes. PDF, DOCX, TXT and image/photo import are supported, including OCR for scanned text. Always review imported names, dates and section boundaries before applying.' },
      { q: 'Is ResumeMakery useful for Indian freshers?', a: 'Yes. Freshers can emphasize education, projects, internships, certifications and skills, and can compare each resume version against a real job description before applying.' },
      { q: 'Does it work on mobile?', a: 'Yes. The editor and download flow include mobile-specific handling, although a larger screen can be more convenient for detailed resume editing.' },
    ],
  },
  '/ats-resume-checker': {
    kicker: 'Free ATS resume checker',
    title: 'Compare your resume with the job you actually want',
    description: 'Paste a job description and see which important terms your resume already covers and which are missing. The check runs as part of your ResumeMakery editing workflow.',
    answer: 'An ATS resume check is most useful when it compares your resume with the exact job description. ResumeMakery checks keyword and term coverage, shows relevant gaps and lets you edit and re-check the same resume. It is diagnostic guidance, not a promise that an employer will shortlist you.',
    proof: 'Practical ATS matching',
    bullets: ['Job-description keyword comparison', 'Missing-term visibility', 'Re-score while editing', 'No separate paid ATS subscription'],
    cards: [
      { title: 'Use a real job ad', body: 'Generic resume scores can miss the point because ATS screening is role-specific. Paste the actual description for the role you want so the comparison reflects the employer’s language.' },
      { title: 'Keep claims truthful', body: 'Add missing skills or terms only when they genuinely describe your experience. Keyword stuffing, copied requirements and unsupported claims can reduce readability and credibility.' },
      { title: 'Fix in the same editor', body: 'Move directly from the ATS result to the resume content and re-check as you improve it. This makes the score a practical editing loop rather than a one-time number.' },
    ],
    steps: [
      { title: 'Paste the job description', body: 'Use the full relevant job posting instead of a generic title such as “software engineer”.' },
      { title: 'Review covered and missing terms', body: 'Separate truly relevant skills from employer-specific wording that does not apply to your background.' },
      { title: 'Improve and re-check', body: 'Rewrite truthful bullets with clearer evidence, then compare the updated resume again before applying.' },
    ],
    faqs: [
      { q: 'Does a high ATS score guarantee an interview?', a: 'No. ATS matching is a diagnostic tool, not a hiring guarantee. Recruiter judgment, experience, role fit, competition and employer-specific rules still matter.' },
      { q: 'Is the ATS checker free?', a: 'Yes. It is included in ResumeMakery and does not require a separate paid ATS subscription in the current product.' },
      { q: 'What should I do with missing keywords?', a: 'Use them only when they accurately describe your real skills or experience. A strong resume explains evidence and outcomes instead of simply copying a list of keywords.' },
      { q: 'Do I need to upload the job description?', a: 'No file upload is required for the job description. You can paste the relevant job-description text and compare it with your resume.' },
    ],
  },
  '/resume-editor': {
    kicker: 'Edit an existing resume online',
    title: 'Upload your existing resume and keep editing instead of starting over',
    description: 'Bring a PDF, DOCX, TXT file or a photo of a printed resume. ResumeMakery extracts usable content into editable fields so you can redesign, correct and export it.',
    answer: 'ResumeMakery can use an existing PDF, DOCX, TXT file or resume photo as the starting point. Imported content is placed into editable resume fields so you can correct text, reorganize sections, switch templates and export a fresh PDF instead of rebuilding everything manually.',
    proof: 'Import → edit → export',
    bullets: ['PDF and DOCX import', 'Photo/scanned text OCR', 'Editable structured fields', 'Template switching without retyping'],
    cards: [
      { title: 'Preserve your work', body: 'Use your current resume as the starting point instead of manually re-entering every date, company, project and qualification.' },
      { title: 'Edit structurally', body: 'Imported content becomes editable resume fields rather than a flat screenshot. This makes it possible to update wording, section order and presentation after import.' },
      { title: 'Switch presentation', body: 'Try a different layout while keeping the underlying resume information. This separates your career content from the visual template.' },
    ],
    steps: [
      { title: 'Import the source resume', body: 'Choose a supported PDF, DOCX, TXT file or image/photo. Scanned text can be read with OCR.' },
      { title: 'Verify the extraction', body: 'Check names, dates, headings, bullet boundaries and contact information because no parser is perfect.' },
      { title: 'Edit and export', body: 'Improve the structured fields, choose a suitable template and download the updated resume as a clean PDF.' },
    ],
    faqs: [
      { q: 'Can ResumeMakery edit a scanned resume?', a: 'It includes on-device OCR for photo and scanned-text extraction. OCR quality depends on image clarity, so review the extracted content carefully.' },
      { q: 'Will resume import always be perfect?', a: 'No parser is perfect. Review names, dates, section boundaries, bullets and special characters after importing any resume.' },
      { q: 'Can I change templates after import?', a: 'Yes. The imported information is stored as resume content, so you can test other templates without retyping everything.' },
      { q: 'Can I export again after editing?', a: 'Yes. The edited resume can be downloaded as a clean PDF after you review the final layout.' },
    ],
  },
  '/resume-templates': {
    kicker: 'Free professional resume templates',
    title: '50 resume templates, unlocked from the start',
    description: 'Choose from ATS-friendly classics and more distinctive professional layouts across multiple career fields. Switch designs without re-entering your resume.',
    answer: 'ResumeMakery includes 50 resume templates across multiple layout families and career use cases. All templates are unlocked in the current product, and switching designs does not require re-entering the resume content. For ATS-heavy applications, prefer clean layouts with clear headings and readable text.',
    proof: '50 templates · ₹0',
    bullets: ['ATS-friendly options', 'Fresher layouts', 'Professional multi-page support', 'No template paywall'],
    cards: [
      { title: 'Choose for the role', body: 'Use conservative, text-first layouts for ATS-heavy applications and more distinctive designs only when the employer or role makes visual presentation relevant.' },
      { title: 'A4-first output', body: 'Templates are designed around a real resume page rather than a generic web card, with multi-page handling for longer professional histories.' },
      { title: 'Change anytime', body: 'Your resume content remains separate from the visual template, so trying a new design does not require retyping your work history or education.' },
    ],
    steps: [
      { title: 'Start with the hiring context', body: 'Consider the industry, seniority and whether the employer is likely to rely heavily on applicant tracking systems.' },
      { title: 'Check hierarchy and readability', body: 'Make sure name, role, section headings, dates and bullet points are easy to scan at normal size.' },
      { title: 'Preview before download', body: 'Review every page break and section boundary in the live A4 preview before exporting.' },
    ],
    faqs: [
      { q: 'Are all 50 templates free?', a: 'Yes. The current product does not lock templates behind a paid tier.' },
      { q: 'Which resume template is best for ATS?', a: 'A clean template with standard headings, readable text and straightforward section order is usually the safer choice for ATS-heavy applications. ResumeMakery includes multiple layouts designed around that approach.' },
      { q: 'Can a resume be more than one page?', a: 'Yes. The editor supports multi-page resumes and page-break handling. Length should be driven by useful content rather than an arbitrary page target.' },
      { q: 'Do templates add a watermark?', a: 'No. The downloaded PDF is intended to be clean and application-ready without ResumeMakery branding on the resume itself.' },
    ],
  },
  '/resume-for-freshers': {
    kicker: 'Resume maker for freshers and students',
    title: 'Make a strong first-job resume even without years of experience',
    description: 'ResumeMakery includes fresher-focused layouts and guidance so students and early-career applicants can present education, projects, internships, skills and achievements clearly.',
    answer: 'A strong fresher resume should not imitate a senior professional resume with an empty experience section. Lead with evidence you actually have: education, relevant projects, internships, practical skills, certifications, competitions, volunteering and measurable achievements. ResumeMakery provides fresher-focused layouts and ATS job matching for that workflow.',
    proof: 'Built for first applications',
    bullets: ['Fresher template set', 'Projects and education emphasis', 'ATS matching against real roles', 'Clean one-page friendly layouts'],
    cards: [
      { title: 'Lead with evidence', body: 'Projects, internships, certifications, competitions and measurable achievements can carry more weight than an empty work-experience section.' },
      { title: 'Keep it focused', body: 'For many freshers, a clear one-page resume is easier for recruiters to scan. Do not shrink fonts or remove useful evidence simply to hit one page.' },
      { title: 'Tailor each application', body: 'Duplicate your resume and adjust truthful skills, project emphasis and wording for each real job description rather than sending one generic version everywhere.' },
    ],
    steps: [
      { title: 'Put the strongest evidence first', body: 'Use education, projects or internships near the top when they are more relevant than formal work history.' },
      { title: 'Describe outcomes, not course lists', body: 'Explain what you built, analysed, improved or delivered and include measurable results where they are real.' },
      { title: 'Match each target role', body: 'Compare the finished resume with the job description and adjust emphasis only where your actual background supports it.' },
    ],
    faqs: [
      { q: 'What should a fresher put in experience?', a: 'Use internships, projects, freelance or volunteer work and relevant responsibilities when they truthfully demonstrate skills. Do not invent employment.' },
      { q: 'Should a fresher resume be one page?', a: 'Often yes when the content fits comfortably. Do not shrink text or remove important evidence only to force a one-page limit.' },
      { q: 'What sections are most useful for an Indian fresher?', a: 'Education, relevant projects, internships, practical skills, certifications and achievements are often more useful than an empty experience section. The order should match the target role.' },
      { q: 'Can I make different resumes for different jobs?', a: 'Yes. ResumeMakery supports multiple resumes so you can tailor truthful versions for different roles.' },
    ],
  },
};

function RelatedLinks({ route }: { route: string }) {
  const links = [
    ['/resume-builder', 'Free resume builder'],
    ['/ats-resume-checker', 'ATS resume checker'],
    ['/resume-editor', 'Edit an existing resume'],
    ['/resume-templates', 'Resume templates'],
    ['/resume-for-freshers', 'Resume for freshers'],
  ].filter(([path]) => path !== route);
  return (
    <section className="seo-faq" aria-label="Related ResumeMakery tools">
      <h2>Related ResumeMakery tools</h2>
      <p>{links.map(([path, label], index) => <span key={path}>{index > 0 ? ' · ' : ''}<a href={path} onClick={(e) => { e.preventDefault(); navigate(path); }}>{label}</a></span>)}</p>
    </section>
  );
}

export default function SeoLanding({ route, onStart }: { route: string; onStart: (target?: string) => void }) {
  const d = PAGES[route] || PAGES['/resume-builder'];
  return <>
    <section className="seo-hero"><div><div className="seo-kicker">{d.kicker}</div><h1>{d.title}</h1><p>{d.description}</p><div className="land-cta-row" style={{ marginTop: 18 }}><button className="btn primary land-cta" onClick={() => onStart('/editor/new')}>Build my resume — free</button><button className="btn land-cta" onClick={() => onStart('/import')}>Upload existing resume</button></div></div><aside className="seo-proof"><b>{d.proof}</b><span>No watermark, no template lock.</span><ul>{d.bullets.map(x => <li key={x}>{x}</li>)}</ul></aside></section>
    <section className="seo-faq" aria-labelledby="quick-answer-heading"><h2 id="quick-answer-heading">Quick answer</h2><p>{d.answer}</p></section>
    <section className="seo-grid">{d.cards.map(c => <article className="seo-card" key={c.title}><h2>{c.title}</h2><p>{c.body}</p></article>)}</section>
    <section className="seo-faq" aria-labelledby="how-it-works-heading"><h2 id="how-it-works-heading">How it works</h2><ol>{d.steps.map(step => <li key={step.title}><strong>{step.title}.</strong> {step.body}</li>)}</ol></section>
    <section className="seo-faq" aria-labelledby="faq-heading"><h2 id="faq-heading">Frequently asked questions</h2>{d.faqs.map(f => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</section>
    <RelatedLinks route={route} />
  </>;
}
