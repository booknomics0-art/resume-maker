import { currentUser, logout } from '../lib/auth';
import { navigate } from '../App';

export default function Settings() {
  const user = currentUser();

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Account aur data controls.</div>
        </div>
      </div>

      <div className="card pad">
        <h3 style={{ color: 'var(--navy-900)' }}>Account</h3>
        <div className="spread" style={{ marginTop: 8 }}>
          <div>
            <b style={{ color: 'var(--navy-800)' }}>{user?.name}</b>
            <div className="hint">{user?.email} · signed in with {user?.provider === 'google' ? 'Google' : 'email'}</div>
          </div>
          <button className="btn" onClick={() => { logout(); location.hash = '#/'; location.reload(); }}>Logout</button>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <h3 style={{ color: 'var(--navy-900)' }}>Your data</h3>
        <p className="hint">Everything is saved in this browser (localStorage). You can export a backup at any time.</p>
        <div className="row">
          <button className="btn" onClick={() => {
            const blob = new Blob([localStorage.getItem('craftcv.resumes.v1') || '[]'], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'craftcv-backup.json';
            a.click();
          }}>⬇ Export backup (JSON)</button>
          <button className="btn danger" onClick={() => {
            if (confirm('Delete ALL resumes from this browser?')) {
              localStorage.removeItem('craftcv.resumes.v1');
              location.hash = '#/';
              location.reload();
            }
          }}>Delete all data</button>
        </div>
      </div>
    </div>
  );
}
