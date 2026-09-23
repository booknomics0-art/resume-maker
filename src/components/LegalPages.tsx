// Basic pages every professional website needs (Google, payment gateways and
// app stores all expect these): About, Contact, Privacy, Terms, Refund, FAQ.

function Shell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 820 }}>
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
    <Shell title="About CraftCV" sub="Why this product exists">
      <p>
        Most resume builders treat you like a checkout page. You spend twenty minutes
        entering your details, and only then does the paywall appear — or the free
        download arrives with a watermark, or the writing sounds like a robot wrote it.
      </p>
      <p>
        CraftCV was built the other way around. The full builder is free, downloads
        carry no watermark, and every template ships with real example content written
        in plain, professional language. Fill in your facts, pick a design tuned for
        your field, and download a document that reads like you wrote it — because you did.
      </p>
      <h3>What we believe</h3>
      <ul>
        <li><b>Concrete facts beat adjectives.</b> Numbers, tools and outcomes impress recruiters more than fancy words.</li>
        <li><b>Ten minutes is enough.</b> A focused form with good examples beats an open editor with no guidance.</li>
        <li><b>Honest documents win.</b> We never generate fake experience or inflated numbers, and our templates never encourage it.</li>
        <li><b>Simple pricing.</b> One free plan, one ₹20 plan. No trials, no auto-renewal, no surprise charges.</li>
      </ul>
      <h3>Built for India first</h3>
      <p>
        The product is designed for Indian job seekers first — formats recruiters here
        expect, prices that make sense here, and content examples drawn from Indian
        workplaces. Everything works in the browser; your resume data never leaves your device.
      </p>
    </Shell>
  );
}

export function ContactPage() {
  return (
    <Shell title="Contact us" sub="We read every message">
      <p>
        Questions, feedback, or a problem with a payment — write to us and we will
        respond within 2 working days.
      </p>
      <div className="tbl-wrap" style={{ marginTop: 12 }}>
      <table className="tbl">
        <tbody>
          <tr><td style={{ width: 160, minWidth: 120 }}><b>Support email</b></td><td style={{ wordBreak: 'break-all' }}>support@craftcv.app</td></tr>
          <tr><td><b>Payments &amp; refunds</b></td><td style={{ wordBreak: 'break-all' }}>billing@craftcv.app</td></tr>
          <tr><td><b>Response time</b></td><td>Within 2 working days (Mon–Sat)</td></tr>
          <tr><td><b>Location</b></td><td>New Delhi, India</td></tr>
        </tbody>
      </table>
      </div>
      <div className="notice" style={{ marginTop: 16 }}>
        For payment issues, please include your registered email and the transaction
        reference from your UPI app or bank statement — it helps us resolve things faster.
      </div>
    </Shell>
  );
}

export function PrivacyPage() {
  return (
    <Shell title="Privacy Policy" sub="Last updated: 21 September 2026">
      <h3 className="mt0">The short version</h3>
      <p>
        Your resume data stays on your device. CraftCV stores everything you type —
        account details, resume content, photos — in your own browser's local storage.
        We do not run a central database, we do not sell data, and we do not use
        advertising trackers.
      </p>
      <h3>What we store and where</h3>
      <ul>
        <li><b>Account details</b> (name, email) — stored locally in your browser.</li>
        <li><b>Resume content and photos</b> — stored locally in your browser.</li>
        <li><b>Settings</b> — stored locally in your browser.</li>
      </ul>
      <h3>What we do not do</h3>
      <ul>
        <li>We do not share your data with third parties.</li>
        <li>We do not use cookies for tracking or advertising.</li>
        <li>We do not read or analyse the content of your resumes.</li>
      </ul>
      <h3>Your control</h3>
      <p>
        You can export all of your data as a JSON backup from Settings at any time,
        and you can delete everything permanently with the “Delete all data” option.
        Clearing your browser's site data also removes everything.
      </p>
      <h3>Changes to this policy</h3>
      <p>
        If this policy changes — for example when we introduce cloud accounts — we
        will update the date above and explain the change on the website before it applies.
      </p>
      <p>Questions? Write to <a href="#/contact">support@craftcv.app</a>.</p>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell title="Terms of Service" sub="Last updated: 21 September 2026">
      <h3 className="mt0">1. Using CraftCV</h3>
      <p>
        CraftCV is a resume-building tool. You may use it for personal job-search
        purposes. You must not use it to create documents that misrepresent your
        qualifications, experience or identity.
      </p>
      <h3>2. Your content is yours</h3>
      <p>
        Everything you enter — text, photos, links — belongs to you. We claim no
        ownership over your resumes. You are responsible for the accuracy of the
        information in documents you create and send.
      </p>
      <h3>3. Templates and examples</h3>
      <p>
        Templates, example summaries and bullet templates are provided as starting
        points. Replace placeholders with your own facts before sending a resume anywhere.
      </p>
      <h3>4. Free and paid plans</h3>
      <p>
        The Free plan is available at no cost with no time limit. The Pro plan is a
        one-time payment of ₹20 and does not auto-renew. Plan features are described
        on the <a href="#/pricing">Pricing</a> page.
      </p>
      <h3>5. No guarantee of outcomes</h3>
      <p>
        CraftCV helps you present your information well. We cannot guarantee interviews,
        shortlists or job offers, and no part of the product should be read as such a promise.
      </p>
      <h3>6. Fair use</h3>
      <p>
        Do not attempt to break, scrape or abuse the service, or circumvent plan limits.
        We may suspend access for clear misuse.
      </p>
      <h3>7. Liability</h3>
      <p>
        The service is provided “as is”. To the maximum extent permitted by law, our
        total liability is limited to the amount you paid us in the last 12 months.
      </p>
      <h3>8. Changes</h3>
      <p>
        We may update these terms as the product grows. Material changes will be
        announced on the website. Continued use after changes means you accept them.
      </p>
    </Shell>
  );
}

