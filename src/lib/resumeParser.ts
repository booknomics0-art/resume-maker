/**
 * CraftCV Advanced Resume Parser — v2
 * Parses PDF, DOCX, TXT, JSON resumes and extracts structured data.
 *
 * v2 upgrades:
 *  - Real PDF extraction via pdf.js + OCR fallback (see pdfExtract.ts) with
 *    preserved LINE STRUCTURE (the old build collapsed everything into one
 *    line, which is why imported resumes came out as garbage).
 *  - Line-aware section detection (no more matching the word "skills" inside
 *    body sentences).
 *  - Experience: role / company / location / start / end / bullets with
 *    date-range parsing ("Jan 2022 – Present", "2020-2023", …).
 *  - Education, Projects, Certifications & Achievements are now parsed too.
 */

import { emptyResume, uid, type Resume, type ExperienceItem, type EducationItem, type ProjectItem, type CertItem } from './types';
import { sanitizeInput } from './security';
import { extractPdfSmart, type PdfProgress, type PdfExtractMethod, type PdfExtractResult } from './pdfExtract';

export type SupportedFormat = 'pdf' | 'docx' | 'txt' | 'json' | 'unknown';

/** Extra info about HOW the file was parsed (shown in the review UI). */
export interface ParseMeta {
  method?: PdfExtractMethod;
  pages?: number;
  textChars?: number;
  ocrChars?: number;
  warning?: string;
}

export interface ParseResumeResult {
  resume: Resume | null;
  parsed: ParsedSections | null;
  text: string;
  format: SupportedFormat;
  meta?: ParseMeta;
  error?: string;
}

export function detectFormat(file: File): SupportedFormat {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (name.endsWith('.pdf') || type === 'application/pdf') return 'pdf';
  if (name.endsWith('.docx') || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (name.endsWith('.doc')) return 'docx';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.txt') || type === 'text/plain') return 'txt';
  return 'unknown';
}

export async function extractFromTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read TXT file'));
    reader.readAsText(file);
  });
}

export async function extractFromJson(file: File): Promise<Resume | null> {
  try {
    const text = await extractFromTxt(file);
    const data = JSON.parse(text);
    if (Array.isArray(data) && data.length > 0) return data[0] as Resume;
    if (data && typeof data === 'object' && (data as any).personal) return data as Resume;
    return null;
  } catch {
    return null;
  }
}

/**
 * PDF → text using the real engine (pdf.js text layer + OCR fallback).
 * `result.text` preserves line/paragraph structure.
 */
export async function extractFromPdf(
  file: File,
  onProgress?: (p: PdfProgress) => void,
  forceOcr = false,
): Promise<PdfExtractResult> {
  return extractPdfSmart(file, onProgress, forceOcr);
}

export async function extractFromDocx(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const raw = decoder.decode(new Uint8Array(arrayBuffer));
        const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        const paraRegex = /<\/w:p>/g;
        // rebuild paragraphs: split runs by paragraph end, join runs inside
        const paragraphs = raw.split(paraRegex);
        const outLines: string[] = [];
        for (const para of paragraphs) {
          const fragments: string[] = [];
          let m;
          textRegex.lastIndex = 0;
          while ((m = textRegex.exec(para)) !== null) fragments.push(m[1]);
          if (fragments.length) outLines.push(fragments.join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
        }
        if (outLines.length > 0) {
          resolve(outLines.join('\n'));
        } else {
          const readable = raw.match(/[A-Za-z][A-Za-z0-9\s@.,\-_\/():]{10,}/g) || [];
          const cleaned = readable.filter(s => s.trim().length > 10).join(' ');
          resolve(cleaned || `DOCX extraction limited. File: ${file.name}. Please copy-paste content manually.`);
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read DOCX'));
    reader.readAsArrayBuffer(file);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Regexes & constants
// ═════════════════════════════════════════════════════════════════════════════

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_\/]+/gi;
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s]+|(?<![\w@.\-])[a-zA-Z0-9\-]+\.(?:com|dev|io|in|co|org|net|ai|me)(?:\/[^\s]*)?/gi;

const MONTHS_P = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
const MD = `(?:${MONTHS_P})\\.?\\s*,?\\s*'?(?:\\d{4}|'\\d{2})?`;
const DATE_RANGE = new RegExp(
  `((?:${MD})\\s*(?:-|–|—|\\bto\\b|\\buntil\\b)\\s*(?:${MD}|Present|Current|Now|Ongoing|Till\\s+date|Date)` +
  `|(?:19|20)\\d{2}\\s*(?:-|–|—|\\bto\\b)\\s*(?:(?:19|20)\\d{2}|Present|Current|Now|Ongoing))`,
  'i',
);
const ANY_YEAR = /\b(?:19|20)\d{2}\b/;

const BULLET_PREFIX = /^\s*[•▪◦‣·∙*o+)\-–—]\s+/;
const SECTION_LINE_MAX = 50;

