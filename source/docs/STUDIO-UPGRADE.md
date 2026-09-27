# CraftCV studio upgrade

This change keeps the existing React/Vite app, 50-template catalogue, resume model, importer, OCR pipeline and Supabase backend. It is intended for review on a branch before merging into the Vercel production branch.

## What changed

- Navy/silver dashboard with meaningful resume counts, resume search, completion filters, sort, recent-work shortcut and sample onboarding.
- Public `#/templates` library with real A4 previews, a focus-contained modal, zoom, previous/next navigation, Escape-to-close and explicit template application. The selected template survives the sign-in screen.
- Editor sections are freely accessible; mandatory details still gate PDF export. Quality and keyword checks are collapsible. Inputs have associated labels.
- Debounced autosave flushes on navigation/page exit, reports storage errors, retains the original account scope during logout, and no longer silently trims older resumes when storage is full.
- Local account login now uses the existing asynchronous password-verification functions. Signup no longer calls the broken synchronous temporary-password path.
- Google popup tabs are reserved before asynchronous requests; secondary-tab sign-in mirrors the authenticated session before rendering the app; OAuth returns to the intended editor route. Diagnostics no longer overwrite a PKCE verifier for a sign-in already in progress. Email confirmation gets the same explicit return URL.
- Resume storage is scoped to the signed-in email. Old unscoped data is adopted by the first account that opens it, once; the original data is retained as a migration backup. Other accounts no longer inherit or cloud-sync that account's resumes. Local clearing/account removal targets the active account.
- Raster profile photos survive saving without the old 5,000-character truncation. Data checks are deterministic across repeated calls.
- Public legal pages and landing section links work without a login redirect.
- Importer, settings and cover-letter routes load separately. Service worker caching excludes unsuccessful responses and only removes this app's old caches. Vercel does not cache `sw.js`.

## Review and deploy on Vercel

1. Review this PR, especially the account-scoped storage migration. Export a JSON backup from Settings before testing with existing resumes.
2. Vercel project: framework **Vite**, install `npm ci`, build `npm run build`, output **dist**. The repository root is the root directory. No server deployment is required.
3. For an explicit Supabase project override, set **both** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the relevant Vercel environments. A partial override deliberately disables cloud use rather than mixing keys from two projects. The existing public project defaults are retained when neither variable is supplied. Never use a service-role key in a Vite variable.
4. Run `npm run typecheck`, `npm test`, and `npm run build`. Review the Vercel branch preview, then merge when ready. Production is not changed until your deployment workflow runs.
5. After deployment, verify Google sign-in and cloud persistence using the checklist below.

## Google sign-in: exact production setup

The existing default project is `voyvalrnxmdogsllarnz`. A read-only diagnostic run during this work reported Google enabled, signup allowed, and a successful Supabase-to-Google authorize redirect. This is an initial handshake check, not an end-to-end login with a real Google account. Network probes were intermittent in the execution environment.

For the production URL supplied in the request:

| Console | Setting | Value |
| --- | --- | --- |
| Supabase → Authentication → URL Configuration | Site URL | `https://resume-maker-ivory-ten.vercel.app/` |
| Supabase → Authentication → URL Configuration | Redirect URLs | `https://resume-maker-ivory-ten.vercel.app/` |
| Supabase → Authentication → Providers → Google | Provider | Enabled, with your Web application client ID and secret |
| Google Cloud → OAuth Web client | Authorized redirect URI | `https://voyvalrnxmdogsllarnz.supabase.co/auth/v1/callback` |
| Google Cloud → OAuth consent / Audience | Audience | Published for general users, or the intended account included as a test user |

If you override the Supabase project, replace the project reference in the callback URI too. Add each actual Vercel preview origin to Supabase's redirect allow-list before testing it. The callback goes to the app root with `?code=...`; do not put `#/editor/...` in Google’s redirect URI. The app restores that route itself.

Run a read-only check:

```sh
npm run check:auth -- --app-url https://resume-maker-ivory-ten.vercel.app
```

Final account-based verification (requires the owner or a test user):

1. Open production in a normal browser tab, choose a template, and continue with Google.
2. Finish Google consent. Confirm you return to the editor with the chosen template, without another login prompt.
3. Create and save a resume. Refresh, then check the same account in another browser/device.
4. Sign out and sign into a second test account. Confirm the first account's resumes are not shown.
5. Repeat once in a private window and on a phone. If Google displays its own error page, record the actual error; provider configuration and consent settings cannot be repaired by frontend code alone.

Official references: [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## Verification

The existing test suites cover 271 checks across authentication, templates, resume score, cover letters, export content, ATS, OCR, PDF extraction and import handoff. Additional studio regressions cover local login, OAuth route restoration, repeated input checks, photo persistence, account isolation and storage exhaustion.

The browser suite covers public links, template preview/zoom/apply, editor sections, immediate-navigation autosave, dashboard search/duplication, a 390px mobile viewport and PDF export. Browser tests use synthetic local accounts and never submit a real user's credentials or upload a real resume.

```sh
npm ci
npx playwright install chromium
npm run dev
# In a second terminal:
npm run test:browser
```

Optional: `CRAFTCV_TEST_URL` changes the local target and `CRAFTCV_BROWSER_PATH` selects an existing Chromium binary. Browser screenshots/PDF are written to the ignored `tests/.tmp/` folder.

Known limits: the app uses browser Print → Save as PDF; it does not implement a server PDF service. No guarantee of ATS acceptance or job outcomes is implied. Existing AI features need your configured n8n endpoint for remote generation. Real Google consent, email delivery, and cross-device cloud sync need final verification against your own production account. The build still reports a large shared JavaScript chunk; larger bundle splitting is a separate performance improvement.
