export type PreparedPdfDownload = {
  blob: Blob;
  filename: string;
  url: string;
};

export function isAppleTouchBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const classicIos = /iPad|iPhone|iPod/i.test(ua);
  const ipadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return classicIos || ipadDesktopMode;
}

export function preparePdfDownload(blob: Blob, filename: string): PreparedPdfDownload {
  return { blob, filename, url: URL.createObjectURL(blob) };
}

export function releasePdfDownload(download: PreparedPdfDownload | null | undefined) {
  if (!download) return;
  URL.revokeObjectURL(download.url);
}

export function triggerBrowserPdfDownload(download: PreparedPdfDownload) {
  const link = document.createElement('a');
  link.href = download.url;
  link.download = download.filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function asFile(download: PreparedPdfDownload) {
  return new File([download.blob], download.filename, { type: 'application/pdf' });
}

export function canSharePdfFile(download: PreparedPdfDownload): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  const file = asFile(download);
  if (typeof navigator.canShare !== 'function') return true;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function sharePdfFile(download: PreparedPdfDownload) {
  if (!canSharePdfFile(download)) throw new Error('File sharing is not supported in this browser.');
  const file = asFile(download);
  await navigator.share({
    files: [file],
    title: download.filename.replace(/\.pdf$/i, ''),
  });
}

export function openPdfDownload(download: PreparedPdfDownload) {
  const opened = window.open(download.url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.assign(download.url);
}
