import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PRODUCTION_DOMAIN = 'https://www.resumemakery.com';
const GA4_ID = 'G-LLFYR4DHWX';

function productionHeadTags() {
  return {
    name: 'production-head-tags',
    transformIndexHtml(html: string) {
      let updated = html
        .replace(
          "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';",
          "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com;",
        )
        .replace(
          "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co;",
          "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com;",
        )
        .replaceAll('https://www.resumemakery.com', PRODUCTION_DOMAIN)
        .replace(
          'No third-party analytics cookies, no advertising trackers, no fingerprinting.',
          'Google Analytics 4 is used for aggregate traffic measurement. No resume content is sent to Google Analytics; no advertising trackers or fingerprinting.',
        );

      return {
        html: updated,
        tags: [
          {
            tag: 'meta',
            attrs: {
              name: 'google-site-verification',
              content: '78GZuq0-C7diunBYsZsTux9IqFJv3Vm6YguFM-jOKOQ',
            },
            injectTo: 'head-prepend' as const,
          },
          {
            tag: 'script',
            attrs: {
              async: true,
              src: `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`,
            },
            injectTo: 'head' as const,
          },
          {
            tag: 'script',
            children: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');
window.addEventListener('hashchange', function () {
  gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search + window.location.hash
  });
});`,
            injectTo: 'head' as const,
          },
        ],
      };
    },
  };
}

function analyticsPrivacyCopy() {
  return {
    name: 'analytics-privacy-copy',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.endsWith('/src/components/LegalPages.tsx')) return null;

      let updated = code.replace(
        '<li>No third-party analytics cookies (no Google Analytics, no Facebook Pixel, no Mixpanel)</li>',
        '<li>No advertising identifiers, no cross-site advertising pixels, no fingerprinting. Google Analytics 4 is used only for aggregate traffic measurement and is not sent resume content.</li>',
      );

      updated = updated.replace(
        /<p>\s*We do <b>not<\/b> load Google Analytics,[\s\S]*?operations described above\.\s*<\/p>/,
        `<p>
        We use <b>Google Analytics 4</b> (measurement ID <code>${GA4_ID}</code>) for aggregate traffic and page-view measurement.
        We do <b>not</b> send resume content, uploaded files, names or email addresses in Analytics events, and we do not load
        Facebook Pixel, Hotjar, Mixpanel, Segment, Amplitude, Sentry or advertising SDKs.
      </p>`,
      );

      return updated === code ? null : { code: updated, map: null };
    },
  };
}

export default defineConfig({
  plugins: [analyticsPrivacyCopy(), productionHeadTags(), react()],
  // relative base: lets the built site run from any folder/subdomain
  // (Netlify, Vercel, GitHub Pages) without extra configuration
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
});
