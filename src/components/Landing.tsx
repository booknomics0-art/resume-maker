import {
  CATEGORY_META,
  LAYOUT_META,
  TEMPLATES,
  TEMPLATE_COUNT,
  type Template,
} from '../lib/templates';
import { FIELDS } from '../lib/fields';
import { Thumb } from './Preview';
import { sampleResume } from '../lib/store';
import Footer from './Footer';
import type { GoogleAuthIssue } from '../lib/googleAuth';
import './LandingV2.css';

type Testimonial = { name: string; role: string; quote: string };
const TESTIMONIALS: Testimonial[] = [];

const STRIP_INDICES = [0, 7, 14, 21, 28, 35];
const stripTemplates: Template[] = STRIP_INDICES
  .map((index) => TEMPLATES[index])
  .filter((template): template is Template => Boolean(template));

const FAQS = [
  {
    q: 'Is ResumeMakery really 100% free?',
    a: 'Yes. Every template, the ATS match score, upload & edit, and unlimited PDF downloads are free. There is no paid plan, no trial, no credit card and no watermark — the product has no billing at all.',
  },
  {
    q: 'Can I edit my existing resume?',
    a: 'Yes — upload a PDF, DOCX, TXT or JSON file, or even a photo of a printed resume. Text is extracted on your device (scanned pages are read by an offline OCR engine) and lands straight into editable fields with a live preview. Nothing is uploaded to any server.',
  },
  {
    q: 'Will my resume pass ATS screening?',
    a: 'ResumeMakery templates are built on clean structures that applicant tracking systems parse reliably. You also get a free ATS check: paste any job description and see which keywords your resume already covers and which are missing.',
  },
  {
    q: 'How many resumes can I create?',
    a: 'Unlimited. Duplicate a resume and tailor one version per job application — something most builders restrict to a single resume even on paid plans.',
  },
  {
    q: 'Do the free downloads have a watermark or branding?',
    a: 'No. The PDF you download is the final file: no watermark, no “made with” link, no hidden paywall pages. It is even saved under your resume’s own name.',
  },
  {
    q: 'How many pages can my resume be?',
    a: 'One page to three or more — nothing caps your length. The live preview shows page-break guides, and the printed PDF keeps every entry intact across pages.',
  },
  {
    q: 'Where is my data stored?',
    a: 'In your browser by default, and optionally in your own cloud database when you sign in. Parsing, OCR and ATS scoring all run on your device — we never sell or share your data.',
  },
  {
    q: 'Do I need an account to try it?',
    a: 'Yes. Sign in or create a free account to build or import your resume. Resume building and downloads are completely free.',
  },
];

const PUBLIC_TOOLS = [
  {
    href: '/resume-builder',
    title: 'Resume Builder',
    desc: 'See the complete free builder workflow.',
  },
  {
    href: '/ats-resume-checker',
    title: 'ATS Resume Checker',
    desc: 'Understand job-description keyword matching.',
  },
  {
    href: '/resume-editor',
    title: 'Resume Editor',
    desc: 'Upload and edit an existing resume.',
  },
  {
    href: '/resume-templates',
    title: 'Resume Templates',
    desc: `Browse ${TEMPLATE_COUNT} professional layouts.`,
  },
  {
    href: '/resume-for-freshers',
    title: 'Resume for Freshers',
    desc: 'A fresher-first path for Indian job seekers.',
  },
];

