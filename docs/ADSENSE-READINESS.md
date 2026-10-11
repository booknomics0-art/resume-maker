# ResumeMakery AdSense readiness

## Current policy-safe approach

ResumeMakery should be reviewed as a useful product plus original publisher content, not as an ad-first utility. Ads must never be placed inside the resume editor, dashboard, sign-in/sign-up, import/OCR flow, PDF generation/download status, settings, or other action-first screens.

If AdSense is approved later, use the route allowlist in `src/lib/adPlacement.ts`. The initial eligible surfaces are the long-form editorial guide pages only.

## Before adding the AdSense script

1. Receive an approved AdSense publisher ID. Do not publish a placeholder `ads.txt` record.
2. Configure a Google-certified CMP / consent flow wherever Google requires it (including EEA, UK and Switzerland traffic).
3. Update Privacy and Cookie disclosures for the exact advertising and measurement products actually enabled.
4. Publish the correct `ads.txt` line from the AdSense account at `/ads.txt`.
5. Keep ad units visually separate from navigation, download buttons, form controls and resume actions.
6. Do not create pages primarily to host ads; every ad-eligible page must provide substantial original value without the ad.
7. Re-check mobile layout, CLS and Core Web Vitals after enabling ad code.

## Content inventory

The site includes public product/SEO pages plus a dedicated editorial guide library:

- `/guides`
- `/guides/resume-format-india`
- `/guides/resume-summary-examples`
- `/guides/resume-skills-guide`
- `/guides/fresher-resume-guide`

These guides are intentionally long-form, example-led and written to help users make resume decisions rather than to target keywords with thin templated pages.

## Search/indexing checklist

- Keep all public content self-canonical and indexable.
- Keep private/action routes noindex or blocked from crawl where appropriate.
- Maintain `public/sitemap.xml` and resubmit it after meaningful content releases.
- Monitor Search Console for `Discovered - currently not indexed`, canonical issues and crawl failures.
- Avoid mass-publishing near-duplicate career pages until each page can contain genuinely distinct, useful information.

## Review checklist before AdSense application

- Home, About, Contact, Privacy, Terms, Cookies and FAQ are reachable from public navigation/footer.
- No broken public links or placeholder content.
- The homepage and core guides load on mobile without authentication.
- Privacy/Cookie policy matches the analytics and advertising code actually running in production.
- Original editorial content is visible without signing in.
- Ads are not active before consent and publisher configuration are ready.

AdSense approval is ultimately decided by Google; this checklist reduces avoidable product, content and policy risks but cannot guarantee approval.
