import { useMemo, useState } from 'react';
import { googleSetupInfo, type GoogleAuthIssue, type GoogleProviderState } from '../lib/googleAuth';
import { GOOGLE_CLIENT_ID } from '../lib/googleClient';
import { SUPABASE_URL, cloudEnabled } from '../lib/supabase';
import { cloudGoogleDiagnostics, type GoogleDiagnostics } from '../lib/cloud';
import { authRedirectUrl } from '../lib/authRedirect';

/**
 * "Google login does not work" walkthrough.
 *
 * Shown on the login screen (and in Settings) whenever the handshake cannot be
 * started — provider off, credentials mismatched, consent screen still in
 * Testing, site not whitelisted, insecure address… Everything here is
 * copy-paste ready: the exact callback URL, the address that has to be in the
 * redirect allow-list, the three dashboard deep links, a live “Test the
 * connection” (the browser twin of `npm run check:auth`) and a “Check again”
 * button that re-reads the project without a rebuild.
 *
 * The step that matches the reported problem is marked as **your blocker**, so
 * the owner does not have to read all of them.
 */

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to the legacy path */ }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function CopyRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="copy-row">
      <div className="copy-row-label">{label}</div>
      <div className="copy-row-value">
        <span className={mono ? 'mono' : ''}>{value}</span>
        <button
          type="button"
          className="btn small"
          onClick={async () => {
            const ok = await copyText(value);
            setCopied(ok);
            if (ok) setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

/** Which step the reported problem belongs to. */
function blockerStep(issue?: GoogleAuthIssue | null): string {
  switch (issue?.code) {
    case 'provider_disabled': return 'provider';
    case 'provider_misconfigured': return 'credentials';
    case 'consent_testing': return 'consent';
    case 'redirect_not_allowed': return 'urls';
    default: return '';
  }
}

function StepHead({ title, active, blocker }: { title: string; active: boolean; blocker: string }) {
  return (
    <b>
      {title}
      {active && blocker && (
        <span className="notice warn" style={{ marginLeft: 8, padding: '2px 8px', fontSize: 11.5 }}>
          ← your blocker
        </span>
      )}
    </b>
  );
}

export default function GoogleSetupPanel({
  issue,
  state,
  onRecheck,
  rechecking = false,
  onClose,
}: {
  issue?: GoogleAuthIssue | null;
  state: GoogleProviderState;
  onRecheck: () => void;
  rechecking?: boolean;
  onClose?: () => void;
}) {
  // Pure computation from the current address + project URL (no cloud call).
  const info = useMemo(
    () => googleSetupInfo(typeof window !== 'undefined' ? window.location.href : '', SUPABASE_URL),
    [],
  );
  // The exact address this page is served from — the one Supabase has to allow.
  const here = useMemo(() => authRedirectUrl() || info.siteUrl, [info.siteUrl]);
  const blocker = blockerStep(issue);

  const [diag, setDiag] = useState<GoogleDiagnostics | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);

  const runDiagnostics = async () => {
    setDiagBusy(true);
    try {
      setDiag(await cloudGoogleDiagnostics());
    } finally {
      setDiagBusy(false);
    }
  };

  return (
    <div className="setup-panel">
      <div className="setup-head">
        <div>
          <b>{issue?.title || 'Turn on Google sign-in (one-time, ~3 minutes)'}</b>
          <div className="hint" style={{ marginTop: 4 }}>
            {issue?.message || 'Google sign-in has to be switched on inside your Supabase project first.'}
          </div>
        </div>
        {onClose && (
          <button type="button" className="btn small ghost" onClick={onClose} aria-label="Close setup instructions">✕</button>
        )}
      </div>

      {issue?.hint && <div className="notice" style={{ margin: '10px 0 0', fontSize: 12.5 }}>{issue.hint}</div>}

      {issue?.raw && (
        <div className="hint" style={{ marginTop: 8, fontSize: 11.5 }}>
          Server said: <span className="mono">{issue.raw.slice(0, 240)}</span>
        </div>
      )}

      <ol className="setup-steps">
        <li>
          <StepHead title="Google Cloud Console → Credentials" active={blocker === 'credentials'} blocker={blocker} />
          <p className="hint">
            Create (or open) an OAuth client of type <b>Web application</b>. Under <i>Authorized redirect URIs</i> add exactly this
            address, then copy the <b>Client ID</b> and <b>Client secret</b>.
          </p>
          <CopyRow label="Client ID this app uses" value={GOOGLE_CLIENT_ID} />
          <CopyRow label="Authorized redirect URI (Google Cloud)" value={info.callbackUrl} />
          <CopyRow label="Authorized JavaScript origin (optional)" value={info.appOrigin} />
          <a className="btn small" href={info.googleConsoleUrl} target="_blank" rel="noreferrer noopener">Open Google credentials ↗</a>
        </li>

        <li>
          <StepHead title="Google Cloud Console → OAuth consent screen" active={blocker === 'consent'} blocker={blocker} />
          <p className="hint">
            While the consent screen says <b>Testing</b>, Google blocks every account that is not on the
            “Test users” list — people see <i>“Access blocked: … has not completed the Google verification process”</i> and never reach
            this app. Press <b>Publish app</b> (or add the emails under <b>Test users</b>). The basic email + profile scopes used here
            need no Google review, so publishing takes effect immediately.
          </p>
          <a className="btn small" href={info.consentUrl} target="_blank" rel="noreferrer noopener">Open OAuth consent screen ↗</a>
          <CopyRow label="App domain to enter there" value={info.appOrigin} />
        </li>

        <li>
          <StepHead title="Supabase → Authentication → Providers → Google" active={blocker === 'provider'} blocker={blocker} />
          <p className="hint">
            Toggle <b>Google</b> on, paste the Client ID and Client secret from step 1 and press <b>Save</b>.
            Use the same Client ID here — a mismatch is the reason for “redirect_uri_mismatch” errors.
          </p>
          {info.providersUrl
            ? <a className="btn small primary" href={info.providersUrl} target="_blank" rel="noreferrer noopener">Open Supabase Providers ↗</a>
            : <CopyRow label="Open in your Supabase dashboard" value={`${info.supabaseUrl} → Authentication → Providers`} />}
        </li>

        <li>
          <StepHead title="Supabase → Authentication → URL Configuration" active={blocker === 'urls'} blocker={blocker} />
          <p className="hint">
            Supabase only returns users to addresses you allow here. Set the <b>Site URL</b> and add the redirect URLs —
            including <b>this exact address</b>, otherwise the handshake cannot come back to the page you started it from.
          </p>
          <CopyRow label="This page’s address (must be allowed)" value={here} />
          <CopyRow label="Site URL" value={info.siteUrl} />
          <CopyRow label="Redirect URL (live site)" value={info.redirectUrlPattern} />
          <CopyRow label="Redirect URL (local dev)" value={info.localRedirectPattern} />
          {info.urlConfigUrl && (
            <a className="btn small" href={info.urlConfigUrl} target="_blank" rel="noreferrer noopener">Open URL configuration ↗</a>
          )}
        </li>

        <li>
          <StepHead title="Come back here and press “Check again”" active={false} blocker={blocker} />
          <p className="hint">
            The button below re-reads your project settings; “Test the connection” also runs the real handshake from this
            browser and shows Supabase’s own answer.
          </p>
        </li>
      </ol>

      <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <button type="button" className="btn primary" onClick={onRecheck} disabled={rechecking}>
          {rechecking ? 'Checking…' : '↻ Check again'}
        </button>
        <button type="button" className="btn" onClick={() => void runDiagnostics()} disabled={diagBusy || !cloudEnabled()}>
          {diagBusy ? 'Testing…' : '▶ Test the connection'}
        </button>
        <span className="hint" style={{ alignSelf: 'center', fontSize: 12 }}>
          {state === 'enabled'
            ? '✅ Google is enabled — you can sign in now.'
            : state === 'disabled'
              ? '⏳ Still off. Changes in Supabase apply instantly, so save, then check again.'
              : 'Could not read the setting (offline or blocked network). You can try the button anyway.'}
        </span>
      </div>

      {!cloudEnabled() && (
        <div className="notice warn" style={{ marginTop: 10, fontSize: 12.5 }}>
          This build has no Supabase project configured at all (<span className="mono">VITE_SUPABASE_URL</span> /{' '}
          <span className="mono">VITE_SUPABASE_ANON_KEY</span>), so Google sign-in cannot work until that is set.
        </div>
      )}

      {diag && (
        <div className="notice" style={{ marginTop: 12, fontSize: 12.5, display: 'grid', gap: 4 }}>
          <b>Live check from this browser</b>
          <div>
            {diag.provider.state === 'enabled' ? '✅' : diag.provider.state === 'disabled' ? '❌' : '⚠️'}{' '}
            Google provider in this Supabase project:{' '}
            <b>{diag.provider.state === 'enabled' ? 'enabled' : diag.provider.state === 'disabled' ? 'NOT enabled' : 'could not read'}</b>
            {diag.provider.httpStatus ? ` (HTTP ${diag.provider.httpStatus})` : ''}
            {diag.provider.detail ? ` — ${diag.provider.detail}` : ''}
          </div>
          <div>
            {diag.authorize.ok ? '✅' : diag.authorize.checked ? '❌' : '⚠️'}{' '}
            Handshake to Google (Supabase → accounts.google.com):{' '}
            <b>
              {!diag.authorize.checked
                ? 'not reached'
                : diag.authorize.ok
                  ? 'accepted — Google will show its sign-in screen'
                  : 'refused'}
            </b>
            {diag.authorize.status ? ` (HTTP ${diag.authorize.status})` : ''}
          </div>
          {diag.authorize.serverText && (
            <div className="hint" style={{ fontSize: 11.5 }}>
              Server said: <span className="mono">{diag.authorize.serverText.slice(0, 240)}</span>
            </div>
          )}
          {diag.authorize.issue && <div className="hint" style={{ fontSize: 11.5 }}>That answer means: <b>{diag.authorize.issue.title}</b></div>}
          <div className="hint" style={{ fontSize: 11.5 }}>
            Supabase was asked to return the user to: <span className="mono">{diag.authorize.redirectTo}</span>
          </div>
          {diag.authorize.ok && (
            <div className="hint" style={{ fontSize: 11.5 }}>
              A green handshake means the Client ID/secret pair in Supabase is valid and Google accepts Supabase’s callback URL.
              If the Google screen still refuses you, the consent screen is in “Testing” — see step 2.
            </div>
          )}
        </div>
      )}

      <div className="hint" style={{ marginTop: 10, fontSize: 11.5 }}>
        Meanwhile, <b>email + password works right now</b> — and it is not going anywhere.
      </div>
    </div>
  );
}
