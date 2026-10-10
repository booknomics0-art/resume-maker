// MUST come first: snapshots the OAuth/email-link parameters from the address bar
// while they are still there (see src/lib/authRedirect.ts).
import './lib/authRedirect';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { installOriginalUploadCapture } from './lib/originalDocument';
import { installRouteMotion } from './lib/routeMotion';
import { installMobileImportSaveGuard } from './lib/mobileImportSaveGuard';
import { installTemplatePolish } from './lib/templatePolish';
import './styles.css';
import './brand.css';
import './templates.css';
import './template-polish.css';
import './exact-editor-v2.css';
import './pagination.css';
import './navigation-ux.css';

// Preserve the exact uploaded source file before the existing parser/OCR reads
// it, keep route motion consistent, make mobile import validation visible, and
// apply the shared contact/alignment/photo polish to every template family.
installOriginalUploadCapture();
installRouteMotion();
installMobileImportSaveGuard();
installTemplatePolish();

// Landing-page section links such as #templates are useful as in-page targets,
// but they should not put a hash into the public ResumeMakery URL. Intercept
// only same-page section anchors; legacy #/ app routes are handled separately.
document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
  if (!anchor) return;
  const href = anchor.getAttribute('href') || '';
  if (!href.startsWith('#') || href.startsWith('#/') || href.length < 2) return;
  const section = document.getElementById(href.slice(1));
  if (!section) return;
  event.preventDefault();
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// The static #seo-content block in index.html exists for crawlers and no-JS
// visitors. Once the app mounts it would just duplicate the rendered landing
// page — so remove it. If JS never runs (crawler snapshot, broken bundle),
// the static block stays and still tells the whole story.
document.getElementById('seo-content')?.remove();

// PWA: installable + offline-resilient. Keep the worker root-scoped so a direct
// visit to /resume-builder or another clean route does not request /route/sw.js.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* installability is a bonus, never a requirement */ });
  });
}
