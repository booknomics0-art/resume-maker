from pathlib import Path
import json
import re

ROOT = Path('.')
ORIGIN = 'https://www.resumemakery.com'


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, content: str) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    if not p.exists():
        return
    s = p.read_text()
    if old in s:
        p.write_text(s.replace(old, new))


# ---------------------------------------------------------------------------
# 1) Brand migration: user-facing text, public metadata, docs and generators.
# Preserve lowercase craftcv.* storage/session keys to avoid deleting users'
# existing local resumes or Supabase sessions during the rebrand.
# ---------------------------------------------------------------------------
text_suffixes = {'.ts', '.tsx', '.js', '.mjs', '.css', '.html', '.md', '.txt', '.xml', '.webmanifest', '.yml', '.yaml'}
skip_dirs = {'.git', 'node_modules', 'source', 'dist'}
for p in ROOT.rglob('*'):
    if not p.is_file() or any(part in skip_dirs for part in p.parts):
        continue
    if p.suffix not in text_suffixes:
        continue
    try:
        s = p.read_text()
    except Exception:
        continue
    old = s
    s = s.replace('CraftCV', 'ResumeMakery').replace('CRAFTCV', 'RESUMEMAKERY')
    s = s.replace('hello@craftcv.app', 'hello@resumemakery.com')
    s = s.replace('legal@craftcv.app', 'legal@resumemakery.com')
    s = s.replace('privacy@craftcv.app', 'privacy@resumemakery.com')
    s = s.replace('support@craftcv.app', 'support@resumemakery.com')
    s = s.replace('https://resume-maker-ivory-ten.vercel.app', ORIGIN)
    s = s.replace('resume-maker-ivory-ten.vercel.app', 'www.resumemakery.com')
    if s != old:
        p.write_text(s)


# ---------------------------------------------------------------------------
# 2) Clean History API routing. Legacy #/ links are migrated once on arrival.
# ---------------------------------------------------------------------------
write('src/lib/navigation.ts', r'''export interface NavigationEventDetail {
  to: string;
  sameRoute: boolean;
}

// Keep the internal event name stable so existing UI motion/listener code keeps
// working across the public brand migration.
export const NAVIGATION_EVENT = 'craftcv:navigate';

export function normalizePath(path: string): string {
  if (!path) return '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  const clean = withSlash.replace(/\/{2,}/g, '/');
  return clean.length > 1 ? clean.replace(/\/$/, '') : clean;
}

/** Convert legacy hash routes (/#/privacy) to clean URLs (/privacy) once. */
export function migrateLegacyHashRoute(): void {
  const hash = window.location.hash;
  if (!hash.startsWith('#/')) return;
  const target = normalizePath(hash.slice(1));
  window.history.replaceState({}, '', `${target}${window.location.search || ''}`);
}

/** Single navigation entrypoint: clean, shareable, crawlable URLs. */
export function navigate(to: string): void {
  const normalized = normalizePath(to);
  const sameRoute = normalizePath(window.location.pathname) === normalized;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  document.body.style.overflow = '';
  document.documentElement.style.scrollBehavior = 'auto';
  if (!sameRoute) window.history.pushState({}, '', normalized);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  window.dispatchEvent(new CustomEvent<NavigationEventDetail>(NAVIGATION_EVENT, {
    detail: { to: normalized, sameRoute },
  }));
  window.requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
}
''')

