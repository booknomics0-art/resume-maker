import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const GA4_ID = 'G-LLFYR4DHWX';

/**
 * Keep the privacy copy aligned with the GA4 setup declared once in index.html.
 * Head metadata itself lives in index.html so build transforms never duplicate
 * verification or analytics tags.
 */
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
  plugins: [analyticsPrivacyCopy(), react()],
  // The production app owns a root custom domain. Absolute asset paths keep
  // direct clean URLs such as /resume-builder and /privacy reliable.
  base: '/',
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
