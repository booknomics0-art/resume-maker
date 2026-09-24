import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { setPdfWorkerUrl } from './lib/pdfExtract';
// Vite emits the pdf.js worker as an asset and gives us its URL — this is how
// the PDF engine runs in a real worker thread (fast, non-blocking UI).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './styles.css';
import './templates.css';

setPdfWorkerUrl(pdfWorkerUrl);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
