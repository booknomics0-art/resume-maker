# Naukri Resume Maker vs CraftCV — A to Z Analysis & Action Plan

Research date: 27 September 2026. Naukri ka live landing page, FAQ, pricing
(press release Nov 2025 + vendor comparisons) aur poora CraftCV codebase
analyze kiya gaya hai. Har gap ke saath **exact file-level fix** bhi likha hai
taaki implementation seedha shuru ho sake.

---

## 1. Executive Summary (2 minute me)

**Naukri kya bech raha hai:**
- "Free AI resume maker" headline → free tier sirf **1 resume, 3 templates, 3 AI attempts**
- Baaki sab (20 templates, 100 AI attempts/day) **Naukri Pro** me: ₹999/1mo, ₹1,999/3mo, ₹2,999/6mo
- Real moat: Naukri profile integration (recruiter discoverability) + 20 saal ka brand + expert writing service

**CraftCV abhi kya hai:**
- 100% free, no watermark, unlimited resumes + unlimited downloads (Naukri me sirf 1 resume!)
- 50 templates / 20 families / 10 categories (Naukri: 20 templates, 3 free)
- Upload & edit (PDF/DOCX/TXT/photo OCR) — Naukri me ye feature **hai hi nahi**
- Free ATS JD keyword match — Naukri isko AI Pro me bechta hai
- On-device privacy, cloud sync, multi-page, JSON export

**Sabse badi problem:** CraftCV ka pehla screen **login wall** hai. Naukri pehle
poori sales pitch dikhata hai (hero, templates, reviews, FAQ), phir signup maangta hai.
CraftCV visitor ko bina bataye product ke andar bhej deta hai → conversion zero
aur Google bhi content index nahi kar pata (sab kuch login ke baad render hota hai).

**Bottom line:** Product Naukri se **feature-wise stronger hai** (upload/edit + ATS
match + 50 templates free). Jo kami hai wo **storefront** ki hai — landing page,
social proof, SEO, AI ki visibility, cover letter, aur trust signals. Neeche A to Z.

---

## 2. Head-to-Head Comparison Table

| # | Area | Naukri Resume Maker | CraftCV | Winner | CraftCV fix |
|---|------|--------------------|---------|--------|-------------|
| 1 | Landing/marketing page | Full sales page: hero, AI pitch, template gallery, benefits, 3-step how-to, 12+ testimonials, FAQ (SEO), expert-service banner | **Pehla screen login form hai** — koi marketing page nahi | Naukri | Gap 1 — public landing route |
| 2 | Free tier honesty | "Free" lekin 1 resume, 3 templates, 3 AI attempts; PDF hi milta hai | Poora product free — unlimited resumes, 50 templates, unlimited PDF, no watermark | **CraftCV** | Bas isko dikhana hai (landing pe) |
| 3 | Pricing | ₹999 / ₹1,999 / ₹2,999 (Naukri Pro bundle) | ₹0 — no billing code | **CraftCV** | "Forever free" badge |
| 4 | Templates count | 20 total (3 free, 17 Pro-locked) | 50 / 20 families / 10 categories, sab unlocked | **CraftCV** | Public gallery chahiye |
| 5 | Template visibility on landing | Template thumbnails landing pe hi dikh jate hain | Thumbnails sirf logged-in gallery me | Naukri | Gap 4 |
| 6 | AI | Headline feature: profile→resume auto-generate, 3 free / 100-per-day Pro attempts, bullet rewriter | n8n ke peeche chhupa hai; configure na ho to AI **kahin dikhta hi nahi** | Naukri | Gap 3 |
| 7 | ATS | "ATS-friendly templates" claim; actual JD-vs-resume scoring Pro AI ke saath | **Real** live ATS keyword match vs pasted JD, free, on-device | **CraftCV** | Landing pe headline banao |
| 8 | Upload & edit existing resume | ❌ Not available (sirf Naukri profile import) | PDF/DOCX/TXT/JSON/photo + offline OCR + paste-to-import | **CraftCV** | Landing ka #1 hook banao |
| 9 | Cover letter | Samples section + expert-written (paid) | ❌ None | Naukri | Gap 5 |
| 10 | Resume score/review | Expert review service (paid, 20% off banner) | Completeness % hai, lekin koi overall "score card" nahi | Naukri | Gap 6 |
| 11 | Multi-resume | **Sirf 1 resume** (free aur Pro dono) | Unlimited + duplicate | **CraftCV** | Landing pe bolna zaroori |
| 12 | Download format | PDF only | PDF + JSON; multi-page 1–3, clean pagination | **CraftCV** | DOCX add karo (Gap 9) |
| 13 | Watermark/traps | Free PDF me limits + upsell maze | Zero branding in PDF (test-enforced) | **CraftCV** | Highlight karo |
| 14 | Social proof | 12+ named testimonials, industries, star ratings, "4K+ professionals" | **Zero** public reviews/ratings | Naukri | Gap 2 |
| 15 | SEO | FAQ content, career-advice internal links, template pages, indexable Next.js SSR | Hash routing (`#/`), SPA, single title, no sitemap/robots/JSON-LD/OG image | Naukri | Gap 7 |
| 16 | Onboarding friction | Sign-in required, lekin landing pehle convince karti hai | Sign-in required, bina convince kiye | Naukri | Gap 1 + guest mode |
| 17 | Mobile | Responsive claims, "edit on the go" | Bottom-nav, responsive, mobile topbar | Tie | PWA add karo (Gap 10) |
| 18 | Support | Toll-free 1800-102-5557 + email | Contact page | Naukri | Gap 8 |
| 19 | Privacy story | Resume Naukri DB me, recruiters ko visible | On-device parsing/OCR/ATS; sirf user ka apna Supabase | **CraftCV** | Selling point banao |
| 20 | Trust/security | Brand trust, 20+ saal | Strict CSP, security headers, RLS | Tie | Badges banao |
| 21 | Language | English (Hinglish audience implicit) | English | Tie | Hindi toggle (Gap 10) |
| 22 | Extras ecosystem | Resume writing service, expert banner, Naukri Pro bundle (mock interviews etc.) | Sample resume, JSON backup, n8n blueprint | Naukri | Roadmap Phase 3 |