export function RefundPage() {
  return (
    <Shell title="Refund Policy" sub="Simple and fair">
      <h3 className="mt0">The Free plan</h3>
      <p>There is nothing to refund — the Free plan costs nothing, forever.</p>
      <h3>Pro plan (₹20 one-time)</h3>
      <ul>
        <li>If Pro does not unlock after a successful payment, contact
          <b> billing@craftcv.app</b> with your transaction reference and we will fix it
          or refund you within 5 working days.</li>
        <li>If you paid by mistake, request a refund within <b>7 days</b> of purchase
          and we will process it — no questions, no forms.</li>
        <li>Since Pro is a one-time digital purchase of ₹20, refunds after 7 days are
          considered case by case.</li>
      </ul>
      <h3>How refunds are processed</h3>
      <p>
        Refunds go back to the original payment method (UPI, card or net banking) and
        typically reflect within 5–7 working days depending on your bank.
      </p>
    </Shell>
  );
}

export function FaqPage() {
  const faqs: Array<[string, string]> = [
    ['Is CraftCV really free?', 'Yes. One resume, two templates and unlimited watermark-free PDF downloads cost nothing, with no time limit. Pro (₹20 one-time) unlocks all 50 template combinations and unlimited resumes.'],
    ['Where is my data saved?', 'In your own browser (local storage). Nothing is uploaded to a server. Use Settings → Export backup to keep a copy, and remember that clearing browser data will remove resumes.'],
    ['Will my resume pass ATS software?', 'The Compact Pro and Modern Split templates use standard headings and simple structure that ATS systems read reliably. Avoid photos and heavy graphics when applying through strict ATS portals.'],
    ['How long does it take to make a resume?', 'About 10 minutes if you have your details ready. Every step shows ready-made templates you can click and edit, so you are never facing a blank box.'],
    ['Can I use this on my phone?', 'Yes — the entire app is responsive. For fine editing a laptop is more comfortable, but you can create and download a complete resume from a phone.'],
    ['Do you write my resume with AI?', 'No. Templates and examples are pre-written by us; the facts come from you. An optional AI rewrite feature exists but is only active if an administrator connects it — it is off by default.'],
    ['I paid ₹20 but Pro did not unlock.', 'Write to billing@craftcv.app with your transaction reference. We fix or refund within 5 working days.'],
  ];
  return (
    <Shell title="Frequently Asked Questions" sub="Quick answers to common questions">
      {faqs.map(([q, a], i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <h3 style={{ color: 'var(--navy-900)', fontSize: 15, marginBottom: 4 }}>{q}</h3>
          <p className="hint" style={{ fontSize: 13.5 }}>{a}</p>
        </div>
      ))}
      <p>
        Something else on your mind? <a href="#/contact">Contact us</a> — we reply within 2 working days.
      </p>
    </Shell>
  );
}