const DEGREE_KW = /(b\.?\s?tech|b\.?\s?e\b|m\.?\s?tech|bachelor|master|m\.?\s?ba\b|b\.?\s?ca\b|m\.?\s?ca\b|b\.?\s?sc\b|m\.?\s?sc\b|b\.?\s?com\b|m\.?\s?com\b|diploma|high school|higher secondary|senior secondary|secondary school|class\s*(?:x{1,3}|ix|viii|1[012]?)|(?:10|12)th|hsc|ssc|cbse|icse|ib\b|ph\.?\s?d|doctorate|post\s?graduat|under\s?graduat|graduat(?:ion|e)|intermediate|associate(?:'s)?\s?degree)/i;
const SCHOOL_KW = /(college|university|institute|school|academy|polytechnic|vidyalay|iit|nit|iiit|bits\b|board|campus)/i;
const ISSUER_KW = /(coursera|udemy|google|aws|amazon|microsoft|ibm|meta|nptel|hackerrank|hackerearth|cisco|oracle|linkedin|infosys|tcs|wiley|springboard|great learning|simplilearn|upgrad|freecodecamp|kaggle|nvidia|deep ?learning\.?ai|stanford|iit|nit)/i;

const HEADER_KEYWORDS: Array<{ type: SectionType; kws: string[] }> = [
  { type: 'experience', kws: ['work experience', 'professional experience', 'employment history', 'work history', 'career history', 'relevant experience', 'experience', 'employment'] },
  { type: 'education', kws: ['educational background', 'educational qualification', 'academic background', 'academic qualification', 'education', 'academics', 'academic', 'qualification', 'qualifications'] },
  { type: 'skills', kws: ['technical skills', 'technical proficiencies', 'core skills', 'key skills', 'core competencies', 'skills & tools', 'skills', 'technologies', 'tech stack', 'competencies', 'expertise', 'proficiencies'] },
  { type: 'summary', kws: ['professional summary', 'career objective', 'executive summary', 'profile summary', 'summary', 'objective', 'profile', 'about me', 'about'] },
  { type: 'projects', kws: ['personal projects', 'academic projects', 'key projects', 'selected projects', 'projects', 'project work'] },
  { type: 'certifications', kws: ['certifications', 'certification', 'certificates', 'licenses', 'courses & certifications'] },
  { type: 'achievements', kws: ['achievements', 'achievement', 'accomplishments', 'awards & honors', 'awards', 'honors', 'honours', 'extra-curricular', 'extracurricular'] },
];
// suffixes allowed after a keyword in a real section header
const HEADER_SUFFIXES = ['& qualification', 'qualifications', 'qualification', '& courses', 'courses', 'details', 'information', '& achievements', 'background', '& skills', 'and skills', '& tools', 'tools', '& technologies', 'proficiencies', 'toolkit', 'summary', 'profile', 'history', '& honors', '& awards', 'set'];

type SectionType = 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'achievements';

export interface ParsedSections {
  contact: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  experience: Array<Partial<ExperienceItem> & { raw: string }>;
  education: Array<Partial<EducationItem> & { raw: string }>;
  skills: string[];
  projects: Array<Partial<ProjectItem> & { raw: string }>;
  certs: Array<Partial<CertItem> & { raw: string }>;
  achievements: string[];
  rawText: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════════════

const splitLines = (text: string): string[] => text.split(/\r?\n/);
const isBlank = (l: string) => !l || !l.trim();
const isBullet = (l: string) => BULLET_PREFIX.test(l);
const stripBullet = (l: string) => l.replace(BULLET_PREFIX, '').trim();

function isJunk(l: string): boolean {
  const t = l.trim();
  if (!t) return true;
  if (/^page\s*\d+/i.test(t)) return true;
  if (/^\d+\s*(?:of|\/)\s*\d+$/i.test(t)) return true;
  if (/^(?:curriculum\s+vita[eë]|resume|cv)\s*$/i.test(t)) return true;
  if (/^[©®™✓✔☑☆★◆●]+$/u.test(t)) return true;
  if (/^\d{1,3}$/.test(t)) return true;
  return false;
}

/** blocks = groups of non-blank lines separated by blank lines */
function toBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const l of lines) {
    if (isBlank(l)) {
      if (cur.length) { blocks.push(cur); cur = []; }
    } else {
      cur.push(l.trim());
    }
  }
  if (cur.length) blocks.push(cur);
  return blocks;
}

function normalizeDate(t: string): string {
  const s = (t || '').trim().replace(/[.,;]$/, '').trim();
  if (!s) return '';
  if (/present|current|now|ongoing|till/i.test(s)) return 'Present';
  const mm = s.match(new RegExp(`(${MONTHS_P})\\.?\\s*,?\\s*'?(\\d{2,4})`, 'i'));
  if (mm) {
    const monRaw = mm[1].replace(/^Sept/i, 'Sep').slice(0, 3);
    const mon = monRaw[0].toUpperCase() + monRaw.slice(1).toLowerCase();
    let yr = mm[2];
    if (yr.length === 2) yr = Number(yr) > 35 ? `19${yr}` : `20${yr}`;
    return `${mon} ${yr}`;
  }
  const yy = s.match(ANY_YEAR);
  if (yy) return yy[0];
  return s.slice(0, 20);
}

function parseDateRange(raw: string): { start: string; end: string; current: boolean } {
  const s = raw.replace(/[–—]/g, '-').trim();
  const parts = s.split(/\s*(?:-|\bto\b|\buntil\b)\s*/i).filter(Boolean);
  if (parts.length < 2) {
    const d = normalizeDate(s);
    return { start: d, end: /present|current/i.test(s) ? 'Present' : '', current: /present|current/i.test(s) };
  }
  const start = normalizeDate(parts[0]);
  const end = normalizeDate(parts[1]);
  return { start, end, current: /present|current|now|ongoing|till/i.test(parts[1]) };
}

// ═════════════════════════════════════════════════════════════════════════════
// Section detection (line-aware — a header must look like a header)
// ═════════════════════════════════════════════════════════════════════════════

function normalizeHeader(line: string): string {
  return line
    .toLowerCase()
    .replace(/^[\s•▪◦‣·*\-–—>#(\[\]]+/, '')
    .replace(/[\s:：\-–—]+$/, '')
    .trim();
}

export function detectSections(lines: string[]): Array<{ type: SectionType; lineIdx: number }> {
  const found: Array<{ type: SectionType; lineIdx: number }> = [];
  const taken = new Set<SectionType>();
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || raw.length > SECTION_LINE_MAX || isBullet(raw)) continue;
    const norm = normalizeHeader(raw);
    if (!norm || norm.length < 3) continue;
    let best: { type: SectionType; kwLen: number } | null = null;
    for (const { type, kws } of HEADER_KEYWORDS) {
      if (taken.has(type)) continue;
      for (const kw of kws) {
        if (norm === kw) {
          if (!best || kw.length > best.kwLen) best = { type, kwLen: kw.length };
          break;
        }
        if (norm.startsWith(kw)) {
          const rest = norm.slice(kw.length).trim();
          if (HEADER_SUFFIXES.includes(rest) && (!best || kw.length > best.kwLen)) {
            best = { type, kwLen: kw.length };
          }
        }
      }
    }
    if (best) {
      found.push({ type: best.type, lineIdx: i });
      taken.add(best.type);
    }
  }
  return found.sort((a, b) => a.lineIdx - b.lineIdx);
}

function sectionContents(
  lines: string[],
  sections: Array<{ type: SectionType; lineIdx: number }>,
): Partial<Record<SectionType, string[]>> {
  const out: Partial<Record<SectionType, string[]>> = {};
  sections.forEach((sec, idx) => {
    const end = idx + 1 < sections.length ? sections[idx + 1].lineIdx : lines.length;
    out[sec.type] = lines.slice(sec.lineIdx + 1, end);
  });
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
// Contact
// ═════════════════════════════════════════════════════════════════════════════

function findPhone(text: string): string | undefined {
  const candidates = text.match(/\+?\(?\d[\d\s\-().]{7,18}\d/g) || [];
  let fallback: string | undefined;
  for (const c of candidates) {
    const digits = c.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) continue;
    if (/^\d{4}\s*[-–]\s*\d{4}$/.test(c.trim())) continue; // year range
    if (/^(18|19|20)\d{2}[\s\-]/.test(c.trim()) && digits.length <= 10) continue; // date-ish
    if (digits.length === 10 && /^[6-9]/.test(digits)) return c.trim(); // Indian mobile
    if (!fallback) fallback = c.trim();
  }
  return fallback;
}

function titleCase(s: string): string {
  return s.replace(/\b([a-z])([a-z']*)/gi, (_, a, b) => a.toUpperCase() + b.toLowerCase());
}

const HEADLINE_WORDS = /(developer|engineer|manager|designer|analyst|consultant|specialist|associate|intern|architect|administrator|executive|director|lead|head|student|graduate|fresher|seeker|enthusiast|programmer|officer|researcher|teacher|accountant|recruiter|marketer|writer|editor|operations|support|technician|nurse|advocate|trainee)/i;

/** Words that mark a SECTION HEADER in all-caps ("WORK EXPERIENCE") — never a person name */
const HEADER_WORD = /(experience|education|skill|summary|objective|profile|project|certificat|achievement|award|honou?r|contact|language|hobb|interest|strength|reference|declaration|curriculum|curricular|activities|publication|internship|courses|portfolio|competenc|expertise|qualificat|history|about)/i;

function isNameLine(line: string): boolean {
  const t = line.trim().replace(/[|,]+$/, '');
  if (!t || t.length > 42 || /\d|@|https?:|www\./i.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  if (HEADLINE_WORDS.test(t)) return false;
  if (DEGREE_KW.test(t)) return false;
  if (HEADER_WORD.test(t)) return false; // "WORK EXPERIENCE" is not a name
  // every word must be purely alphabetic and capitalized (Title Case or ALL CAPS)
  for (const w of words) {
    const parts = w.split(/[.'\-]/).filter(Boolean);
    if (!parts.length) return false;
    for (const p of parts) {
      if (!/^[A-Z][a-zA-Z]*$/.test(p) && !/^[A-Z]+$/.test(p)) return false;
    }
  }
  return true;
}

function nameFromEmail(email: string): string | undefined {
  const local = email.split('@')[0];
  const parts = local.split(/[._\-+]+/).filter(p => /^[A-Za-z]{3,}$/.test(p));
  if (parts.length >= 2 && parts.length <= 3) {
    return titleCase(parts.slice(0, 2).join(' '));
  }
  return undefined;
}

function extractContactInfo(text: string): ParsedSections['contact'] {
  const contact: ParsedSections['contact'] = {};
  const emails = text.match(EMAIL_REGEX);
  if (emails && emails.length > 0) contact.email = emails[0].toLowerCase();
  contact.phone = findPhone(text);
  const linkedins = text.match(LINKEDIN_REGEX);
  if (linkedins && linkedins.length > 0) contact.linkedin = linkedins[0].replace(/^https?:\/\//i, '').replace(/^www\./i, '');

  const urls = (text.match(URL_REGEX) || [])
    .map(u => u.replace(/[.,;)]+$/, ''))
    .filter(u => !u.includes('@'))
    .filter(u => !u.toLowerCase().includes('linkedin') && !u.toLowerCase().includes('github.com'));
  const portfolio = urls.find(u => !/\.(png|jpe?g|pdf|css|js)$/i.test(u));
  if (portfolio) contact.website = portfolio;

  // Name — scan the first 8 meaningful lines
  const lines = splitLines(text).map(l => l.trim()).filter(l => !isJunk(l));
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    if (isNameLine(lines[i])) { contact.name = lines[i].replace(/[|,]+$/, '').trim(); break; }
  }
  if (!contact.name && contact.email) {
    contact.name = nameFromEmail(contact.email);
  }

  // City — "Location: X" / standalone "City, State" near the top
  const cityLine = lines.find(l => /^(?:location|address|city|based in|current (?:city|location))\s*[:\-–]/i.test(l));
  if (cityLine) {
    const val = cityLine.split(/[:\-–]/).slice(1).join(':').trim();
    if (val && val.length <= 40) contact.city = val.split(',')[0].trim();
  }
  if (!contact.city) {
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      // standalone "City, State" or a "City, State | ..." segment in a contact line
      const segments = lines[i].split('|').map(s => s.trim());
      for (const seg of segments) {
        const m = seg.match(/^([A-Z][a-zA-Z.]{2,}(?:\s+[A-Z][a-zA-Z.]{2,})?),\s*[A-Z][a-zA-Z.]{2,}\s*$/);
        if (m && !HEADLINE_WORDS.test(m[1]) && !/@|\d/.test(seg)) { contact.city = m[1].trim(); break; }
      }
      if (contact.city) break;
      // trailing "| Mumbai" style city at the end of a contact line
      const tail = lines[i].match(/\|\s*([A-Z][a-zA-Z]{2,18})\s*$/);
      if (tail && !HEADER_WORD.test(tail[1]) && !HEADLINE_WORDS.test(tail[1]) && !/^Linked/i.test(tail[1]) && !/@|\d/.test(lines[i].split('|').pop() || '')) {
        contact.city = tail[1];
        break;
      }
    }
  }
  return contact;
}

// ═════════════════════════════════════════════════════════════════════════════
// Sections
// ═════════════════════════════════════════════════════════════════════════════

function parseExperience(contentLines: string[]): ParsedSections['experience'] {
  const jobs: string[][] = [];
  let cur: string[] = [];
  for (const raw of contentLines) {
    const l = raw.trim();
    if (!l) {
      if (cur.length) { jobs.push(cur); cur = []; }
      continue;
    }
    const dateOnly = DATE_RANGE.test(l) && l.replace(DATE_RANGE, '').trim() === '';
    const dateInline = DATE_RANGE.test(l) && !dateOnly;
    const headerAfterBullets =
      cur.length > 0 && !isBullet(l) && cur.some(isBullet) &&
      l.length <= 60 && !/[.!?]$/.test(l) && !dateOnly;
    // a date-only line belongs to the job above; a "Role <dates>" line or a
    // new header line (after bullets) starts a new job
    if (cur.length > 0 && (dateInline || headerAfterBullets)) {
      jobs.push(cur);
      cur = [l];
      continue;
    }
    cur.push(l);
  }
  if (cur.length) jobs.push(cur);

  const experience: ParsedSections['experience'] = [];
  for (const block of jobs) {
    if (isJunk(block.join(' '))) continue;
    const blockText = block.join('\n');
    const drMatch = blockText.match(DATE_RANGE);
    let start = '', end = '', current = false;
    if (drMatch) ({ start, end, current } = parseDateRange(drMatch[0]));

    // header = leading non-bullet lines (with the date removed)
    let i = 0;
    const header: string[] = [];
    while (i < block.length && !isBullet(block[i])) {
      const cleaned = block[i].replace(DATE_RANGE, '').replace(/[\s|,·•–—\-]+$/g, '').trim();
      if (cleaned && !/^(?:present|current|now|ongoing|till\s+date)$/i.test(cleaned)) header.push(cleaned);
      i++;
    }
    const bullets = block.slice(i).map(stripBullet).filter(l => l.length > 2 && !isJunk(l)).slice(0, 8);

    let role = '', company = '', location = '';
    if (header.length) {
      const first = header[0];
      let parts: string[];
      if (first.includes('|')) parts = first.split('|');
      else if (/\s+at\s+/i.test(first)) parts = first.split(/\s+at\s+/i);
      else if (/\s+[-–—]\s+/.test(first) && !/^\d/.test(first)) parts = first.split(/\s+[-–—]\s+/);
      else if (first.includes(',')) parts = first.split(',');
      else parts = [first];
      role = (parts[0] || '').trim().slice(0, 100);
      company = (parts[1] || '').trim().slice(0, 100);
      location = (parts[2] || '').trim().slice(0, 60);
      if (!company && header[1]) {
        company = header[1].replace(/^at\s+/i, '').trim().slice(0, 100);
        if (/,/.test(company)) {
          const cparts = company.split(',');
          company = cparts[0].trim();
          if (!location && cparts[1]) location = cparts[1].trim().slice(0, 60);
        }
      }
      if (company && /,/.test(company) && !location) {
        const cparts = company.split(',');
        if (cparts.length === 2 && /^[A-Za-z\s.]{2,25}$/.test(cparts[1])) {
          company = cparts[0].trim();
          location = cparts[1].trim();
        }
      }
    }
    if (!role && bullets.length === 0) continue;
    experience.push({
      role: role || header[0]?.slice(0, 100) || '',
      company,
      location,
      start,
      end: current ? 'Present' : end,
      current,
      bullets: bullets.map(b => b.slice(0, 250)),
      raw: blockText.slice(0, 600),
    });
    if (experience.length >= 8) break;
  }
  return experience;
}

function parseEducation(contentLines: string[]): ParsedSections['education'] {
  const education: ParsedSections['education'] = [];
  for (const block of toBlocks(contentLines).slice(0, 6)) {
    if (isJunk(block.join(' '))) continue;
    const lines = block.map(stripBullet).filter(Boolean);
    if (!lines.length) continue;
    const blockText = lines.join(' ');

    const drMatch = blockText.match(DATE_RANGE);
    let year = '';
    if (drMatch) {
      const { start, end } = parseDateRange(drMatch[0]);
      year = end && end !== 'Present' && start !== end ? `${start} - ${end}` : start;
    }
    if (!year) {
      const y = blockText.match(ANY_YEAR);
      if (y) year = y[0];
    }

    // degree / school may be on one line ("B.Tech CSE, IIT Delhi, 2020") or separate lines
    let degree = '', school = '', note = '';
    const flatParts: string[] = [];
    for (const l of lines) {
      if (l.includes('|')) flatParts.push(...l.split('|'));
      else if (l.includes(',')) flatParts.push(...l.split(','));
      else flatParts.push(l);
    }
    for (const p of flatParts) {
      const t = p.trim().replace(/\.$/, '');
      if (!t) continue;
      if (!degree && DEGREE_KW.test(t)) degree = t.slice(0, 100);
      else if (!school && SCHOOL_KW.test(t) && !DEGREE_KW.test(t)) school = t.slice(0, 100);
      else if (!note && /(?:cgpa|c\.?g\.?p\.?a|aggregate|percentage|\d\s*%)/i.test(t)) note = t.slice(0, 80);
    }
    if (!degree) degree = lines[0].slice(0, 100);
    if (!school) {
      const second = lines.find(l => l !== lines[0] && !ANY_YEAR.test(l.replace(DEGREE_KW, '')) );
      if (second && SCHOOL_KW.test(second)) school = second.slice(0, 100);
      else if (second && lines.length >= 2 && !DEGREE_KW.test(second)) school = second.slice(0, 100);
    }
    education.push({ degree, school, year, note, raw: block.join('\n').slice(0, 300) });
  }
  return education.filter(e => e.degree || e.school);
}

/** word-boundary skill match ("Java" must NOT match inside "JavaScript") */
function hasSkill(lowerText: string, skill: string): boolean {
  const s = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#.])${s}(?=$|[^a-z0-9+#])`, 'i').test(lowerText);
}

function parseSkills(contentLines: string[] | undefined, fullText: string): string[] {
  const COMMON_SKILLS = [
    'JavaScript', 'TypeScript', 'React', 'React Native', 'Node.js', 'Python', 'Java', 'SQL', 'AWS', 'Docker',
    'Kubernetes', 'Git', 'GitHub', 'HTML', 'CSS', 'SASS', 'Tailwind', 'Next.js', 'Angular', 'Vue', 'Express',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Firebase', 'Redis', 'GraphQL', 'REST API', 'CI/CD', 'Jenkins', 'Linux',
    'Figma', 'Photoshop', 'Illustrator', 'Excel', 'Power BI', 'Tableau', 'Pandas', 'NumPy', 'Machine Learning',
    'Deep Learning', 'Data Analysis', 'Data Science', 'TensorFlow', 'PyTorch', 'C++', 'C#', 'PHP', 'Laravel',
    'Spring Boot', 'Django', 'Flutter', 'Kotlin', 'Swift', 'Android', 'iOS', 'Scala', 'Go', 'Rust', 'Bash',
    'Communication', 'Leadership', 'Team Management', 'Problem Solving', 'Time Management', 'Critical Thinking',
    'Public Speaking', 'Negotiation', 'Decision Making', 'Adaptability', 'Teamwork', 'Attention to Detail',
    'SEO', 'Digital Marketing', 'Content Writing', 'Salesforce', 'SAP', 'Tally', 'Jira', 'Agile', 'Scrum',
  ];
  const STOP = new Set(['skills', 'skill', 'others', 'etc', 'tools', 'tool', 'and', 'or', 'the', 'of', 'in', 'languages', 'language', 'frameworks', 'framework', 'libraries', 'library', 'databases', 'database', 'technologies', 'technology', 'programming languages', 'web technologies', 'soft skills', 'core competencies', 'primary', 'secondary', 'proficient', 'proficiency', 'familiar', 'knowledge', 'working knowledge', 'excellent', 'good', 'basic', 'basics', 'beginner', 'intermediate', 'advanced', 'expert', 'level', 'competitive programming', 'operating systems', 'coursework', 'relevant coursework', 'interests', 'hobbies', 'strengths', 'areas of interest', 'domain', 'domains']);

  const found: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/^[•·|,\-–—:\s]+|[•·|,\s]+$/g, '').trim();
    if (t.length < 2 || t.length > 32) return;
    if (STOP.has(t.toLowerCase())) return;
    if (!/^[A-Za-z0-9 .+#/&'()\-.]+$/.test(t)) return;
    if (/^\d+$/.test(t)) return;
    const key = t.toLowerCase().replace(/s$/, '');
    if (seen.has(key)) return;
    seen.add(key);
    found.push(t);
  };

  const source = contentLines && contentLines.length ? contentLines : null;
  if (source) {
    for (const raw of source) {
      const l = stripBullet(raw);
      if (isJunk(l)) continue;
      if (/^[A-Za-z\s&/]+:\s*$/.test(l)) continue; // sub-headers like "Languages:"
      // split on separators, but keep "C++", "Node.js", "CI/CD" intact
      for (const part of l.split(/\s*[,;•·|]\s*|\s{3,}/)) {
        if (part.trim()) push(part);
      }
    }
    // add known skills that appear in the section text but weren't tokens
    const lower = source.join(' ').toLowerCase();
    for (const skill of COMMON_SKILLS) {
      if (found.length >= 25) break;
      if (hasSkill(lower, skill)) push(skill);
    }
  } else {
    const lower = fullText.toLowerCase();
    for (const skill of COMMON_SKILLS) {
      if (hasSkill(lower, skill)) found.push(skill);
    }
  }
  return found.slice(0, 25);
}

function parseProjects(contentLines: string[]): ParsedSections['projects'] {
  const projects: ParsedSections['projects'] = [];
  for (const block of toBlocks(contentLines).slice(0, 6)) {
    if (isJunk(block.join(' '))) continue;
    const lines = block.map(stripBullet).filter(l => l.length > 1 && !isJunk(l));
    if (!lines.length) continue;
    const blockText = lines.join('\n');
    let name = lines[0];
    const titleSep = name.match(/^(.{2,60}?)\s*(?:[:\u2013\u2014-]|\s\|\s)\s*(.+)$/);
    if (titleSep && !ANY_YEAR.test(titleSep[1])) name = titleSep[1];
    if (name.length > 80) name = name.slice(0, 80);
    const link = blockText.match(URL_REGEX)?.[0]?.replace(/[.,)]+$/, '') || '';
    const points = lines.slice(1).map(l => l.slice(0, 220)).slice(0, 6);
    projects.push({ name, link, points: points.join('\n'), raw: blockText.slice(0, 400) });
  }
  return projects;
}

function parseCerts(contentLines: string[]): ParsedSections['certs'] {
  const certs: ParsedSections['certs'] = [];
  for (const raw of contentLines.slice(0, 12)) {
    const l = stripBullet(raw);
    if (!l || isJunk(l) || l.length < 4) continue;
    if (/^[A-Za-z\s&/]+:\s*$/.test(l)) continue;
    const year = l.match(ANY_YEAR)?.[0] || '';
    let parts = l.split(/\s*\|\s*|\s+[–—]\s+|\s+-\s+/).map(p => p.trim()).filter(Boolean);
    if (parts.length < 2 && l.includes(',')) parts = l.split(',').map(p => p.trim());
    let name = l, issuer = '';
    if (parts.length >= 2) {
      // issuer = the SHORTEST part matching a known issuer ("Meta Front-End
      // Developer" also contains "meta" — shortest wins correctly)
      issuer = parts
        .filter(p => p.length <= 40 && ISSUER_KW.test(p) && !DEGREE_KW.test(p))
        .sort((a, b) => a.length - b.length)[0] || '';
      const rest = parts.filter(p => p !== issuer);
      name = rest.sort((a, b) => b.length - a.length)[0] || l;
    }
    name = name.replace(ANY_YEAR, '').replace(/[\s,|\-–—]+$/, '').trim().slice(0, 90);
    issuer = issuer.replace(ANY_YEAR, '').replace(/[\s,|\-–—]+$/, '').trim().slice(0, 60);
    certs.push({ name, issuer, year, raw: l.slice(0, 200) });
  }
  return certs;
}

function parseAchievements(contentLines: string[]): string[] {
  return contentLines
    .map(stripBullet)
    .filter(l => l.length > 8 && !isJunk(l) && !/^[A-Za-z\s&/]+:\s*$/.test(l))
    .map(l => l.slice(0, 220))
    .slice(0, 10);
}

function parseSummary(contentLines: string[] | undefined): string {
  if (!contentLines || !contentLines.length) return '';
  const txt = contentLines
    .map(stripBullet)
    .filter(l => l.length > 1 && !isJunk(l))
    .slice(0, 8)
    .join(' ');
  return txt.slice(0, 800).trim();
}

// ═════════════════════════════════════════════════════════════════════════════
// Top-level parse
// ═════════════════════════════════════════════════════════════════════════════

export function parseResumeText(rawText: string): ParsedSections {
  const text = sanitizeInput(rawText, 30000);
  const lines = splitLines(text);
  const contact = extractContactInfo(text);
  const sections = detectSections(lines);
  const contents = sectionContents(lines, sections);

  return {
    contact,
    summary: parseSummary(contents.summary),
    experience: parseExperience(contents.experience || []),
    education: parseEducation(contents.education || []),
    skills: parseSkills(contents.skills, text),
    projects: parseProjects(contents.projects || []),
    certs: parseCerts(contents.certifications || []),
    achievements: parseAchievements(contents.achievements || []),
    rawText: text,
  };
}

export function parsedToResume(parsed: ParsedSections, fieldId = 'it'): Resume {
  const resume = emptyResume();
  resume.fieldId = fieldId;
  resume.name = parsed.contact.name ? `${parsed.contact.name} — Resume` : 'Imported Resume';
  resume.personal = {
    fullName: parsed.contact.name || '',
    headline: '',
    email: parsed.contact.email || '',
    phone: parsed.contact.phone || '',
    city: parsed.contact.city || '',
    linkedin: parsed.contact.linkedin || '',
    website: parsed.contact.website || '',
    photo: '',
  };
  resume.summary = parsed.summary || '';
  resume.skills = [...parsed.skills];
  resume.achievements = [...parsed.achievements];
  resume.experience = parsed.experience.map(exp => ({
    id: uid(),
    role: (exp.role || '').slice(0, 100),
    company: (exp.company || '').slice(0, 100),
    location: (exp.location || '').slice(0, 60),
    start: (exp.start || '').slice(0, 20),
    end: (exp.end || '').slice(0, 20),
    current: !!exp.current,
    bullets: (exp.bullets || []).map(b => b.slice(0, 250)).filter(Boolean).slice(0, 8),
  }));
  resume.education = parsed.education.map(edu => ({
    id: uid(),
    degree: (edu.degree || '').slice(0, 100),
    school: (edu.school || '').slice(0, 100),
    location: '',
    year: (edu.year || '').slice(0, 30),
    note: (edu.note || '').slice(0, 80),
  }));
  resume.projects = parsed.projects.map(p => ({
    id: uid(),
    name: (p.name || '').slice(0, 80),
    link: (p.link || '').slice(0, 200),
    points: (p.points || '').slice(0, 1200),
  }));
  resume.certs = parsed.certs.map(c => ({
    id: uid(),
    name: (c.name || '').slice(0, 90),
    issuer: (c.issuer || '').slice(0, 60),
    year: (c.year || '').slice(0, 20),
  }));
  const firstRole = parsed.experience.find(e => e.role)?.role;
  if (firstRole) resume.personal.headline = firstRole.slice(0, 100);
  return resume;
}

export async function parseResumeFile(
  file: File,
  opts?: { onProgress?: (p: PdfProgress) => void; forceOcr?: boolean },
): Promise<ParseResumeResult> {
  const format = detectFormat(file);
  let meta: ParseMeta | undefined;
  try {
    let text = '';
    let resume: Resume | null = null;
    let parsed: ParsedSections | null = null;

    if (format === 'json') {
      const jsonResume = await extractFromJson(file);
      if (jsonResume) return { resume: jsonResume, parsed: null, text: JSON.stringify(jsonResume).slice(0, 1000), format };
      throw new Error('Invalid JSON resume format');
    }

    if (format === 'pdf') {
      const pdf = await extractPdfSmart(file, opts?.onProgress, opts?.forceOcr || false);
      text = pdf.text;
      meta = { method: pdf.method, pages: pdf.pages, textChars: pdf.textChars, ocrChars: pdf.ocrChars, warning: pdf.warning };
    } else if (format === 'txt') text = await extractFromTxt(file);
    else if (format === 'docx') text = await extractFromDocx(file);
    else throw new Error(`Unsupported format: ${file.name}. Please upload PDF, DOCX, TXT, or JSON.`);

    if (!text || text.trim().length < 20) {
      throw new Error(
        format === 'pdf'
          ? 'No readable text found in this PDF. If it is a scanned/photo PDF, OCR could not recover it — please upload a text-based PDF, DOCX or TXT.'
          : 'Could not extract text from file. The file may be corrupted. Please try another format or copy-paste manually.',
      );
    }

    parsed = parseResumeText(text);
    resume = parsedToResume(parsed);
    return { resume, parsed, text, format, meta };
  } catch (e: any) {
    return { resume: null, parsed: null, text: '', format, meta, error: e?.message || 'Failed to parse resume' };
  }
}

