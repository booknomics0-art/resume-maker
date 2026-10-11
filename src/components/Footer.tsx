export default function Footer() {
  return (
    <footer className="site-footer no-print">
      <div className="footer-grid">
        <div className="footer-col footer-brand">
          <div className="brand" style={{ padding: 0 }}>
            <div className="brand-badge">CV</div>
            <div>
              <div className="brand-name">ResumeMakery</div>
              <div className="brand-sub">Resume Studio</div>
            </div>
          </div>
          <p>
            Build a clean, professional resume with 50 hand-tuned templates,
            ATS guidance and an honest application workflow. Your first guest
            resume and first PDF need no sign-up; a free account saves your work
            and keeps future downloads available. No watermark or paid plan.
          </p>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <a href="/">Home</a>
          <a href="/editor/new">Create a resume</a>
          <a href="/import">📤 Upload & Edit Resume</a>
          <a href="/cover-letter">✉ Cover Letter Builder</a>
          <a href="/ats-resume-checker">ATS Resume Checker</a>
        </div>

        <div className="footer-col">
          <h4>Resume Guides</h4>
          <a href="/guides">All guides</a>
          <a href="/guides/resume-format-india">Resume format for India</a>
          <a href="/guides/resume-summary-examples">Resume summary examples</a>
          <a href="/guides/resume-skills-guide">Skills for a resume</a>
          <a href="/guides/fresher-resume-guide">Fresher resume guide</a>
        </div>

        <div className="footer-col">
          <h4>Company & Legal</h4>
          <a href="/about">About us</a>
          <a href="/contact">Contact</a>
          <a href="/faq">FAQ</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/cookies">Cookie Policy</a>
          <a href="/disclaimer">Disclaimer</a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 ResumeMakery. All rights reserved.</span>
        <span className="footer-dot">·</span>
        <a href="/contact">support@resumemakery.com</a>
        <span className="footer-dot">·</span>
        <a href="/privacy">Privacy</a>
        <span className="footer-dot">·</span>
        <a href="/terms">Terms</a>
      </div>
    </footer>
  );
}