export default function Landing({
  onStart,
  notice,
}: {
  onStart: (target?: string) => void;
  notice?: GoogleAuthIssue | null;
}) {
  const heroResume = sampleResume();

  return (
    <div className="landing-v2 no-print">
      <header className="rm2-top">
        <div className="rm2-top-inner">
          <a className="rm2-brand" href="/" aria-label="ResumeMakery home">
            <span className="rm2-brand-mark" aria-hidden>RM</span>
            <span className="rm2-brand-copy">
              <span className="rm2-brand-name">ResumeMakery</span>
              <span className="rm2-brand-sub">Free ATS resume workspace</span>
            </span>
          </a>

          <nav className="rm2-nav" aria-label="Homepage sections">
            <a href="#workflow">Job Match</a>
            <a href="#freshers">Freshers</a>
            <a href="#templates">Templates</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="rm2-top-actions">
            <a className="rm2-btn compact rm2-signin" href="/login">Sign in</a>
            <button className="rm2-btn primary compact" type="button" onClick={() => onStart('/editor/new')}>
              Build free
            </button>
          </div>
        </div>
      </header>

      {notice && (
        <div className="rm2-notice" role="alert">
          <div className="rm2-notice-inner">
            <span>⚠️ {notice.title || 'Sign-in could not finish'}</span>
            <a className="rm2-btn compact" href="/login">Open sign-in</a>
          </div>
        </div>
      )}

      <main>
        <section className="rm2-hero">
          <div className="rm2-hero-inner">
            <div>
              <div className="rm2-eyebrow">Made for India · ₹0 forever · No watermark</div>
              <h1>
                Build a resume for the <em>job</em> — not just a resume.
              </h1>
              <p className="rm2-lede">
                Create or upload your resume, match it against a real job description, see the keywords you are missing,
                switch between {TEMPLATE_COUNT} professional templates and download a clean PDF. ResumeMakery keeps the
                useful parts together instead of hiding them behind separate paid tools.
              </p>

              <div className="rm2-cta-row">
                <button className="rm2-btn primary" type="button" onClick={() => onStart('/editor/new')}>
                  Build my resume — free
                </button>
                <a className="rm2-btn secondary" href="/ats-resume-checker">
                  Check ATS workflow
                </a>
              </div>
              <div className="rm2-microcopy">Free account required to enter the editor. No card, no trial and no watermark.</div>

              <div className="rm2-trust-row" aria-label="Key product benefits">
                <span className="rm2-trust-pill">✓ Unlimited clean PDFs</span>
                <span className="rm2-trust-pill">✓ PDF · DOCX · photo import</span>
                <span className="rm2-trust-pill">✓ Job-description matching</span>
                <span className="rm2-trust-pill">✓ Fresher-friendly</span>
              </div>
            </div>

            <div className="rm2-hero-visual" aria-label="Example ResumeMakery workflow">
              <div className="rm2-product-card">
                <div className="rm2-product-card-head">
                  <b>Example job-match workflow</b>
                  <span className="rm2-live-pill">Built into ResumeMakery</span>
                </div>
                <div className="rm2-score-box">
                  <div className="rm2-score-top">
                    <span>Illustrative job match</span>
                    <strong>74%</strong>
                  </div>
                  <div className="rm2-progress" aria-hidden><span /></div>
                </div>
                <div className="rm2-check-list">
                  <div className="rm2-check-item">
                    <span className="rm2-check-icon">🎯</span>
                    <span><b>Paste the job description</b><small>Compare your resume against the role you want.</small></span>
                    <span className="rm2-check-state">1</span>
                  </div>
                  <div className="rm2-check-item">
                    <span className="rm2-check-icon">🔎</span>
                    <span><b>See covered and missing keywords</b><small>Use the existing ATS match checker before applying.</small></span>
                    <span className="rm2-check-state">2</span>
                  </div>
                  <div className="rm2-check-item">
                    <span className="rm2-check-icon">✍️</span>
                    <span><b>Edit what is genuinely true</b><small>Improve relevance without inventing experience.</small></span>
                    <span className="rm2-check-state">3</span>
                  </div>
                  <div className="rm2-check-item">
                    <span className="rm2-check-icon">📄</span>
                    <span><b>Download the final PDF</b><small>No watermark or ResumeMakery branding.</small></span>
                    <span className="rm2-check-state">4</span>
                  </div>
                </div>
                <p className="rm2-visual-note">The percentage above is an example interface value, not a claim about a specific resume.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rm2-strip" aria-label="ResumeMakery product facts">
          <div className="rm2-strip-inner">
            <div className="rm2-stat"><strong>{TEMPLATE_COUNT}</strong><span>professional templates unlocked</span></div>
            <div className="rm2-stat"><strong>{FIELDS.length}</strong><span>career fields supported</span></div>
            <div className="rm2-stat"><strong>₹0</strong><span>product price — no paid plan</span></div>
            <div className="rm2-stat"><strong>0</strong><span>watermarks on downloaded PDFs</span></div>
          </div>
        </section>

        <section className="rm2-section" id="why">
          <div className="rm2-kicker">Why ResumeMakery</div>
          <h2>Compete on useful workflow, not template count alone.</h2>
          <p className="rm2-section-lede">
            The homepage now makes the strongest existing product advantages obvious within the first screen instead of
            asking visitors to discover them after sign-in.
          </p>
          <div className="rm2-value-grid">
            <article className="rm2-value-card">
              <div className="rm2-value-icon">🎯</div>
              <h3>Job-description matching</h3>
              <p>Paste a real vacancy and use the ATS matcher to identify covered and missing terms before you apply.</p>
            </article>
            <article className="rm2-value-card">
              <div className="rm2-value-icon">📤</div>
              <h3>Bring your old resume</h3>
              <p>ResumeMakery can start from an existing PDF, DOCX, text file or resume photo instead of forcing a rebuild.</p>
            </article>
            <article className="rm2-value-card">
              <div className="rm2-value-icon">🔓</div>
              <h3>Actually free downloads</h3>
              <p>Templates, resume creation and clean PDF downloads stay available without a watermark or checkout surprise.</p>
            </article>
            <article className="rm2-value-card">
              <div className="rm2-value-icon">🇮🇳</div>
              <h3>India-first entry point</h3>
              <p>The product now speaks directly to freshers and Indian job seekers instead of using generic global-builder copy.</p>
            </article>
          </div>
        </section>

        <section className="rm2-workflow-shell" id="workflow">
          <div className="rm2-workflow">
            <div className="rm2-kicker">Existing ATS workflow, surfaced properly</div>
            <h2>From job description to cleaner application in four steps.</h2>
            <p>
              This is the differentiator we can own immediately without rewriting the resume editor or risking the PDF pipeline.
            </p>
            <div className="rm2-workflow-grid">
              <article className="rm2-workflow-step"><span className="rm2-workflow-num">01</span><h3>Build or import</h3><p>Create a resume or bring the one you already use.</p></article>
              <article className="rm2-workflow-step"><span className="rm2-workflow-num">02</span><h3>Paste the vacancy</h3><p>Use the actual job description instead of generic ATS advice.</p></article>
              <article className="rm2-workflow-step"><span className="rm2-workflow-num">03</span><h3>Check the match</h3><p>Review covered and missing job-description keywords.</p></article>
              <article className="rm2-workflow-step"><span className="rm2-workflow-num">04</span><h3>Edit and download</h3><p>Make truthful improvements and export the clean PDF.</p></article>
            </div>
            <div className="rm2-workflow-actions">
              <a className="rm2-btn primary" href="/ats-resume-checker">Explore ATS checker</a>
              <button className="rm2-btn secondary" type="button" onClick={() => onStart('/editor/new')}>Start a resume</button>
            </div>
          </div>
        </section>

        <section className="rm2-section" id="freshers">
          <div className="rm2-kicker">Fresher-first positioning</div>
          <h2>No experience? Your resume still needs a clear story.</h2>
          <p className="rm2-section-lede">
            Freshers should not be forced into an experienced-professional structure. ResumeMakery already has fresher-focused
            templates, so the homepage now gives that audience a direct path.
          </p>
          <div className="rm2-fresher-grid">
            <article className="rm2-fresher-card primary">
              <h3>Lead with proof you already have.</h3>
              <p>For many freshers, projects, technical skills, internships, education and measurable achievements deserve more attention than an empty work-history section.</p>
              <div className="rm2-role-chips" aria-label="Example fresher roles">
                <span className="rm2-role-chip">Software Developer</span>
                <span className="rm2-role-chip">Data Analyst</span>
                <span className="rm2-role-chip">Sales</span>
                <span className="rm2-role-chip">Marketing</span>
                <span className="rm2-role-chip">Finance</span>
              </div>
              <div className="rm2-cta-row">
                <a className="rm2-btn primary" href="/resume-for-freshers">Open fresher guide</a>
              </div>
            </article>
            <article className="rm2-fresher-card">
              <h3>What to emphasize</h3>
              <div className="rm2-fresher-list">
                <div><span>✓</span><span>Projects that demonstrate relevant skills</span></div>
                <div><span>✓</span><span>Internships, volunteering and real responsibilities</span></div>
                <div><span>✓</span><span>Relevant tools, coursework and certifications</span></div>
                <div><span>✓</span><span>Achievements with evidence instead of empty adjectives</span></div>
                <div><span>✓</span><span>Keywords that genuinely match the target role</span></div>
              </div>
            </article>
          </div>
        </section>

        <section className="rm2-section rm2-tight" id="templates">
          <div className="rm2-kicker">Templates</div>
          <h2>Professional layouts without turning ResumeMakery into a design contest.</h2>
          <p className="rm2-section-lede">Templates remain important, but the product story is now about getting application-ready.</p>
          <div className="rm2-template-grid">
            {stripTemplates.map((template) => (
              <figure className="rm2-template-card" key={template.id}>
                <div className="rm2-template-frame">
                  <Thumb r={heroResume} tpl={template} />
                </div>
                <figcaption>
                  <b>{template.name}</b>
                  <span>{LAYOUT_META[template.layout]?.label} · {CATEGORY_META[template.category]?.label}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="rm2-center"><a className="rm2-btn" href="/resume-templates">Browse template collection</a></div>
        </section>

        <section className="rm2-section rm2-tight" id="proof">
          <div className="rm2-kicker">Proof before hype</div>
          <h2>Trust should come from verifiable product facts.</h2>
          <p className="rm2-section-lede">We are deliberately not adding fake testimonials, fake user counts or invented recruiter endorsements.</p>
          <div className="rm2-proof-grid">
            <article className="rm2-proof-card"><strong>No hidden PDF paywall</strong><p>The current product is positioned around clean, watermark-free downloads instead of a fake-free funnel.</p></article>
            <article className="rm2-proof-card"><strong>On-device resume processing</strong><p>Import parsing, OCR and ATS-related processing are designed to run in the browser where possible.</p></article>
            <article className="rm2-proof-card"><strong>Real reviews only</strong><p>Social proof should be added only when feedback has actually been collected from users.</p></article>
          </div>
        </section>

        {TESTIMONIALS.length > 0 && (
          <section className="rm2-section rm2-tight" id="reviews">
            <div className="rm2-kicker">Real user feedback</div>
            <h2>What job seekers say.</h2>
            <div className="rm2-proof-grid">
              {TESTIMONIALS.map((item) => (
                <blockquote className="rm2-proof-card" key={`${item.name}-${item.role}`}>
                  <strong>{item.name}</strong>
                  <p>{item.role}</p>
                  <p>“{item.quote}”</p>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        <section className="rm2-section rm2-tight" aria-labelledby="explore-heading">
          <div className="rm2-kicker">Explore</div>
          <h2 id="explore-heading">Useful public entry points for search and users.</h2>
          <p className="rm2-section-lede">These pages already exist and now receive clearer internal links from the homepage.</p>
          <div className="rm2-links">
            {PUBLIC_TOOLS.map((item) => (
              <a className="rm2-link-card" href={item.href} key={item.href}>
                <b>{item.title}</b>
                <span>{item.desc}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="rm2-section" id="faq">
          <div className="rm2-kicker">FAQ</div>
          <h2>Know what happens before you start.</h2>
          <div className="rm2-faqs">
            {FAQS.map((item) => (
              <details className="rm2-faq" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="rm2-final-wrap">
          <section className="rm2-final">
            <h2>Make the resume fit the opportunity.</h2>
            <p>Build it, compare it with the job, improve what is true and download the final PDF.</p>
            <div className="rm2-cta-row">
              <button className="rm2-btn primary" type="button" onClick={() => onStart('/editor/new')}>Build my resume — free</button>
              <a className="rm2-btn secondary" href="/ats-resume-checker">See ATS checker</a>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