app = read('src/App.tsx')
app = app.replace("const Landing = lazy(() => import('./components/Landing'));", "const Landing = lazy(() => import('./components/Landing'));\nconst SeoLanding = lazy(() => import('./components/SeoLanding'));\nconst PublicShell = lazy(() => import('./components/PublicShell'));")
app = app.replace("import { navigate } from './lib/navigation';", "import { migrateLegacyHashRoute, NAVIGATION_EVENT, navigate, normalizePath } from './lib/navigation';\nimport { applySeo } from './lib/seo';")
app = re.sub(r"function useHashRoute\(\) \{.*?\n\}", r'''function usePathRoute() {
  const [path, setPath] = useState(() => {
    migrateLegacyHashRoute();
    return normalizePath(window.location.pathname || '/');
  });
  useEffect(() => {
    const sync = () => setPath(normalizePath(window.location.pathname || '/'));
    window.addEventListener('popstate', sync);
    window.addEventListener(NAVIGATION_EVENT, sync as EventListener);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(NAVIGATION_EVENT, sync as EventListener);
    };
  }, []);
  return path;
}''', app, count=1, flags=re.S)
app = app.replace('const tab = useHashRoute();', "const tab = usePathRoute();\n\n  useEffect(() => { applySeo(tab); }, [tab]);")
app = re.sub(r"const hash = window\.location\.hash \|\| ['\"]#/['\"];\s*if \(hash === ['\"]#['\"] \|\| hash === ['\"]#/['\"]\) window\.location\.hash = ['\"]/login['\"];", "const path = normalizePath(window.location.pathname || '/');\n      if (path === '/') navigate('/login');", app)
app = app.replace('href={`#${to}`}', 'href={to}')
app = app.replace('href="#/', 'href="/').replace("href='#/", "href='/")

old_block = '''  if (!user) {
    // Logged-out visitors get the public storefront on the home route — the
    // product pitch (hero, templates, FAQ) comes BEFORE any login wall.
    if (tab === '/' || tab === '') {
      return (
        <Suspense fallback={<div className="card pad">Loading ResumeMakery…</div>}>
          <Landing
            notice={authNotice}
            onStart={(target) => navigate(target || '/editor/new')}
          />
        </Suspense>
      );
    }
    // Any other deep link (e.g. a bookmarked #/editor/…) keeps the old
    // behaviour: show the login page first.
    return (
      <Suspense fallback={<div className="card pad">Loading sign-in…</div>}>
        <AuthPage onAuth={() => setUser(currentUser())} notice={authNotice} />
      </Suspense>
    );
  }
'''
new_block = '''  if (!user) {
    if (tab === '/' || tab === '') {
      return (
        <Suspense fallback={<div className="card pad">Loading ResumeMakery…</div>}>
          <Landing notice={authNotice} onStart={(target) => navigate(target || '/editor/new')} />
        </Suspense>
      );
    }

    const seoRoutes = new Set(['/resume-builder', '/ats-resume-checker', '/resume-editor', '/resume-templates', '/resume-for-freshers']);
    if (seoRoutes.has(tab)) {
      return (
        <Suspense fallback={<div className="card pad">Loading ResumeMakery…</div>}>
          <PublicShell onStart={(target) => navigate(target || '/editor/new')}>
            <SeoLanding route={tab} onStart={(target) => navigate(target || '/editor/new')} />
          </PublicShell>
        </Suspense>
      );
    }

    const publicInfo: Record<string, React.ReactNode> = {
      '/about': <AboutPage />,
      '/contact': <ContactPage />,
      '/faq': <FaqPage />,
      '/privacy': <PrivacyPage />,
      '/terms': <TermsPage />,
      '/disclaimer': <DisclaimerPage />,
      '/cookies': <CookiePage />,
      '/eula': <EulaPage />,
    };
    if (publicInfo[tab]) {
      return (
        <Suspense fallback={<div className="card pad">Loading ResumeMakery…</div>}>
          <PublicShell onStart={(target) => navigate(target || '/editor/new')}>
            {publicInfo[tab]}
          </PublicShell>
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<div className="card pad">Loading sign-in…</div>}>
        <AuthPage onAuth={() => setUser(currentUser())} notice={authNotice} />
      </Suspense>
    );
  }
'''
if old_block not in app:
    raise RuntimeError('Expected logged-out App block not found; refusing partial route migration')
app = app.replace(old_block, new_block)
app = app.replace('<div className="brand-badge">CV</div>', '<div className="brand-badge">RM</div>')
write('src/App.tsx', app)

