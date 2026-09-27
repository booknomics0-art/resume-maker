/**
 * OCR text repair — the difference between "unsable garbage" and a parseable
 * resume.
 *
 * Raw OCR output of a real resume looks like this:
 *   "Email: rahul. verma@gmail.com | Phone: +91 98200 11223 | Mumbai"
 *   "Built REST APIs with Node. js"
 *   "Software Developer at TCS Mumbai      Jun 2021 - Present"
 * Small, targeted repairs (never a blanket regex) turn that into text the
 * resume parser can read. Everything here is pure and unit-testable.
 */

/** Tokens that OCR loves to split in half. */
const SPLIT_TOKEN_FIXES: Array<[RegExp, string]> = [
  [/\bNode\s*\.\s*js\b/gi, 'Node.js'],
  [/\bNext\s*\.\s*js\b/gi, 'Next.js'],
  [/\bNuxt\s*\.\s*js\b/gi, 'Nuxt.js'],
  [/\bVue\s*\.\s*js\b/gi, 'Vue.js'],
  [/\bReact\s*\.\s*js\b/gi, 'React.js'],
  [/\bExpress\s*\.\s*js\b/gi, 'Express.js'],
  [/\bD3\s*\.\s*js\b/gi, 'D3.js'],
  [/\bC\s*\+\s*\+/g, 'C++'],
  [/\bC\s*#/g, 'C#'],
  [/\b\.\s*NET\b/gi, '.NET'],
  [/\bGit\s*Hub\b/gi, 'GitHub'],
  [/\bGit\s*Lab\b/gi, 'GitLab'],
  [/\bLinked\s*In\b/gi, 'LinkedIn'],
  [/\bJava\s*Script\b/gi, 'JavaScript'],
  [/\bType\s*Script\b/gi, 'TypeScript'],
  [/\bPostgre\s*SQL\b/gi, 'PostgreSQL'],
  [/\bMy\s*SQL\b/gi, 'MySQL'],
  [/\bMongo\s*DB\b/gi, 'MongoDB'],
  [/\bPower\s*BI\b/gi, 'Power BI'],
  [/\bRest\s*APIs?\b/gi, 'REST API'],
  [/\bJIRA\b/g, 'Jira'],
  [/\bCI\s*\/\s*CD\b/gi, 'CI/CD'],
];

/** Lines that only appear because the scanner hallucinated a rule or smudge. */
const JUNK_LINE = /^[\s.,;:|+\-_=~^*'"`\\/()\[\]{}<>•·▪◦‣–—]*$/;

export function cleanOcrLayout(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    // de-hyphenate words broken across lines: "develop-\nment" → "development"
    .replace(/([A-Za-z])-\s*\n\s*([a-z])/g, '$1$2')
    // OCR frequently drops the space *before* a new line
    .replace(/[ \t]+\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]{2,}/g, (m) => (m.length >= 4 ? '   ' : ' ')))
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l, i, arr) => !(JUNK_LINE.test(l) && arr.length > 3))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Repairs that only make sense inside a document. Applied to OCR output before
 * it reaches the resume parser.
 */
