/**
 * Real DOCX extraction.
 *
 * The old path grepped the raw zip bytes for `<w:t>`. Word stores document.xml
 * deflated, so that regex matched nothing on a normal file and the sidebar
 * stayed empty. This reads the zip central directory and inflates the XML.
 */

const WANTED = /word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/i;

export async function extractDocxText(buf: ArrayBuffer): Promise<string> {
  const files = await readZipXml(buf, WANTED);
  const names = [...files.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const parts = names.map((n) => docxXmlToText(files.get(n) || '')).filter(Boolean);
  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function rank(name: string): number {
  if (/header/i.test(name)) return 0;
  if (/document\.xml$/i.test(name)) return 1;
  if (/footnote|endnote/i.test(name)) return 2;
  return 3;
}

export function docxXmlToText(xml: string): string {
  const marked = xml
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<w:cr\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<w:t\b[^>]*>([^<]*)<\/w:t>/g, (_, t) => decodeXml(t));
  return decodeXml(marked.replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

async function readZipXml(buf: ArrayBuffer, nameRe: RegExp): Promise<Map<string, string>> {
  const u8 = new Uint8Array(buf);
  const view = new DataView(buf);
  const eocd = findEOCD(u8);
  if (eocd < 0) throw new Error('Not a DOCX zip');
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const out = new Map<string, string>();
  for (let i = 0; i < count && offset + 46 < u8.length; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localOff = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(u8.subarray(offset + 46, offset + 46 + nameLen));
    offset += 46 + nameLen + extraLen + commentLen;
    nameRe.lastIndex = 0;
    if (!nameRe.test(name)) continue;
    if (localOff + 30 > u8.length) continue;
    const localNameLen = view.getUint16(localOff + 26, true);
    const localExtraLen = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + localNameLen + localExtraLen;
    const comp = u8.subarray(dataStart, Math.min(u8.length, dataStart + compSize));
    let text = '';
    if (method === 0) text = new TextDecoder('utf-8').decode(comp);
    else if (method === 8) text = await inflateRaw(comp);
    if (text) out.set(name, text);
  }
  return out;
}

function findEOCD(u8: Uint8Array): number {
  const min = Math.max(0, u8.length - 22 - 65536);
  for (let i = u8.length - 22; i >= min; i--) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) return i;
  }
  return -1;
}

async function inflateRaw(data: Uint8Array): Promise<string> {
  const G = globalThis as any;
  if (typeof G.DecompressionStream !== 'function') {
    throw new Error('This browser cannot inflate a DOCX. Upload a PDF or TXT instead.');
  }
  const ds = new G.DecompressionStream('deflate-raw');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder('utf-8').decode(buf);
}
