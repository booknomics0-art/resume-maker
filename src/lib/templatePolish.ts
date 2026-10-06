export type ContactKind = 'email' | 'phone' | 'location' | 'linkedin' | 'website';

const CONTACT_SELECTOR = '.s-contact > span, .contact-line, .mast-strip > span, .tint-contact > span, .quick-contact';
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Classify rendered contact values without changing the resume data model.
 * Several template families render the same fields through different markup,
 * so this small compatibility layer gives every surface the same icon/stacking
 * treatment without rewriting the templates or their IDs.
 */
export function classifyContactValue(value: string): ContactKind {
  const text = value.trim();
  const lower = text.toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) || lower.includes('mailto:')) return 'email';
  if (lower.includes('linkedin.com') || /^linkedin\b/i.test(text)) return 'linkedin';
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 7 && digits.length <= 16) return 'phone';
  if (/^(?:https?:\/\/|www\.)/i.test(text) || /\.(?:com|org|net|io|dev|in|co)(?:\/|$)/i.test(text)) return 'website';
  return 'location';
}

/**
 * Repair the two malformed image forms seen in older saved/imported resumes:
 * whitespace inside a base64 data URL, and raw base64 with its MIME prefix
 * stripped. Valid modern data URLs pass through unchanged.
 */
export function repairResumeImageSource(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const data = raw.match(/^data:image\/(jpeg|jpg|png|webp);base64,([\s\S]+)$/i);
  if (data) {
    const payload = data[2].replace(/\s+/g, '');
    return `data:image/${data[1].toLowerCase()};base64,${payload}`;
  }

  const compact = raw.replace(/\s+/g, '');
  if (compact.startsWith('/9j/')) return `data:image/jpeg;base64,${compact}`;
  if (compact.startsWith('iVBOR')) return `data:image/png;base64,${compact}`;
  if (compact.startsWith('UklGR')) return `data:image/webp;base64,${compact}`;
  return raw;
}

function initialsFor(img: HTMLImageElement): string {
  const name = img.closest('.sheet')?.querySelector('.s-name, .quick-name')?.textContent?.trim() || 'CV';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'CV';
}

function safePhotoFallback(initials: string): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#f1f4f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#31445f';
    ctx.font = '700 54px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials.replace(/[^A-Z0-9]/gi, '').slice(0, 2), 80, 82);
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

function svgNode<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string>) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

/**
 * Build the icon as real inline SVG markup. The editor exports sheet.outerHTML
 * to the PDF service, so the SVG travels inside the printable HTML itself.
 * This avoids CSS masks / symbol fonts, both of which can disappear in a
 * headless-Chromium PDF even when they look correct in the browser preview.
 */