# Clean literal hash hrefs throughout UI components. (C# / regex fragments are not touched.)
for p in Path('src').rglob('*.tsx'):
    s = p.read_text().replace('href="#/', 'href="/').replace("href='#/", "href='/")
    p.write_text(s)

# Route-dependent helpers used by import/auth/security.
replace('src/components/Settings.tsx', "location.hash = '#/';\n              location.reload();", "location.assign('/');")
replace('src/components/Settings.tsx', "location.hash = '#/';\n            location.reload();", "location.assign('/');")
replace('src/lib/mobileImportSaveGuard.ts', "return window.location.hash.startsWith('#/import') && window.matchMedia('(max-width: 900px)').matches;", "return (window.location.pathname === '/import' || window.location.hash.startsWith('#/import')) && window.matchMedia('(max-width: 900px)').matches;")
replace('src/lib/originalDocument.ts', "if (!window.location.hash.startsWith('#/import')) return;", "if (window.location.pathname !== '/import' && !window.location.hash.startsWith('#/import')) return;")
replace('src/lib/security.ts', "window.location.hash = '#/';", "window.location.assign('/');")

auth = read('src/lib/authRedirect.ts')
auth = auth.replace(" *  2. The app uses hash routing (`#/editor/abc`). Auth parameters must never be\n *     mistaken for a route, and the route must survive the cleanup.", " *  2. Legacy versions used hash routing (`#/editor/abc`). Auth parameters must never be\n *     mistaken for a legacy route, and clean History API paths must survive cleanup.")
auth = auth.replace("    if (!url.hash) url.hash = '#/';\n", '')
auth = auth.replace(" * exactly and Google never has to deal with our hash routes.", " * exactly. Legacy hash routes are never used as OAuth redirect destinations.")
write('src/lib/authRedirect.ts', auth)
replace('tests/test-google-auth.mjs', "assert.equal(cleaned.hash, '#/');", "assert.equal(cleaned.hash, '');")

# ---------------------------------------------------------------------------
# 3) Premium ResumeMakery visual identity and public acquisition pages.
# ---------------------------------------------------------------------------
main = read('src/main.tsx')
if "import './brand.css';" not in main:
    main = main.replace("import './styles.css';", "import './styles.css';\nimport './brand.css';")
write('src/main.tsx', main)

write('src/brand.css', r'''/* ResumeMakery brand layer — isolated from resume-template print CSS. */
.brand-badge {
  position: relative; overflow: hidden; isolation: isolate;
  border-radius: 12px !important;
  background: radial-gradient(circle at 28% 18%, rgba(255,255,255,.22), transparent 30%), linear-gradient(145deg, #234d91 0%, #102b5b 46%, #07152f 100%) !important;
  border: 1px solid rgba(226,234,245,.42) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 8px 22px rgba(3,12,29,.22);
  color: #f7f9fc !important; font-family: ui-serif, Georgia, Cambria, serif !important;
  font-weight: 800 !important; letter-spacing: -1px; text-shadow: 0 1px 1px rgba(0,0,0,.28);
}
.brand-badge::after { content:''; position:absolute; inset:-40% 58% -40% -28%; background:linear-gradient(110deg,transparent,rgba(255,255,255,.18),transparent); transform:rotate(11deg); z-index:-1; }
.brand-name, .mobile-brand-name { letter-spacing:-.35px !important; font-weight:800 !important; }
.land-top .brand-name { font-size:18px; }
.public-brand-link { text-decoration:none; color:inherit; }
.public-shell { min-height:100vh; background:var(--silver-100); }
.public-shell .land-top { position:sticky; top:0; z-index:60; }
.public-shell-main { max-width:1120px; margin:0 auto; padding:42px 24px 72px; }
.seo-hero { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr); gap:32px; align-items:center; padding:34px; background:#fff; border:1px solid var(--silver-200); border-radius:20px; box-shadow:var(--shadow-sm); }
.seo-kicker { text-transform:uppercase; letter-spacing:1.4px; font-size:12px; font-weight:800; color:var(--navy-600); }
.seo-hero h1 { font-size:clamp(32px,5vw,54px); line-height:1.04; letter-spacing:-1.5px; color:var(--navy-950); margin:10px 0 14px; }
.seo-hero p { font-size:17px; color:var(--silver-500); max-width:760px; }
.seo-proof { padding:24px; border-radius:16px; background:linear-gradient(145deg,var(--navy-900),var(--navy-700)); color:#fff; box-shadow:var(--shadow-md); }
.seo-proof b { display:block; font-size:28px; margin-bottom:8px; }
.seo-proof ul { margin:12px 0 0; padding-left:18px; color:var(--silver-200); }
.seo-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-top:22px; }
.seo-card { background:#fff; border:1px solid var(--silver-200); border-radius:14px; padding:20px; }
.seo-card h2 { font-size:18px; color:var(--navy-900); }
.seo-faq { margin-top:30px; }
.seo-faq details { background:#fff; border:1px solid var(--silver-200); border-radius:12px; padding:15px 17px; margin:9px 0; }
.seo-faq summary { cursor:pointer; font-weight:750; color:var(--navy-900); }
@media (max-width:760px) { .seo-hero{grid-template-columns:1fr;padding:24px}.seo-grid{grid-template-columns:1fr}.public-shell-main{padding:26px 16px 54px} }
''')

