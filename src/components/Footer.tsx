export default function Footer() {
  return (
    <footer className="site-footer no-print">
      <div className="footer-grid">
        <div className="footer-col footer-brand">
          <div className="brand" style={{ padding: 0 }}>
            <div className="brand-badge">CV</div>
            <div>
              <div className="brand-name">CraftCV</div>
              <div className="brand-sub">Resume Studio</div>
            </div>
          </div>
          <p>
            Build a clean, professional resume in under 10 minutes.
            Ten career fields, five hand-tuned designs, one honest document
            you can stand behind in an interview. Advanced upload & edit, 
            1 free download then ₹20 Pro lifetime.
          </p>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <a href="#/">Dashboard</a>
          <a href="#/editor/new">Create a resume</a>
          <a href="#/import">📤 Upload & Edit Resume</a>
          <a href="#/pricing">Pricing — ₹20 Pro</a>
          <a href="#/faq">FAQ</a>
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <a href="#/about">About us</a>
          <a href="#/contact">Contact</a>
          <a href="#/pricing">Pricing</a>
          <a href="#/refund">Refund (No Refund)</a>
          <a href="#/shipping">Shipping (Digital)</a>
        </div>

        <div className="footer-col">
          <h4>Legal — Detailed</h4>
          <a href="#/privacy">Privacy Policy</a>
          <a href="#/terms">Terms of Service</a>
          <a href="#/refund">Refund Policy — No Refund</a>
          <a href="#/disclaimer">Disclaimer</a>
          <a href="#/cookies">Cookie Policy</a>
          <a href="#/cancellation">Cancellation Policy</a>
          <a href="#/eula">EULA</a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 CraftCV. All rights reserved.</span>
        <span className="footer-dot">·</span>
        <a href="#/contact">support@craftcv.app</a>
        <span className="footer-dot">·</span>
        <a href="#/privacy">Privacy</a>
        <span className="footer-dot">·</span>
        <a href="#/terms">Terms</a>
      </div>
    </footer>
  );
}
