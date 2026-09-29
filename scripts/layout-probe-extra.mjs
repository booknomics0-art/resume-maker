/**
 * Extra scenes probe: design step, landing, dashboard, and a desktop layout.
 * Needs one-off: `npm i -D puppeteer-core @sparticuz/chromium` (not shipped).
 *   LD_LIBRARY_PATH=/tmp/al2023/lib node scripts/layout-probe-extra.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const base = process.argv[2] || 'http://localhost:5173';
let failures = 0;
const fail = (m) => { failures++; console.log('  ✗ ' + m); };
const pass = (m) => console.log('  ✓ ' + m);

const browser = await puppeteer.launch({
  args: [...chromium.args, '--no-sandbox'],
  executablePath: await chromium.executablePath(),
  headless: true,
});

async function overflow(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollerOk = (el) =>
      el.closest('.sidebar, .stepper, .tpl-chips, .dev-tabs, .tbl-wrap, .land-table-wrap, .sheet-holder, pre, .editor-view-tabs, .tbl-wrap');
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
    return { vw, scrollW: document.documentElement.scrollWidth, over: over.slice(0, 6) };
  });
}

async function scene(name, { route, w, h, seed = true, click, click2 }) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, isMobile: w <= 800, hasTouch: w <= 800, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((doSeed) => {
    localStorage.clear();
    if (!doSeed) return;
    const u = { name: 'Mobile Tester', email: 'mobile@test.dev', provider: 'email', createdAt: Date.now() };
    localStorage.setItem('craftcv.users.v2', JSON.stringify({ [u.email]: u }));
    localStorage.setItem('craftcv.session.v2', u.email);
    localStorage.setItem('craftcv.session.offline', '1');
  }, seed);
  await page.goto(`${base}/?qa=1${route}`, { waitUntil: 'networkidle0', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1200));
  if (click) { await page.evaluate((s) => document.querySelector(s)?.click(), click); await new Promise((r) => setTimeout(r, 700)); }
  if (click2) { await page.evaluate((s) => document.querySelector(s)?.click(), click2); await new Promise((r) => setTimeout(r, 700)); }
  const o = await overflow(page);
  console.log(`\n== ${name} @ ${w}x${h} ==`);
  o.scrollW === o.vw ? pass(`no page overflow (scrollW=${o.scrollW})`) : fail(`scrollW=${o.scrollW} vw=${o.vw}`);
  o.over.length === 0 ? pass('no element overflows') : fail('overflow: ' + JSON.stringify(o.over));
  if (name === 'design') {
    const d = await page.evaluate(() => {
      const tabs = document.querySelector('.design-device .dev-tabs');
      const chips = tabs ? [...tabs.querySelectorAll('.chip')].map((c) => ({ t: c.textContent, h: Math.round(c.getBoundingClientRect().height) })) : [];
      return { chips, maxChipH: Math.max(...chips.map((c) => c.h), 0) };
    });
    d.maxChipH <= 40 ? pass('device chips on one line (max h=' + d.maxChipH + 'px)') : fail('chips wrap: ' + JSON.stringify(d.chips));
  }
  if (name.startsWith('desktop')) {
    const d = await page.evaluate(() => {
      const form = document.querySelector('.editor-form');
      const prev = document.querySelector('.editor-preview');
      const fr = form.getBoundingClientRect();
      const pr = prev.getBoundingClientRect();
      const ats = document.querySelector('.ats-check');
      const body = document.querySelector('.step-body');
      return {
        sideBySide: fr.left < pr.left && getComputedStyle(form).display !== 'none' && getComputedStyle(prev).display !== 'none',
        atsTop: ats ? Math.round(ats.getBoundingClientRect().top) : -1,
        bodyTop: body ? Math.round(body.getBoundingClientRect().top) : -1,
      };
    });
    d.sideBySide ? pass('desktop keeps two-pane editor') : fail('desktop panes not side by side');
    d.atsTop < d.bodyTop ? pass('desktop keeps ATS/score above fields (unchanged)') : fail(`desktop order changed: ats=${d.atsTop} body=${d.bodyTop}`);
  }
  await page.close();
}

await scene('design step', { route: '#/editor/sample', w: 360, h: 780 });
await scene('design step', { route: '#/editor/sample', w: 320, h: 700 });
await scene('landing', { route: '#/', w: 360, h: 780, seed: false });
await scene('landing', { route: '#/', w: 320, h: 700, seed: false });
await scene('dashboard', { route: '#/', w: 360, h: 780 });
await scene('desktop editor', { route: '#/editor/sample', w: 1440, h: 900, click: '.step-pill:nth-of-type(1)' });
await scene('desktop preview split', { route: '#/editor/sample', w: 1440, h: 900, click: '.step-pill:nth-of-type(1)' });

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL EXTRA PROBES PASSED');
process.exit(failures ? 1 : 0);