write('src/components/PublicShell.tsx', r'''import type { ReactNode } from 'react';
import { navigate } from '../lib/navigation';

export default function PublicShell({ children, onStart }: { children: ReactNode; onStart: (target?: string) => void }) {
  return (
    <div className="public-shell">
      <header className="land-top">
        <div className="land-top-inner">
          <a className="brand public-brand-link" href="/" onClick={(e)=>{e.preventDefault();navigate('/');}} style={{ padding: 0 }}>
            <div className="brand-badge">RM</div>
            <div><div className="brand-name">ResumeMakery</div><div className="brand-sub">Resume Studio · Free forever</div></div>
          </a>
          <nav className="land-top-nav" aria-label="Public navigation">
            <a href="/resume-templates" onClick={(e)=>{e.preventDefault();navigate('/resume-templates');}}>Templates</a>
            <a href="/ats-resume-checker" onClick={(e)=>{e.preventDefault();navigate('/ats-resume-checker');}}>ATS Checker</a>
            <a href="/resume-for-freshers" onClick={(e)=>{e.preventDefault();navigate('/resume-for-freshers');}}>Freshers</a>
          </nav>
          <div className="land-top-actions">
            <a className="btn small" href="/login" onClick={(e)=>{e.preventDefault();navigate('/login');}}>Sign in</a>
            <button type="button" className="btn small primary" onClick={() => onStart('/editor/new')}>Start free</button>
          </div>
        </div>
      </header>
      <main className="public-shell-main">{children}</main>
    </div>
  );
}
''')

