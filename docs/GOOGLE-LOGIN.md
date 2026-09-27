# Google login — why it failed and how it is fixed

## The symptom(s)

Signing in with Google ended on this message (Supabase's own error page/JSON, or a
red notice inside the app):

```
Provider (issuer "https://accounts.google.com") is not enabled
```

Other shapes of the same complaint, all of them covered below:

| What the user sees | What it really is |
|---|---|
| *“The Google button does nothing”* / back on the login form with no message | Google never sent the user back to us (usually its own “Access blocked” page) |
| *“Access blocked: … has not completed the Google verification process”* on accounts.google.com | OAuth consent screen still in **Testing** |
| *“accounts.google.com refused to connect”* | the app was being viewed inside an **iframe** — Google's pages cannot be framed |
| A red *“Google sign-in was cancelled”* right after a blocked-app page | (old build) the real cause was thrown away — fixed, see the error map |
| Anything on a `http://` address other than `localhost` | **no `crypto.subtle`** → the PKCE handshake cannot be built at all |

## Live status of this project (checked 2026-09-24)

Read straight off the public endpoints — no guessing:

| Check | Result |
|---|---|
| `GET /auth/v1/settings → external.google` | **enabled** ✅ (`email`, `google` on; sign-ups allowed) |
| `GET /auth/v1/authorize?provider=google` | **302 to `accounts.google.com`** ✅ — Supabase accepted the client ID/secret pair and Google accepted its callback |
| Google client in use | `854985942115-ns0npfc14kimq2nno8n10qkgagr85cfg.apps.googleusercontent.com` |
| Callback Supabase sends to Google | `https://voyvalrnxmdogsllarnz.supabase.co/auth/v1/callback` |

So **the Supabase half is correct** and the Google client/secret pair is real. What
is left is the *last mile*, which is exactly what the app now checks and explains.

### For the record — the two phrasings GoTrue uses

It is worth knowing because the error text differs by call path, which is why the
classifier matches on both:

| Where it comes from | Response |
|---|---|
| `POST /auth/v1/token?grant_type=id_token` (old GSI/One-Tap code path) | `400 {"error_code":"provider_disabled","msg":"Provider (issuer \"https://accounts.google.com\") is not enabled"}` |
| `GET /auth/v1/authorize?provider=google` | `400 {"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}` |

## The original cause (now fixed)

**The Google provider was switched off in the Supabase project**
(`Authentication → Providers → Google`). Supabase stores the Google *client
secret* on its server, so this switch cannot be flipped from the website — no
front-end change can avoid it. It is a one-time project setting, and on this
project it **is now enabled** (see the live status above).

### The other four causes (all detected and explained in-app now)

1. **OAuth consent screen still in “Testing”.** Google then blocks every account
   that is not on the *Test users* list with
   *“Access blocked: … has not completed the Google verification process”* — and
   that page **never redirects back to the app**, so the user simply lands on the
   login form again with no message. Fix: Google Cloud → APIs & Services →
   OAuth consent screen → **Publish app** (the basic `email profile` scopes need
   no Google review, so it applies instantly). The app now
   • names this cause when Google's description reaches us as `access_denied`, and
   • notices a browser that left for Google and came back with nothing, and shows
     the walkthrough with this step highlighted.
2. **The address is not whitelisted.** Supabase → Authentication → URL
   Configuration must contain the site's Site URL and a redirect entry for the
   address the user started from (e.g. `https://your-site/**` and
   `http://localhost:5173/**`). The setup panel prints the *exact current
   address* to copy.
3. **The app is shown inside an iframe** (preview panels, dashboards, embeds).
   Google sends its sign-in pages with `X-Frame-Options: DENY`, so the frame can
   never show them. `cloudStartGoogleSignIn()` detects the embed and reserves a
   **real top-level tab synchronously on click**, before any asynchronous provider
   checks (opening the tab *after* those checks loses browser user activation and
   is blocked as a popup). Once the PKCE verifier is stored and the authorize URL
   checked, it navigates that tab; on failure it closes it. The original tab
   follows the session as soon as it appears (`cloudOnAuthChange`). If a popup
   blocker stops the tab, the app offers “Open the app in a new tab ↗”.
