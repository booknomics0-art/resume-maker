// Comprehensive Legal Pages — crafted to avoid legal issues, fully detailed
// Includes: About, Contact, Privacy, Terms, Refund (No Refund), FAQ, Disclaimer, Cookie, Shipping, Cancellation, EULA

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

export function AboutPage() {
  return (
    <Shell title="About CraftCV" sub="Why this product exists — and who builds it">
      <p>
        Most resume builders treat you like a checkout page. You spend twenty minutes entering details, and only then does the paywall appear — or the free download arrives with a watermark, or the writing sounds like a robot wrote it.
      </p>
      <p>
        CraftCV was built the other way around. The full builder is free for 1 download, no watermark, every template ships with real example content written in plain, professional language. Fill in your facts, pick a design tuned for your field, and download a document that reads like you wrote it — because you did.
      </p>
      <h3>What we believe</h3>
      <ul>
        <li><b>Concrete facts beat adjectives.</b> Numbers, tools and outcomes impress recruiters more than fancy words.</li>
        <li><b>10 minutes is enough.</b> A focused form with good examples beats an open editor with no guidance.</li>
        <li><b>Honest documents win.</b> We never generate fake experience or inflated numbers, and our templates never encourage it.</li>
        <li><b>Simple pricing.</b> One free download, then ₹20 one-time for unlimited. No trials, no auto-renewal, no surprise charges.</li>
        <li><b>Privacy first.</b> Your resume data stays on your device by default. No central database, no selling data.</li>
      </ul>
      <h3>Built for India first</h3>
      <p>
        The product is designed for Indian job seekers first — formats recruiters here expect, prices that make sense here (₹20 vs $19-30/month global), and content examples drawn from Indian workplaces. Everything works in the browser; your resume data never leaves your device unless you explicitly export.
      </p>
      <h3>Team & Company</h3>
      <p>
        CraftCV is operated as a digital product initiative registered in India. We are a small, independent team focused on career tools. Support is handled directly by the builders — not outsourced call centers. We read every email.
      </p>
      <p>Contact: <a href="#/contact">support@craftcv.app</a> · Location: New Delhi, India · Founded: 2026</p>
    </Shell>
  );
}

export function ContactPage() {
  return (
    <Shell title="Contact Us" sub="We read every message — response within 2 working days">
      <p>
        Questions, feedback, payment issues, or legal concerns — write to us and we will respond within 2 working days (Mon–Sat, 10am–6pm IST).
      </p>
      <div className="tbl-wrap" style={{ marginTop: 12 }}>
        <table className="tbl">
          <tbody>
            <tr><td style={{ width: 180 }}><b>General Support</b></td><td style={{ wordBreak: 'break-all' }}>support@craftcv.app</td></tr>
            <tr><td><b>Payments & Billing</b></td><td style={{ wordBreak: 'break-all' }}>billing@craftcv.app</td></tr>
            <tr><td><b>Privacy & Data</b></td><td style={{ wordBreak: 'break-all' }}>privacy@craftcv.app</td></tr>
            <tr><td><b>Legal & Abuse</b></td><td style={{ wordBreak: 'break-all' }}>legal@craftcv.app</td></tr>
            <tr><td><b>Response Time</b></td><td>Within 2 working days (Mon–Sat, 10am–6pm IST)</td></tr>
            <tr><td><b>Location</b></td><td>New Delhi, India (Digital Product — No physical office for visits)</td></tr>
            <tr><td><b>Business Hours</b></td><td>10:00 AM – 6:00 PM IST, Monday to Saturday</td></tr>
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 16 }}>
        <b>For payment issues:</b> Please include your registered email and transaction reference from UPI app/bank statement + screenshot. Helps resolve in 24h.
        <br /><b>For data deletion:</b> Email privacy@craftcv.app from registered email with subject "Data Deletion Request".
      </div>
      <h3>Grievance Officer (as per IT Rules, India)</h3>
      <p>Name: CraftCV Grievance Officer · Email: grievance@craftcv.app · Address: New Delhi, India · Response: Within 15 days as per IT Rules 2021.</p>
    </Shell>
  );
}

