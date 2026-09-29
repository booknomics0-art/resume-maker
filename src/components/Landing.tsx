// CraftCV public landing page — the storefront.
//
// Why this exists: previously the first screen every visitor saw was the login
// form. Competitors (Naukri Resume Maker, Zety, Resume.io…) show a full sales
// page first — hero, templates, benefits, social proof, FAQ — and only then ask
// for an account. The "Start free" CTA asks visitors to sign in before
// continuing to the editor or import page.
//
// Everything here is static + reuses existing pieces (Thumb, sampleResume,
// Footer) so there is zero impact on the editor, the print pipeline or tests.
// Never rendered for a signed-in user.

import {
  CATEGORY_META, LAYOUT_META, TEMPLATES, TEMPLATE_COUNT, templateById, type Template,
} from '../lib/templates';
import { FIELDS } from '../lib/fields';
import { Thumb } from './Preview';
import { sampleResume } from '../lib/store';
import Footer from './Footer';
import type { GoogleAuthIssue } from '../lib/googleAuth';

/**
 * Real user reviews land here as they come in (beta feedback, Google Form
 * responses…). The section renders ONLY when this array is non-empty — we
 * never ship invented testimonials. Format: { name, role, quote, stars (1–5) }.
 */
const TESTIMONIALS: { name: string; role: string; quote: string; stars: number }[] = [];

/** Spread of designs across the catalogue for the landing strip. */
const STRIP_INDICES = [0, 7, 14, 21, 28, 35, 42, 49];
const stripTemplates: Template[] = STRIP_INDICES
  .map((i) => TEMPLATES[i])
  .filter((t): t is Template => !!t);

