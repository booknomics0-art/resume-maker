export default function Pricing() {
  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Pricing</div>
          <div className="page-sub">Two plans. No hidden charges, no trial traps.</div>
        </div>
      </div>

      <div className="plans">
        <div className="card plan">
          <b style={{ color: 'var(--navy-800)', fontSize: 17 }}>Free</b>
          <div className="price">₹0 <small>forever</small></div>
          <ul>
            <li>1 resume, unlimited edits</li>
            <li>2 templates — Modern Split &amp; Compact Pro</li>
            <li>Unlimited PDF downloads, no watermark</li>
            <li>All 10 career fields with examples</li>
            <li>Summary &amp; bullet templates</li>
          </ul>
          <button className="btn" style={{ marginTop: 'auto', justifyContent: 'center' }}>Current plan</button>
        </div>

        <div className="card plan hot">
          <span className="tag">BEST VALUE</span>
          <b style={{ color: 'var(--navy-800)', fontSize: 17 }}>Pro</b>
          <div className="price">₹20 <small>one-time</small></div>
          <ul>
            <li>Unlimited resumes</li>
            <li>All 50 templates × 10 fields — 500 combos</li>
            <li>Profile photo support in every template</li>
            <li>Hobbies, best experience — sab sections</li>
            <li>Future templates included</li>
          </ul>
          <button className="btn primary" style={{ marginTop: 'auto', justifyContent: 'center' }}>Unlock Pro — ₹20</button>
        </div>
      </div>

      <div className="notice">
        Pay once with UPI or card via Razorpay — it never renews.
      </div>
    </div>
  );
}