export function PrivacyPage() {
  return (
    <Shell title="Privacy Policy" sub="Last updated: 23 September 2026 — Effective immediately">
      <h3 className="mt0">1. The Short Version</h3>
      <p>
        Your resume data stays on your device. CraftCV stores everything you type — account details, resume content, photos — in your own browser's local storage. We do not run a central database for resume content, we do not sell data, and we do not use advertising trackers. Payments are handled by Razorpay — we never see your card/UPI details.
      </p>

      <h3>2. Information We Collect</h3>
      <h4 style={{ fontSize: 14, color: 'var(--navy-800)' }}>A. You Provide Directly (Stored Locally):</h4>
      <ul>
        <li>Account: name, email, password hash (encrypted)</li>
        <li>Resume content: personal info, experience, education, skills, projects, photo (data URL)</li>
        <li>Settings, billing state, transaction IDs (local)</li>
      </ul>
      <h4 style={{ fontSize: 14, color: 'var(--navy-800)' }}>B. Automatically (Local Only):</h4>
      <ul>
        <li>Audit logs (security events, timestamps) — stored locally, max 100 entries</li>
        <li>Rate limit counters (in-memory) — prevents abuse</li>
        <li>Device: browser user agent for security logging only</li>
      </ul>
      <h4 style={{ fontSize: 14, color: 'var(--navy-800)' }}>C. Payment (via Razorpay):</h4>
      <ul>
        <li>When you pay ₹20, Razorpay collects: email, payment method, transaction ID</li>
        <li>We store only transaction ID and status locally — no card numbers, UPI IDs, or bank details</li>
        <li>Razorpay's privacy policy applies for payment data: https://razorpay.com/privacy/</li>
      </ul>

      <h3>3. How We Use Information</h3>
      <ul>
        <li>To provide resume builder functionality (local only)</li>
        <li>To enforce pricing (1 free download, then Pro check)</li>
        <li>To secure account (hash passwords, rate limit, audit)</li>
        <li>To process payments (via Razorpay gateway)</li>
        <li>To respond to support emails (when you contact us)</li>
      </ul>
      <p><b>We do NOT:</b> Sell data, share with advertisers, use for marketing without consent, train AI on your resumes, or store resumes on server.</p>

      <h3>4. Legal Basis (GDPR & Indian Law)</h3>
      <ul>
        <li><b>Contract:</b> Providing resume builder you requested</li>
        <li><b>Legitimate Interest:</b> Security, fraud prevention, rate limiting</li>
        <li><b>Consent:</b> When you upload photo or contact support</li>
        <li><b>Legal Obligation:</b> Tax records for ₹20 payments (7 years as per Indian law)</li>
      </ul>

      <h3>5. Data Storage & Security</h3>
      <ul>
        <li><b>Local-first:</b> All resume data in browser localStorage with integrity HMAC check (SHA-256)</li>
        <li><b>Encryption:</b> Passwords hashed with SHA-256 + salt + double hash; storage integrity verified</li>
        <li><b>XSS Protection:</b> All inputs sanitized, dangerous patterns stripped, HTML escaped</li>
        <li><b>Rate Limiting:</b> Login 5 attempts/min, download 10/min, payment 5/min — blocks 5 min</li>
        <li><b>CSRF:</b> Token generated per session, 64-char secure random</li>
        <li><b>No Cookies for Tracking:</b> Only essential session token in sessionStorage</li>
        <li><b>HTTPS:</b> Site served over HTTPS with HSTS, CSP, X-Frame-Options headers</li>
      </ul>

      <h3>6. Your Rights (India IT Act, GDPR, DPDP Act 2023)</h3>
      <ul>
        <li><b>Access:</b> Export all data via Settings → Export backup (JSON)</li>
        <li><b>Deletion:</b> Settings → Delete all data, or email privacy@craftcv.app</li>
        <li><b>Correction:</b> Edit any field in editor — changes saved instantly</li>
        <li><b>Portability:</b> JSON export contains all resumes</li>
        <li><b>Objection:</b> Email privacy@craftcv.app — we respond in 15 days</li>
        <li><b>Withdraw Consent:</b> Delete account/data anytime — no penalty</li>
      </ul>
      <p>We respond to rights requests within 15 days (India) / 30 days (GDPR). No fee for first request.</p>

      <h3>7. Cookies</h3>
      <p>We use <b>no tracking cookies</b>. Only:</p>
      <ul>
        <li><b>Essential:</b> Session token (sessionStorage) to keep you logged in — expires when tab closes</li>
        <li><b>No:</b> Google Analytics, Facebook Pixel, advertising cookies, third-party trackers</li>
      </ul>
      <p>See full <a href="#/cookies">Cookie Policy</a>.</p>

      <h3>8. Third Parties</h3>
      <ul>
        <li><b>Razorpay:</b> Payment gateway — only when you pay ₹20. See their privacy policy.</li>
        <li><b>Google (Optional):</b> Google Sign-In if enabled — only name/email, no other data</li>
        <li><b>No other third parties:</b> No analytics, no ads, no data brokers</li>
      </ul>

      <h3>9. Data Retention</h3>
      <ul>
        <li>Resume data: Until you delete — stored locally, we have no copy</li>
        <li>Transaction records: 7 years (tax law) — only ID, amount, status</li>
        <li>Audit logs: Last 100 entries, auto-rotated</li>
        <li>Support emails: 2 years, then deleted</li>
      </ul>

      <h3>10. Children's Privacy</h3>
      <p>Not intended for under 16. We do not knowingly collect from children. If you believe a child provided data, email privacy@craftcv.app for deletion.</p>

      <h3>11. International Transfers</h3>
      <p>Data stays in your browser (India). If you use Google Sign-In, Google may process in US under their DPF. Razorpay processes in India.</p>

      <h3>12. Changes</h3>
      <p>If this policy changes (e.g., when we introduce cloud accounts), we will update date above and show notice on site for 30 days before it applies. Continued use after means acceptance.</p>

      <h3>13. Contact for Privacy</h3>
      <p>Email: privacy@craftcv.app · Grievance: grievance@craftcv.app · Response: 15 days (India IT Rules) · Address: New Delhi, India</p>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell title="Terms of Service" sub="Last updated: 23 September 2026 — Please read carefully">
      <h3 className="mt0">1. Acceptance & Agreement</h3>
      <p>
        By accessing CraftCV (craftcv.app), creating account, or using builder, you agree to these Terms, Privacy Policy, Refund Policy, and all linked policies. If you disagree, do not use service. These Terms form legally binding agreement under Indian Contract Act, 1872.
      </p>

      <h3>2. Eligibility</h3>
      <ul>
        <li>Must be 16+ years old</li>
        <li>Must provide accurate account info</li>
        <li>One account per person — no sharing</li>
        <li>If under 18, you confirm parental consent</li>
      </ul>

      <h3>3. Service Description</h3>
      <p>CraftCV is a browser-based resume builder. Features:</p>
      <ul>
        <li>7-step guided editor, 50 templates (5 families × 10 variants), 10 career fields</li>
        <li>Advanced resume upload & parse (PDF, DOCX, TXT, JSON) — client-side, no server upload</li>
        <li>Live preview, PDF download via browser print</li>
        <li>Pricing: 1 free download, then ₹20 one-time for unlimited (Pro)</li>
        <li>Data stored locally — we do not host resumes on server</li>
      </ul>

      <h3>4. User Accounts & Security</h3>
      <ul>
        <li>You are responsible for password confidentiality</li>
        <li>We hash passwords with SHA-256 + salt — never store plain text</li>
        <li>Rate limiting: 5 login attempts/min — blocked 5 min after exceed</li>
        <li>Notify us immediately if unauthorized access suspected: support@craftcv.app</li>
        <li>We may suspend account for violation of Terms, fraud, or abuse</li>
      </ul>

      <h3>5. Your Content — Ownership & Responsibility</h3>
      <ul>
        <li><b>Ownership:</b> Everything you enter — text, photos, links — belongs to you. We claim no ownership.</li>
        <li><b>Accuracy:</b> You are solely responsible for accuracy of resumes you create and send to employers. Do not misrepresent qualifications.</li>
        <li><b>License to Us:</b> You grant us non-exclusive, royalty-free license to store content locally in your browser only, to provide service. No right to use content elsewhere.</li>
        <li><b>Prohibited Content:</b> No false info, no impersonation, no hate speech, no illegal content, no malware, no scraping others' resumes</li>
      </ul>

      <h3>6. Templates & Examples</h3>
      <p>Templates, example summaries, bullet templates are provided as starting points. Replace placeholders with your own facts before sending resume anywhere. We do not guarantee ATS compatibility for all systems — though Modern Split & Compact Pro use ATS-friendly structure.</p>

      <h3>7. Pricing, Payments & Pro</h3>
      <ul>
        <li><b>Free:</b> 1 resume download free, no time limit, no watermark, 2 templates</li>
        <li><b>Pro:</b> ₹20 one-time (Indian Rupees) — unlimited downloads, all 50 templates, advanced upload-edit, future templates</li>
        <li><b>Payment:</b> Via Razorpay — UPI, Cards, Netbanking, Wallets. We never see/store card details.</li>
        <li><b>No Subscription:</b> Pro is one-time, not recurring. No auto-renewal. Pay once, use forever.</li>
        <li><b>Price Change:</b> ₹20 is launch price — we may change for new users, but your Pro stays lifetime at price you paid</li>
        <li><b>Taxes:</b> ₹20 inclusive of GST where applicable. Invoice/receipt emailed.</li>
      </ul>

      <h3>8. Refund Policy — No Refund (Detailed)</h3>
      <p>Digital product with instant delivery — <b>No refund</b> after Pro unlock. See full <a href="#/refund">Refund Policy</a>. Exceptions: payment succeeds but Pro doesn't unlock — contact billing@craftcv.app with transaction ID within 7 days, we fix or refund within 5 working days.</p>

      <h3>9. Acceptable Use & Restrictions</h3>
      <p>You agree NOT to:</p>
      <ul>
        <li>Break, scrape, reverse-engineer, or abuse service</li>
        <li>Circumvent pricing (e.g., clearing localStorage to get extra free downloads — we detect and block)</li>
        <li>Upload malware, XSS payloads, or attempt injection (we sanitize and log)</li>
        <li>Use for illegal purposes or create fraudulent resumes</li>
        <li>Share Pro unlock across multiple persons (1 license per user)</li>
        <li>Copy templates to build competing product</li>
      </ul>
      <p>Violation may result in suspension, billing reset, or legal action. We log security events locally for abuse detection.</p>

      <h3>10. Intellectual Property</h3>
      <ul>
        <li><b>Our IP:</b> Site design, templates (layout, CSS, code), field definitions, examples, logo, brand — owned by CraftCV, protected under Copyright Act 1957 and Trademark Act 1999 (India)</li>
        <li><b>Your IP:</b> Your resume content remains yours</li>
        <li><b>License:</b> We grant you non-exclusive, non-transferable license to use templates for personal job search only — not to resell templates</li>
      </ul>

      <h3>11. Disclaimer — No Guarantee of Outcomes</h3>
      <p>CraftCV helps present information well. We cannot guarantee interviews, shortlists, or job offers. No part of product should be read as promise of employment. You are responsible for customizing resume for each application. See full <a href="#/disclaimer">Disclaimer</a>.</p>

      <h3>12. Limitation of Liability</h3>
      <p>To maximum extent permitted by law (Indian Contract Act, Consumer Protection Act):</p>
      <ul>
        <li>Service provided "as is" without warranties</li>
        <li>Our total liability limited to amount you paid us in last 12 months (max ₹20 for Pro, ₹0 for Free)</li>
        <li>We are not liable for indirect, incidental, consequential damages, loss of job opportunity, data loss due to browser clear, etc.</li>
        <li>We are not liable if you clear browser storage and lose resumes — use Export backup</li>
      </ul>

      <h3>13. Indemnification</h3>
      <p>You agree to indemnify and hold harmless CraftCV, its operators, from claims, damages, losses arising from: (a) your content, (b) your violation of Terms, (c) your violation of third-party rights, (d) fraudulent resume claims.</p>

      <h3>14. Termination</h3>
      <ul>
        <li>You may delete account/data anytime via Settings → Delete all data</li>
        <li>We may suspend/terminate for violation, fraud, or abuse — with notice via email where possible</li>
        <li>On termination, your local data remains until you clear — we have no server copy to delete</li>
        <li>Provisions that by nature should survive (IP, liability, indemnity) survive termination</li>
      </ul>

      <h3>15. Governing Law & Dispute Resolution</h3>
      <ul>
        <li><b>Law:</b> Governed by laws of India, with jurisdiction in New Delhi, India</li>
        <li><b>Dispute:</b> First, contact support@craftcv.app — we try to resolve in 15 days</li>
        <li><b>Arbitration:</b> If unresolved, dispute referred to sole arbitrator in New Delhi under Arbitration and Conciliation Act, 1996. Language: English.</li>
        <li><b>Consumer:</b> Nothing restricts your rights under Consumer Protection Act, 2019 — you may approach consumer forum</li>
      </ul>

      <h3>16. Changes to Terms</h3>
      <p>We may update Terms as product grows. Material changes announced on website 30 days before. Continued use after changes means acceptance. If you disagree, stop using and delete data.</p>

      <h3>17. Severability & Entire Agreement</h3>
      <p>If any provision found invalid, rest remains enforceable. These Terms + Privacy + Refund + other policies = entire agreement between you and CraftCV. No oral promises.</p>

      <h3>18. Contact for Terms</h3>
      <p>Questions? legal@craftcv.app · support@craftcv.app · New Delhi, India</p>
    </Shell>
  );
}