**Score: CraftCV product features me 9 jeet raha hai, Naukri storefront/trust me 8.
Ab storefront ko fix karna hai — wahi jahan paisa aur users dono hain.**

---

## 3. Naukri ka Funnel Deep-Dive (unka exact playbook)

1. **Hero:** "Free Online Resume Maker — Fast-track your job search with our AI resume
   builder." + do cards side-by-side: Free (3 AI attempts, 3 templates) vs Premium
   (unlimited AI, 20 templates → "Upgrade to Naukri Pro"). Matlab landing pe hi
   **anchor + upsell** dono dikh jate hain.
2. **Expert service banner:** "20% discount, expert resume, free cover letter, 1:1
   assistance, 4K+ professionals" — high-ticket upsell resume maker ke andar hi.
3. **Template gallery:** 20 thumbnails, 3 pe "Free" badge, 17 pe "Pro" crown —
   dekhne me hi value aur FOMO dono.
4. **Benefits (3):** Save time · Organized info · More applications — emotional,
   feature nahi.
5. **How-to (3 steps):** Register → Template → Apply. Friction ko chhota dikhana.
6. **Testimonials:** 12+ reviews, naam + industry + 5-star images. Social proof ka
   poora wall.
7. **FAQ (12 Q main + 9 Q "other"):** ye asal me **SEO content** hai — har FAQ me
   internal links (resume templates article, cover letter samples, one-page resume).
   Google is page ko "resume maker" ke har long-tail query pe rank karata hai.
8. **Footer Breadcrumb:** Home › Naukri 360 › Resume Maker — site authority flow.
9. **Conversion ke baad:** sirf 1 resume allowed — taaki har naye job application
   ke liye user Pro le. CraftCV yahan unlimited de deta hai — **ye "freedom" story
   hai jo Naukri user ko bahut achi lagegi.**

**Seekhne wali baat:** Naukri ka product average hai, presentation top-class hai.
CraftCV ka product top-class hai, presentation missing hai. Presentation copy
karna product se aasan hai.

---

## 4. GAP 1 (Sabse bada): Login Wall + Koi Landing Page Nahi

**Problem:** `App.tsx` me `if (!user) return <AuthPage/>` — visitor ka pehla
experience ek login form hai. Na features dikhe, na templates, na trust.
Naukri ka visitor 8 screens ka sales dekh chuka hota hai. Result: bounce.

**Fix (detailed):**
1. `src/App.tsx` me logged-out state me `AuthPage` ki jagah naya
   `Landing.tsx` render karo — landing ke andar CTA buttons ("Start free",
   "Upload your resume") signup modal/section kholenge. Login ko landing ka
   ek section banao, poora page nahi.
