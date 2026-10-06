import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const MAX_HTML_CHARS = 3_200_000;
const MAX_CSS_CHARS = 900_000;
const MAX_PDF_BYTES = 4_300_000;

/*
 * Keep a small server-side print guard after the client CSS. The editor already
 * ships the shared pagination stylesheet, but generated PDFs must remain safe
 * even if stylesheet bundling/order changes later. Template identity is left
 * alone; this only defines the physical A4 content box and fragmentation rules.
 */
const PRINT_GUARD_CSS = `
@page { size: A4; margin: 10mm 9mm 12mm 9mm; }
@media print {
  html, body { margin: 0 !important; padding: 0 !important; width: auto !important; min-width: 0 !important; background: #fff !important; }
  .print-root { position: static !important; inset: auto !important; width: auto !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; transform: none !important; background: transparent !important; border: 0 !important; box-shadow: none !important; }
  .print-root .sheet { width: auto !important; max-width: 100% !important; min-height: 275mm !important; height: auto !important; margin: 0 !important; overflow: visible !important; box-shadow: none !important; }
  .sheet { orphans: 3; widows: 3; }
  .sheet .s-sec-title, .sheet .s-item-head { break-inside: avoid-page; page-break-inside: avoid; break-after: avoid-page; page-break-after: avoid; }
  .sheet .sec, .sheet .s-item, .sheet .tl-row, .sheet .tl-body, .sheet .content { break-inside: auto !important; page-break-inside: auto !important; }
  .sheet .s-item > ul, .sheet .tl-body > ul { break-before: avoid-page; page-break-before: avoid; }
  .sheet .s-item > ul > li, .sheet .tl-body > ul > li, .sheet .sec-achievements > ul > li { break-inside: avoid-page; page-break-inside: avoid; }
  .sheet .s-item > ul > li:first-child, .sheet .tl-body > ul > li:first-child { break-after: avoid-page; page-break-after: avoid; }
  .sheet .s-table tr, .sheet .bar, .sheet .dots, .sheet .contact-item, .sheet .s-skill { break-inside: avoid-page; page-break-inside: avoid; }
  .sheet p, .sheet li { orphans: 3; widows: 3; }
  .tpl-timeline .tl-row { display: block !important; position: relative; min-height: 42px; padding-left: 128px; margin-bottom: 13px; background: linear-gradient(var(--a), var(--a)) 116px 0 / 2px 100% no-repeat; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .tpl-timeline .tl-date { position: absolute; left: 0; top: 0; width: 96px; min-width: 96px; }
  .tpl-timeline .tl-dot { position: absolute; left: 104px; top: 0; width: 24px; height: 24px; }
  .tpl-timeline .tl-dot::after { display: none !important; }
}
`;

function cleanTitle(value: unknown): string {
  const raw = typeof value === 'string' ? value : 'resume';
  return raw
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'resume';
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed.', {
        status: 405,
        headers: { Allow: 'POST' },
      });
    }
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
    try {
      const body = await request.json().catch(() => null) as { html?: unknown; css?: unknown; title?: unknown } | null;
      const html = typeof body?.html === 'string' ? body.html : '';
      const css = typeof body?.css === 'string' ? body.css : '';
      const title = cleanTitle(body?.title);

      if (!html || !html.includes('class="sheet')) {
        return new Response('Missing printable resume HTML.', { status: 400 });
      }
      if (html.length > MAX_HTML_CHARS || css.length > MAX_CSS_CHARS) {
        return new Response('Resume is too large to generate safely.', { status: 413 });
      }

      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
        defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
      });

      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);

      // Never let user-controlled resume markup or CSS trigger server-side
      // network requests. Profile photos are embedded as data: URLs and remain
      // available, while http(s), file and other resource fetches are blocked.
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        if (url === 'about:blank' || url.startsWith('data:')) req.continue();
        else req.abort();
      });

      await page.setContent(
        `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light">
  <style>
    html, body { margin: 0; padding: 0; background: #fff; }
    ${css}
    ${PRINT_GUARD_CSS}
  </style>
</head>
<body>
  <div class="print-root">${html}</div>
</body>
</html>`,
        { waitUntil: 'domcontentloaded' },
      );
      await page.emulateMediaType('print');

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        // CSS @page owns the repeated safe area; Puppeteer margins stay zero so
        // they are not accidentally added a second time.
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      if (pdf.byteLength > MAX_PDF_BYTES) {
        return new Response('Generated PDF is too large. Try a smaller profile photo.', { status: 413 });
      }

      const asciiName = title.replace(/[^\x20-\x7E]/g, '').trim() || 'resume';
      const utf8Name = encodeURIComponent(`${title}.pdf`);
      return new Response(pdf as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${asciiName}.pdf"; filename*=UTF-8''${utf8Name}`,
          'Cache-Control': 'no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (error) {
      console.error('PDF generation failed', error);
      return new Response('PDF generation failed.', { status: 500 });
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  },
};