write('src/components/SeoLanding.tsx', r'''type PageData = { kicker:string; title:string; description:string; proof:string; bullets:string[]; cards:{title:string;body:string}[]; faqs:{q:string;a:string}[] };
const PAGES: Record<string, PageData> = {
  '/resume-builder': { kicker:'Free resume builder', title:'Build an ATS-friendly resume without paywalls', description:'Create a professional resume from scratch or import your existing one. Use 50 templates, a live A4 preview and clean PDF export — without a watermark.', proof:'One workflow, start to finish', bullets:['50 unlocked templates','Unlimited clean PDFs','Live A4 preview','Import PDF, DOCX, TXT or photo'], cards:[{title:'Start fast',body:'Seven guided sections keep the form focused while the live preview updates beside you.'},{title:'Stay ATS-readable',body:'Use clean structure and compare your resume with a real job description before applying.'},{title:'Download cleanly',body:'Export a professional PDF without ResumeMakery branding or a watermark on your resume.'}], faqs:[{q:'Is ResumeMakery really free?',a:'Yes. Resume creation, templates, ATS matching and PDF downloads are free; there is no paid plan in the current product.'},{q:'Can I import my old resume?',a:'Yes. PDF, DOCX, TXT and image/photo import are supported, with OCR for scanned text.'},{q:'Does it work on mobile?',a:'Yes. The editor and download flow include mobile-specific handling.'}] },
  '/ats-resume-checker': { kicker:'ATS resume checker', title:'Compare your resume with the job you actually want', description:'Paste a job description and see which important terms your resume already covers and which are missing. The check runs as part of your ResumeMakery editing workflow.', proof:'Practical ATS matching', bullets:['Job-description keyword comparison','Missing-term visibility','Re-score while editing','No separate paid ATS subscription'], cards:[{title:'Use a real job ad',body:'Generic scores are less useful than comparing against the exact role you plan to apply for.'},{title:'Keep claims truthful',body:'Add missing skills only when they genuinely describe your experience; keyword stuffing hurts readability.'},{title:'Fix in the same editor',body:'Move directly from the ATS result to the resume content and re-check as you improve it.'}], faqs:[{q:'Does a high score guarantee an interview?',a:'No. ATS matching is a diagnostic tool, not a hiring guarantee. Recruiter judgment, experience and role fit still matter.'},{q:'Is the ATS checker free?',a:'Yes, it is included in ResumeMakery.'},{q:'Do I need to upload the job description?',a:'You can paste the job description text and compare it with your resume.'}] },
  '/resume-editor': { kicker:'Resume editor', title:'Upload your existing resume and keep editing instead of starting over', description:'Bring a PDF, DOCX, TXT file or a photo of a printed resume. ResumeMakery extracts usable content into editable fields so you can redesign, correct and export it.', proof:'Import → edit → export', bullets:['PDF and DOCX import','Photo/scanned text OCR','Editable structured fields','Template switching without retyping'], cards:[{title:'Preserve your work',body:'Use your existing resume as the starting point instead of rebuilding every section manually.'},{title:'Edit structurally',body:'Imported content becomes editable resume fields rather than a flat screenshot.'},{title:'Switch presentation',body:'Try a different layout while keeping the underlying resume information.'}], faqs:[{q:'Can ResumeMakery edit a scanned resume?',a:'It includes on-device OCR for photo/scanned text extraction.'},{q:'Will import always be perfect?',a:'No parser is perfect; review names, dates, section boundaries and bullets after import.'},{q:'Can I export again after editing?',a:'Yes, the edited resume can be downloaded as a clean PDF.'}] },
  '/resume-templates': { kicker:'Professional resume templates', title:'50 resume templates, unlocked from the start', description:'Choose from ATS-safe classics and more distinctive professional layouts across multiple career fields. Switch designs without re-entering your resume.', proof:'50 templates · ₹0', bullets:['ATS-friendly options','Fresher layouts','Professional multi-page support','No template paywall'], cards:[{title:'Choose for the role',body:'Use conservative layouts for ATS-heavy applications and more visual options where design is appropriate.'},{title:'A4-first output',body:'Templates are designed around a real resume page rather than a generic web card.'},{title:'Change anytime',body:'Your content remains separate from the visual template, so trying a new design does not require retyping.'}], faqs:[{q:'Are all 50 templates free?',a:'Yes. The current product does not lock templates behind a paid tier.'},{q:'Can a resume be more than one page?',a:'Yes. The editor supports multi-page resumes and page-break handling.'},{q:'Do templates add a watermark?',a:'No. The downloaded PDF is intended to be clean and application-ready.'}] },
  '/resume-for-freshers': { kicker:'Resume for freshers', title:'Make a strong first-job resume even without years of experience', description:'ResumeMakery includes fresher-focused layouts and guidance so students and early-career applicants can present education, projects, internships, skills and achievements clearly.', proof:'Built for first applications', bullets:['Fresher template set','Projects and education emphasis','ATS matching against real roles','Clean one-page friendly layouts'], cards:[{title:'Lead with evidence',body:'Projects, internships, certifications and measurable achievements can carry more weight than an empty experience section.'},{title:'Keep it focused',body:'For many freshers, a clear one-page resume is easier for recruiters to scan.'},{title:'Tailor each application',body:'Duplicate your resume and adjust keywords and emphasis for each real job description.'}], faqs:[{q:'What should a fresher put in experience?',a:'Use internships, projects, freelance/volunteer work and relevant responsibilities when they truthfully demonstrate skills.'},{q:'Should a fresher resume be one page?',a:'Often yes, when the content fits comfortably. Do not shrink text just to force a page.'},{q:'Can I make different resumes for different jobs?',a:'Yes. ResumeMakery supports multiple resumes so you can tailor versions per role.'}] },
};
export default function SeoLanding({ route, onStart }: { route:string; onStart:(target?:string)=>void }) { const d=PAGES[route]||PAGES['/resume-builder']; return <><section className="seo-hero"><div><div className="seo-kicker">{d.kicker}</div><h1>{d.title}</h1><p>{d.description}</p><div className="land-cta-row" style={{marginTop:18}}><button className="btn primary land-cta" onClick={()=>onStart('/editor/new')}>Build my resume — free</button><button className="btn land-cta" onClick={()=>onStart('/import')}>Upload existing resume</button></div></div><aside className="seo-proof"><b>{d.proof}</b><span>No ads, no watermark, no template lock.</span><ul>{d.bullets.map(x=><li key={x}>{x}</li>)}</ul></aside></section><section className="seo-grid">{d.cards.map(c=><article className="seo-card" key={c.title}><h2>{c.title}</h2><p>{c.body}</p></article>)}</section><section className="seo-faq"><h2>Frequently asked questions</h2>{d.faqs.map(f=><details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</section></>; }
''')

