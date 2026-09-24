import { useState } from 'react';
import { currentUser, logout } from '../lib/auth';
import { getAuditLogs } from '../lib/security';
import { cloudEnabled } from '../lib/supabase';
import { cloudDeleteAccount } from '../lib/cloud';
import { loadResumes, syncWithCloud, upsertResume } from '../lib/store';
import CloudBadge from './CloudBadge';

export default function Settings() {
  const user = currentUser();
  const [showAudit, setShowAudit] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const auditLogs = getAuditLogs();
  const resumes = loadResumes();

  const exportJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  const importJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const parsed = JSON.parse(await f.text());
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.resumes) ? parsed.resumes : [];
        if (!list.length) { setMsg('No resumes found in that file.'); return; }
        let n = 0;
        for (const r of list) { if (r && r.personal) { upsertResume(r); n++; } }
        setMsg(`Imported ${n} resume${n === 1 ? '' : 's'}.`);
      } catch {
        setMsg('Could not read that file — is it a CraftCV backup?');
      }
    };
    input.click();
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Account, cloud sync and data controls. <CloudBadge /></div>
        </div>
      </div>

      <div className="card pad">
        <h3 style={{ color: 'var(--navy-900)' }}>Account</h3>
        <div className="spread" style={{ marginTop: 8 }}>
          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
            <b style={{ color: 'var(--navy-800)', wordBreak: 'break-all' }}>{user?.name}</b>
            <div className="hint" style={{ wordBreak: 'break-all' }}>{user?.email} · signed in with {user?.provider === 'google' ? 'Google' : 'email'}</div>
          </div>
          <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => { logout(); location.hash = '#/'; location.reload(); }}>Logout</button>
        </div>
        <div className="notice" style={{ marginTop: 12, fontSize: 12.5 }}>
          🎁 <b>CraftCV is 100% free</b> — unlimited resumes, unlimited PDF downloads, all {80} templates. No plans, nothing to unlock.
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <h3 style={{ color: 'var(--navy-900)' }}>☁️ Cloud sync</h3>
        {cloudEnabled() ? (
          <>
            <p className="hint">
              Your resumes are saved to your CraftCV account (Supabase, row-level security) and mirrored in this browser for offline use.
              Sign in on any device to continue where you left off.
            </p>
            <div className="row">
              <button className="btn" disabled={busy === 'sync'} onClick={async () => {
                setBusy('sync'); setMsg('');
                try { const list = await syncWithCloud(); setMsg(`Synced — ${list.length} resume${list.length === 1 ? '' : 's'} up to date.`); }
                catch (e) { setMsg(`Sync failed: ${String(e)}`); }
                finally { setBusy(''); }
              }}>{busy === 'sync' ? 'Syncing…' : '⟳ Sync now'}</button>
            </div>
          </>
        ) : (
          <div className="notice warn" style={{ fontSize: 12.5 }}>
            Cloud sync is <b>not configured</b> on this deployment — resumes are stored only in this browser.
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see <code>docs/SUPABASE.md</code>) to enable accounts that work across devices.
          </div>
        )}
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <h3 style={{ color: 'var(--navy-900)' }}>Your data</h3>
        <p className="hint">{resumes.length} resume{resumes.length === 1 ? '' : 's'} in this account. Export anytime — it’s your data.</p>
        <div className="row">
          <button className="btn" onClick={() => exportJson({ exportedAt: new Date().toISOString(), resumes }, `craftcv-backup-${new Date().toISOString().slice(0, 10)}.json`)}>⬇ Export all resumes (JSON)</button>
          <button className="btn" onClick={importJson}>⬆ Import backup</button>
          <button className="btn danger" onClick={() => {
            if (confirm('Delete ALL resumes from this browser? (Cloud copies are kept — use Sync to restore.)')) {
              localStorage.removeItem('craftcv.resumes.v1');
              localStorage.removeItem('craftcv.resumes.v2');
              location.hash = '#/';
              location.reload();
            }
          }}>Clear local copies</button>
        </div>
        {msg && <div className="notice" style={{ marginTop: 12, fontSize: 12.5 }}>{msg}</div>}
      </div>

      <div className="card pad" style={{ marginTop: 18, borderColor: '#f3c7c7' }}>
        <h3 style={{ color: 'var(--err)' }}>Danger zone</h3>
        <p className="hint">Deleting your account removes your profile, every resume and all events from our database. This cannot be undone.</p>
        <div className="row">
          <button className="btn danger" disabled={busy === 'del'} onClick={async () => {
            if (!confirm('Delete your account and ALL resumes permanently?')) return;
            if (!confirm('Last check — this cannot be undone. Continue?')) return;
            setBusy('del');
            if (cloudEnabled()) {
              const res = await cloudDeleteAccount();
              if (!res.ok) { setMsg(`Could not delete account: ${res.error}`); setBusy(''); return; }
            }
            localStorage.clear();
            sessionStorage.clear();
            location.hash = '#/';
            location.reload();
          }}>{busy === 'del' ? 'Deleting…' : 'Delete account & all data'}</button>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <div className="spread">
          <h3 style={{ color: 'var(--navy-900)', margin: 0 }}>🔐 Security log (this browser)</h3>
          <button className="btn small" onClick={() => setShowAudit(!showAudit)}>{showAudit ? 'Hide' : 'Show'} ({auditLogs.length})</button>
        </div>
        {showAudit && (
          <div className="tbl-wrap" style={{ marginTop: 12, maxHeight: 300, overflow: 'auto' }}>
            <table className="tbl" style={{ fontSize: 11.5 }}>
              <thead><tr><th>Time</th><th>Event</th><th>Details</th></tr></thead>
              <tbody>
                {auditLogs.slice(-50).reverse().map((l, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.timestamp).toLocaleString()}</td>
                    <td style={{ fontFamily: 'monospace' }}>{l.action}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 10.5, wordBreak: 'break-all' }}>{JSON.stringify(l.details).slice(0, 120)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