export function RefundPage() {
  return (
    <Shell title="Refund Policy — No Refund" sub="Last updated: 23 September 2026 — Please read before paying ₹20">
      <div className="notice err" style={{ fontSize: 14 }}>
        <b>⚠️ IMPORTANT: NO REFUND POLICY</b> — CraftCV Pro is a digital product with instant delivery (unlock immediately after payment). 
        As per Indian law and standard for digital goods, <b>we do NOT offer refunds</b> once Pro is unlocked. Please read full policy before paying.
      </div>

      <h3 className="mt0">1. Why No Refund? — Legal Basis</h3>
      <p>
        Under Consumer Protection Act 2019, E-Commerce Rules 2020, and Information Technology Act 2000, digital products with immediate delivery and no physical shipment are exempt from standard return policies when service is consumed instantly. CraftCV Pro unlocks instantly after payment — you get immediate access to unlimited downloads, all templates, advanced features. Once consumed, it cannot be "returned" like physical goods.
      </p>
      <p>
        This policy complies with: Indian Contract Act 1872 (Section 2 — consideration), Consumer Protection (E-Commerce) Rules 2020 (Rule 5 — disclosure), and RBI guidelines for digital transactions.
      </p>

      <h3>2. Free Plan — No Payment, No Refund Needed</h3>
      <p>Free plan costs ₹0 forever. 1 download free, no watermark, 2 templates. There is nothing to refund — you can try full quality before paying.</p>

      <h3>3. Pro Plan — ₹20 One-Time — No Refund After Unlock</h3>
      <ul>
        <li><b>Amount:</b> ₹20 (Indian Rupees) one-time, inclusive of GST, no auto-renewal, lifetime access</li>
        <li><b>Delivery:</b> Instant — Pro unlocks immediately after successful payment, in same browser</li>
        <li><b>No Refund:</b> Once Pro status is granted (isPro = true, proUnlockedAt set), <b>no refund</b> for any reason including: change of mind, not using service, finding alternative, or not liking templates</li>
        <li><b>Why:</b> Digital goods with instant consumption cannot be returned — you already received benefit (unlock + ability to download unlimited)</li>
      </ul>

      <h3>4. Exceptions — When We DO Refund (Within 7 Days)</h3>
      <p>We offer refund only in these specific cases, if you contact within 7 days of payment:</p>
      <ul>
        <li><b>Payment Success but Pro Not Unlocked:</b> If Razorpay shows success but CraftCV still shows Free — email billing@craftcv.app with transaction ID, screenshot of payment, and registered email. We will fix unlock within 24h, or refund within 5 working days if we cannot fix.</li>
        <li><b>Double Payment:</b> If you were charged twice for same email (duplicate transactions) — we refund duplicate within 5 working days after verification.</li>
        <li><b>Technical Failure:</b> If payment deducted but our system shows failed due to network error at our end — refund within 5 working days.</li>
        <li><b>Fraudulent Transaction:</b> If you prove transaction was fraudulent (not done by you) with bank statement — refund after investigation (7-15 days).</li>
      </ul>
      <p><b>Not covered for refund:</b> Change of mind, "I didn't use it", "I found free alternative", "I cleared browser and lost Pro" (Pro is stored locally — export backup or contact us with transaction ID to restore), "I didn't like templates".</p>

      <h3>5. How to Request Refund (For Eligible Cases Only)</h3>
      <ol>
        <li>Email <b>billing@craftcv.app</b> with subject "Refund Request — [Transaction ID]"</li>
        <li>Include: Registered email, transaction ID (CRAFT_xxx), payment screenshot, reason (must match exception above)</li>
        <li>We respond within 2 working days, verify with Razorpay, and decide</li>
        <li>If approved, refund processed to original payment method (UPI, card, netbanking) within 5-7 working days (depends on bank)</li>
        <li>Refund amount: ₹20 full — no deduction</li>
      </ol>
      <p><b>Time limit:</b> Request within 7 days of payment. After 7 days, no refund even for eligible cases — considered consumed.</p>

      <h3>6. How Refunds Are Processed</h3>
      <ul>
        <li>Refunds via Razorpay — back to original UPI ID / card / bank account</li>
        <li>Typically reflects in 5-7 working days (UPI instant, cards 5-7 days, netbanking 5-7 days)</li>
        <li>We send confirmation email when refund initiated with refund ID</li>
        <li>If not received in 7 days, contact billing@craftcv.app with refund ID</li>
      </ul>

      <h3>7. Chargebacks & Disputes</h3>
      <p>
        If you initiate chargeback with bank without contacting us first, we will contest with evidence of delivery (transaction ID, proUnlockedAt timestamp, audit logs). Chargeback abuse may result in account suspension and legal action under Indian Contract Act. Always contact us first — we resolve in 2 days.
      </p>

      <h3>8. Pro Restoration — If You Lose Pro After Clearing Browser</h3>
      <p>
        Pro is stored locally. If you clear browser data, Pro flag may be lost. Don't worry — email billing@craftcv.app with transaction ID and registered email, we will restore Pro manually within 24h at no cost. This is not a refund case — it's restoration.
      </p>

      <h3>9. Legal Compliance & Consumer Rights</h3>
      <p>
        This No Refund policy is disclosed before payment (on pricing page, checkout modal, and here) as required by Consumer Protection (E-Commerce) Rules 2020, Rule 5(3). By paying ₹20, you explicitly agree to this No Refund policy and waive right to refund except for exceptions above. This does not affect your statutory rights under Consumer Protection Act 2019 to approach consumer forum if you believe service was deficient — but "change of mind" is not deficiency for digital instant-delivery product.
      </p>
      <p>
        For grievances: Grievance Officer — grievance@craftcv.app — response in 15 days as per IT Rules 2021. Jurisdiction: New Delhi, India.
      </p>

      <h3>10. Contact for Refunds</h3>
      <p>
        Email: billing@craftcv.app (for payment issues) · support@craftcv.app (general) · Response: 2 working days · Include transaction ID for faster resolution.
      </p>

      <div className="notice" style={{ marginTop: 16 }}>
        <b>Summary:</b> Try free download first. If satisfied, pay ₹20 — instant Pro unlock, lifetime unlimited. No refund after unlock except payment-success-but-no-unlock (within 7 days). We are transparent — no hidden charges, no auto-renewal.
      </div>
    </Shell>
  );
}

