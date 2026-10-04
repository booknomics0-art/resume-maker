// MUST come first: snapshots the OAuth/email-link parameters from the address bar
// while they are still there (see src/lib/authRedirect.ts).
import './lib/authRedirect';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { installOriginalUploadCapture } from './lib/originalDocument';
import { installRouteMotion } from './lib/routeMotion';
import './styles.css';
import './templates.css';

// Preserve the exact uploaded source file before the existing parser/OCR reads
// it, and add a light route transition without touching the router itself.
installOriginalUploadCapture();
installRouteMotion();

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

// PWA: installable + offline-resilient. Only in production builds — a service
// worker in `npm run dev` would serve stale modules and drive everyone mad.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* installability is a bonus, never a requirement */ });
  });
}
