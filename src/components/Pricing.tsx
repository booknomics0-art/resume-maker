export default function Pricing() {
  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Pricing</div>
          <div className="page-sub">Do plans. Koi hidden charge nahi, koi trial trap nahi.</div>
        </div>
      </div>

      <div className="plans" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="card plan">
          <b style={{ color: 'var(--navy-800)', fontSize: 17 }}>Free</b>
          <div className="price">₹0 <small>forever</small></div>
          <ul>
            <li>1 resume, unlimited edits</li>
            <li>2 templates — Modern Split &amp; Compact Pro</li>
            <li>Unlimited PDF downloads, no watermark</li>
            <li>Saare 10 career fields with examples</li>
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
            <li>All 5 templates × 10 fields — saare 50 combos</li>
            <li>Profile photo support in every template</li>
            <li>Hobbies, best experience — sab sections</li>
            <li>Future templates included</li>
          </ul>
          <button className="btn primary" style={{ marginTop: 'auto', justifyContent: 'center' }}>Unlock Pro — ₹20</button>
        </div>
      </div>

      <div className="notice">
        Payment UPI / card se — Razorpay checkout. Ek baar ₹20, kabhi renew nahi hoga.
      </div>
    </div>
  );
}