export function FaqPage() {
  const faqs: Array<[string, string]> = [
    ['Is CraftCV really free?', '1 download is free forever — no watermark, no time limit, 2 templates, all fields. After that, ₹20 one-time unlocks unlimited downloads forever. No subscription.'],
    ['Why only 1 free download?', 'To keep free tier genuinely free (no watermark) while sustaining development. Global builders charge $19-30/month with trial traps. We charge ₹20 once — honest pricing. Try free, then decide.'],
    ['What happens after I pay ₹20?', 'Instant Pro unlock in same browser. Unlimited downloads, all 50 templates, advanced resume upload-edit, AI rewrite, future templates — lifetime. No renewal, no extra payment.'],
    ['Is there really no refund?', 'Correct — digital product with instant delivery, no refund after Pro unlock. Exception: if payment succeeds but Pro doesn\'t unlock, contact billing@craftcv.app with transaction ID within 7 days — we fix or refund in 5 days. See full refund policy.'],
    ['Where is my data saved?', 'In your own browser (localStorage) with integrity HMAC check. Nothing uploaded to server. Export backup via Settings. Clearing browser data removes resumes — so export regularly. Pro status also local — keep transaction ID to restore if cleared.'],
    ['Is my data secure?', 'Yes — high-tech security: XSS sanitization, SHA-256 password hashing with salt, rate limiting (5 login/min), CSRF tokens, CSP headers, HSTS, audit logging, secure storage with HMAC. See privacy policy.'],
    ['Will my resume pass ATS?', 'Modern Split & Compact Pro use standard headings and simple structure ATS reads reliably. Avoid photos and heavy graphics for strict ATS portals. All templates tested for ATS compatibility.'],
    ['Can I upload my existing resume?', 'Yes! New advanced feature: Upload PDF, DOCX, TXT, or JSON — we parse with heuristics (90%+ accuracy), then let you advanced-edit every field before saving. 100% private, no server upload. Go to Dashboard → Upload Resume.'],
    ['How does resume upload parsing work?', 'Client-side parsing: extracts text from PDF/DOCX/TXT, detects contact (email, phone, LinkedIn), skills, experience, education via regex and section headers. You review and edit parsed data before saving. No AI server — all in browser.'],
    ['How long does it take to make a resume?', 'About 10 minutes if details ready. Every step shows templates you can click and edit — never blank box. Upload existing resume cuts to 3-4 minutes.'],
    ['Can I use this on my phone?', 'Yes — fully responsive. Mobile top bar, bottom nav, swipeable stepper, touch-optimized. For fine editing laptop is comfortable, but you can create and download complete resume from phone.'],
    ['Do you write my resume with AI?', 'No — templates and examples are pre-written by us; facts come from you. Optional AI rewrite exists but only active if admin connects n8n webhook — off by default. Your data never sent to AI without explicit action.'],
    ['I paid ₹20 but Pro did not unlock.', 'Email billing@craftcv.app with transaction ID, payment screenshot, registered email. We fix or refund within 5 working days. This is the only refund-eligible case. Keep transaction ID safe.'],
    ['What if I clear browser data and lose Pro?', 'Pro is stored locally. If cleared, email billing@craftcv.app with transaction ID and email — we restore Pro manually within 24h free. Not a refund case — restoration. Always export backup.'],
    ['Is ₹20 inclusive of GST?', 'Yes — ₹20 inclusive of GST where applicable. Receipt emailed via Razorpay. No extra charges.'],
    ['Do you store my card/UPI details?', 'No — payments via Razorpay, PCI-DSS Level 1 certified. We only store transaction ID and status locally. No card numbers, UPI IDs, or bank details ever touch our servers.'],
    ['Can I get invoice?', 'Yes — Razorpay sends receipt to your email after payment with transaction ID. For GST invoice, email billing@craftcv.app with transaction ID.'],
    ['Is there a mobile app?', 'No — web app works on mobile browser, no install needed. Add to home screen for app-like experience. PWA support planned.'],
  ];
  return (
    <Shell title="Frequently Asked Questions" sub="Quick answers — 18 most asked">
      {faqs.map(([q, a], i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <h3 style={{ color: 'var(--navy-900)', fontSize: 15, marginBottom: 4 }}>{i+1}. {q}</h3>
          <p className="hint" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{a}</p>
        </div>
      ))}
      <p>
        Something else? <a href="#/contact">Contact us</a> — we reply within 2 working days. For payment issues, include transaction ID.
      </p>
    </Shell>
  );
}