/** Keep these in sync with the FAQPage JSON-LD in index.html (same 8 Q&As). */
const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is CraftCV really 100% free?',
    a: 'Yes. Every template, the ATS match score, upload & edit, and unlimited PDF downloads are free. There is no paid plan, no trial, no credit card and no watermark — the product has no billing at all.',
  },
  {
    q: 'Can I edit my existing resume?',
    a: 'Yes — upload a PDF, DOCX, TXT or JSON file, or even a photo of a printed resume. Text is extracted on your device (scanned pages are read by an offline OCR engine) and lands straight into editable fields with a live preview. Nothing is uploaded to any server.',
  },
  {
    q: 'Will my resume pass ATS screening?',
    a: 'CraftCV templates are built on clean structures that applicant tracking systems parse reliably. You also get a free ATS check: paste any job description and see which keywords your resume already covers and which are missing.',
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

function Stars({ n }: { n: number }) {
  return <span aria-label={`${n} out of 5 stars`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export default function Landing({
  onStart,
  notice,
}: {
  onStart: (target?: string) => void;
  notice?: GoogleAuthIssue | null;
}) {
  const hero = sampleResume();
  const heroTpl = templateById('ats-sterling');

  return (
    <div className="landing no-print">
      {/* ---------- top bar ---------- */}
      <header className="land-top">
        <div className="land-top-inner">
          <div className="brand" style={{ padding: 0 }}>
            <div className="brand-badge">CV</div>
            <div>
              <div className="brand-name">CraftCV</div>
              <div className="brand-sub">Resume Studio · Free forever</div>
            </div>
          </div>
          <nav className="land-top-nav" aria-label="Landing">
            <a href="#templates">Templates</a>
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="land-top-actions">
            <a className="btn small" href="#/login">Sign in</a>
            <button type="button" className="btn small primary" onClick={() => onStart('/editor/new')}>
              Start free
            </button>
          </div>
        </div>
      </header>

      {notice && (
        <div className="land-notice" role="alert">
          <span>⚠️ {notice.title || 'Sign-in could not finish'}</span>
          <a className="btn small" href="#/login">See details & sign in</a>
        </div>
      )}

      {/* ---------- hero ---------- */}
      <section className="land-hero">
        <div className="land-hero-inner">
          <div className="land-hero-copy">
            <div className="land-eyebrow">100% free · no watermark · made for India 🇮🇳</div>
            <h1>The honest resume builder.<br />Everything free. Everything unlocked.</h1>
            <p className="land-lede">
              Build a recruiter-ready resume in about 10 minutes — or upload your old one and edit it.
              {` ${TEMPLATE_COUNT}`} professional templates, a free ATS match score, unlimited resumes and
              unlimited PDF downloads. No plans. No card. No watermark.
            </p>
            <div className="land-cta-row">
              <button type="button" className="btn primary land-cta" onClick={() => onStart('/editor/new')}>
                Start free
              </button>
              <button type="button" className="btn land-cta" onClick={() => onStart('/import')}>
                📤 Upload my old resume
              </button>
            </div>
            <div className="land-chips">
              <span className="land-chip">✓ All {TEMPLATE_COUNT} templates unlocked</span>
              <span className="land-chip">✓ Free ATS score</span>
              <span className="land-chip">✓ Free cover letter builder</span>
              <span className="land-chip">✓ PDF · DOCX · photo import</span>
              <span className="land-chip">✓ Works offline</span>
              <span className="land-chip">✓ Your data stays yours</span>
            </div>
          </div>
          <div className="land-hero-sheet" aria-hidden>
            <div className="land-sheet-frame">
              <Thumb r={hero} tpl={heroTpl} />
            </div>
            <div className="land-sheet-caption">Live A4 preview — this is the real thing, not a screenshot</div>
          </div>
        </div>
      </section>

      {/* ---------- numbers strip ---------- */}
      <section className="land-stats" aria-label="CraftCV in numbers">
        <div className="land-stat"><b>{TEMPLATE_COUNT}</b><span>templates, all unlocked</span></div>
        <div className="land-stat"><b>{FIELDS.length}</b><span>career fields tuned</span></div>
        <div className="land-stat"><b>₹0</b><span>forever — no plans</span></div>
        <div className="land-stat"><b>~10 min</b><span>to a finished PDF</span></div>
      </section>

      {/* ---------- comparison ---------- */}
      <section className="land-section" id="why">
        <h2>Why jobseekers switch to CraftCV</h2>
        <p className="land-section-sub">
          Most “free” resume builders paywall the download, watermark the file or lock every good
          template. Here is the honest comparison.
        </p>
        <div className="land-table-wrap">
          <table className="land-table">
            <thead>
              <tr><th>What you get</th><th>Typical “free” builders</th><th className="land-col-us">CraftCV</th></tr>
            </thead>
            <tbody>
              <tr><td>Resumes you can create</td><td>Usually 1</td><td className="land-col-us"><b>Unlimited</b></td></tr>
              <tr><td>Templates</td><td>3–5 free, the rest locked</td><td className="land-col-us"><b>All {TEMPLATE_COUNT} unlocked</b></td></tr>
              <tr><td>ATS match score vs a job description</td><td>Paid feature</td><td className="land-col-us"><b>Free, on-device</b></td></tr>
              <tr><td>Upload & edit an existing resume</td><td>Often missing</td><td className="land-col-us"><b>PDF · DOCX · TXT · photo — free</b></td></tr>
              <tr><td>Downloaded PDF</td><td>Watermarked or paywalled</td><td className="land-col-us"><b>Clean, no watermark, unlimited</b></td></tr>
              <tr><td>Price</td><td>₹500–₹1,000+ / month after trial</td><td className="land-col-us"><b>₹0 — forever</b></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- feature pillars ---------- */}
      <section className="land-section land-alt" id="features">
        <h2>Three things paid builders charge for — free here</h2>
        <div className="land-pillars">
          <article className="land-pillar">
            <div className="land-pillar-icon">📤</div>
            <h3>Upload & edit your old resume</h3>
            <p>
              Bring a PDF, DOCX, text file — or just a photo of a printed resume. An on-device reader
              (with a fully offline OCR engine for scans) rebuilds it into editable fields with a live
              preview beside you. The file never leaves your tab.
            </p>
          </article>
          <article className="land-pillar">
            <div className="land-pillar-icon">🎯</div>
            <h3>Free ATS match score</h3>
            <p>
              Paste any job description and get a live score: keywords your resume covers, and the ones
              missing — with an honest nudge to add them only if they are true. Re-scores as you type.
            </p>
          </article>
          <article className="land-pillar">
            <div className="land-pillar-icon">🖌️</div>
            <h3>{TEMPLATE_COUNT} templates for {FIELDS.length} career fields</h3>
            <p>
              ATS-safe classics and distinctive designs, tuned per field — IT, Data, Sales, Healthcare,
              Teaching, Design, Leadership and a dedicated Fresher set. Every single one unlocked.
            </p>
          </article>
        </div>
      </section>

      {/* ---------- template strip ---------- */}
      <section className="land-section" id="templates">
        <h2>Templates that look written by a professional</h2>
        <p className="land-section-sub">
          A taste of the {TEMPLATE_COUNT}-template collection — every one renders as a real A4 sheet in your
          browser, and every one downloads as a clean PDF.
        </p>
        <div className="land-strip">
          {stripTemplates.map((t) => (
            <figure className="land-tpl-card" key={t.id}>
              <div className="land-tpl-frame">
                <Thumb r={hero} tpl={t} />
              </div>
              <figcaption>
                <b>{t.name}</b>
                <span>{LAYOUT_META[t.layout]?.label} · {CATEGORY_META[t.category]?.label}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="land-center">
          <button type="button" className="btn primary" onClick={() => onStart('/editor/new')}>
            Browse all {TEMPLATE_COUNT} inside — free
          </button>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="land-section land-alt" id="how">
        <h2>Three steps to your finished PDF</h2>
        <div className="land-steps">
          <div className="land-step"><span className="land-step-num">1</span><div><h3>Fill or upload</h3><p>Type into 7 short steps, or upload your old resume / paste its text — we fill the form for you.</p></div></div>
          <div className="land-step"><span className="land-step-num">2</span><div><h3>Pick a template</h3><p>Switch designs anytime; your content never moves. Check the ATS score against a real job ad.</p></div></div>
          <div className="land-step"><span className="land-step-num">3</span><div><h3>Download clean PDF</h3><p>No watermark, no branding, your name on the file. Download as often as you like.</p></div></div>
        </div>
      </section>

      {/* ---------- privacy ---------- */}
      <section className="land-section land-privacy" id="privacy">
        <div className="land-privacy-inner">
          <h2>🔒 Your resume is nobody’s business but yours</h2>
          <p>
            Parsing, OCR and ATS scoring run entirely on your device. Your resumes live in your browser —
            and if you choose to sign in, in <em>your own</em> cloud database, protected by row-level security.
            We don’t sell data, we don’t share resumes with recruiters, and creating an account is free.
          </p>
          <p style={{ marginTop: 10, fontSize: 14 }}>
            Read the full policy:{' '}
            <a href="#/privacy" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>
              Privacy Policy
            </a>
            {' · '}
            <a href="#/terms" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>
              Terms of Service
            </a>
            {' · '}
            <a href="#/cookies" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>
              Cookie Policy
            </a>
          </p>
        </div>
      </section>

      {/* ---------- testimonials (renders only when real ones exist) ---------- */}
      {TESTIMONIALS.length > 0 && (
        <section className="land-section" id="reviews">
          <h2>What jobseekers say</h2>
          <div className="land-reviews">
            {TESTIMONIALS.map((t) => (
              <blockquote className="land-review" key={t.name}>
                <Stars n={t.stars} />
                <p>“{t.quote}”</p>
                <footer><b>{t.name}</b><span>{t.role}</span></footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* ---------- FAQ ---------- */}
      <section className="land-section land-alt" id="faq">
        <h2>Frequently asked questions</h2>
        <div className="land-faqs">
          {FAQS.map((f) => (
            <details className="land-faq" key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="land-final">
        <h2>Your next job starts with one honest page.</h2>
        <p>No card. No trial. No watermark. Just a resume you can stand behind.</p>
        <div className="land-cta-row land-center">
          <button type="button" className="btn primary land-cta" onClick={() => onStart('/editor/new')}>
            Build my resume — free
          </button>
          <a className="btn land-cta" href="#/login">Sign in / Create account</a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