write('src/lib/seo.ts', r'''const ORIGIN='https://www.resumemakery.com';
const PUBLIC: Record<string,{title:string;description:string}> = {
  '/':{title:'ResumeMakery — Free ATS Resume Builder | 50 Templates',description:'Build, import, edit and ATS-check your resume free. 50 professional templates, clean PDF downloads, no watermark.'},
  '/resume-builder':{title:'Free Resume Builder & ATS Resume Maker | ResumeMakery',description:'Create an ATS-friendly resume free with 50 templates, live preview, existing-resume import and clean PDF downloads.'},
  '/ats-resume-checker':{title:'Free ATS Resume Checker & Job Match | ResumeMakery',description:'Compare your resume against a real job description, find missing terms and improve the same resume in ResumeMakery.'},
  '/resume-editor':{title:'Edit Existing Resume Online — PDF & DOCX | ResumeMakery',description:'Upload a PDF, DOCX, TXT or resume photo, extract the content, edit it and export a clean professional PDF.'},
  '/resume-templates':{title:'50 Free Professional Resume Templates | ResumeMakery',description:'Browse 50 unlocked resume templates including ATS-friendly, professional and fresher layouts. No watermark or template paywall.'},
  '/resume-for-freshers':{title:'Free Resume Maker for Freshers & Students | ResumeMakery',description:'Create a focused fresher resume with templates for projects, education, internships and skills, plus free ATS job matching.'},
  '/about':{title:'About ResumeMakery',description:'Learn why ResumeMakery exists and how the free resume builder is designed for job seekers.'}, '/faq':{title:'ResumeMakery FAQ — Resume Builder, ATS & Downloads',description:'Answers about ResumeMakery templates, resume imports, ATS matching, privacy and clean PDF downloads.'}, '/privacy':{title:'Privacy Policy | ResumeMakery',description:'How ResumeMakery handles account data, resume content, imports, analytics and user privacy.'}, '/terms':{title:'Terms of Service | ResumeMakery',description:'Terms for using the ResumeMakery free resume builder.'}, '/contact':{title:'Contact ResumeMakery',description:'Contact ResumeMakery about the resume builder, privacy or product support.'}, '/cookies':{title:'Cookie Policy | ResumeMakery',description:'Cookie and analytics information for ResumeMakery.'}, '/disclaimer':{title:'Disclaimer | ResumeMakery',description:'Important limitations and disclaimers for ResumeMakery and ATS guidance.'}, '/eula':{title:'EULA | ResumeMakery',description:'End-user licence terms for ResumeMakery.'}
};
function meta(name:string,value:string,property=false){const selector=property?`meta[property="${name}"]`:`meta[name="${name}"]`;let el=document.head.querySelector(selector) as HTMLMetaElement|null;if(!el){el=document.createElement('meta');property?el.setAttribute('property',name):el.setAttribute('name',name);document.head.appendChild(el)}el.content=value}
export function applySeo(path:string){const clean=path.length>1?path.replace(/\/$/,''):path;const data=PUBLIC[clean];const isPublic=!!data;const title=data?.title||'ResumeMakery — Free Resume Builder';const description=data?.description||'ResumeMakery resume workspace.';const url=`${ORIGIN}${isPublic&&clean!=='/'?clean:''}${clean==='/'?'/':''}`;document.title=title;meta('description',description);meta('robots',isPublic?'index, follow':'noindex, nofollow');meta('og:title',title,true);meta('og:description',description,true);meta('og:url',url,true);meta('og:site_name','ResumeMakery',true);meta('twitter:title',title);meta('twitter:description',description);let canonical=document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement|null;if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=url}
''')