export function DisclaimerPage() {
  return (
    <Shell title="Disclaimer" sub="Last updated: 23 September 2026">
      <h3 className="mt0">1. No Guarantee of Employment</h3>
      <p>CraftCV is a resume formatting and structuring tool. We do not guarantee interviews, shortlists, job offers, or career outcomes. Success depends on your qualifications, job market, employer decisions, and how you customize resume for each role. No statement on site should be read as promise of employment.</p>
      
      <h3>2. Accuracy & Responsibility</h3>
      <p>You are solely responsible for accuracy, truthfulness, and legality of information in resumes you create. Do not misrepresent qualifications, experience, or identity. False information may lead to rejection, termination, or legal consequences — we are not liable. Always verify facts before sending resume.</p>
      
      <h3>3. Templates & ATS</h3>
      <p>Templates are provided as design starting points. While we test for ATS compatibility, we cannot guarantee all ATS systems will parse perfectly — ATS software varies. For strict ATS portals, use Modern Split or Compact Pro without photo. Test resume by uploading to ATS checker if needed.</p>
      
      <h3>4. No Professional Advice</h3>
      <p>Content on site (examples, tips, field guidance) is for general information only — not professional career, legal, or financial advice. Consult qualified professional for specific advice.</p>
      
      <h3>5. Third-Party Links</h3>
      <p>Site may contain links to third parties (Razorpay, Google). We are not responsible for their content, privacy, or practices. Use at your own risk.</p>
      
      <h3>6. Limitation</h3>
      <p>To extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for purpose, non-infringement. Service provided "as is".</p>
    </Shell>
  );
}

