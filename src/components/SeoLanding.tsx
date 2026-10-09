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
    kicker: 'Free ATS Resume Checker 2.0',
    title: 'Get a job match score, resume readiness score and priority fixes',
    description: 'Paste the job description you want and review two separate signals: how well your resume matches the role and how ready the resume itself is. ResumeMakery then shows the highest-impact fixes first.',
    answer: 'ResumeMakery ATS 2.0 separates job-description match from resume readiness. Job Match measures covered versus missing terms from the job description. Resume Readiness checks practical resume signals such as contact details, summary quality, evidence bullets, measurable results, action verbs and readability. It then turns problems into prioritized Issue → Why → Fix guidance. The results are deterministic guidance, not an employer-specific ATS simulation or an interview guarantee.',
    proof: 'Two scores · one editing loop',
    bullets: ['Job Match score', 'Resume Readiness score', 'Priority Issue → Why → Fix', 'Skills-without-evidence detection'],
    cards: [
      { title: 'Separate match from quality', body: 'A resume can contain many job keywords and still be weakly written. ResumeMakery therefore keeps job-description coverage separate from structural and content readiness instead of hiding both ideas inside one opaque number.' },
      { title: 'Show evidence, not keyword stuffing', body: 'If a matched skill appears only in the Skills list, ATS 2.0 can flag the lack of supporting evidence in your summary, experience or projects. Add proof only when it is true.' },
      { title: 'Fix the highest-impact issue first', body: 'Problems are ordered as Fix first, Improve or Polish. The report explains why each issue matters and gives a concrete next action before you re-check the resume.' },
    ],
    steps: [
      { title: 'Build or import your resume', body: 'Start from a ResumeMakery resume or bring in an existing PDF, DOCX, TXT file or image.' },
      { title: 'Paste the real job description', body: 'Use the full responsibilities and requirements so the match reflects the language of the role you actually want.' },
      { title: 'Fix, edit and re-check', body: 'Work through the priority fixes, keep every claim truthful and watch both scores update as the resume changes.' },
    ],
    faqs: [
      { q: 'What does ResumeMakery ATS 2.0 check?', a: 'It checks job-description keyword coverage plus resume-readiness signals such as contact completeness, summary quality, evidence bullets, measurable results, action verbs and readability. It also identifies some matched skills that appear only in the Skills list without supporting evidence elsewhere.' },
      { q: 'Does a high ATS score guarantee an interview?', a: 'No. Employers use different systems, rules and human judgment. ResumeMakery reports deterministic signals from the resume and job description you provide; it does not know an employer’s private ATS configuration.' },
      { q: 'What should I do with a missing keyword?', a: 'Add it only when it accurately reflects your real background. When possible, show truthful evidence in a project, summary or experience bullet instead of copying a requirement into a keyword list.' },
      { q: 'Is the readiness score fair for freshers?', a: 'Fresher mode does not require formal work history when none exists. It focuses more on the applicable checks and encourages real projects or achievements as evidence.' },
    ],
  },
  '/job-description-resume-match': {
    kicker: 'Resume vs job description match',
    title: 'Compare your resume with a job description before you apply',
    description: 'Use the exact job posting to see which role-specific terms are already represented in your resume, which are missing and which matched skills still need evidence.',
    answer: 'A resume-to-job-description match compares the language of your resume with the actual role you are targeting. ResumeMakery extracts relevant job terms, reports the terms already covered, highlights missing terms and separates simple keyword presence from stronger evidence in summaries, projects and experience. The goal is to tailor truthfully for one application — not to copy the job description.',
    proof: 'Target one real application',
    bullets: ['Exact JD comparison', 'Covered vs missing terms', 'Evidence-aware matching', 'Live re-check while editing'],
    cards: [
      { title: 'Match the exact role', body: 'Two jobs with the same title can emphasize different tools, methods and responsibilities. Matching against the actual posting gives you a more relevant signal than a generic resume grade.' },
      { title: 'Find what is genuinely missing', body: 'The report surfaces terms present in the posting but absent from your resume. Review them manually and add only the ones you can honestly support.' },
      { title: 'Strengthen proof for matched skills', body: 'A term in a Skills list shows presence; a concise project or achievement shows evidence. ResumeMakery distinguishes these cases so you know where stronger support may help.' },
    ],
    steps: [
      { title: 'Open the resume version for this job', body: 'Use a dedicated copy when you are applying to a specific role so changes do not overwrite a stronger general version.' },
      { title: 'Paste the full posting', body: 'Include responsibilities and requirements, not only the job title.' },
      { title: 'Review, tailor and re-check', body: 'Adjust truthful emphasis, improve evidence and confirm that the final resume still reads naturally to a human recruiter.' },
    ],
    faqs: [
      { q: 'What is a good resume-to-job-description match?', a: 'There is no universal percentage that guarantees success. Use the score as a directional coverage signal, then inspect the actual missing terms, evidence and resume quality before applying.' },
      { q: 'Should I copy every keyword from the job description?', a: 'No. Copying unsupported skills or qualifications creates an inaccurate resume. Use employer wording only where it truthfully describes your background.' },
      { q: 'Why can two jobs with the same title get different match scores?', a: 'Because each job description can prioritize different tools, responsibilities, qualifications and terminology. The comparison should reflect the specific posting.' },
      { q: 'Can I re-check after editing?', a: 'Yes. In the ResumeMakery editor the match updates as the resume or pasted job description changes.' },
    ],
  },
  '/ats-keyword-checker': {
    kicker: 'Free ATS keyword checker',
    title: 'Find covered and missing resume keywords from a real job description',
    description: 'Paste a job description to identify relevant terms, see which ones are already on your resume and review missing terms without turning the resume into a keyword-stuffed list.',
    answer: 'An ATS keyword checker looks for important job-description terms and compares them with your resume. ResumeMakery reports covered and missing terms and can also highlight matched skills that appear only in the Skills list without supporting evidence elsewhere. Missing terms are suggestions to review, not instructions to add claims you cannot support.',
    proof: 'Keywords with context',
    bullets: ['Relevant JD term extraction', 'Covered keyword list', 'Missing keyword list', 'Evidence gap detection'],
    cards: [
      { title: 'Extract role-specific terms', body: 'The checker looks for relevant skills, tools and multi-word terms from the job description rather than treating every common word as an important keyword.' },
      { title: 'Review missing terms safely', body: 'A missing term is useful only if it reflects something you actually know or have done. ResumeMakery explicitly tells users not to invent skills, metrics or experience.' },
      { title: 'Move from keyword to evidence', body: 'When a skill is present only in the Skills section, add a real example in a project or work bullet if you genuinely used it. Evidence is more credible than repetition.' },
    ],
    steps: [
      { title: 'Paste the job description', body: 'Include the responsibilities and requirements where the important tools and competencies are usually stated.' },
      { title: 'Separate covered from missing', body: 'Review each relevant term instead of chasing a single percentage.' },
      { title: 'Add truthful context', body: 'Use real projects, achievements or experience to support relevant skills, then re-check the resume.' },
    ],
    faqs: [
      { q: 'What counts as an ATS keyword?', a: 'Common examples include tools, technologies, certifications, methods, role-specific skills and some multi-word competencies explicitly present in a job description.' },
      { q: 'Should I repeat keywords many times?', a: 'No. Repetition without useful evidence can make a resume harder to read. Use accurate terminology naturally where it belongs.' },
      { q: 'Why does ResumeMakery flag a skill that is already in my Skills section?', a: 'It may be flagging an evidence gap, not a missing keyword. The skill can be present while still lacking a project, summary or experience example that shows where you used it.' },
      { q: 'Does the checker upload my job description?', a: 'The ATS matching workflow is designed to run on-device in the current product; the pasted job description is used for the local comparison and stored per resume in browser storage for convenience.' },
    ],
  },
  '/resume-score-checker': {
    kicker: 'Free resume score checker',
    title: 'Check resume readiness without confusing it with job match',
    description: 'Review the practical resume-quality signals recruiters can scan quickly: contact completeness, summary quality, evidence bullets, measurable results, action verbs and readability.',
    answer: 'ResumeMakery’s Resume Readiness score evaluates practical content and structure checks that apply to the resume itself. It is intentionally separate from the Job Match score. A resume can be well written but poorly targeted to one role, or highly keyword-matched but weakly evidenced. Seeing both signals makes the next edit clearer.',
    proof: 'Readiness is not job match',
    bullets: ['Contact completeness', 'Summary quality', 'Evidence and measurable results', 'Action verbs and readability'],
    cards: [
      { title: 'Check the basics recruiters need', body: 'A missing email, phone, city, useful summary or education entry can weaken an otherwise promising resume. Readiness checks surface these practical gaps.' },
      { title: 'Turn duties into evidence', body: 'The checker looks for experience bullets, measurable outcomes and stronger action-led phrasing. The goal is clearer evidence, not exaggerated claims.' },
      { title: 'Keep fresher scoring applicable', body: 'When fresher mode has no formal work history, ResumeMakery does not require the same work-experience bullet checks. Projects and achievements become more important evidence.' },
    ],
    steps: [
      { title: 'Open or import your resume', body: 'Use your actual application content rather than a sample resume.' },
      { title: 'Review failed readiness checks', body: 'Fix the highest-impact gaps first: contact information, summary, evidence and measurable outcomes.' },
      { title: 'Add the job description separately', body: 'Once the resume itself is strong, use Job Match to check how well that version fits the specific role.' },
    ],
    faqs: [
      { q: 'Is a resume score the same as an ATS match score?', a: 'No. Resume readiness measures the quality and completeness signals of the resume itself. Job Match compares the resume with a specific job description. ResumeMakery shows them separately.' },
      { q: 'Can a resume score 100 and still be wrong for a job?', a: 'Yes. A structurally strong resume can still be poorly targeted to a specific role. That is why a separate job-description match is useful.' },
      { q: 'Does the score judge design taste?', a: 'The readiness score focuses on deterministic content and structure checks rather than pretending to know a recruiter’s personal design preference.' },
      { q: 'Do freshers need work experience to get a useful score?', a: 'No. Fresher mode avoids requiring formal experience when it does not exist and instead rewards applicable evidence such as education, projects and achievements.' },
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
    ['/ats-resume-checker', 'ATS resume checker 2.0'],
    ['/job-description-resume-match', 'Resume vs job description'],
    ['/ats-keyword-checker', 'ATS keyword checker'],
    ['/resume-score-checker', 'Resume score checker'],
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
