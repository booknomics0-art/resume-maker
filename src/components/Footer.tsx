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
            Build a clean, professional resume in under 10 minutes.
            Ten career fields, 50 hand-tuned templates, one honest document
            you can stand behind in an interview. Upload & edit existing resumes,
            unlimited PDF downloads — 100% free, no watermark.
          </p>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <a href="/">Dashboard</a>
          <a href="/editor/new">Create a resume</a>
          <a href="/import">📤 Upload & Edit Resume</a>
          <a href="/cover-letter">✉ Cover Letter Builder</a>
          <a href="/faq">FAQ</a>
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <a href="/about">About us</a>
          <a href="/contact">Contact</a>
        </div>

        <div className="footer-col">
          <h4>Legal — Detailed</h4>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/disclaimer">Disclaimer</a>
          <a href="/cookies">Cookie Policy</a>
          <a href="/eula">EULA</a>
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