4. **A plain `http://` address** (LAN preview, old host). Browsers only expose
   `crypto.subtle` in a secure context, and PKCE needs it — the app now refuses
   up front with *“This page is not on a secure (HTTPS) address”* instead of
   failing mid-handshake.

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

0. **Google Cloud Console → APIs & Services → OAuth consent screen → `Publish app`**
   While it says *Testing*, Google blocks every account that is not on the
   *Test users* list. Publishing costs nothing and needs no review for the
   `email`/`profile` scopes used here.
   Deep link: `https://console.cloud.google.com/apis/oauth-consent`

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

Verify from the repo — no guessing (and there is an in-app twin: **Settings →
Google login → Setup / fix Google login → “▶ Test the connection”**, which runs the
same probe + handshake from the user's own browser and prints Supabase's answer):

```bash
npm run check:auth -- --app-url=https://your-site.example
# exit 0 = enabled · 1 = disabled · 2 = could not check
```

The script reads the public `GET /auth/v1/settings` endpoint **and** starts a
handshake (`/auth/v1/authorize?provider=google`) without following it, so it can
also report which Google client Supabase is using and where Google will send the
user back:

```
Google provider  : ENABLED ✅
Handshake        : OK ✅  (Supabase → Google accepts the redirect)
Google client ID : 834408285039-…apps.googleusercontent.com
Google redirect  : https://<ref>.supabase.co/auth/v1/callback
Scopes           : email profile
```

A green handshake means Supabase reached Google with a client ID/secret pair
Google accepted — Google rejects an unregistered `redirect_uri` before showing
the account chooser, so the Google Cloud half of the setup is correct too.

### Two things the script cannot see

* **OAuth consent screen** (Google Cloud → *OAuth consent screen*): if it is still
  in *Testing*, only listed test users can sign in — everyone else gets
  *“Access blocked: … has not completed the Google verification process”*. Press
  **Publish app** (or add test users) before opening sign-up to the public.
* **Site URL / Redirect URLs** must contain your *real* deployed domain. If they
  do not, the user is returned to the wrong address after Google accepts them.

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
| `src/components/AuthPage.tsx`, `src/components/Settings.tsx`, `src/App.tsx` | Button + status, the “Signing you in…” screen while a callback is being exchanged, and following a sign-in that finished in another tab. |
| `src/components/GoogleSetupPanel.tsx` | Copy-paste walkthrough (credentials → consent screen → provider → URLs), the step that matches the reported problem is marked **← your blocker**, plus **“▶ Test the connection”** (`cloudGoogleDiagnostics()`), **“↻ Check again”** and the exact address to whitelist. |
| `tests/test-google-auth.mjs` | 88 checks (part of `npm test`): URL parsing, error translation (incl. the consent/iframe/insecure cases), provider probe, handshake diagnostics, and the full flow against a stubbed Supabase in five different browsers. |

### Error → message map

| Server says | App shows | Fix |
|---|---|---|
| `Provider (issuer …) is not enabled`, `Unsupported provider` | *Google login is switched off for this Supabase project* | Enable the provider (step 2) |
| `redirect_uri_mismatch`, `Unable to exchange external code`, `invalid_client` | *Google is enabled, but the OAuth credentials do not match* | Add the callback URI in Google Cloud, use the same client in Supabase |
| `Redirect URL not allowed`, `Invalid redirect URL` | *This site's address is not whitelisted for sign-in* | URL configuration (step 3) |
| `PKCE code verifier not found in storage` | *That Google sign-in link expired* | Start again in the same browser |
| `access_denied` (bare) | *Google sign-in was cancelled* (neutral wording) | Try again / use email |
| `Access blocked: … has not completed the Google verification process`, `org_internal`, `admin_policy_enforced` | *Google is blocking the app — the consent screen is still in “Testing”* | Publish the consent screen (step 0) |
| no callback at all (browser left and came back empty) | *You came back from Google without finishing* | Same fix — consent screen, highlighted in the walkthrough |
| app inside an iframe | *Google sign-in cannot run inside this preview frame* + “open in a new tab” | The flow opens a real tab by itself; the tab is blocked only if popups are |
| page on plain `http://` | *This page is not on a secure (HTTPS) address* | Open the site over https:// (or localhost) |
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