2. Landing page sections (Naukri anatomy se better version):
   - **Hero:** "India ka sabse honest resume builder — 100% free, forever."
     Sub: "Upload your old resume (PDF/DOCX/photo) ya 10 minute me naya banao.
     50 templates. Unlimited downloads. No watermark. No credit card."
     + live mini A4 preview (CraftCV me `Preview.tsx` pehle se hai — ek
     `sampleResume()` ko animate karke type-karne wala demo do).
   - **Free vs "unke free" comparison card:** "Naukri ka free = 1 resume, 3
     templates. CraftCV ka free = unlimited resumes, 50 templates." (Comparison
     sirf generic rakho — "other builders" bolo, legal-safe.)
   - **3 feature pillars:** Upload & Edit (OCR tak) · Free ATS Score (JD paste
     karo) · 50 recruiter-tested templates.
   - **Template strip:** 8–10 best template thumbnails horizontally scrollable
     (pre-rendered PNG/SVG — `npm run preview:templates` pipeline already hai).
   - **"How it works" 3 steps:** Upload/Fill → Pick template → Download PDF.
   - **FAQ section (SEO):** kam se kam 10 Q&A — "Is CraftCV really free?",
     "Kya ye ATS-friendly hai?", "Kya main apna purana resume edit kar sakta
     hoon?", "PDF me watermark aata hai?", "Kitne pages?", "Data kahan store
     hota hai?" — inme `craftcv.com/#/faq` internal links.
   - **Footer** (already hai) landing pe bhi.
3. **Guest mode:** "Start without account" button — `emptyResume()` se seedha
   editor kholo (offline store already bina login chalta hai —
   `lib/store.ts` localStorage-based hai). Download/save par optional "save to
   cloud" prompt. CraftCV ka demo-account fallback already iska aadha kaam
   karta hai.

---

## 5. GAP 2: Social Proof Zero

Naukri ke paas 12+ naam-wale reviews hain; CraftCV ka koi review kahin nahi.

