# Google login — why it failed and how it is fixed

## The symptom

Signing in with Google ended on this message (Supabase's own error page/JSON, or a
red notice inside the app):

```
Provider (issuer "https://accounts.google.com") is not enabled
```

Depending on the call path Supabase phrases the same problem two ways:

| Where it comes from | Response |
|---|---|
| `POST /auth/v1/token?grant_type=id_token` (old GSI/One-Tap code path) | `400 {"error_code":"provider_disabled","msg":"Provider (issuer \"https://accounts.google.com\") is not enabled"}` |
| `GET /auth/v1/authorize?provider=google` | `400 {"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}` |

## The cause

**The Google provider is switched off in the Supabase project**
(`Authentication → Providers → Google`). Supabase stores the Google *client
secret* on its server, so this switch cannot be flipped from the website — no
front-end change can avoid it. It is a one-time project setting.

Two secondary problems made it much worse than it needed to be, and both are
fixed in code:

1. The login button used Google Identity Services (`accounts.google.com/gsi/client`)
   + `supabase.auth.signInWithIdToken()`. That path is what produced the cryptic
   *issuer* message, needed a second Google client next to Supabase's, and was at
   odds with this app's strict CSP/COOP headers.
2. When the provider was off, the browser was sent to Supabase's `/authorize`
   endpoint, which answers with **raw JSON**. The user got a dead end with no hint
   of what to do.

## The fix — the 3-minute setup (owner, one time)

1. **Google Cloud Console → APIs & Services → Credentials**
   Create an OAuth client of type **Web application**.
   *Authorized redirect URIs* — add exactly:

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

   (For CraftCV: `https://voyvalrnxmdogsllarnz.supabase.co/auth/v1/callback`.)
   Copy the **Client ID** and **Client secret**.

2. **Supabase → Authentication → Providers → Google** → enable it, paste the
   Client ID + secret, **Save**.
   Deep link: `https://supabase.com/dashboard/project/<ref>/auth/providers`

3. **Supabase → Authentication → URL Configuration** → set the **Site URL** to
   your deployed site and add the redirect URLs:

   ```
   https://your-site.example/        ← Site URL
   https://your-site.example/**      ← Redirect URLs
   http://localhost:5173/**          ← local development
   ```

Verify from the repo — no guessing:

```bash
npm run check:auth -- --app-url=https://your-site.example
# exit 0 = enabled · 1 = disabled · 2 = could not check
```

The app itself also checks: the login screen probes the project setting, labels
the button, and the *"Check again"* button inside the built-in walkthrough
re-reads it after you save. `Settings → Google login` has the same status card.

## What the code does now

| File | Role |
|---|---|
| `src/lib/authRedirect.ts` | Snapshots the callback parameters synchronously at import time (before anything can clean the URL), removes them afterwards without touching the hash route, and builds the `redirectTo` target. |
| `src/lib/googleAuth.ts` | Pure logic: `probeGoogleProvider()` reads `GET /auth/v1/settings → external.google`; `classifyAuthError()` turns every Supabase/Google/network error into one sentence + the fix; `googleSetupInfo()` builds the deep links and exact values shown in the walkthrough. |
| `src/lib/cloud.ts` | The flow: `cloudStartGoogleSignIn()` (probe → **refuse before navigating when the provider is off** → guard the authorize URL → hand over to Supabase) and `cloudCompleteRedirectSignIn()` / `cloudBootAuth()` (exchange the one-time `?code=…`, once per page load so StrictMode cannot burn it, then map every failure). |
| `src/lib/supabase.ts` | `flowType: 'pkce'` and `detectSessionInUrl: false` — the code arrives in the **query string** (safe with hash routing) and *we* exchange it, so errors are explained instead of swallowed. |
| `src/components/GoogleSetupPanel.tsx` | The copy-paste walkthrough (callback URI, both dashboard links, “Check again”). |
| `src/components/AuthPage.tsx`, `src/components/Settings.tsx`, `src/App.tsx` | Button + status, and the “Signing you in…” screen while a callback is being exchanged. |
| `tests/test-google-auth.mjs` | 56 checks (part of `npm test`): URL parsing, error translation, provider probe, and the full flow against a stubbed Supabase. |

### Error → message map

| Server says | App shows | Fix |
|---|---|---|
| `Provider (issuer …) is not enabled`, `Unsupported provider` | *Google login is switched off for this Supabase project* | Enable the provider (step 2) |
| `redirect_uri_mismatch`, `Unable to exchange external code`, `invalid_client` | *Google is enabled, but the OAuth credentials do not match* | Add the callback URI in Google Cloud, use the same client in Supabase |
| `Redirect URL not allowed`, `Invalid redirect URL` | *This site's address is not whitelisted for sign-in* | URL configuration (step 3) |
| `PKCE code verifier not found in storage` | *That Google sign-in link expired* | Start again in the same browser |
| `access_denied` | *Google sign-in was cancelled* (neutral wording) | Try again / use email |
| `Failed to fetch`, timeout | *Could not reach the sign-in service* | Check the connection |

## Why the browser is now safe

- The provider status is probed **before** any navigation, so a disabled project
  produces the walkthrough instead of Supabase's raw JSON page.
- As a second guard, the authorize URL is requested with `redirect: 'manual'`
  first: a 3xx towards Google is expected, a readable error body is turned into a
  message *inside the app*.
- The one-time `code` and the tokens never stay in the address bar (they are
  removed with `history.replaceState`, and the `#/…` route survives).
- Email + password is untouched and works even if Google is unavailable, in cloud
  mode and in offline/demo mode.
