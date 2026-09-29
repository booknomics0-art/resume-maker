/**
 * Layout/behavior probe (dev-only): asserts the mobile invariants programmatically.
 * Needs one-off: `npm i -D puppeteer-core @sparticuz/chromium` (not shipped).
 *   LD_LIBRARY_PATH=/tmp/al2023/lib node scripts/layout-probe.mjs [baseUrl]
 *
 * Checks, at several phone widths:
 *  - no visible element extends past the viewport (except intentional scrollers)
 *  - the preview pane fits the screen and the A4 sheet fits inside the pane
 *  - Edit ⇄ Preview tabs actually swap panes (pixel-probed)
 *  - fields render before ATS/score cards on phones
 *  - PDF download buttons are never disabled; no required '*' labels remain
 */
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const base = process.argv[2] || 'http://localhost:5173';
const widths = [320, 360, 390, 430];
let failures = 0;
const fail = (msg) => { failures++; console.log('  ✗ ' + msg); };
const pass = (msg) => console.log('  ✓ ' + msg);

const browser = await puppeteer.launch({
  args: [...chromium.args, '--no-sandbox'],
  executablePath: await chromium.executablePath(),
  headless: true,
});

for (const w of widths) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    const u = { name: 'Mobile Tester', email: 'mobile@test.dev', provider: 'email', createdAt: Date.now() };
    localStorage.setItem('craftcv.users.v2', JSON.stringify({ [u.email]: u }));
    localStorage.setItem('craftcv.session.v2', u.email);
    localStorage.setItem('craftcv.session.offline', '1');
  });
  await page.goto(`${base}/?qa=1#/editor/sample`, { waitUntil: 'networkidle0', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => document.querySelector('.step-pill:nth-of-type(1)')?.click());
  await new Promise((r) => setTimeout(r, 700));

  console.log(`\n== ${w}px · editor form ==`);
  const form = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollerOk = (el) =>
      el.closest('.sidebar, .stepper, .tpl-chips, .dev-tabs, .tbl-wrap, .land-table-wrap, .sheet-holder, pre, .editor-view-tabs');
    const over = [];
    for (const el of document.querySelectorAll('body *')) {
      if (scrollerOk(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > vw + 1.5 || r.left < -1.5)) {
        over.push({ cls: (el.className || '').toString().slice(0, 40), left: Math.round(r.left), right: Math.round(r.right) });
      }
    }
    const formEl = document.querySelector('.editor-form');
    const ats = document.querySelector('.ats-check');
    const score = document.querySelector('.score-card');
    const body = document.querySelector('.step-body');
    const dl = [...document.querySelectorAll('button')].filter((b) => /download pdf/i.test(b.textContent || ''));
    return {
      vw,
      scrollW: document.documentElement.scrollWidth,
      over: over.slice(0, 6),
      formDisplay: formEl && getComputedStyle(formEl).display,
      order: {
        body: body && Math.round(body.getBoundingClientRect().top),
        ats: ats && Math.round(ats.getBoundingClientRect().top),
        score: score && Math.round(score.getBoundingClientRect().top),
      },
      dlDisabled: dl.map((b) => b.disabled),
      reqMarks: document.querySelectorAll('label.f .req, label.f .req-star').length,
      reqText: /mandatory|required/i.test(document.body.innerText),
    };
  });
  form.scrollW === form.vw ? pass(`no page-level horizontal overflow (scrollW=${form.scrollW})`) : fail(`page overflows: scrollW=${form.scrollW} > vw=${form.vw}`);
  form.over.length === 0 ? pass('no element overflows the viewport') : fail('overflow: ' + JSON.stringify(form.over));
  form.formDisplay === 'flex' ? pass('form pane visible on Edit tab') : fail('form display=' + form.formDisplay);
  (form.order.ats != null && form.order.body != null && form.order.body < form.order.ats)
    ? pass('fields render above ATS/score cards on mobile')
    : fail(`order wrong: body=${form.order.body} ats=${form.order.ats}`);
  form.dlDisabled.every((d) => d === false) ? pass('download buttons enabled (' + form.dlDisabled.length + ')') : fail('a download button is disabled: ' + form.dlDisabled);
  form.reqMarks === 0 ? pass('no required asterisks') : fail('found ' + form.reqMarks + ' required marks');
  if (form.reqText) fail('copy still mentions mandatory/required');

  // Preview tab: pane must fit the screen and hold the sheet
  await page.evaluate(() => document.querySelectorAll('.editor-mobile-tabs button')[1]?.click());
  await new Promise((r) => setTimeout(r, 700));
  console.log(`== ${w}px · preview tab ==`);
  const prev = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const pane = document.querySelector('.editor-preview');
    const pr = pane.getBoundingClientRect();
    const frame = pane.querySelector('.sheet-frame');
    const fr = frame ? frame.getBoundingClientRect() : null;
    return {
      vw,
      pane: { left: Math.round(pr.left), right: Math.round(pr.right), w: Math.round(pr.width) },
      paneDisplay: getComputedStyle(pane).display,
      formDisplay: getComputedStyle(document.querySelector('.editor-form')).display,
      sheet: fr && { left: Math.round(fr.left), right: Math.round(fr.right), w: Math.round(fr.width), h: Math.round(fr.height) },
      badge: (pane.querySelector('.page-badge') || {}).textContent,
    };
  });
  prev.paneDisplay === 'flex' ? pass('preview pane visible on Preview tab') : fail('preview display=' + prev.paneDisplay);
  prev.formDisplay === 'none' ? pass('form hidden on Preview tab') : fail('form still visible (display=' + prev.formDisplay + ')');
  prev.pane.right <= prev.vw + 1.5 ? pass(`preview pane fits (${prev.pane.w}px @ ${prev.vw}px)`) : fail(`preview pane overflows: right=${prev.pane.right} vw=${prev.vw}`);
  prev.sheet
    ? (prev.sheet.right <= prev.vw + 1.5 && prev.sheet.left >= 0
      ? pass(`A4 sheet fits the screen (${prev.sheet.w}×${prev.sheet.h})`)
      : fail(`A4 sheet cut: ${JSON.stringify(prev.sheet)}`))
    : fail('no sheet frame rendered');
  console.log('   badge:', JSON.stringify(prev.badge));

  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PROBES PASSED');
process.exit(failures ? 1 : 0);
