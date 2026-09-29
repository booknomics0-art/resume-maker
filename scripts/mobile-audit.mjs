/**
 * Mobile QA harness (dev-only): loads routes in a bundled headless Chromium at
 * real phone viewports and saves scrolled viewport screenshots to .scratch/.
 * Needs one-off: `npm i -D puppeteer-core @sparticuz/chromium` (not shipped).
 *   LD_LIBRARY_PATH=/tmp/al2023/lib node scripts/mobile-audit.mjs [baseUrl]
 *
 * Auth seeding happens in-page before app code runs (query `?qa=on|off`).
 */
import { mkdirSync, rmSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const base = process.argv[2] || 'http://localhost:5173';
const outDir = new URL('../.scratch/mobile-audit/', import.meta.url).pathname;
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const scenes = [
  { name: 'basics', route: '#/editor/sample', click: '.step-pill:nth-of-type(1)' },
  { name: 'basics-preview', route: '#/editor/sample', click: '.step-pill:nth-of-type(1)', click2: '.editor-mobile-tabs button:nth-of-type(2)' },
  { name: 'design', route: '#/editor/sample' }, // sample starts on Design step
  { name: 'new-editor', route: '#/editor/new' },
  { name: 'dashboard', route: '#/' },
  { name: 'landing', route: '#/', noSeed: true },
  { name: 'desktop-basics', route: '#/editor/sample', click: '.step-pill:nth-of-type(1)', w: 1280, h: 900, dpr: 1 },
];

const browser = await puppeteer.launch({
  args: [...chromium.args, '--no-sandbox'],
  executablePath: await chromium.executablePath(),
  headless: true,
});

try {
  for (const s of scenes) {
    const page = await browser.newPage();
    await page.setViewport({
      width: s.w || 360, height: s.h || 780,
      isMobile: !(s.w && s.w > 800), hasTouch: !(s.w && s.w > 800),
      deviceScaleFactor: s.dpr || 2,
    });
    await page.evaluateOnNewDocument((wantSeed) => {
      localStorage.clear();
      if (!wantSeed) return;
      const u = { name: 'Mobile Tester', email: 'mobile@test.dev', provider: 'email', createdAt: Date.now() };
      localStorage.setItem('craftcv.users.v2', JSON.stringify({ [u.email]: u }));
      localStorage.setItem('craftcv.session.v2', u.email);
      localStorage.setItem('craftcv.session.offline', '1');
    }, !s.noSeed);
    await page.goto(`${base}/?qa=1${s.route}`, { waitUntil: 'networkidle0', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));
    if (s.click) {
      await page.evaluate((sel) => document.querySelector(sel)?.click(), s.click);
      await new Promise((r) => setTimeout(r, 900));
    }
    if (s.click2) {
      await page.evaluate((sel) => document.querySelector(sel)?.click(), s.click2);
      await new Promise((r) => setTimeout(r, 900));
    }
    // scrolled viewport shots (up to 4 per scene) — smooth scroll would still
    // be animating at screenshot time, so force instant jumps first
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    const totalH = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let i = 0; i < 4; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), i * 700);
      await new Promise((r) => setTimeout(r, 350));
      await page.screenshot({ path: `${outDir}${s.name}-${i}.png` });
      if ((i + 1) * 700 > totalH) break;
    }
    const overflow = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const bad = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('.sidebar')) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > vw + 1.5 || r.left < -1.5)) {
          bad.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 50), left: Math.round(r.left), right: Math.round(r.right) });
        }
      }
      return { vw, scrollW: document.documentElement.scrollWidth, bad: bad.slice(0, 8) };
    });
    console.log(s.name, JSON.stringify(overflow));
    await page.close();
  }
} finally {
  await browser.close();
}