**Fix:**
1. Landing pe testimonials band — 6 cards: naam, role (e.g. "Software Developer,
   Pune"), 5-star row, 1–2 line quote. Shuru me beta-users/Google Form se real
   feedback lo; jab tak na mile, "early access" framing me rakhna (fake reviews
   kabhi nahi — Naukri wale bhi real lagte hain, humein real chahiye).
2. Trust badges row: "100% Free · No Watermark · Works Offline · Your Data,
   Your Database · Made in India 🇮🇳".
3. Counter chips: "50 templates · 10 career fields · <10 min average build time"
   — ye sab verifiable numbers hain, inline badges ban jayenge.
4. Baad me: producthunt/reddit/quora links + "rated by users" widget.

---

## 6. GAP 3: AI Dikh Nahi Raha (Naukri ka #1 Weapon)

Naukri "AI resume maker" bech raha hai jo free me sirf 3 attempts deta hai.
CraftCV me AI hai (n8n webhook, `lib/ai.ts`, `AiButton` har step pe) — **lekin
configure na ho to UI me ek bhi AI button nahi dikhta.** User ko pata hi nahi
chalta.

**Fix:**
1. **AI ko hamesha-visible banao** with graceful fallback: jab webhook
   configured nahi, button dabao to local "smart templates" chale
   (`lib/fields.ts` me per-field summaries/bullets already hain — ek
   `localEnhance()` likho jo field+role ke hisaab se sentence templates se
   polished text de). Msg: "Instant draft — AI server connect hone par aur
   better." Isse user ko AI experience milta hai bina infrastructure ke.
2. Landing pe "AI-assisted summaries & bullets" ko headline feature bolo —
   lekin honest: "AI helps you phrase it — you stay in control" (CraftCV ka
   truthful-branding USP, Naukri ke hallucination-prone AI ka counter).
3. "Improve with AI" buttons ko wizard steps pe sticky visible karo, sirf
   conditional nahi.
4. Baad me (Phase 3): "Generate full resume from profile" — Basics fill karo →
   AI/field-templates se pura draft (Naukri ka flagship flow, free version me).

---

## 7. GAP 4: Templates Publicly Dikhao

Naukri landing pe hi 20 thumbnails dikhata hai. CraftCV ke paas `public/
template-preview.html` (400 KB, sab 50 templates SSR) hai — par wo sirf internal
dev preview hai.

**Fix:**
1. `scripts/render-templates.mjs` already `Preview.tsx` se render karta hai —
   usko extend karo: har template ka static thumbnail (SVG/PNG + a PDF-safe
   HTML) `public/thumbs/` me generate karo (build step me).
2. Landing pe "Template strip" (8 best) + `#/templates` route pe poora gallery —
   category filters wahi jo `TemplateGallery.tsx` me hain (family × audience).
   Har card pe: thumbnail, naam, family, "ATS-safe" tag.
3. SEO bonus: har category ka ek block + text ("ATS resume templates for IT,
   Data, Sales, Healthcare, Fresher…") — Naukri ke career-advice internal
   linking ka free version.

---

## 8. GAP 5: Cover Letter Builder Nahi Hai

Naukri cover letter samples + expert service bechta hai. Paid builders isko
paywall karte hain. CraftCV ke paas fields ka poora data hai — cover letter
banane ke liye sirf ek template + preview chahiye.

**Fix:**
1. `#/cover-letter` route + `CoverLetter.tsx`: resume select karo → 3 layouts
   (Formal, Modern, Short) → auto-draft from resume (greeting, role, top 3
   achievements from experience bullets, skills line) + editable paragraphs.
2. Same print pipeline (`Preview` jaisa A4 print CSS) — PDF export.
3. Landing pe "Cover letter included — free" ek aur "others charge for this"
   moment hai.

---

## 9. GAP 6: Resume Score Card (Naukri ka "expert review" ka free jawab)

CraftCV me 2 alag-alag signals hain — completeness % (editor) aur ATS match
(AtsCheck) — par ek convincing "score" kahin nahi.

**Fix:** `ResumeScore.tsx` — ek card jo 0–100 score dikhaye: Completeness (40),
ATS JD match (30), Format checks (30: bullet length, quantified numbers in
bullets, email professionalism, phone format, page length guidance, action
verbs). Har check pe ✅/⚠️ + 1-line tip. Ye "expert review" ka free, instant,
offline version hai — aur download se pehle motivation deta hai. `lib/ats.ts`
+ `completeness()` dono pehle se hain; naya sirf format-check module likhna hai.

---

## 10. GAP 7: SEO — CraftCV Google me hai hi nahi

Naukri ka page "resume maker", "ats resume", "ai resume builder free" — sab pe
rank karta hai kyunki: SSR/Next.js, FAQ content, internal links, schema. CraftCV:
SPA + hash routing + login wall + no sitemap. Google ke liye site almost invisible.

**Fix (high priority, technical):**
1. **`index.html` me static landing content** — pure React ke peeche mat rakho.
   Ya to (a) landing ko static HTML+CSS me banao aur app uske baad hydrate
   kare, ya (b) prerender script (`render-templates.mjs` jaisa) se
   `dist/index.html` me landing ka HTML bake karo. Ish content me H1, feature
   copy, FAQ text sab Google-readable hoga.
2. **`public/robots.txt` + `public/sitemap.xml`** add karo (main, #/faq,
   #/about, #/templates…).
3. **JSON-LD schema** index.html me: `SoftwareApplication` (offers ₹0) +
   `FAQPage` (landing FAQ se) + `Organization`. Naukri FAQ schema hi use karta
   hai rich results ke liye.
4. **OG image (1200×630)** banao — navy/silver CraftCV brand, "Free Resume
   Builder · 50 Templates · ATS Score Free" — `og:image`, `twitter:card`
   (abhi index.html me og:image hai hi nahi).
5. **Canonical + title keyword tune:** title already theek hai;
   `<link rel="canonical">` add karo. Hindi audience ke liye description me
   "मुफ़्त रिज़्यूमे" jaisa ek Hinglish variant socho.
6. **Long-tail content pages (Phase 2–3):** `#/resume-for-fresher`,
   `#/ats-resume-checker`, `#/resume-for-software-engineer`… har career field
   (10 hain, `lib/fields.ts` ready) ka ek SEO page: 300–500 shabd + template
   suggestions + CTA. Naukri career-advice internal linking ka jawab.
7. Note: strict CSP (`connect-src 'self'`) hai — analytics (Plausible/Umami
   self-hosted) tabhi lagana jab CSP me us origin ko add karo. Privacy-friendly
   analytics brand story ke saath fit bhi hota hai.

---

## 11. GAP 8: Support Channels

Naukri: toll-free number + email. CraftCV: sirf contact page.

**Fix:** Contact page pe email + (agar possible ho) WhatsApp business link +
"response within 24h" promise + FAQ deep-link. Support ki visibility = trust.

---

## 12. GAP 9: DOCX Export (paid builders ka another paywall item)

Recruiters aksar Word format maangte hain; Naukri sirf PDF deta hai.

**Fix (Phase 2–3):** client-side DOCX export — resume ka structured JSON pehle
se hai (`types.ts`); `docx` npm library se Word file banao, templates ke
headings/colors ke saath. Landing pe: "PDF + Word, both free."

---

## 13. GAP 10: PWA + Hindi/Hinglish Touch

1. **PWA:** `manifest.webmanifest` + service worker (precache index + OCR
   assets) → "Install CraftCV" mobile pe. Offline-first already architecture me
   hai (localStorage + on-device OCR) — PWA natural fit hai, Naukri me ye
   possible bhi nahi (server-heavy).
2. **Hindi/Hinglish:** UI labels ki light Hinglish tone (buttons jaise "Upload
   karo", "Download le lo") India Tier-2/3 audience ke liye conversion badhata
   hai. Full i18n baad me; pehle landing copy Hinglish me bhi test karo.
3. **Rupee framing:** "₹999 bachao" — "Naukri Pro ₹999/month leta hai; yahan
   ₹0" style honest comparisons (generic "other builders" rakh ke).

---

## 14. GAP 11: Analytics & Experimentation

Abhi koi analytics nahi (CSP bhi block karta hai). Bina data ke optimization
andha hai.

**Fix:** self-hosted Umami/Plausible (CSP me sirf apna origin add hoga) →
funnel events: landing→signup→editor→download. Phir weekly: landing headline
A/B, template strip order, signup timing (early vs at download).

---

## 15. Kya COPY NAHI Karna (Naukri ki weaknesses = hamara weapon)

| Naukri weakness | CraftCV ka counter-positioning |
|---|---|
| "Free" me sirf 1 resume | **Unlimited resumes** — har job ke liye tailored version |
| 3 AI attempts, phir ₹999 | Unlimited edits + free ATS score |
| 3 free templates, 17 locked | Sab 50 unlocked |
| Trial/subscription maze | "No plans. No card. No watermark. Ever." — landing ka tagline |
| Resume recruiter-visible (privacy concern bhi hai) | On-device processing + user ka apna DB — privacy-first story |
| PDF only | PDF + JSON (+ DOCX roadmap) |
| Expert service ₹ high-ticket | Free Resume Score card (instant, offline) |

In sab ko landing + FAQ me explicitly bolo — ye CraftCV ki "honest builder"
brand hai jo `docs/COMPETITORS.md` ka philosophy already kehta hai.

---

## 16. Prioritized Roadmap

### Phase 1 — Storefront (1–2 hafté, sabse zyada ROI)
1. `Landing.tsx` + logged-out route change (Gap 1) — hero, pillars, FAQ, trust badges
2. `index.html` static SEO content + JSON-LD + OG image + robots/sitemap (Gap 7.1–7.5)
3. Guest/demo mode — "Start without account" (Gap 1.3)
4. Template thumbnails public (`#/templates` + landing strip) (Gap 4)
5. Testimonials + trust badges section (Gap 2)
6. Resume Score card (Gap 6) — engineering-light, motivation-heavy

### Phase 2 — Product Surface (2–4 hafte)
7. AI always-visible + local smart-draft fallback (Gap 3.1–3.3)
8. Cover letter builder (Gap 5)
9. Analytics + funnel events (Gap 11)
10. PWA manifest + service worker (Gap 10.1)
11. Support channels upgrade (Gap 8)

### Phase 3 — Moat Builders (quarter)
12. DOCX export (Gap 9)
13. Per-field SEO pages ×10 (Gap 7.6)
14. "Generate resume from profile" one-shot AI flow (Gap 3.4)
15. i18n (Hindi), referral loop, email-me-PDF

---

## 17. Sources

- Naukri resume-maker live page (hero, pricing cards, templates, testimonials,
  21 FAQs, expert-service banner) — naukri.com/resume-maker
- Naukri Pro pricing press release (Business Standard/The Wire, Nov 2025):
  ₹999/1mo · ₹1,999/3mo · ₹2,999/6mo; 100 AI attempts/day; Pro bundle
  (profile enhancement, hidden jobs, AI mock interviews)
- 1MillionResume comparison (Jan 2026): Naukri free = 3 templates + 3 AI
  attempts; resume-builder-only Pro ~₹299/3mo variant bhi note kiya gaya
- CraftCV codebase: `src/App.tsx`, `src/components/*`, `src/lib/*`,
  `index.html`, `netlify.toml`, `docs/COMPETITORS.md`, `docs/FRONTEND-PLAN.md`
