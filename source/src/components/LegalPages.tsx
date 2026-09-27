// Legal & info pages for CraftCV — a 100% free resume builder.
// Includes: About, Contact, Privacy, Terms, FAQ, Disclaimer, Cookie, EULA.
// No payments exist in the product, so there is no refund / shipping / cancellation policy.

function Shell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-head">
        <div>
          <div className="page-title">{title}</div>
          {sub && <div className="page-sub">{sub}</div>}
        </div>
      </div>
      <div className="card pad guide">{children}</div>
    </div>
  );
}

const UPDATED = 'Last updated: 24 September 2026';

export function AboutPage() {
  return (
    <Shell title="About CraftCV" sub="Why this product exists — and who builds it">
      <h3 className="mt0">Our mission</h3>
      <p>
        Most people write a resume three or four times in their life, usually in a hurry, usually without help.
        CraftCV exists so that anyone — a fresher in Patna, a nurse in Kochi, a sales manager in Pune — can
        produce a clean, honest, recruiter-ready resume in under ten minutes, without paying a rupee.
      </p>
      <h3>What makes it different</h3>
      <ul>
        <li><b>Completely free.</b> Unlimited resumes, unlimited PDF downloads, every template, no watermark, no “Pro” tier, no trial trap. Ever.</li>
        <li><b>Field-aware guidance.</b> Ten career fields, each with real example summaries, bullet templates and skill lists drawn from Indian workplaces.</li>
        <li><b>A proper template library.</b> Dozens of professionally designed A4 layouts — sidebar, classic serif, minimal, photo header, timeline, monogram, infographic and more — all built in code so they print pixel-perfect.</li>
        <li><b>Upload & edit.</b> Bring an existing PDF, DOCX or even a photo of a printed resume; we extract the text (with on-device OCR) and pre-fill the editor.</li>
        <li><b>Your data, your account.</b> Resumes are saved to your account so you can continue on any device. You can export or delete everything at any time.</li>
      </ul>
      <h3>Who we are</h3>
      <p>
        CraftCV is built by a small independent team in India. We are not funded by advertising and we do not sell user data.
        Write to us at <b>hello@craftcv.app</b>.
      </p>
    </Shell>
  );
}

export function ContactPage() {
  return (
    <Shell title="Contact us" sub="We reply within 2 working days (Mon–Sat, 10am–6pm IST)">
      <div className="tbl-wrap">
        <table className="tbl">
          <tbody>
            <tr><td><b>General & feedback</b></td><td style={{ wordBreak: 'break-all' }}>hello@craftcv.app</td></tr>
            <tr><td><b>Support (bugs, import issues)</b></td><td style={{ wordBreak: 'break-all' }}>support@craftcv.app</td></tr>
            <tr><td><b>Privacy & data requests</b></td><td style={{ wordBreak: 'break-all' }}>privacy@craftcv.app</td></tr>
            <tr><td><b>Legal</b></td><td style={{ wordBreak: 'break-all' }}>legal@craftcv.app</td></tr>
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 14 }}>
        <b>For support:</b> include your registered email, the browser you use, and a screenshot. If the problem is with an
        uploaded file, attaching the file (with personal details blurred) speeds things up a lot.
      </div>
    </Shell>
  );
}

