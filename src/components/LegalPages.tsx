// Legal & info pages for ResumeMakery — a 100% free resume builder.
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

const UPDATED = 'Last updated: 30 September 2026';

export function AboutPage() {
  return (
    <Shell title="About ResumeMakery" sub="Why this product exists — and who builds it">
      <h3 className="mt0">Our mission</h3>
      <p>
        Most people write a resume three or four times in their life, usually in a hurry, usually without help.
        ResumeMakery exists so that anyone — a fresher in Patna, a nurse in Kochi, a sales manager in Pune — can
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
        ResumeMakery is built by a small independent team in India. We are not funded by advertising and we do not sell user data.
        Write to us at <b>hello@resumemakery.com</b>.
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
            <tr><td><b>General & feedback</b></td><td style={{ wordBreak: 'break-all' }}>hello@resumemakery.com</td></tr>
            <tr><td><b>Support (bugs, import issues)</b></td><td style={{ wordBreak: 'break-all' }}>support@resumemakery.com</td></tr>
            <tr><td><b>Privacy & data requests</b></td><td style={{ wordBreak: 'break-all' }}>privacy@resumemakery.com</td></tr>
            <tr><td><b>Legal</b></td><td style={{ wordBreak: 'break-all' }}>legal@resumemakery.com</td></tr>
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
        <b>ResumeMakery</b> (“we”, “us”, “our”) is a free, browser-based resume builder. This Privacy Policy explains in
        detail what personal information we collect, why we collect it, how it is stored, who it is shared with,
        how long it is kept, and what rights you have over it. It is written to satisfy the disclosure requirements
        of Google’s OAuth API verification, the Information Technology Act 2000, the SPDI Rules 2011 (India), and
        the Digital Personal Data Protection Act 2023 (DPDP Act, India). By using ResumeMakery you agree to the practices
        described below.
      </p>

      <h3>1. Who we are and how to contact us</h3>
      <ul>
        <li><b>Service:</b> ResumeMakery — Free Resume Builder</li>
        <li><b>Operator:</b> ResumeMakery (independent project, operated from India)</li>
        <li><b>Grievance Officer / Data Protection contact:</b> <a href="mailto:privacy@resumemakery.com">privacy@resumemakery.com</a></li>
        <li><b>General support:</b> <a href="mailto:support@resumemakery.com">support@resumemakery.com</a></li>
        <li><b>Legal:</b> <a href="mailto:legal@resumemakery.com">legal@resumemakery.com</a></li>
        <li><b>Response time:</b> we acknowledge every privacy request within 7 days and resolve it within 30 days, as required by Indian law</li>
      </ul>

      <h3>2. The personal information we collect</h3>
      <p>
        We collect only the information needed to provide the resume-building service. Below is the full list,
        grouped by purpose. Each item explains <i>what</i> is collected, <i>how</i> it is collected, and <i>why</i> it is needed.
      </p>

      <h4 style={{ fontSize: 14, color: 'var(--navy-800)' }}>A. Account information (only when you create an account)</h4>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Item</th><th>How it is collected</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr>
              <td>Email address</td>
              <td>Email + password sign-up, or Google Sign-In</td>
              <td>Unique account identifier, sign-in, password reset, security alerts</td>
            </tr>
            <tr>
              <td>Full name</td>
              <td>Email + password sign-up, or Google Sign-In (Google provides the “name” scope)</td>
              <td>Display name inside the app, default author name on resumes</td>
            </tr>
            <tr>
              <td>Password (email accounts only)</td>
              <td>You type it during sign-up</td>
              <td>Account access. We <b>never store the plaintext</b> — only a salted SHA-256 hash is persisted</td>
            </tr>
            <tr>
              <td>OAuth provider + provider user ID</td>
              <td>When you sign in with Google</td>
              <td>Account linking, “Sign in with Google” button labelling, security audit</td>
            </tr>
            <tr>
              <td>Avatar URL (Google only)</td>
              <td>Google Sign-In, when you grant the “profile” scope</td>
              <td>Optional profile picture in the app’s sidebar</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h4 style={{ fontSize: 14, color: 'var(--navy-800)' }}>B. Resume content (you control all of it)</h4>
      <ul>
        <li><b>Contact details</b> — name, phone, email, city, links (LinkedIn, GitHub, portfolio)</li>
        <li><b>Work history</b> — job titles, employer names, dates, responsibilities, achievements</li>
        <li><b>Education</b> — institutions, degrees, dates, grades</li>
        <li><b>Skills, projects, certifications, languages, hobbies, awards</b> — whatever you choose to add</li>
        <li><b>Optional profile photo</b> — uploaded by you; you can remove it at any time</li>
        <li><b>Template choice and layout settings</b> — which template you picked, accent colour, page size</li>
        <li><b>Cover letter content</b> — if you use the cover-letter feature</li>
      </ul>

      <h4 style={{ fontSize: 14, color: 'var(--navy-800)' }}>C. Files you upload for the “Upload &amp; Edit” feature</h4>
      <p>
        Files you upload (PDF, DOCX, TXT, JSON, or an image of a printed resume) are processed <b>entirely inside your
        browser</b>. The file itself is <b>never uploaded to our servers</b>. Only the extracted text — once you
        accept it — becomes part of your saved resume content (covered above).
      </p>
      <ul>
        <li>PDF / DOCX text extraction runs locally using PDF.js and a JS DOCX parser bundled with the app</li>
        <li>Image OCR runs locally using Tesseract.js (WASM + English language model) — the image does not leave your device</li>
      </ul>

      <h4 style={{ fontSize: 14, color: 'var(--navy-800)' }}>D. Usage and device information</h4>
      <ul>
        <li><b>Sign-in &amp; security events</b> — sign-in timestamps, failed attempts, rate-limit hits (kept in your
            browser for 200 events; the same information is also stored server-side for 90 days)</li>
        <li><b>Product analytics (aggregate counts only)</b> — template chosen, “PDF downloaded” count, feature used.
            No resume content, names, emails or other personal data is included in analytics events</li>
        <li><b>Standard request headers</b> — IP address (truncated to the network prefix), user-agent string and
            approximate country derived from the request. Used for rate limiting, abuse detection, and to keep the
            layout working on the devices people actually use</li>
      </ul>

      <h4 style={{ fontSize: 14, color: 'var(--navy-800)' }}>E. Information we do <b>not</b> collect</h4>
      <ul>
        <li>No advertising identifiers, no cross-site tracking pixels, no fingerprinting</li>
        <li>No third-party analytics cookies (no Google Analytics, no Facebook Pixel, no Mixpanel)</li>
        <li>No biometric data, no precise GPS location, no contacts, no camera or microphone access</li>
        <li>No purchase history — ResumeMakery has no billing system, because the service is free</li>
        <li>No “scraped” personal data — everything you see in ResumeMakery came from you</li>
      </ul>

      <h3>3. How and why we use your information (legal basis)</h3>
      <p>Under the DPDP Act 2023 the following are the <i>purposes</i> and <i>lawful uses</i> for which we process personal data:</p>
      <ul>
        <li><b>To provide the core service</b> (consent + performance of a contract) — saving your resumes, syncing across devices, rendering PDFs, ATS scoring, “Upload &amp; Edit” extraction</li>
        <li><b>To authenticate you</b> (consent + security) — verifying the email/password or Google sign-in, sending security alerts</li>
        <li><b>To keep the service secure</b> (legitimate interest) — rate limiting, brute-force protection, abuse detection, audit logs</li>
        <li><b>To improve the product</b> (legitimate interest) — understanding which templates and fields are most used; aggregate counts only, never resume content</li>
        <li><b>To comply with law</b> (legal obligation) — responding to valid legal requests, retaining tax/audit records where required</li>
        <li><b>Marketing email</b> (opt-in consent only) — we never send marketing email unless you explicitly subscribed. The service itself never sends marketing email</li>
      </ul>

      <h3>4. Google Sign-In — what Google shares with us, and what we share with Google</h3>
      <p>
        When you press “Continue with Google” the browser is sent to Google’s servers through a Supabase-mediated
        OAuth handshake (the standard “OAuth 2.0 Authorization Code with PKCE” flow). The redirect URI is
        <code> https://&lt;project-ref&gt;.supabase.co/auth/v1/callback</code>. After you consent, Supabase
        receives a one-time code and exchanges it with Google for the following <b>limited profile fields</b>:
      </p>
      <ul>
        <li><b>Email address</b> (always — required to identify your account)</li>
        <li><b>Full name</b> (from the <code>profile</code> scope)</li>
        <li><b>Profile picture URL</b> (from the <code>profile</code> scope, optional)</li>
        <li><b>Google account ID</b> (an opaque identifier — used only to detect duplicate sign-ins)</li>
      </ul>
      <p>
        We <b>do not request</b> and Google does <b>not send</b> your contacts, calendar, drive, Gmail, location,
        YouTube, or any other Google service data. The OAuth scopes used are exactly
        <code> openid email profile</code>. A full list of the scopes and the data Google exposes to ResumeMakery is also
        available on Google’s consent screen at sign-in time.
      </p>
      <p>
        ResumeMakery does not send any data back to Google from your account. We do not push resume content, downloads,
        or analytics into Google services, and we do not use Google signals for advertising.
      </p>
      <p>
        Google’s use of information it collects from ResumeMakery’s OAuth flow is governed by
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer"> Google’s Privacy Policy</a> and
        the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
        Google API Services User Data Policy</a> (including the Limited Use requirements). Google’s
        <a href="https://support.google.com/cloud/answer/9110914" target="_blank" rel="noreferrer"> data security
        terms</a> apply to any Google user data we receive.
      </p>

      <h3>5. Where your data is stored and how it is transferred</h3>
      <ul>
        <li><b>In your browser</b> — a local copy of your resumes, session token and settings is kept in
            <code>localStorage</code> and <code>sessionStorage</code> so the app loads instantly and works offline.
            You can clear it at any time from your browser settings; clearing it signs you out, but your resumes
            remain safe in your cloud account.</li>
        <li><b>In your ResumeMakery account (cloud)</b> — resumes, profile and analytics events are stored in a
            PostgreSQL database hosted on <b>Supabase</b> (Frankfurt / Singapore region, chosen by Supabase based on
            the user). The database is encrypted at rest (AES-256) and all traffic uses TLS 1.2+. Row-level
            security (RLS) policies on every table ensure that only your account can read your rows. Our
            operations team cannot browse individual resumes in normal operation.</li>
        <li><b>Static hosting / CDN</b> — the ResumeMakery web app itself (HTML, CSS, JS, fonts, icons) is served by
            <b>Vercel</b> (and a small set of static files by <b>Cloudflare</b> for the OCR engine assets).
            Vercel processes only standard HTTP request metadata — IP, user-agent, referrer — for caching, DDoS
            protection and analytics (aggregate counts only, no personal data).</li>
        <li><b>Cross-border transfer</b> — by using ResumeMakery you understand that your data may be processed in
            Supabase’s data centres outside India. We have selected Supabase because it provides contractual
            safeguards equivalent to those required by the DPDP Act for cross-border transfer.</li>
      </ul>

      <h3>6. Who we share your data with (and who we do not)</h3>
      <p>We <b>do not sell</b>, <b>do not rent</b>, and <b>do not trade</b> your personal information or your resume content with recruiters, advertisers, data brokers, marketing platforms, or any third party for their own use. Period.</p>
      <p>The only sharing we do is with the <i>sub-processors</i> required to run the service:</p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Sub-processor</th><th>Purpose</th><th>Data shared</th><th>Policy</th></tr></thead>
          <tbody>
            <tr><td><b>Supabase Inc.</b></td><td>Authentication, database, file storage</td><td>Account + resume data you choose to sync</td><td><a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">supabase.com/privacy</a></td></tr>
            <tr><td><b>Google LLC</b></td><td>OAuth sign-in (only when you press “Continue with Google”)</td><td>Name, email, avatar, Google account ID</td><td><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">policies.google.com/privacy</a></td></tr>
            <tr><td><b>Vercel Inc.</b></td><td>Static hosting &amp; CDN for the web app</td><td>Standard HTTP request metadata only (no resume / account content)</td><td><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">vercel.com/legal/privacy-policy</a></td></tr>
            <tr><td><b>Cloudflare, Inc.</b></td><td>CDN for the OCR engine assets (Tesseract WASM + language model)</td><td>Standard HTTP request metadata only</td><td><a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">cloudflare.com/privacypolicy</a></td></tr>
            <tr><td><b>Your own n8n / AI endpoint</b> (optional, only if you enable it)</td><td>AI rewrite suggestions</td><td>Only the text you choose to send</td><td>Whatever provider you configure — we do not control it</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        We will <b>not</b> share your data with any other third party unless (a) you give us explicit consent,
        (b) we are compelled by a valid Indian legal order, or (c) it is necessary to prevent imminent harm to
        a person (and even then only the minimum required).
      </p>

      <h3>7. Cookies, local storage and SDKs</h3>
      <p>ResumeMakery does not set any third-party tracking cookies. We use only <i>strictly necessary</i> browser storage to run the app:</p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Type</th><th>Purpose</th><th>Duration</th></tr></thead>
          <tbody>
            <tr><td><code>sb-*-auth-token</code></td><td>localStorage</td><td>Keeps you signed in to your ResumeMakery account (Supabase Auth)</td><td>Until logout or 7 days idle</td></tr>
            <tr><td><code>craftcv.session.v2</code></td><td>localStorage</td><td>Local session mirror (so the UI knows who is signed in synchronously)</td><td>Until logout</td></tr>
            <tr><td><code>craftcv.users.v2</code></td><td>localStorage</td><td>Local account record (offline-fallback mode)</td><td>Until you clear browser data</td></tr>
            <tr><td><code>craftcv.resumes.v1</code></td><td>localStorage</td><td>Offline copy of your resumes (so the app loads instantly)</td><td>Until cleared</td></tr>
            <tr><td><code>craftcv.audit.v2</code></td><td>localStorage</td><td>Local security log (rate limiting)</td><td>Rolling 200 entries</td></tr>
            <tr><td><code>craftcv.ai.*</code></td><td>localStorage</td><td>Your optional AI webhook settings</td><td>Until cleared</td></tr>
            <tr><td><code>craftcv.google.flow</code></td><td>sessionStorage</td><td>PKCE flow id for in-progress Google sign-in</td><td>Until sign-in completes</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        We do <b>not</b> load Google Analytics, Facebook Pixel, Hotjar, Mixpanel, Segment, Amplitude, Sentry, ad-tech,
        or any other third-party tracking SDK. The only third-party JavaScript that runs inside ResumeMakery is the
        Tesseract.js OCR engine and a Supabase Auth client — both bundled into the app itself, neither sends
        personal data to a third party beyond the operations described above.
      </p>

      <h3>8. How long we keep your data (retention)</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Category</th><th>Retention</th></tr></thead>
          <tbody>
            <tr><td>Account profile (name, email, provider)</td><td>Until you delete your account. Hard-deleted within 30 days of account deletion.</td></tr>
            <tr><td>Resume content (the JSON you saved)</td><td>Until you delete the resume. Removed immediately on request. Backups roll off within 30 days.</td></tr>
            <tr><td>Cover letter content</td><td>Until you delete it. Removed immediately.</td></tr>
            <tr><td>PDF download count (aggregate)</td><td>24 months</td></tr>
            <tr><td>Sign-in &amp; security events (server-side)</td><td>90 days</td></tr>
            <tr><td>Rate-limit &amp; abuse logs</td><td>30 days</td></tr>
            <tr><td>Backups</td><td>30 days rolling</td></tr>
          </tbody>
        </table>
      </div>

      <h3>9. Your rights and how to exercise them</h3>
      <p>You have the following rights under Indian law (DPDP Act 2023) and equivalent international frameworks:</p>
      <ul>
        <li><b>Right to access</b> — Settings → “Export data” downloads all your data as a single JSON file (account profile, resumes, cover letters, events)</li>
        <li><b>Right to correct</b> — edit anything directly in the app; the cloud copy updates automatically</li>
        <li><b>Right to delete (erasure)</b> — Settings → “Delete account” removes all your data permanently from production systems. Backups expire within 30 days. You can also email <a href="mailto:privacy@resumemakery.com">privacy@resumemakery.com</a> to request deletion</li>
        <li><b>Right to withdraw consent</b> — sign out, disconnect the Google account (Google account → “Third-party apps with account access” → ResumeMakery → “Remove access”), or email us</li>
        <li><b>Right to nominate</b> — under the DPDP Act you may nominate another person to exercise your rights in the event of death or incapacity; write to <a href="mailto:privacy@resumemakery.com">privacy@resumemakery.com</a></li>
        <li><b>Right to grievance redressal</b> — write to <a href="mailto:privacy@resumemakery.com">privacy@resumemakery.com</a>. We respond within 7 days and resolve within 30 days, as required by the IT Rules 2011</li>
        <li><b>Right to complain</b> — if unsatisfied, you may complain to the Data Protection Board of India under the DPDP Act 2023</li>
      </ul>

      <h3>10. Security of your information</h3>
      <p>We protect your data with industry-standard safeguards:</p>
      <ul>
        <li><b>Transport:</b> TLS 1.2+ for all traffic; HSTS preload recommended; HTTP → HTTPS redirect enforced</li>
        <li><b>Storage:</b> AES-256 encryption at rest on the database and file storage; encrypted daily backups</li>
        <li><b>Access control:</b> row-level security (RLS) policies on every table — only your account can read your rows; least-privilege API keys; service-role keys never shipped to the browser</li>
        <li><b>Authentication:</b> per-user salt + SHA-256 password hashing; sign-in rate limiting; automatic lock-out after 5 failed attempts (15 minutes); Supabase JWTs with short lifetimes and refresh tokens</li>
        <li><b>Browser hardening:</b> Content-Security-Policy headers (no inline third-party scripts), strict-origin referrer policy, X-Content-Type-Options: nosniff, Permissions-Policy (no camera / mic / geolocation), input sanitisation against XSS</li>
        <li><b>Operational:</b> employee access to production data requires a documented support ticket; we keep an audit trail; we run dependency scanning and continuous integration tests</li>
        <li><b>Incident response:</b> in the event of a personal-data breach we will notify affected users and the Data Protection Board within 72 hours, as required by the DPDP Act</li>
      </ul>

      <h3>11. Children’s privacy</h3>
      <p>
        ResumeMakery is intended for users aged <b>16 and above</b>. We do not knowingly collect personal information
        from anyone under 16. If you believe a child under 16 has created an account, email
        <a href="mailto:privacy@resumemakery.com"> privacy@resumemakery.com</a> and we will delete the account within 7 days.
        The service is not directed at children, and we do not show behavioural advertising to anyone.
      </p>

      <h3>12. International users</h3>
      <p>
        If you are in the European Economic Area, the United Kingdom, or California, you have additional rights
        (access, rectification, erasure, restriction of processing, data portability, objection, withdrawal of
        consent, and the right to lodge a complaint with your local data-protection authority). We honour all
        of these rights — the easiest way to exercise them is the in-app “Export data” and “Delete account”
        buttons, or by emailing <a href="mailto:privacy@resumemakery.com">privacy@resumemakery.com</a>.
      </p>

      <h3>13. Automated decision-making</h3>
      <p>
        ResumeMakery does <b>not</b> make automated decisions about you that produce legal effects (e.g. credit
        scoring, employment screening). The ATS score we display is a <i>suggestion</i> for you to act on, not
        a decision we make about you. The AI rewrite feature, if enabled, returns suggestions that you can
        accept, edit or ignore.
      </p>

      <h3>14. Changes to this policy</h3>
      <p>
        We will announce material changes in the app and update the “Last updated” date at the top of this
        page. If a change affects previously collected data in a meaningful way, we will ask for your renewed
        consent where required by law.
      </p>

      <h3>15. How to contact us</h3>
      <p>
        For any privacy question — access, deletion, correction, complaint, or general — email
        <a href="mailto:privacy@resumemakery.com"> privacy@resumemakery.com</a>. We respond within 7 days and resolve
        within 30 days, as required by the IT Rules 2011 and the DPDP Act 2023.
      </p>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell title="Terms of Service" sub={UPDATED}>
      <h3 className="mt0">1. Agreement</h3>
      <p>
        By creating an account or using ResumeMakery you agree to these Terms and our Privacy Policy. These form a binding agreement
        under the Indian Contract Act, 1872. If you do not agree, please do not use the service.
      </p>

      <h3>2. The service</h3>
      <ul>
        <li>ResumeMakery is a browser-based resume builder with cloud sync, templates, import tools and PDF export</li>
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
        The ResumeMakery software, template designs, example text and brand are owned by ResumeMakery. Templates are original works created
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
        To the maximum extent permitted by law, ResumeMakery is not liable for indirect, incidental or consequential damages. Because the
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
      <p>legal@resumemakery.com</p>
    </Shell>
  );
}

