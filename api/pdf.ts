import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const MAX_HTML_CHARS = 3_200_000;
const MAX_CSS_CHARS = 900_000;
const MAX_PDF_BYTES = 4_300_000;

function cleanTitle(value: unknown): string {
  const raw = typeof value === 'string' ? value : 'resume';
  return raw
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'resume';
}

export async function POST(request: Request) {
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
}