# ---------------------------------------------------------------------------
# 4) Domain metadata, search files, PWA identity and Vercel SPA fallback.
# ---------------------------------------------------------------------------
landing = read('src/components/Landing.tsx')
landing = landing.replace('<div className="brand-badge">CV</div>', '<div className="brand-badge">RM</div>')
landing = landing.replace('The honest resume builder.<br />Everything free. Everything unlocked.', 'Free ATS resume builder.<br />Everything free. Everything unlocked.')
write('src/components/Landing.tsx', landing)

write('public/icon.svg', '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2b5ba5"/><stop offset=".52" stop-color="#102b5b"/><stop offset="1" stop-color="#07152f"/></linearGradient></defs><rect width="512" height="512" rx="124" fill="url(#g)"/><path d="M105 392V120h101c70 0 111 34 111 91 0 38-20 66-57 81l79 100h-71l-67-88h-36v88h-60zm60-139h38c34 0 52-13 52-39 0-26-18-39-52-39h-38v78z" fill="#fff"/><path d="M314 392V120h58v272h-58z" fill="#c9d6e8"/><path d="M347 120h60l-57 72h-36l33-72z" fill="#fff" opacity=".94"/></svg>''')

manifest = json.loads(read('public/manifest.webmanifest'))
manifest.update({'name':'ResumeMakery — Free Resume Builder','short_name':'ResumeMakery','description':'Free ATS resume builder with 50 templates, resume import/edit and clean PDF downloads.','start_url':'/','scope':'/'})
manifest['icons']=[{'src':'/icon.svg','sizes':'any','type':'image/svg+xml','purpose':'any maskable'}]
write('public/manifest.webmanifest', json.dumps(manifest, indent=2)+'\n')

routes=[('/', 'weekly','1.0'),('/resume-builder','weekly','0.9'),('/ats-resume-checker','weekly','0.9'),('/resume-editor','weekly','0.9'),('/resume-templates','weekly','0.9'),('/resume-for-freshers','weekly','0.9'),('/privacy','monthly','0.5'),('/terms','monthly','0.5'),('/about','monthly','0.5'),('/faq','monthly','0.5'),('/contact','monthly','0.4'),('/cookies','monthly','0.3'),('/disclaimer','monthly','0.3'),('/eula','monthly','0.3')]
xml=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for path,freq,pri in routes:
    xml += ['  <url>',f'    <loc>{ORIGIN}{path}</loc>',f'    <changefreq>{freq}</changefreq>',f'    <priority>{pri}</priority>','  </url>']
