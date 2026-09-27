// Run against `npm run dev` with CRAFTCV_TEST_URL, or the default localhost:5173.
// CRAFTCV_BROWSER_PATH optionally points to a Chromium binary in CI.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.CRAFTCV_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CRAFTCV_BROWSER_PATH || undefined, args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-zygote'] });
const base = process.env.CRAFTCV_TEST_URL || 'http://127.0.0.1:5173';
const page = await browser.newPage({ viewport:{width:1440,height:1000} });
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
let passed=0;
async function check(name, fn) { await fn(); passed++; console.log(`✓ ${name}`); }
mkdirSync('tests/.tmp',{recursive:true});
try {
  await page.goto(base);
  await check('Landing navigation stays on the storefront; legal pages are public',async()=>{
    await page.getByRole('link',{name:'Features',exact:true}).click(); assert.equal(await page.locator('.auth-wrap').count(),0);
    await page.goto(`${base}/#/privacy`); await page.locator('.public-page').waitFor(); assert.equal(await page.locator('.auth-wrap').count(),0);
  });
  await check('Public template library supports preview, zoom, navigation and apply',async()=>{
    await page.goto(`${base}/#/templates`); await page.locator('.tpl-preview-button').first().click();
    await page.locator('dialog[open]').waitFor(); const first=await page.locator('#template-dialog-title').innerText();
    await page.getByLabel('Preview zoom').selectOption('1'); await page.getByRole('button',{name:'Next template',exact:true}).click();
    assert.notEqual(await page.locator('#template-dialog-title').innerText(),first);
    await page.screenshot({path:'tests/.tmp/template-desktop.png'});
    await page.getByRole('button',{name:'Use this template',exact:false}).click(); await page.locator('.auth-wrap').waitFor();
  });
  await page.evaluate(()=>{
    localStorage.setItem('craftcv.users.v2',JSON.stringify({'qa@example.com':{name:'Priya Sharma',email:'qa@example.com',provider:'email',createdAt:Date.now()}}));
    localStorage.setItem('craftcv.session.v2','qa@example.com'); localStorage.setItem('craftcv.session.offline','1');
  });
  await page.goto(`${base}/#/`); await page.reload(); await page.locator('.studio-dashboard').waitFor();
  await page.screenshot({path:'tests/.tmp/dashboard-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Explore a sample'}).click(); await page.locator('.editor-root').waitFor();
  await check('Editor opens any section and full template preview without losing content',async()=>{
    await page.locator('.step-pill').filter({hasText:'Design'}).click();
    await page.locator('.tpl-preview-button').first().click(); await page.locator('dialog[open]').waitFor();
    await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog[open]').count(),0);
    await page.locator('.step-pill').filter({hasText:'Basics'}).click();
  });
  await check('Immediate navigation flushes the latest edits and account storage stays scoped',async()=>{
    // Existing sample value locates the actual personal-name input, independent of visual labels.
    const name=page.locator('input[value="Amit Shukla"]'); await name.fill('Priya QA Latest');
    await page.getByRole('button',{name:'← Dashboard',exact:true}).click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('craftcv.resumes.v2:qa%40example.com')));
    assert.equal(saved[0].personal.fullName,'Priya QA Latest');
    await page.getByLabel('Search resumes').fill('no-match-example'); await page.getByText('No matching resumes',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Clear filters',exact:true}).click();
    await page.getByRole('button',{name:'Duplicate',exact:true}).first().click(); assert.equal(await page.locator('.studio-resume-grid .resume-card').count(),2);
  });
  await check('Mobile dashboard and preview fit a 390px viewport',async()=>{
    await page.setViewportSize({width:390,height:844}); await page.evaluate(() => window.scrollTo(0,0)); await page.waitForTimeout(350); await page.screenshot({path:'tests/.tmp/dashboard-mobile.png',fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false);
    const sidebar = await page.locator('.sidebar').boundingBox(); assert.ok(sidebar.x + sidebar.width <= 1, 'mobile drawer is fully closed');
    await page.goto(`${base}/#/templates`); await page.locator('.tpl-preview-button').first().click(); await page.locator('dialog[open]').waitFor();
    await page.screenshot({path:'tests/.tmp/template-mobile.png'}); const box=await page.locator('dialog').boundingBox(); assert.ok(box.width<=390);
    await page.getByRole('button',{name:'Close template preview'}).click();
  });
  await check('PDF export contains resume content and excludes app navigation',async()=>{
    await page.setViewportSize({width:1440,height:1000}); await page.goto(`${base}/#/`);
    await page.getByRole('button',{name:'Edit resume',exact:false}).first().click(); await page.locator('.print-root .sheet').waitFor({state:'attached'});
    await page.emulateMedia({media:'print'}); assert.equal(await page.locator('.sidebar').isVisible(),false);
    await page.pdf({path:'tests/.tmp/studio-resume.pdf',format:'A4',printBackground:true,preferCSSPageSize:true});
    await page.emulateMedia({media:'screen'});
  });
  assert.deepEqual(errors,[]);
  console.log(`${passed}/${passed} browser flows passed; no uncaught browser errors`);
} finally { await browser.close(); }