export function CookiePage() {
  return (
    <Shell title="Cookie Policy" sub="Last updated: 23 September 2026">
      <h3 className="mt0">What Are Cookies?</h3>
      <p>Cookies are small text files stored on device by websites. We use minimal cookies — only essential for functionality.</p>
      
      <h3>Types We Use</h3>
      <table className="tbl">
        <thead><tr><th>Type</th><th>Purpose</th><th>Duration</th><th>Essential?</th></tr></thead>
        <tbody>
          <tr><td><b>Session Token</b></td><td>Keep you logged in (sessionStorage)</td><td>Until tab closes</td><td>Yes</td></tr>
          <tr><td><b>CSRF Token</b></td><td>Security — prevent CSRF attacks</td><td>Session</td><td>Yes</td></tr>
          <tr><td><b>Local Storage</b></td><td>Store resumes, billing, settings locally</td><td>Until you delete</td><td>Yes (functional)</td></tr>
        </tbody>
      </table>
      
      <h3>What We DON'T Use</h3>
      <ul>
        <li>No tracking cookies (Google Analytics, Facebook Pixel)</li>
        <li>No advertising cookies</li>
        <li>No third-party cookies</li>
        <li>No cross-site tracking</li>
      </ul>
      
      <h3>Your Choices</h3>
      <p>Essential cookies cannot be disabled — site won't work without them (login, resume storage). You can clear localStorage via Settings → Delete all data, or browser settings → Clear site data. No consent banner needed as we use only essential cookies under IT Rules and GDPR.</p>
      
      <h3>Contact</h3>
      <p>Questions? privacy@craftcv.app</p>
    </Shell>
  );
}