function createContactIcon(kind: ContactKind): SVGSVGElement {
  const svg = svgNode('svg', {
    viewBox: '0 0 24 24',
    width: '14',
    height: '14',
    'aria-hidden': 'true',
    focusable: 'false',
    class: 'contact-icon',
    'data-contact-icon': kind,
  }) as SVGSVGElement;

  const outline = {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };

  if (kind === 'email') {
    svg.append(
      svgNode('rect', { x: '3', y: '5', width: '18', height: '14', rx: '2', ...outline }),
      svgNode('path', { d: 'm4 7 8 6 8-6', ...outline }),
    );
  } else if (kind === 'phone') {
    svg.append(svgNode('path', {
      d: 'M22 16.9v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.28-1.28a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.9Z',
      ...outline,
    }));
  } else if (kind === 'location') {
    svg.append(
      svgNode('path', { d: 'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z', ...outline }),
      svgNode('circle', { cx: '12', cy: '10', r: '2.5', fill: 'currentColor' }),
    );
  } else if (kind === 'linkedin') {
    svg.append(
      svgNode('circle', { cx: '5.3', cy: '6.1', r: '1.6', fill: 'currentColor' }),
      svgNode('rect', { x: '3.9', y: '9', width: '2.8', height: '10.5', rx: '.5', fill: 'currentColor' }),
      svgNode('path', {
        d: 'M10 9h2.7v1.45c1.05-1.25 2.45-1.8 4.05-1.8 3.2 0 4.85 2.05 4.85 5.8v5.05h-2.9v-4.7c0-2.25-.75-3.45-2.55-3.45-2.05 0-3.25 1.4-3.25 4v4.15H10Z',
        fill: 'currentColor',
      }),
    );
  } else {
    svg.append(
      svgNode('circle', { cx: '12', cy: '12', r: '9', ...outline }),
      svgNode('path', { d: 'M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21M12 3C9.6 5.5 8.4 8.5 8.4 12S9.6 18.5 12 21', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round' }),
    );
  }

  return svg;
}

function enhanceContact(el: Element) {
  // SVG icons contain no text nodes, so textContent remains the resume value.
  const text = el.textContent?.trim() || '';
  if (!text) return;
  const kind = classifyContactValue(text);
  el.classList.add('contact-item');
  el.setAttribute('data-contact-kind', kind);

  const existing = el.querySelector(':scope > .contact-icon');
  if (existing?.getAttribute('data-contact-icon') === kind) return;
  existing?.remove();
  el.prepend(createContactIcon(kind));
}

function enhanceRailContactBlocks(root: ParentNode) {
  root.querySelectorAll('.rail-block').forEach((block) => {
    const heading = block.querySelector(':scope > h4')?.textContent?.trim().toLowerCase();
    if (heading !== 'contact') return;
    block.querySelectorAll(':scope > div').forEach(enhanceContact);
  });
}

function onPhotoError(event: Event) {
  const img = event.currentTarget as HTMLImageElement;
  if (!img?.isConnected) return;

  const original = img.getAttribute('src') || '';
  if (img.dataset.photoRepairTried !== '1') {
    img.dataset.photoRepairTried = '1';
    const repaired = repairResumeImageSource(original);
    if (repaired && repaired !== original) {
      img.src = repaired;
      return;
    }
  }

  if (img.dataset.photoFallback !== '1') {
    img.dataset.photoFallback = '1';
    img.classList.add('template-photo-fallback');
    const fallback = safePhotoFallback(initialsFor(img));
    if (fallback) img.src = fallback;
  }
}

function enhancePhoto(img: HTMLImageElement) {
  if (img.dataset.templatePhotoEnhanced === '1') return;
  img.dataset.templatePhotoEnhanced = '1';
  img.addEventListener('error', onPhotoError);

  // Repair obvious legacy values before the browser has to fail once.
  const raw = img.getAttribute('src') || '';
  const repaired = repairResumeImageSource(raw);
  if (repaired && repaired !== raw) {
    img.dataset.photoRepairTried = '1';
    img.src = repaired;
  }
}

function enhance(root: ParentNode) {
  root.querySelectorAll(CONTACT_SELECTOR).forEach(enhanceContact);
  enhanceRailContactBlocks(root);
  root.querySelectorAll<HTMLImageElement>(
    '.sheet img.s-photo, .sheet img.avatar, .sheet img.seal-photo, .sheet img.mast-photo, .sheet img.band-photo, .sheet img.spine-photo, .sheet img.tint-photo, .sheet img.rail-photo',
  ).forEach(enhancePhoto);
}

let installed = false;

/** Install once at app boot; React can then mount/swap any template family. */
export function installTemplatePolish() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  const start = () => {
    enhance(document);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          if (parent?.matches(CONTACT_SELECTOR)) enhanceContact(parent);
          continue;
        }

        const target = mutation.target;
        if (target instanceof Element && target.matches(CONTACT_SELECTOR)) enhanceContact(target);
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(CONTACT_SELECTOR)) enhanceContact(node);
          if (node.matches('.sheet img')) enhancePhoto(node as HTMLImageElement);
          enhance(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
