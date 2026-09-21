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
            you can stand behind in an interview.
          </p>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <a href="#/">Dashboard</a>
          <a href="#/editor/new">Create a resume</a>
          <a href="#/pricing">Pricing</a>
          <a href="#/faq">FAQ</a>
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <a href="#/about">About us</a>
          <a href="#/contact">Contact</a>
          <a href="#/refund">Refund policy</a>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <a href="#/privacy">Privacy policy</a>
          <a href="#/terms">Terms of service</a>
          <a href="#/refund">Refund policy</a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 CraftCV. All rights reserved.</span>
        <span className="footer-dot">·</span>
        <span>Made in India 🇮🇳</span>
        <span className="footer-dot">·</span>
        <a href="#/contact">support@craftcv.app</a>
      </div>
    </footer>
  );
}