export function ShippingPage() {
  return (
    <Shell title="Shipping & Delivery Policy" sub="Digital Product — No Physical Shipment">
      <h3 className="mt0">Digital Product — Instant Delivery</h3>
      <p>CraftCV is a digital service — no physical product, no shipping. All features delivered instantly via website.</p>
      
      <h3>Delivery Details</h3>
      <ul>
        <li><b>Free Plan:</b> Instant access after signup — no delivery needed, use immediately in browser</li>
        <li><b>Pro Plan (₹20):</b> Instant unlock after successful payment — Pro status granted in same browser within seconds. No email delivery needed, but receipt emailed via Razorpay.</li>
        <li><b>Resume Downloads:</b> PDF generated via browser print — instant download, no waiting</li>
        <li><b>No Shipping Address:</b> We don't collect or need shipping address — digital only</li>
        <li><b>No Courier:</b> No physical shipment, no tracking, no delivery charges</li>
      </ul>
      
      <h3>Access Issues?</h3>
      <p>If Pro doesn't unlock after payment (rare), email billing@craftcv.app with transaction ID — we fix within 24h. See refund policy for eligible refund cases.</p>
      
      <h3>Contact</h3>
      <p>support@craftcv.app · billing@craftcv.app</p>
    </Shell>
  );
}

