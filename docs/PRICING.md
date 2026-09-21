# Pricing — competitor research & recommendation

Prices verified via web research on 2026-09-20 (public pricing pages & 2025–26 reviews).

## Competitor snapshot

| Competitor | Free tier | Monthly | Annual / other | Main catch |
|---|---|---|---|---|
| Resume.io | TXT only | $2.95 trial → **$29.95/4 weeks** | $49.95/quarter, $74.95/yr | trial auto-renews (~$389/yr) [1][2][3] |
| Zety | build only, **no download** | ~**$24–25.95** ($2.70 trial) | $71.40/yr ($5.95/mo) | paywall at download [4][5][2] |
| Novoresume | 1-page resume | **$19.99** | $39.99/qtr, $99.99/yr | 1 page on free [4][2] |
| Kickresume | watermark | **$19–29** | $48–96/yr, $9/wk | watermarked exports [4][2][5] |
| Enhancv | 7-day trial, watermark | ~**$13–25** | ~$60/yr, **$149 lifetime** | watermark until paid [4][5] |
| Rezi | 3 PDFs lifetime | **$29** | **$149 lifetime** | hard PDF cap [3] |
| JobSprout | basic templates | **$12** ($6/wk) | $72/yr, **$99 lifetime** | young product [3] |
| Canva | resume templates free | Pro $14.99 | $119.99/yr | resumes often ATS-unfriendly [5] |

Sources:
[1] https://pitchmeai.com/blog/resume-io-full-review-pros-cons
[2] https://aivario.com/tools/resume-io
[3] https://www.jobsprout.ai/blog/best-cv-cover-letter-tools
[4] https://resumeup.ai/blog/best-resume-builders
[5] https://bestjobsearchapps.com/articles/en/kickresume-vs-canva-resume-builder-vs-zety-vs-novoresume-vs-enhancv-vs-rezi-vs-teal-vs-indeed-vs-linkedin-resume-builder-comparison-2026
(See also: https://www.resumefast.io/blog/best-zety-alternatives, https://dev.to/alexdevson/best-resume-builders-in-2026-i-applied-to-50-jobs-to-test-these-o92)

## Market pattern

1. **Price cluster: $19–30/month.** Almost everyone sits here.
2. **Trial traps everywhere** ($2.70–2.95 → auto-renew $24–30). Big trust problem;
   refund complaints dominate reviews.
3. **Free tiers are crippled** (no download, watermark, TXT only, 1 page).
4. **Lifetime deals are rare** — only Enhancv ($149), Rezi ($149), JobSprout ($99).
   Under $99 there's a gap.
5. India-specific: global prices feel steep; ₹500–999/mo is the comfortable band,
   and one-time/lifetime plans convert very well with Indian users.

## Recommended setup for CraftCV

| Plan | Price | What's included |
|---|---|---|
| **Free** | ₹0 | 1 resume, 2 templates (Modern Split, Compact Pro), unlimited PDF downloads **without watermark**, all 10 fields |
| **Pro** | **₹399/mo or $7.99/mo** (launch: ₹299) | unlimited resumes, all 5×10 template combos, AI writing via n8n, future templates |
| **Lifetime** | **₹1,999 or $39 one-time** | everything in Pro, forever, no subscription |

Rationale:
- Free tier is genuinely usable (no watermark, real PDF) → word-of-mouth + SEO.
  Competitors' crippled free tiers are their most-hated feature; we invert it.
- ₹399 undercuts the $19–30 cluster by ~3× while AI cost per user stays pennies
  (gpt-4o-mini / Gemini free tier through your own n8n).
- Lifetime at ₹1,999/$39 attacks the empty under-$99 lifetime niche and funds
  early growth without billing infrastructure pressure.
- No trial-trap mechanics. Transparent pricing will be a marketing point itself.

## Payment setup (start simple)

- **India:** Razorpay — Payment Links or Checkout.js; supports UPI/cards/netbanking.
  Webhook → mark user Pro in your DB.
- **Global:** Stripe — Payment Links for the 3 SKUs; Stripe handles tax/invoices.
- **Later:** move to Razorpay Subscriptions + Stripe Billing for Pro recurring;
  lifetime stays one-time.
- Feature gating in-app: free tier = templates `modern` + `compact`; others show a
  lock → pricing page. (Ready to wire; v1 currently leaves everything open.)
