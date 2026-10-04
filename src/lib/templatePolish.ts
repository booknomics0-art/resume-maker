export type ContactKind = 'email' | 'phone' | 'location' | 'linkedin' | 'website';

const CONTACT_SELECTOR = '.s-contact > span, .contact-line, .mast-strip > span, .tint-contact > span, .quick-contact';

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

function enhanceContact(el: Element) {
  const text = el.textContent?.trim() || '';
  if (!text) return;
  el.classList.add('contact-item');
  el.setAttribute('data-contact-kind', classifyContactValue(text));
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
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(CONTACT_SELECTOR)) enhanceContact(node);
          if (node.matches('.sheet img')) enhancePhoto(node as HTMLImageElement);
          enhance(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
