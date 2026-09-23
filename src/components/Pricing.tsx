import { useState } from 'react';
import { PRICING, getBillingState, getRemainingFreeDownloads, isPro, getTransactions, resetBilling } from '../lib/billing';
import PaymentModal from './PaymentModal';
import { currentUser } from '../lib/auth';

export default function Pricing() {
  const [billing, setBilling] = useState(getBillingState());
  const [showPay, setShowPay] = useState(false);
  const remaining = getRemainingFreeDownloads();
  const transactions = getTransactions();
  const user = currentUser();

  const refresh = () => setBilling(getBillingState());

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Pricing — Simple & Honest</div>
          <div className="page-sub">1 free download, then ₹20 one-time for unlimited. No subscription, no trial trap, no watermark.</div>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 18, background: isPro() ? '#eef6f0' : 'var(--navy-50)', borderColor: isPro() ? '#c3e6cb' : 'var(--navy-100)' }}>
        <div className="spread">
          <div>
            <b style={{ color: 'var(--navy-900)' }}>Your current status:</b>
            <div className="hint" style={{ marginTop: 4 }}>
              {isPro() ? (
                <>✅ <b style={{ color: 'var(--ok)' }}>Pro — Unlimited downloads</b> · Unlocked on {billing.proUnlockedAt ? new Date(billing.proUnlockedAt).toLocaleDateString() : ''} · Total downloads: {billing.totalDownloads}</>
              ) : (
                <>📄 Free — {billing.freeDownloadsUsed}/{billing.freeDownloadsLimit} downloads used · {remaining} free left · Total: {billing.totalDownloads}</>
              )}
            </div>
          </div>
          {!isPro() && billing.freeDownloadsUsed >= 1 && (
            <button className="btn primary" onClick={() => setShowPay(true)}>Unlock Pro — ₹20</button>
          )}
        </div>
        <div className="progress" style={{ marginTop: 12, height: 8 }}>
          <div style={{ width: isPro() ? '100%' : `${(billing.freeDownloadsUsed / billing.freeDownloadsLimit) * 100}%`, background: isPro() ? 'var(--ok)' : 'linear-gradient(90deg, var(--navy-600), var(--silver-400))`' }} />
        </div>
      </div>

      <div className="plans">
        <div className="card plan">
          <b style={{ color: 'var(--navy-800)', fontSize: 17 }}>{PRICING.free.name}</b>
          <div className="price">₹0 <small>forever</small></div>
          <div className="hint" style={{ fontSize: 12.5, marginBottom: 8 }}>Perfect to try — 1 full resume download free</div>
          <ul>
            <li><b>1 resume download</b> — free, no watermark</li>
            <li>2 premium templates (Modern Split & Compact Pro)</li>
            <li>All 10 career fields with examples</li>
            <li>Summary & bullet templates</li>
            <li>Basic editing & PDF export</li>
            <li>100% private — data stays in browser</li>
          </ul>
          <button className="btn" style={{ marginTop: 'auto', justifyContent: 'center' }} disabled={!isPro() && billing.freeDownloadsUsed >= 1}>
            {isPro() ? 'Included in Pro' : billing.freeDownloadsUsed >= 1 ? 'Free limit used' : `${remaining} free left`}
          </button>
          <p className="hint" style={{ fontSize: 11, textAlign: 'center', marginTop: 8 }}>No credit card required</p>
        </div>

        <div className="card plan hot">
          <span className="tag">BEST VALUE — ₹20 ONLY</span>
          <b style={{ color: 'var(--navy-800)', fontSize: 17 }}>{PRICING.pro.name}</b>
          <div className="price">{PRICING.pro.priceDisplay} <small>{PRICING.pro.subtext}</small></div>
          <div className="hint" style={{ fontSize: 12.5, marginBottom: 8, color: 'var(--ok)', fontWeight: 700 }}>One-time payment, lifetime access — never pay again</div>
          <ul>
            {PRICING.pro.features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          {isPro() ? (
            <button className="btn" style={{ marginTop: 'auto', justifyContent: 'center', background: '#eef6f0', borderColor: '#c3e6cb', color: 'var(--ok)' }}>
              ✅ Pro Active — Unlimited
            </button>
          ) : (
            <button className="btn primary" style={{ marginTop: 'auto', justifyContent: 'center', fontWeight: 800 }} onClick={() => setShowPay(true)}>
              {PRICING.pro.cta}
            </button>
          )}
          <p className="hint" style={{ fontSize: 11, textAlign: 'center', marginTop: 8 }}>🔒 Secure via Razorpay · UPI, Card, Netbanking · Instant unlock</p>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <h3 style={{ color: 'var(--navy-900)', marginTop: 0 }}>How the ₹20 Pro works — Transparent Pricing</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 12 }}>
          <div>
            <b style={{ fontSize: 14 }}>1️⃣ Free Trial — 1 Download</b>
            <p className="hint" style={{ fontSize: 13, marginTop: 4 }}>Create your resume, edit fully, download once for free. No watermark, no signup fee. See quality first.</p>
          </div>
          <div>
            <b style={{ fontSize: 14 }}>2️⃣ Pay ₹20 Once</b>
            <p className="hint" style={{ fontSize: 13, marginTop: 4 }}>Second download onwards needs Pro. Pay ₹20 one-time via UPI/Card. No subscription, no auto-renewal, no hidden charges.</p>
          </div>
          <div>
            <b style={{ fontSize: 14 }}>3️⃣ Unlimited Forever</b>
            <p className="hint" style={{ fontSize: 13, marginTop: 4 }}>After ₹20, unlimited downloads, all 50 templates, advanced upload-edit, AI rewrite, future updates — lifetime.</p>
          </div>
        </div>
        <div className="notice" style={{ marginTop: 16 }}>
          <b>Why ₹20?</b> Global builders charge $19-30/month with trial traps. We charge ₹20 once — honest pricing for India. 
          Covers server costs, supports development, keeps free tier genuinely free. No venture capital tricks.
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <h3 style={{ color: 'var(--navy-900)', marginTop: 0 }}>🔒 Payment Security & Trust</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 8 }}>
          <div className="hint" style={{ fontSize: 13 }}><b>🛡️ Razorpay Secure:</b> PCI-DSS Level 1 certified, bank-grade encryption</div>
          <div className="hint" style={{ fontSize: 13 }}><b>💳 No Storage:</b> We never store card/UPI details — handled by Razorpay</div>
          <div className="hint" style={{ fontSize: 13 }}><b>📧 Instant Receipt:</b> Email receipt + transaction ID immediately</div>
          <div className="hint" style={{ fontSize: 13 }}><b>🚫 No Auto-Renew:</b> One-time only, no subscription, cancel not needed</div>
        </div>
        <p className="hint" style={{ marginTop: 12, fontSize: 12 }}>
          Payments processed by Razorpay (India's most trusted gateway). UPI: GPay, PhonePe, Paytm, BHIM. Cards: Visa, Mastercard, Rupay. Netbanking: 50+ banks. Wallets supported.
        </p>
      </div>

      {transactions.length > 0 && (
        <div className="card pad" style={{ marginTop: 18 }}>
          <div className="spread">
            <h3 style={{ color: 'var(--navy-900)', margin: 0 }}>Your Transactions</h3>
            <button className="btn small ghost" onClick={() => { if (confirm('Reset billing data? For testing only.')) { resetBilling(); refresh(); } }}>Reset (Test)</button>
          </div>
          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>ID</th><th>Amount</th><th>Status</th><th>Method</th><th>Date</th></tr></thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{t.id.slice(0, 20)}...</td>
                    <td>₹{t.amount}</td>
                    <td><span style={{ color: t.status === 'success' ? 'var(--ok)' : t.status === 'failed' ? 'var(--err)' : 'var(--warn)', fontWeight: 700 }}>{t.status.toUpperCase()}</span></td>
                    <td>{t.method}</td>
                    <td>{new Date(t.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="notice" style={{ marginTop: 18 }}>
        <b>Refund Policy:</b> Digital product — <b>No refund</b> after Pro unlock (instant delivery). Exception: if payment succeeds but Pro doesn't unlock, contact billing@craftcv.app with transaction ID — we fix or refund within 5 working days. See <a href="#/refund">full refund policy</a>.
      </div>

      {showPay && (
        <PaymentModal
          remainingFree={remaining}
          onClose={() => setShowPay(false)}
          onSuccess={(id) => {
            setShowPay(false);
            refresh();
            alert(`✅ Payment successful! Transaction: ${id}\nPro unlocked — unlimited downloads now.`);
          }}
        />
      )}
    </div>
  );
}