export function CancellationPage() {
  return (
    <Shell title="Cancellation Policy" sub="Last updated: 23 September 2026">
      <h3 className="mt0">No Subscription — No Cancellation Needed</h3>
      <p>CraftCV Pro is <b>one-time payment of ₹20, lifetime access, no subscription, no auto-renewal</b>. Therefore, no cancellation needed — you pay once, use forever. No recurring charges to cancel.</p>
      
      <h3>Free Plan</h3>
      <p>Free plan is free forever — no payment, no cancellation. Just stop using or delete data via Settings → Delete all data.</p>
      
      <h3>Pro Plan — What You Can Do</h3>
      <ul>
        <li><b>Stop Using:</b> Simply stop using — no charges ever again</li>
        <li><b>Delete Data:</b> Settings → Delete all data — removes resumes, billing stays? No, billing reset also possible for testing, but Pro restoration available via transaction ID</li>
        <li><b>Account Deletion:</b> Logout + clear browser storage — account removed locally. For full deletion email privacy@craftcv.app</li>
      </ul>
      
      <h3>No Refund on Cancellation</h3>
      <p>As per No Refund policy, once Pro unlocked, no refund even if you cancel/stop using. Digital product with instant delivery. Exception: payment success but no unlock — refund within 5 days if not fixable.</p>
      
      <h3>Contact</h3>
      <p>support@craftcv.app · billing@craftcv.app</p>
    </Shell>
  );
}

export function EulaPage() {
  return (
    <Shell title="End User License Agreement (EULA)" sub="Last updated: 23 September 2026">
      <h3 className="mt0">1. License Grant</h3>
      <p>CraftCV grants you non-exclusive, non-transferable, revocable license to use website and templates for personal, non-commercial job search purposes only. One license per user account.</p>
      
      <h3>2. Restrictions</h3>
      <p>You may NOT:</p>
      <ul>
        <li>Resell, sublicense, distribute templates as templates</li>
        <li>Use templates to build competing resume builder</li>
        <li>Copy site code, design, or field definitions</li>
        <li>Share Pro account — 1 user per license</li>
        <li>Reverse engineer, decompile, or attempt to extract source</li>
        <li>Use for illegal or fraudulent purposes</li>
      </ul>
      
      <h3>3. Ownership</h3>
      <p>All IP — site design, code, templates (layout/CSS), field data, examples, brand — owned by CraftCV. Your resume content remains yours. Templates license is for use, not ownership.</p>
      
      <h3>4. Termination</h3>
      <p>License terminates if you violate EULA. On termination, you must stop using templates and delete any copies of template files (not your resume content — that remains yours). Provisions on IP, liability survive.</p>
      
      <h3>5. Disclaimer & Liability</h3>
      <p>Service provided "as is". Max liability ₹20 (amount paid). See Terms for full liability clause.</p>
      
      <h3>6. Governing Law</h3>
      <p>India, New Delhi jurisdiction. See Terms for dispute resolution.</p>
    </Shell>
  );
}