export function repairOcrText(raw: string): string {
  let t = cleanOcrLayout(raw);

  // 1. e-mail addresses are the most valuable field on the page — repair the
  //    spacing OCR inserts around dots, and the space after "@".
  t = t.replace(/[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (m) =>
    m.replace(/\s+/g, '').replace(/\.{2,}/g, '.'),
  );
  // "rahul.verma @ gmail. com" already handled above; now dot-split words in
  // web/tech tokens ("Node. js", "C + +") that the parser needs to recognise
  for (const [re, sub] of SPLIT_TOKEN_FIXES) t = t.replace(re, sub);

  // 2. A stray space after a dot inside a single token ("REST. APIs",
  //    "js. Node") — only when both halves are short and the next character is
  //    lowercase, which is a strong signal the dot was a divider mid-word.
  t = t.replace(/([A-Za-z]{2,})\.\s+([a-z]{1,4})\b/g, (m, a: string, b: string) =>
    b.length <= 4 && !/^(com|net|org|in|co|io|it)$/i.test(b) ? `${a}.${b}` : m,
  );

  // 3. bullet markers: OCR renders them as -, *, o, • or "+" with a space.
  //    Normalise so the parser sees real bullets.
  t = t.replace(/^[ \t]*[•▪◦‣·]?[ \t]*[o*+\-–—][ \t]+(?=[A-Z(])/gm, '- ');

  // 4. pipes: OCR renders "|" as "l", "I" or "1" in contact lines. Only touch
  //    separators between two spaces (a lone letter surrounded by spaces) so
  //    real words are never harmed.
  t = t.replace(/([A-Za-z0-9,)]) +[lI1] +([A-Za-z0-9(@])/g, '$1 | $2');

  // 5. Indian mobile numbers written as "98200 11223" / "9820011223" are fine,
  //    but "98200-11223" and "9820011223." get a clean form.
  t = t.replace(/(\+?\d{1,3}[ -]?)?\d{5}[ .-]?\d{5}\b/g, (m) => m.replace(/[.]$/, ''));

  // 6. dates: "Jun 2O21" (letter O for zero), "2021- Present" spacing
  t = t.replace(/\b((?:19|20)[0-9]{1})[Oo]\b/g, '$10');
  t = t.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s*[-–—]\s*/gi, '$1 - ');
  t = t.replace(/\s*[-–—]\s*(Present|Current|Now|Ongoing)\b/gi, ' - Present');

  return cleanOcrLayout(t);
}

/**
 * How much real, resume-shaped content is in this text? Used to pick the best
 * of several OCR passes (and to decide whether a second strategy is worth it).
 * Rewards word-like tokens, penalises long unbroken garbage runs.
 */
export function ocrQuality(text: string): number {
  if (!text) return 0;
  let score = 0;
  const tokens = text.split(/\s+/).filter(Boolean);
  for (const raw of tokens) {
    const t = raw.replace(/^[^\w]+|[^\w]+$/g, '');
    if (!t) continue;
    if (/^[A-Za-z][A-Za-z'&.-]{2,}$/.test(t)) score += t.length >= 4 ? 2 : 1; // a real word
    else if (/^\d{2,4}$/.test(t)) score += 1; // years, counts
    else if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$/.test(t)) score += 6; // e-mail
    else if (/^[+()\d][\d\s()-]{7,}$/.test(t)) score += 4; // phone
    else if (/^[\W_]+$/.test(t)) score -= 1; // punctuation soup
    else if (t.length > 24) score -= 3; // unbroken garbage run
  }
  const lines = text.split('\n').filter((l) => l.trim().length > 1).length;
  return score + lines;
}

/**
 * Sparse-pass rescue: keeps lines the main pass never produced — typically the
 * big, stylised name at the top of a resume, which whole-page segmentation
 * sometimes skips entirely.
 */
/**
 * Keep every line that appears in either extraction. The text layer and the
 * OCR pass each drop different things (a sidebar, a scanned column, a name in
 * a weird font). Union them instead of picking a winner and throwing the rest
 * away — that was how "some details came and some didn't".
 */
export function unionText(primary: string, extra: string): string {
  if (!extra?.trim()) return primary || '';
  if (!primary?.trim()) return extra;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const base = norm(primary);
  const add: string[] = [];
  for (const line of extra.split('\n')) {
    const l = line.trim();
    const n = norm(l);
    if (n.length < 5) continue;
    if (base.includes(n)) continue;
    add.push(l);
    if (add.length >= 48) break;
  }
  if (!add.length) return primary;
  return `${primary.replace(/\s+$/g, '')}\n${add.join('\n')}`;
}

export function mergeMissingLines(main: string, sparse: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const mainNorm = norm(main);
  if (!mainNorm) return sparse || main;
  const missing: string[] = [];
  for (const line of sparse.split('\n')) {
    const l = line.trim();
    if (l.length < 4) continue;
    const n = norm(l);
    if (n.length < 4) continue;
    if (mainNorm.includes(n)) continue;
    if (!/[A-Za-z]{2}/.test(l)) continue;
    missing.push(l);
    if (missing.length >= 4) break;
  }
  if (!missing.length) return main;
  return [...missing, main].join('\n');
}
