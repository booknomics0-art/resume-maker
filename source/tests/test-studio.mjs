import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

mkdirSync('tests/.tmp', { recursive: true });
await build({ stdin: { contents: `export * from './src/lib/auth'; export * from './src/lib/store'; export * from './src/lib/security'; export * from './src/lib/authRedirect';`, resolveDir: process.cwd(), loader: 'ts' }, outfile: 'tests/.tmp/studio.mjs', bundle: true, format: 'esm', platform: 'node', define: { 'import.meta.env': JSON.stringify({VITE_SUPABASE_URL:'disabled',VITE_SUPABASE_ANON_KEY:'disabled'}) } });
function storage() { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k,v) => m.set(k,String(v)), removeItem: k => m.delete(k), clear: () => m.clear()}; }
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = {location:{href:'https://example.com/#/editor/abc', hash:'#/editor/abc',origin:'https://example.com',pathname:'/'},sessionStorage,dispatchEvent(){}};
const app = await import(pathToFileURL(resolve('tests/.tmp/studio.mjs')));
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`✓ ${name}`); }
await check('Signup stores a hash, then async login accepts the same password',async()=>{
  const signup = await app.signupAsync('Priya Sharma','priya@example.com','Career2026!'); assert.equal(signup.ok,true);
  const stored = JSON.parse(localStorage.getItem('craftcv.users.v2'))['priya@example.com']; assert.ok(stored.passHash); assert.equal(stored.pass,undefined);
  localStorage.removeItem('craftcv.session.v2'); assert.equal((await app.loginAsync('priya@example.com','Wrong2026!')).ok,false);
  assert.equal((await app.loginAsync('priya@example.com','Career2026!')).ok,true);
});
await check('OAuth restores an editor destination and rejects external destinations',()=>{
  app.rememberAuthRoute(); assert.equal(app.consumeAuthRoute(),'/editor/abc'); assert.equal(app.consumeAuthRoute(),'/');
  sessionStorage.setItem('craftcv.auth.return-route','//evil.example'); assert.equal(app.consumeAuthRoute(),'/');
});
await check('Data safety checks do not alternate on repeated calls',()=>{ for(let i=0;i<4;i++) assert.equal(app.isSafeString('<script>alert(1)</script>'),false); });
await check('Profile photos survive repeated saves above the old 5000-character limit',()=>{
  const r=app.sampleResume(); r.personal.photo='data:image/png;base64,'+'A'.repeat(16000);
  const saved=app.upsertResume(r); assert.equal(app.loadResumes()[0].personal.photo,r.personal.photo); app.upsertResume(saved); assert.equal(app.loadResumes()[0].personal.photo,r.personal.photo);
  assert.equal(app.sanitizeResumeData({photo:'data:image/svg+xml;base64,AAAA'}).photo,'');
});
await check('Accounts in the same browser do not see or merge each other’s resumes',()=>{
  assert.equal(app.loadResumes().length,1); localStorage.setItem('craftcv.session.v2','other@example.com'); assert.equal(app.loadResumes().length,0);
  const r=app.sampleResume(); r.name='Other account'; app.upsertResume(r); assert.equal(app.loadResumes().length,1);
  localStorage.setItem('craftcv.session.v2','priya@example.com'); assert.equal(app.loadResumes().length,1); assert.notEqual(app.loadResumes()[0].name,'Other account');
});
await check('Storage exhaustion reports failure and preserves every existing resume',()=>{
  const before=app.loadResumes(); const all=Array.from({length:4},(_,i)=>{const r=app.sampleResume();r.id=`large-${i}`;r.personal.photo='data:image/png;base64,'+'A'.repeat(1800000);return r;});
  assert.throws(()=>app.saveResumes(all),/Storage full/); assert.deepEqual(app.loadResumes(),before);
});
await check('Clearing one account keeps other account copies and late editor saves retain their owner',()=>{
  const owner=app.resumeStorageKey(); const resume=app.loadResumes()[0];
  localStorage.setItem('craftcv.session.v2','other@example.com');
  app.upsertResume({...resume,name:'Final edit before logout'},owner);
  assert.equal(app.loadResumes()[0].name,'Other account');
  app.clearLocalResumes(); assert.equal(app.loadResumes().length,0);
  localStorage.setItem('craftcv.session.v2','priya@example.com');
  assert.equal(app.loadResumes()[0].name,'Final edit before logout');
});
console.log(`${passed}/${passed} studio regression checks passed`);