export function FaqPage() {
  const faqs: [string, string][] = [
    ['Is ResumeMakery really free?', 'Yes — 100%. Unlimited resumes, unlimited PDF downloads, every template, no watermark. There is no paid plan and nothing to unlock.'],
    ['How do you make money then?', 'Right now we don’t. ResumeMakery is an independent project; we may add optional services (like career coaching partners) in future, but the builder itself will stay free.'],
    ['Where is my data saved?', 'In your ResumeMakery account — a secure PostgreSQL database hosted on Supabase with row-level security — plus a local copy in your browser so the app works offline. You can export or delete everything from Settings.'],
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
        Something else? <a href="/contact">Contact us</a> — we reply within 2 working days.
      </div>
    </Shell>
  );
}

export function DisclaimerPage() {
  return (
    <Shell title="Disclaimer" sub={UPDATED}>
      <ul className="mt0">
        <li><b>No employment guarantee.</b> ResumeMakery helps you present your experience clearly; it cannot guarantee interviews or job offers.</li>
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
      <p className="mt0">ResumeMakery uses a minimal set of browser storage, all of it strictly necessary to run the app.</p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Type</th><th>Purpose</th><th>Duration</th></tr></thead>
          <tbody>
            <tr><td>sb-*-auth-token</td><td>localStorage</td><td>Keeps you signed in to your ResumeMakery account (Supabase Auth)</td><td>Until logout</td></tr>
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
        ResumeMakery grants you a personal, non-exclusive, non-transferable, revocable licence to use the ResumeMakery web application and its
        templates to create resumes for yourself (or for a person who has asked you to help them).
      </p>
      <h3>2. Restrictions</h3>
      <ul>
        <li>Do not copy, modify, reverse-engineer or redistribute the software or template library</li>
        <li>Do not offer the templates for sale or as part of another product</li>
        <li>Do not remove notices or circumvent security features</li>
      </ul>
      <h3>3. Ownership</h3>
      <p>The software and templates remain the property of ResumeMakery. Your resume content remains yours.</p>
      <h3>4. Term</h3>
      <p>This licence lasts while you use the service and ends automatically if you breach these terms.</p>
      <h3>5. No warranty</h3>
      <p>The software is provided “as is”, free of charge, without warranty of any kind.</p>
      <h3>6. Governing law</h3>
      <p>Laws of India; courts of New Delhi.</p>
    </Shell>
  );
}
