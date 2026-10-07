# Site verification

Google Search Console (and similar services like Bing, Yandex, Norton, etc.) need to
confirm that you own this domain before they show any data for it. The file-based
method is the most reliable on static hosting because nothing has to be redeployed
after you swap the token.

## Verify ownership via the file method

1. Open https://search.google.com/search-console and add this site as a
   **URL prefix** property: `https://www.resumemakery.com/`.
2. Pick the verification method **“File upload”** (not HTML tag, not DNS).
3. Download the file Google gives you. It is called
   `google<token>.html` and its content is a single token string.
4. Drop that exact file here:
   `public/google<token>.html`
5. Commit + push. Vercel will publish it at
   `https://www.resumemakery.com/google<token>.html`.
6. Press **Verify** in the Search Console. The token must remain on the URL
   permanently — do not delete the file after verification.

## Verify ownership via the HTML meta tag method

If you prefer the HTML tag method instead of the file upload:

1. Open https://search.google.com/search-console → add property → choose
   **HTML tag** as the verification method.
2. Copy the meta tag Google shows you.
3. Replace the placeholder line in `index.html`:
   ```html
   <meta name="google-site-verification" content="REPLACE_WITH_YOUR_VERIFICATION_TOKEN" />
   ```
   with the real content attribute Google gave you.
4. Redeploy. Google verifies within a minute or two.

## Why is the placeholder token still here?

`public/.well-known/google-site-verification` ships with a placeholder string.
Google will reject that placeholder as a real token (because they did not issue
it), but it lets you **see** the URL the file method will live at — and is harmless
if you are using the HTML tag method instead.

If you delete the `.well-known/` folder, no verification breaks; if you leave it,
nothing leaks. The folder exists only as a paper trail.