export function PrivacyPage() {
  return (
    <Shell title="Privacy Policy" sub={UPDATED}>
      <p className="mt0">
        CraftCV is a free resume builder. This policy explains what we collect, why, where it is stored and what control you have.
        We follow the Information Technology Act 2000, the SPDI Rules 2011 and the Digital Personal Data Protection Act 2023.
      </p>

      <h3>1. What we collect</h3>
      <h4 style={{ fontSize: 14, color: 'var(--navy-800)' }}>A. Account data</h4>
      <ul>
        <li>Name and email address (from sign-up form or Google Sign-In)</li>
        <li>A salted password hash if you sign up with email — we never store the plain password</li>
        <li>Sign-in timestamps and basic security events (failed attempts, rate-limit hits)</li>
      </ul>
      <h4 style={{ fontSize: 14, color: 'var(--navy-800)' }}>B. Resume content</h4>
      <ul>
        <li>Everything you type into the builder: contact details, work history, education, skills, photo (optional)</li>
        <li>Files you upload for import (PDF / DOCX / image) are processed <b>inside your browser</b>; the file itself is not uploaded to us — only the extracted text becomes part of your resume</li>
        <li>Which template you chose and when you downloaded a PDF (used for product analytics — counts only, never the PDF)</li>
      </ul>
      <h4 style={{ fontSize: 14, color: 'var(--navy-800)' }}>C. Technical data</h4>
      <ul>
        <li>Browser type, screen size and approximate country (from standard request headers) — used to fix bugs and keep the layout working on phones</li>
        <li>We do <b>not</b> use advertising trackers, fingerprinting or third-party analytics cookies</li>
      </ul>

      <h3>2. Where your data is stored</h3>
      <ul>
        <li><b>In your browser</b> — a local copy is kept so the app works offline and loads instantly</li>
        <li><b>In your CraftCV account (cloud)</b> — resumes are synced to our database hosted on Supabase (PostgreSQL, encrypted at rest and in transit). Row-level security ensures only your account can read your rows; our staff cannot browse individual resumes in normal operation</li>
      </ul>

      <h3>3. Why we use it</h3>
      <ul>
        <li>To save your resumes and let you continue on any device</li>
        <li>To provide upload-and-edit, AI rewrite (only if you enable it) and PDF export</li>
        <li>To keep the service secure (rate limiting, abuse detection)</li>
        <li>To understand which templates and fields are used most, so we can improve them (aggregate counts only)</li>
      </ul>

      <h3>4. What we never do</h3>
      <ul>
        <li>Sell, rent or share your personal data or resume content with recruiters, advertisers or data brokers</li>
        <li>Train AI models on your resume content</li>
        <li>Send marketing email without your explicit opt-in</li>
      </ul>

      <h3>5. Third parties</h3>
      <ul>
        <li><b>Supabase</b> — database & authentication hosting (<a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">privacy policy</a>)</li>
        <li><b>Google</b> — only if you choose “Sign in with Google”; we receive your name, email and avatar</li>
        <li><b>Netlify</b> — static hosting and CDN for the web app</li>
        <li><b>Your own n8n / AI provider</b> — if you connect the optional AI webhook, text you send for rewriting goes to the endpoint <i>you</i> configured, not to us</li>
      </ul>

      <h3>6. Retention</h3>
      <p>
        Account and resume data are retained until you delete them. Deleting a resume removes it from our database immediately;
        deleting your account removes all resumes, events and profile data within 30 days (backups roll off within 30 days).
        Security logs are kept for 90 days.
      </p>

      <h3>7. Your rights</h3>
      <ul>
        <li><b>Access / export</b> — Settings → Export gives you all your data as JSON at any time</li>
        <li><b>Correction</b> — edit anything directly in the app</li>
        <li><b>Deletion</b> — Settings → Delete account, or email privacy@craftcv.app</li>
        <li><b>Grievance officer</b> — privacy@craftcv.app; we respond within 7 days as required by Indian law</li>
      </ul>

      <h3>8. Security</h3>
      <ul>
        <li>TLS 1.2+ for all traffic; database encrypted at rest (AES-256)</li>
        <li>Row-level security policies on every table; least-privilege API keys</li>
        <li>Password hashing with per-user salt; login rate limiting and lockout</li>
        <li>Input sanitisation and Content-Security-Policy headers to prevent XSS</li>
      </ul>

      <h3>9. Children</h3>
      <p>CraftCV is intended for users aged 16 and above. We do not knowingly collect data from children under 16.</p>

      <h3>10. Changes</h3>
      <p>We will announce material changes in the app and update the date at the top of this page.</p>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell title="Terms of Service" sub={UPDATED}>
      <h3 className="mt0">1. Agreement</h3>
      <p>
        By creating an account or using CraftCV you agree to these Terms and our Privacy Policy. These form a binding agreement
        under the Indian Contract Act, 1872. If you do not agree, please do not use the service.
      </p>

      <h3>2. The service</h3>
      <ul>
        <li>CraftCV is a browser-based resume builder with cloud sync, templates, import tools and PDF export</li>
        <li>The service is provided <b>free of charge</b>. There are no paid plans, in-app purchases or subscriptions</li>
        <li>We may add, change or remove features at any time. We will give reasonable notice before removing anything that affects saved resumes</li>
      </ul>

      <h3>3. Your account</h3>
      <ul>
        <li>You must provide accurate information and keep your password confidential</li>
        <li>One account per person. You are responsible for all activity under your account</li>
        <li>Minimum age is 16</li>
      </ul>

      <h3>4. Your content</h3>
      <ul>
        <li>You own the content you enter. You grant us a limited licence to store, process and display it solely to provide the service to you</li>
        <li>You are responsible for the truthfulness of your resume. Do not include false credentials or other people’s personal data without consent</li>
        <li>You may export or delete your content at any time</li>
      </ul>

      <h3>5. Acceptable use</h3>
      <p>You agree not to:</p>
      <ul>
        <li>Scrape, copy or redistribute the template library or example content as a competing product</li>
        <li>Upload malware, attempt to bypass security controls or overload the service</li>
        <li>Use the service to harass, defraud or impersonate anyone</li>
      </ul>

      <h3>6. Intellectual property</h3>
      <p>
        The CraftCV software, template designs, example text and brand are owned by CraftCV. Templates are original works created
        by our team. You receive a personal, non-exclusive licence to use them for your own resumes — including sending those resumes
        to any employer — but not to resell the templates themselves.
      </p>

      <h3>7. Templates & examples</h3>
      <p>
        Example summaries, bullets and skills are starting points. Replace placeholders with your own facts. We do not guarantee that
        any template will pass every applicant-tracking system, though single-column templates use ATS-friendly structure.
      </p>

      <h3>8. Disclaimer of warranties</h3>
      <p>
        The service is provided “as is”. We do not guarantee interviews, job offers, uninterrupted availability or error-free operation.
        Keep an exported copy of important resumes.
      </p>

      <h3>9. Limitation of liability</h3>
      <p>
        To the maximum extent permitted by law, CraftCV is not liable for indirect, incidental or consequential damages. Because the
        service is free, our total liability for any claim is limited to ₹1,000.
      </p>

      <h3>10. Termination</h3>
      <p>
        You may delete your account at any time. We may suspend accounts that violate these Terms. On termination we delete your
        data in line with the Privacy Policy.
      </p>

      <h3>11. Governing law</h3>
      <p>These Terms are governed by the laws of India. Courts in New Delhi have exclusive jurisdiction.</p>

      <h3>12. Contact</h3>
      <p>legal@craftcv.app</p>
    </Shell>
  );
}

export function FaqPage() {
  const faqs: [string, string][] = [
    ['Is CraftCV really free?', 'Yes — 100%. Unlimited resumes, unlimited PDF downloads, every template, no watermark. There is no paid plan and nothing to unlock.'],
    ['How do you make money then?', 'Right now we don’t. CraftCV is an independent project; we may add optional services (like career coaching partners) in future, but the builder itself will stay free.'],
    ['Where is my data saved?', 'In your CraftCV account — a secure PostgreSQL database hosted on Supabase with row-level security — plus a local copy in your browser so the app works offline. You can export or delete everything from Settings.'],
    ['Can I use it on my phone?', 'Yes. The editor, template gallery and PDF export all work on mobile browsers. Use “Whole page” in the preview to see the full A4 sheet.'],
    ['Will my resume pass ATS?', 'Single-column templates (Classic, Minimal, Dense, Executive) use standard headings and plain structure that ATS parsers read reliably. Two-column and photo templates look great for direct email / LinkedIn applications; for strict ATS portals choose a single-column layout.'],
    ['How do I import my old resume?', 'Go to Upload & Edit, drop a PDF, DOCX or a clear photo of your printed resume. Text is extracted on your device (with OCR for images) and the editor is pre-filled. Check names, phone numbers and dates afterwards.'],
    ['Can I add a photo?', 'Yes — Basics step → upload photo. Photo-first templates (Portrait, Studio, Monogram) are designed around it; others show a small round photo in the header.'],
    ['How do I download a PDF?', 'Click Download PDF. Your browser’s print dialog opens — choose “Save as PDF”, A4, margins “None”. The result is an exact copy of the preview.'],
    ['Is AI rewriting included?', 'AI rewrite is optional and runs through a webhook you configure (n8n + any LLM). See the n8n guide from the dashboard. Without it, all example content and templates still work.'],
    ['How do I delete my account?', 'Settings → Delete account. All resumes and profile data are removed from our database.'],
  ];
  return (
    <Shell title="FAQ" sub="Straight answers">
      {faqs.map(([q, a]) => (
        <div key={q} style={{ marginBottom: 14 }}>
          <b style={{ color: 'var(--navy-900)' }}>{q}</b>
          <p style={{ margin: '4px 0 0' }}>{a}</p>
        </div>
      ))}
      <div className="notice" style={{ marginTop: 8 }}>
        Something else? <a href="#/contact">Contact us</a> — we reply within 2 working days.
      </div>
    </Shell>
  );
}

export function DisclaimerPage() {
  return (
    <Shell title="Disclaimer" sub={UPDATED}>
      <ul className="mt0">
        <li><b>No employment guarantee.</b> CraftCV helps you present your experience clearly; it cannot guarantee interviews or job offers.</li>
        <li><b>Example content.</b> Sample summaries, bullets and numbers are illustrative. Do not submit them without replacing with your own facts.</li>
        <li><b>OCR & import accuracy.</b> Text extracted from PDFs, DOCX files and photos may contain mistakes. Always review imported fields.</li>
        <li><b>AI suggestions.</b> If you enable the optional AI webhook, generated text may be inaccurate. You are responsible for what you submit.</li>
        <li><b>External links.</b> We are not responsible for the content of third-party sites we link to.</li>
        <li><b>Availability.</b> We aim for high uptime but the service may be interrupted for maintenance. Keep exported copies of important resumes.</li>
      </ul>
    </Shell>
  );
}

export function CookiePage() {
  return (
    <Shell title="Cookie Policy" sub={UPDATED}>
      <p className="mt0">CraftCV uses a minimal set of browser storage, all of it strictly necessary to run the app.</p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Type</th><th>Purpose</th><th>Duration</th></tr></thead>
          <tbody>
            <tr><td>sb-*-auth-token</td><td>localStorage</td><td>Keeps you signed in to your CraftCV account (Supabase Auth)</td><td>Until logout</td></tr>
            <tr><td>craftcv.session.v2</td><td>localStorage</td><td>Local session mirror</td><td>Until logout</td></tr>
            <tr><td>craftcv.resumes.v1</td><td>localStorage</td><td>Offline copy of your resumes</td><td>Until deleted</td></tr>
            <tr><td>craftcv.audit.v2</td><td>localStorage</td><td>Local security log (rate limiting)</td><td>Rolling 200 entries</td></tr>
            <tr><td>craftcv.ai.*</td><td>localStorage</td><td>Your optional AI webhook settings</td><td>Until cleared</td></tr>
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 12 }}>
        We do not set advertising, analytics or cross-site tracking cookies. Clearing your browser storage signs you out; your
        resumes remain safe in your account.
      </p>
    </Shell>
  );
}

export function EulaPage() {
  return (
    <Shell title="End User Licence Agreement" sub={UPDATED}>
      <h3 className="mt0">1. Licence grant</h3>
      <p>
        CraftCV grants you a personal, non-exclusive, non-transferable, revocable licence to use the CraftCV web application and its
        templates to create resumes for yourself (or for a person who has asked you to help them).
      </p>
      <h3>2. Restrictions</h3>
      <ul>
        <li>Do not copy, modify, reverse-engineer or redistribute the software or template library</li>
        <li>Do not offer the templates for sale or as part of another product</li>
        <li>Do not remove notices or circumvent security features</li>
      </ul>
      <h3>3. Ownership</h3>
      <p>The software and templates remain the property of CraftCV. Your resume content remains yours.</p>
      <h3>4. Term</h3>
      <p>This licence lasts while you use the service and ends automatically if you breach these terms.</p>
      <h3>5. No warranty</h3>
      <p>The software is provided “as is”, free of charge, without warranty of any kind.</p>
      <h3>6. Governing law</h3>
      <p>Laws of India; courts of New Delhi.</p>
    </Shell>
  );
}