xml.append('</urlset>')
write('public/sitemap.xml','\n'.join(xml)+'\n')
write('public/robots.txt','''# ResumeMakery — public pages are crawlable; private app routes are not search landing pages.\nUser-agent: *\nAllow: /\nDisallow: /.well-known/\nDisallow: /dashboard\nDisallow: /settings\nDisallow: /editor/\nDisallow: /import\n\nSitemap: https://www.resumemakery.com/sitemap.xml\n''')

# Keep legacy internal cache/storage keys stable; update PWA public cache identity and icon.
sw = read('public/sw.js')
sw = sw.replace("const CACHE = 'craftcv-v1';", "const CACHE = 'resumemakery-v2';")
sw = sw.replace("'./icon-192.png', './icon-512.png'", "'./icon.svg'")
write('public/sw.js', sw)

# Ensure generated template preview also carries the new public brand.
render = read('scripts/render-templates.mjs').replace('CraftCV','ResumeMakery').replace('CRAFTCV','RESUMEMAKERY')
write('scripts/render-templates.mjs', render)

# Vercel Vite SPA deep-link fallback; existing functions/headers stay unchanged.
vercel = json.loads(read('vercel.json'))
vercel['rewrites']=[{'source':'/(.*)','destination':'/index.html'}]
write('vercel.json',json.dumps(vercel,indent=2)+'\n')

# Production domain in QA checks.
replace('.github/workflows/qa.yml','https://resume-maker-ivory-ten.vercel.app','https://www.resumemakery.com')

# index.html: canonical/entity/social metadata, verification, GA4 and clean links.
idx = read('index.html')
idx = idx.replace('https://resumemakery.com', ORIGIN)
idx = idx.replace('Free Online Resume Builder — 50 Templates, ATS Score, Upload & Edit','Free ATS Resume Builder — Create, Edit & Download Your Resume')
idx = idx.replace(f'{ORIGIN}/#/privacy', f'{ORIGIN}/privacy')
idx = re.sub(r'<link rel="icon"[^>]*>', '<link rel="icon" type="image/svg+xml" href="/icon.svg" />', idx, count=1)
idx = re.sub(r'<link rel="apple-touch-icon"[^>]*>', '<link rel="apple-touch-icon" href="/icon.svg" />', idx, count=1)
if '78GZuq0-C7diunBYsZsTux9IqFJv3Vm6YguFM-jOKOQ' not in idx:
    idx=idx.replace('<head>','<head>\n    <meta name="google-site-verification" content="78GZuq0-C7diunBYsZsTux9IqFJv3Vm6YguFM-jOKOQ" />',1)
idx = idx.replace("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';", "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com;")
idx = idx.replace("connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co;", "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com;")
if 'G-LLFYR4DHWX' not in idx:
    ga='''\n    <script async src="https://www.googletagmanager.com/gtag/js?id=G-LLFYR4DHWX"></script>\n    <script>\n      window.dataLayer = window.dataLayer || [];\n      function gtag(){dataLayer.push(arguments);}\n      gtag('js', new Date());\n      gtag('config', 'G-LLFYR4DHWX');\n      function resumemakeryPageView(){ gtag('event','page_view',{page_title:document.title,page_location:window.location.href,page_path:window.location.pathname + window.location.search}); }\n      window.addEventListener('popstate', resumemakeryPageView);\n      window.addEventListener('craftcv:navigate', resumemakeryPageView);\n    </script>\n'''
    idx=idx.replace('</head>',ga+'</head>')
write('index.html',idx)

# Final source-level integrity checks: no public hash routes or stale public brand.
for target in ['index.html','public/sitemap.xml','public/robots.txt','src/App.tsx','src/components/Landing.tsx','src/components/Footer.tsx','src/components/LegalPages.tsx']:
    s=read(target)
    if 'resume-maker-ivory-ten.vercel.app' in s:
        raise RuntimeError(f'stale deployment domain remains in {target}')
    if 'CraftCV' in s or 'CRAFTCV' in s:
        raise RuntimeError(f'stale public brand remains in {target}')
if '#/' in read('public/sitemap.xml'):
    raise RuntimeError('hash URL remains in sitemap')

print('ResumeMakery migration applied successfully')
