import { useMemo, useState } from 'react';
import { googleSetupInfo, type GoogleAuthIssue, type GoogleProviderState } from '../lib/googleAuth';
import { SUPABASE_URL } from '../lib/supabase';

/**
 * "Google login is not enabled" walkthrough.
 *
 * Shown on the login screen (and in Settings) when Supabase reports that the
 * Google provider is off for this project — the one reason Google sign-in cannot
 * work that app code cannot fix by itself. Everything here is copy-paste ready:
 * the exact callback URL, the two dashboard deep links and a "check again"
 * button that re-reads the project settings without a rebuild.
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

  return (
    <div className="setup-panel">
      <div className="setup-head">
        <div>
          <b>{issue?.title || 'Turn on Google sign-in (one-time, ~2 minutes)'}</b>
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
          <b>Google Cloud Console → Credentials</b>
          <p className="hint">
            Create (or open) an OAuth client of type <b>Web application</b>. Under <i>Authorized redirect URIs</i> add exactly this
            address, then copy the <b>Client ID</b> and <b>Client secret</b>.
          </p>
          <CopyRow label="Authorized redirect URI" value={info.callbackUrl} />
          {info.appOrigin && <CopyRow label="Authorized JavaScript origin (optional)" value={info.appOrigin} />}
          <a className="btn small" href={info.googleConsoleUrl} target="_blank" rel="noreferrer noopener">Open Google credentials ↗</a>
        </li>

        <li>
          <b>Supabase → Authentication → Providers → Google</b>
          <p className="hint">
            Toggle <b>Google</b> on, paste the Client ID and Client secret from step 1 and press <b>Save</b>.
            Use the same Client ID here — a mismatch is the reason for “redirect_uri_mismatch” errors.
          </p>
          {info.providersUrl
            ? <a className="btn small primary" href={info.providersUrl} target="_blank" rel="noreferrer noopener">Open Supabase Providers ↗</a>
            : <CopyRow label="Open in your Supabase dashboard" value={`${info.supabaseUrl} → Authentication → Providers`} />}
        </li>

        <li>
          <b>Supabase → Authentication → URL Configuration</b>
          <p className="hint">
            Supabase only returns users to addresses you allow here. Set the <b>Site URL</b> and add the redirect URL
            (add the localhost one too if you develop on your machine).
          </p>
          <CopyRow label="Site URL" value={info.siteUrl} />
          <CopyRow label="Redirect URL (live site)" value={info.redirectUrlPattern} />
          <CopyRow label="Redirect URL (local dev)" value={info.localRedirectPattern} />
          {info.urlConfigUrl && (
            <a className="btn small" href={info.urlConfigUrl} target="_blank" rel="noreferrer noopener">Open URL configuration ↗</a>
          )}
        </li>

        <li>
          <b>Come back here and press “Check again”</b>
          <p className="hint">
            The button below re-reads your project settings. Green means “Continue with Google” now takes you straight to Google.
          </p>
        </li>
      </ol>

      <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <button type="button" className="btn primary" onClick={onRecheck} disabled={rechecking}>
          {rechecking ? 'Checking…' : '↻ Check again'}
        </button>
        <span className="hint" style={{ alignSelf: 'center', fontSize: 12 }}>
          {state === 'enabled'
            ? '✅ Google is enabled — you can sign in now.'
            : state === 'disabled'
              ? '⏳ Still off. Changes in Supabase apply instantly, so save, then check again.'
              : 'Could not read the setting (offline or blocked network). You can try the button anyway.'}
        </span>
      </div>

      <div className="hint" style={{ marginTop: 10, fontSize: 11.5 }}>
        Meanwhile, <b>email + password works right now</b> — and it is not going anywhere.
      </div>
    </div>
  );
}
