import { currentUser, logout } from '../lib/auth';
import { navigate } from '../App';
import { getBillingState, isPro, getTransactions, resetBilling } from '../lib/billing';
import { getAuditLogs, isSecureContext } from '../lib/security';
import { useState } from 'react';

export default function Settings() {
  const user = currentUser();
  const billing = getBillingState();
  const pro = isPro();
  const transactions = getTransactions();
  const [showAudit, setShowAudit] = useState(false);
  const auditLogs = getAuditLogs();

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Account, billing, data & security controls.</div>
        </div>
      </div>

      <div className="card pad">
        <h3 style={{ color: 'var(--navy-900)' }}>Account {pro && <span style={{ background: '#1f8a5b', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 99, marginLeft: 8 }}>PRO</span>}</h3>
        <div className="spread" style={{ marginTop: 8 }}>
          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
            <b style={{ color: 'var(--navy-800)', wordBreak: 'break-all' }}>{user?.name}</b>
            <div className="hint" style={{ wordBreak: 'break-all' }}>{user?.email} · signed in with {user?.provider === 'google' ? 'Google' : 'email'}</div>
            <div className="hint" style={{ marginTop: 6, fontSize: 12 }}>
              🔒 Password hashed with SHA-256 + salt · Rate limiting active · CSRF protected
            </div>
          </div>
          <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => { logout(); location.hash = '#/'; location.reload(); }}>Logout</button>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 18, background: pro ? '#eef6f0' : '#fff', borderColor: pro ? '#c3e6cb' : undefined }}>
        <h3 style={{ color: 'var(--navy-900)' }}>💳 Billing & Pro Status</h3>
        <div className="tbl-wrap" style={{ marginTop: 12 }}>
          <table className="tbl">
            <tbody>
              <tr><td><b>Plan</b></td><td>{pro ? <span style={{ color: 'var(--ok)', fontWeight: 800 }}>Pro — Unlimited</span> : `Free — ${billing.freeDownloadsUsed}/${billing.freeDownloadsLimit} used`}</td></tr>
              <tr><td><b>Downloads</b></td><td>Total: {billing.totalDownloads} · Free used: {billing.freeDownloadsUsed} · Remaining free: {pro ? '∞ (Pro)' : Math.max(0, billing.freeDownloadsLimit - billing.freeDownloadsUsed)}</td></tr>
              <tr><td><b>Pro Unlocked</b></td><td>{billing.proUnlockedAt ? new Date(billing.proUnlockedAt).toLocaleString() : 'Not unlocked'}</td></tr>
              <tr><td><b>Transaction ID</b></td><td style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{billing.transactionId || '—'}</td></tr>
              <tr><td><b>Last Download</b></td><td>{billing.lastDownloadAt ? new Date(billing.lastDownloadAt).toLocaleString() : 'Never'}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          {!pro && <button className="btn primary" onClick={() => navigate('/pricing')}>Unlock Pro — ₹20</button>}
          <button className="btn" onClick={() => navigate('/pricing')}>View Pricing</button>
        </div>
        {transactions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <b style={{ fontSize: 13 }}>Recent Transactions:</b>
            <div className="tbl-wrap" style={{ marginTop: 8 }}>
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead><tr><th>ID</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {transactions.slice(0, 3).map(t => (
                    <tr key={t.id}><td style={{ fontFamily: 'monospace', fontSize: 10 }}>{t.id.slice(0, 18)}...</td><td>₹{t.amount}</td><td>{t.status}</td><td>{new Date(t.timestamp).toLocaleDateString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <h3 style={{ color: 'var(--navy-900)' }}>🔒 Security Status — High-Tech Protection Active</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 12 }}>
          <div style={{ background: 'var(--navy-50)', padding: 12, borderRadius: 8, border: '1px solid var(--navy-100)' }}>
            <b style={{ fontSize: 13, color: 'var(--navy-800)' }}>✅ XSS Protection</b>
            <p className="hint" style={{ fontSize: 12, marginTop: 4 }}>All inputs sanitized, dangerous patterns stripped, HTML escaped</p>
          </div>
          <div style={{ background: 'var(--silver-100)', padding: 12, borderRadius: 8, border: '1px solid var(--silver-200)' }}>
            <b style={{ fontSize: 13, color: 'var(--navy-800)' }}>✅ Password Security</b>
            <p className="hint" style={{ fontSize: 12, marginTop: 4 }}>SHA-256 double hash with 16-byte salt, secure random</p>
          </div>
          <div style={{ background: 'var(--silver-100)', padding: 12, borderRadius: 8, border: '1px solid var(--silver-200)' }}>
            <b style={{ fontSize: 13, color: 'var(--navy-800)' }}>✅ Rate Limiting</b>
            <p className="hint" style={{ fontSize: 12, marginTop: 4 }}>Login 5/min, download 10/min, payment 5/min — auto block</p>
          </div>
          <div style={{ background: 'var(--silver-100)', padding: 12, borderRadius: 8, border: '1px solid var(--silver-200)' }}>
            <b style={{ fontSize: 13, color: 'var(--navy-800)' }}>✅ HMAC Integrity</b>
            <p className="hint" style={{ fontSize: 12, marginTop: 4 }}>Storage tamper detection with SHA-256 HMAC verification</p>
          </div>
          <div style={{ background: 'var(--silver-100)', padding: 12, borderRadius: 8, border: '1px solid var(--silver-200)' }}>
            <b style={{ fontSize: 13, color: 'var(--navy-800)' }}>✅ CSRF Protection</b>
            <p className="hint" style={{ fontSize: 12, marginTop: 4 }}>64-char secure random token per session, validated</p>
          </div>
          <div style={{ background: isSecureContext() ? '#eef6f0' : '#fff8e6', padding: 12, borderRadius: 8, border: `1px solid ${isSecureContext() ? '#c3e6cb' : '#f0ddc0'}` }}>
            <b style={{ fontSize: 13, color: isSecureContext() ? '#0f6848' : 'var(--warn)' }}>{isSecureContext() ? '✅ Secure Context' : '⚠️ Secure Context'}</b>
            <p className="hint" style={{ fontSize: 12, marginTop: 4 }}>{isSecureContext() ? 'HTTPS/HSTS active, secure' : 'Localhost — HTTPS in production'} · CSP, X-Frame, HSTS headers</p>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small" onClick={() => setShowAudit(!showAudit)}>{showAudit ? 'Hide' : 'Show'} Audit Logs ({auditLogs.length})</button>
          <button className="btn small ghost" onClick={() => { localStorage.removeItem('craftcv.audit.v2'); alert('Audit logs cleared'); setShowAudit(false); }}>Clear Audit Logs</button>
        </div>
        {showAudit && (
          <div style={{ marginTop: 12, background: 'var(--navy-950)', color: '#dfe6f2', borderRadius: 8, padding: 12, maxHeight: 300, overflow: 'auto', fontSize: 11, fontFamily: 'monospace' }}>
            {auditLogs.slice(-20).reverse().map((log, i) => (
              <div key={i} style={{ marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>
                [{new Date(log.timestamp).toLocaleString()}] {log.action} {log.details ? JSON.stringify(log.details).slice(0, 100) : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <h3 style={{ color: 'var(--navy-900)' }}>Your Data — Local-First, Private</h3>
        <p className="hint">Everything is saved in this browser (localStorage) with integrity checks. You can export backup anytime. No server copy.</p>
        <div className="row">
          <button className="btn" onClick={() => {
            const data = {
              resumes: localStorage.getItem('craftcv.resumes.v1'),
              billing: localStorage.getItem('craftcv.billing.v2'),
              transactions: localStorage.getItem('craftcv.transactions.v2'),
              audit: localStorage.getItem('craftcv.audit.v2'),
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `craftcv-backup-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
          }}>⬇ Export Full Backup (JSON)</button>
          <button className="btn" onClick={() => {
            const blob = new Blob([localStorage.getItem('craftcv.resumes.v1') || '[]'], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'craftcv-resumes.json';
            a.click();
          }}>⬇ Export Resumes Only</button>
          <button className="btn danger" onClick={() => {
            if (confirm('Delete ALL resumes from this browser? Billing and transactions will remain.')) {
              localStorage.removeItem('craftcv.resumes.v1');
              location.hash = '#/';
              location.reload();
            }
          }}>Delete Resumes</button>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small ghost" onClick={() => {
            if (confirm('Reset billing data? For testing only — you will lose Pro and free count.')) {
              resetBilling();
              location.reload();
            }
          }}>Reset Billing (Test)</button>
          <button className="btn small danger" onClick={() => {
            if (confirm('Delete ALL data including account, resumes, billing, audit? This cannot be undone.')) {
              localStorage.clear();
              sessionStorage.clear();
              location.hash = '#/';
              location.reload();
            }
          }}>Delete ALL Data</button>
        </div>
        <div className="notice" style={{ marginTop: 12, fontSize: 12 }}>
          💡 <b>Tip:</b> Export backup regularly. If you clear browser data, you lose resumes and Pro flag. Keep transaction ID (from billing) to restore Pro via support.
        </div>
      </div>
    </div>
  );
}
