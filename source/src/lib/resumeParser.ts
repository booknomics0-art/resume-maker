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

import { emptyResume, uid, type Resume, type ExperienceItem, type EducationItem, type ProjectItem, type CertItem, type LanguageItem } from './types';
import { sanitizeInput } from './security';
import { extractPdfSmart, type PdfProgress, type PdfExtractMethod, type PdfExtractResult } from './pdfExtract';
import { extractFromImage } from './imageExtract';
import type { OcrRunOptions } from './ocr';
import { repairOcrText } from './ocrText';
import { extractDocxText } from './docxExtract';
import { itemsToText } from './layoutText';

export { itemsToText };

export type SupportedFormat = 'pdf' | 'docx' | 'txt' | 'json' | 'image' | 'unknown';

/** Extra info about HOW the file was parsed (shown in the review UI). */
export interface ParseMeta {
  method?: PdfExtractMethod;
  pages?: number;
  textChars?: number;
  ocrChars?: number;
  /** Average Tesseract confidence on OCR pages (0-100). */
  ocrConfidence?: number;
  /** How many pages needed OCR. */
  ocrPages?: number;
  /** OCR took this long (ms) — useful when explaining why the import is slow. */
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
  if (/^image\//.test(type) || /\.(jpe?g|png|webp|bmp|gif|avif)$/.test(name)) return 'image';
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
  const buf = await file.arrayBuffer();
  try {
    const unzipped = await extractDocxText(buf);
    if (unzipped && unzipped.replace(/\s/g, '').length > 20) return unzipped;
  } catch {
    /* fall through to the raw-byte scan for uncompressed / odd files */
  }
  const raw = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buf));
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const paragraphs = raw.split(/<\/w:p>/g);
  const outLines: string[] = [];
  for (const para of paragraphs) {
    const fragments: string[] = [];
    let m: RegExpExecArray | null;
    textRegex.lastIndex = 0;
    while ((m = textRegex.exec(para)) !== null) fragments.push(m[1]);
    if (fragments.length) outLines.push(fragments.join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  }
  if (outLines.length > 0) return outLines.join('\n');
  const readable = raw.match(/[A-Za-z][A-Za-z0-9\s@.,\-_\/():]{10,}/g) || [];
  const cleaned = readable.filter(s => s.trim().length > 10).join(' ');
  return cleaned || `DOCX extraction limited. File: ${file.name}. Please copy-paste content manually.`;
}

// ═════════════════════════════════════════════════════════════════════════════
// Regexes & constants
// ═════════════════════════════════════════════════════════════════════════════

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[a-zA-Z0-9\-_%]+/gi;
const GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+/gi;
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s]+|(?<![\w@.\-])[a-zA-Z0-9\-]+\.(?:com|dev|io|in|co|org|net|ai|me)(?:\/[^\s]*)?/gi;

const MONTHS_P = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
// Full month names, 01/2020, 2020/01, "January 2022 – Present", "since 2019".
const DATE_RANGE = /((?:since|from)\s+(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*,?\s*'?(?:(?:19|20)\d{2}|\d{2})|\d{1,2}[\/\-.]\d{4}|(?:19|20)\d{2})|(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*,?\s*'?(?:(?:19|20)\d{2}|\d{2})|\d{1,2}[\/\-.]\d{4}|(?:19|20)\d{2}[\/\-.]\d{1,2}|(?:19|20)\d{2})\s*(?:-|–|—|\bto\b|\buntil\b|\bthrough\b)\s*(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*,?\s*'?(?:(?:19|20)\d{2}|\d{2})|\d{1,2}[\/\-.]\d{4}|(?:19|20)\d{2}[\/\-.]\d{1,2}|(?:19|20)\d{2}|present|current|now|ongoing|till\s+date|to\s+date))/i;
const ANY_YEAR = /\b(?:19|20)\d{2}\b/;

const BULLET_PREFIX = /^\s*(?:[•▪◦‣·∙*o+)\-–—]|\d{1,2}[.)])\s+/;
const SECTION_LINE_MAX = 50;

const DEGREE_KW = /(b\.?\s?tech|b\.?\s?e\b|m\.?\s?tech|m\.?\s?e\b|bachelor|master|m\.?\s?ba\b|b\.?\s?ba\b|b\.?\s?ca\b|m\.?\s?ca\b|b\.?\s?sc\b|m\.?\s?sc\b|b\.?\s?com\b|m\.?\s?com\b|b\.?\s?a\b|m\.?\s?a\b|pgdm|pg\s?diploma|diploma|high school|higher secondary|senior secondary|secondary school|class\s*(?:x{1,3}|ix|viii|1[012]?)|(?:10|12)th|hsc|ssc|cbse|icse|ib\b|ph\.?\s?d|doctorate|post\s?graduat|under\s?graduat|graduat(?:ion|e)|intermediate|matriculation|mbbs|bds|b\.?\s?pharm|ll\.?\s?b|ll\.?\s?m|b\.?\s?ed|m\.?\s?ed|b\.?\s?arch|associate(?:'s)?\s?degree)/i;
const SCHOOL_KW = /(college|university|institute|school|academy|polytechnic|vidyalay|iit|nit|iiit|bits\b|board|campus)/i;
const ISSUER_KW = /(coursera|udemy|google|aws|amazon|microsoft|ibm|meta|nptel|hackerrank|hackerearth|cisco|oracle|linkedin|infosys|tcs|wiley|springboard|great learning|simplilearn|upgrad|freecodecamp|kaggle|nvidia|deep ?learning\.?ai|stanford|iit|nit|hubspot)/i;
const CITIES = ['new delhi', 'navi mumbai', 'greater noida', 'bengaluru', 'bangalore', 'hyderabad', 'secunderabad', 'chandigarh', 'ahmedabad', 'kolkata', 'chennai', 'mumbai', 'delhi', 'gurugram', 'gurgaon', 'noida', 'pune', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'patna', 'vadodara', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'varanasi', 'srinagar', 'ranchi', 'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota', 'guwahati', 'mysuru', 'mysore', 'kochi', 'thiruvananthapuram', 'trivandrum', 'surat', 'bhubaneswar', 'dehradun', 'mangaluru', 'mangalore', 'visakhapatnam', 'allahabad', 'prayagraj', 'warangal', 'hubli', 'calicut', 'kozhikode', 'london', 'dubai', 'singapore', 'toronto', 'sydney', 'melbourne', 'new york', 'san francisco', 'seattle', 'austin', 'boston', 'chicago'];
const CITY_RE = new RegExp(`\\b(${CITIES.join('|')})\\b`, 'i');

const HEADER_KEYWORDS: Array<{ type: SectionType; kws: string[] }> = [
  { type: 'experience', kws: ['professional experience', 'work experience', 'employment history', 'work history', 'career history', 'relevant experience', 'industry experience', 'internship experience', 'positions of responsibility', 'positions held', 'industrial training', 'internships', 'internship', 'professional background', 'work exp', 'employment', 'experience'] },
  { type: 'education', kws: ['educational qualifications', 'educational qualification', 'educational background', 'academic qualifications', 'academic qualification', 'academic background', 'academic profile', 'educational details', 'academic details', 'scholastic record', 'education', 'academics', 'qualification', 'qualifications'] },
  { type: 'skills', kws: ['technical proficiencies', 'technical skills', 'technical expertise', 'core competencies', 'areas of expertise', 'professional skills', 'tools & technologies', 'tools and technologies', 'computer skills', 'software skills', 'key skills', 'core skills', 'it skills', 'skills & tools', 'skill set', 'tech stack', 'skills', 'technologies', 'competencies', 'expertise', 'proficiencies', 'strengths'] },
  { type: 'summary', kws: ['professional summary', 'career objective', 'career summary', 'executive summary', 'profile summary', 'personal profile', 'professional profile', 'personal statement', 'about me', 'summary', 'objective', 'profile', 'overview', 'about'] },
  { type: 'projects', kws: ['personal projects', 'academic projects', 'key projects', 'selected projects', 'notable projects', 'project work', 'projects', 'portfolio'] },
  { type: 'certifications', kws: ['certifications & training', 'licenses & certifications', 'courses & certifications', 'professional development', 'certifications', 'certification', 'certificates', 'licenses', 'training'] },
  { type: 'achievements', kws: ['awards & honors', 'awards and honours', 'extra curricular activities', 'extra-curricular activities', 'co-curricular activities', 'extra-curricular', 'extracurricular', 'achievements', 'achievement', 'accomplishments', 'awards', 'honors', 'honours', 'publications', 'volunteer work', 'volunteering'] },
  { type: 'languages', kws: ['languages known', 'language proficiency', 'known languages', 'languages', 'language'] },
  { type: 'hobbies', kws: ['hobbies & interests', 'hobbies and interests', 'areas of interest', 'personal interests', 'hobbies', 'interests'] },
  { type: 'contact', kws: ['contact information', 'contact details', 'personal details', 'personal information', 'contact info', 'contact'] },
];
const HEADER_NOT_TAIL = /\b(with|using|for|in|to|the|built|building|developed|worked|working|helped|led|managed|created|designed|from|by|at|on|my|our|include|includes|including|across|during)\b/i;

type SectionType = 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'achievements' | 'languages' | 'hobbies' | 'contact';

export interface ParsedSections {
  contact: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    linkedin?: string;
    website?: string;
  };
  headline?: string;
  summary?: string;
  experience: Array<Partial<ExperienceItem> & { raw: string }>;
  education: Array<Partial<EducationItem> & { raw: string }>;
  skills: string[];
  projects: Array<Partial<ProjectItem> & { raw: string }>;
  certs: Array<Partial<CertItem> & { raw: string }>;
  achievements: string[];
  languages: Array<Partial<LanguageItem>>;
  hobbies: string[];
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
  const numeric = s.match(/\b(\d{1,2})[\/\-.]((?:19|20)\d{2})\b/);
  if (numeric) {
    const mi = Number(numeric[1]);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (mi >= 1 && mi <= 12) return `${months[mi - 1]} ${numeric[2]}`;
  }
  const ym = s.match(/\b((?:19|20)\d{2})[\/\-.](\d{1,2})\b/);
  if (ym) {
    const mi = Number(ym[2]);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (mi >= 1 && mi <= 12) return `${months[mi - 1]} ${ym[1]}`;
  }
  const yy = s.match(ANY_YEAR);
  if (yy) return yy[0];
  return s.slice(0, 20);
}

function parseDateRange(raw: string): { start: string; end: string; current: boolean } {
  const s = raw.replace(/[–—]/g, '-').replace(/^\s*(?:since|from)\s+/i, '').trim();
  const parts = s.split(/\s*(?:-|\bto\b|\buntil\b|\bthrough\b)\s*/i).filter(Boolean);
  if (parts.length < 2) {
    const d = normalizeDate(s);
    return { start: d, end: /present|current/i.test(s) ? 'Present' : '', current: /present|current/i.test(s) };
  }
  const start = normalizeDate(parts[0]);
  const end = normalizeDate(parts[1]);
  const current = /present|current|now|ongoing|till|to date|^date$/i.test(parts[1]);
  return { start, end: current ? 'Present' : end, current };
}

// ═════════════════════════════════════════════════════════════════════════════
// Section detection (line-aware — a header must look like a header)
// ═════════════════════════════════════════════════════════════════════════════

function normalizeHeader(line: string): string {
  return line
    .toLowerCase()
    .replace(/^[\s•▪◦‣·*\-–—>#(\[\]|*=~_]+/, '')
    .replace(/^(?:\d{1,2}|[ivx]{1,5})[.)\-:\s]+/, '')
    .replace(/[\s:：\-–—|*=~_]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectSections(lines: string[]): Array<{ type: SectionType; lineIdx: number }> {
  const found: Array<{ type: SectionType; lineIdx: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || raw.length > 64 || isBullet(raw)) continue;
    const norm = normalizeHeader(raw);
    if (!norm || norm.length < 3 || norm.length > 48) continue;
    if (/@|\d{5,}/.test(norm) || /[.!?]/.test(norm)) continue;
    if (norm.split(/\s+/).length > 6) continue;
    let best: { type: SectionType; kwLen: number } | null = null;
    for (const { type, kws } of HEADER_KEYWORDS) {
      for (const kw of kws) {
        if (norm === kw) {
          if (!best || kw.length > best.kwLen) best = { type, kwLen: kw.length };
          continue;
        }
        if (norm.startsWith(kw + ' ') || norm.startsWith(kw + '&') || norm.startsWith(kw + '/')) {
          const rest = norm.slice(kw.length).trim();
          if (rest.length > 32 || rest.split(/\s+/).length > 4) continue;
          if (HEADER_NOT_TAIL.test(rest)) continue;
          if (!best || kw.length > best.kwLen) best = { type, kwLen: kw.length };
        }
      }
    }
    if (best) found.push({ type: best.type, lineIdx: i });
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
    const chunk = lines.slice(sec.lineIdx + 1, end);
    // Same heading can appear twice (jobs + internships). Keep both.
    out[sec.type] = (out[sec.type] || []).concat(chunk);
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

  const githubs = text.match(GITHUB_REGEX);
  const urls = (text.match(URL_REGEX) || [])
    .map(u => u.replace(/[.,;)]+$/, ''))
    .filter(u => !u.includes('@'))
    .filter(u => !/linkedin/i.test(u))
    .filter(u => !/^(?:gmail|yahoo|outlook|hotmail|rediffmail|icloud|live|proton)\./i.test(u.replace(/^https?:\/\//i, '').replace(/^www\./i, '')));
  const portfolio = urls.find(u => !/github\.com/i.test(u) && !/\.(png|jpe?g|pdf|css|js)$/i.test(u));
  if (portfolio) contact.website = portfolio;
  else if (githubs && githubs.length) contact.website = githubs[0].replace(/^https?:\/\//i, '').replace(/^www\./i, '');

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
  if (!contact.city) {
    const head = lines.slice(0, 12).join(' \n ');
    const hit = head.match(CITY_RE);
    if (hit) {
      const canon = CITIES.find(c => c.toLowerCase() === hit[1].toLowerCase()) || hit[1];
      contact.city = canon.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
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

    // header = leading non-bullet lines (with the date removed). Anything after
    // the role/company lines is a description — keep it, even without a bullet.
    let i = 0;
    const header: string[] = [];
    const desc: string[] = [];
    while (i < block.length && !isBullet(block[i]) && header.length < 2) {
      const cleaned = block[i].replace(DATE_RANGE, '').replace(/[\s|,·•–—\-]+$/g, '').trim();
      if (cleaned && !/^(?:present|current|now|ongoing|till\s+date|to\s+date)$/i.test(cleaned)) header.push(cleaned);
      i++;
    }
    while (i < block.length && !isBullet(block[i])) {
      const cleaned = block[i].replace(DATE_RANGE, '').replace(/[\s|,·•–—\-]+$/g, '').trim();
      if (cleaned && cleaned.length > 2 && !isJunk(cleaned)) desc.push(cleaned);
      i++;
    }
    const bullets = [...desc, ...block.slice(i).map(stripBullet).filter(l => l.length > 2 && !isJunk(l))].slice(0, 12);

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
      bullets: bullets.map(b => b.slice(0, 400)),
      raw: blockText.slice(0, 800),
    });
    if (experience.length >= 16) break;
  }
  return stitchJobs(experience);
}

/** A blank line sometimes splits a role from its dates or its bullets. Glue those back. */
function stitchJobs(jobs: ParsedSections['experience']): ParsedSections['experience'] {
  const out: ParsedSections['experience'] = [];
  for (const job of jobs) {
    const prev = out[out.length - 1];
    if (prev && !job.role && !job.company && (job.bullets?.length || job.start)) {
      if (!prev.start && job.start) prev.start = job.start;
      if (!prev.end && job.end) prev.end = job.end;
      if (job.current) prev.current = true;
      prev.bullets = [...(prev.bullets || []), ...(job.bullets || [])].slice(0, 12);
      continue;
    }
    if (prev && job.role && !job.start && !prev.role && prev.start) {
      prev.role = job.role;
      prev.company = job.company || prev.company;
      prev.location = job.location || prev.location;
      prev.bullets = [...(job.bullets || []), ...(prev.bullets || [])].slice(0, 12);
      continue;
    }
    out.push(job);
  }
  return out;
}

function parseEducation(contentLines: string[]): ParsedSections['education'] {
  const education: ParsedSections['education'] = [];
  for (const block of toBlocks(contentLines).slice(0, 10)) {
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
    let location = '';
    const cityHit = blockText.match(CITY_RE);
    if (cityHit) {
      location = cityHit[1].split(/\s+/).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    education.push({ degree, school, location, year, note, raw: block.join('\n').slice(0, 400) });
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
    if (t.length < 2 || t.length > 42) return;
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
  return found.slice(0, 40);
}

function parseProjects(contentLines: string[]): ParsedSections['projects'] {
  const projects: ParsedSections['projects'] = [];
  for (const block of toBlocks(contentLines).slice(0, 10)) {
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
  for (const raw of contentLines.slice(0, 20)) {
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
    .slice(0, 16);
}

const LEVEL_WORDS = /(native|fluent|proficient|professional|conversational|intermediate|beginner|basic|advanced|excellent|mother tongue|bilingual|full professional|limited working|elementary)/i;

/** "English (Fluent), Hindi - Native, Marathi" → structured list */
function parseLanguages(contentLines: string[] | undefined): Array<Partial<LanguageItem>> {
  if (!contentLines || !contentLines.length) return [];
  const out: Array<Partial<LanguageItem>> = [];
  const seen = new Set<string>();
  for (const raw of contentLines.slice(0, 12)) {
    const line = stripBullet(raw);
    if (!line || isJunk(line) || !/[A-Za-z]{3}/.test(line)) continue;
    for (const part of line.split(/\s*[,;•·|]\s*/)) {
      const t = part.replace(/[.:]+$/, '').trim();
      if (!t || t.length < 3 || t.length > 40) continue;
      const m = t.match(/^([A-Za-z][A-Za-z\s'()-]{2,28}?)\s*[(:\-–—]\s*([A-Za-z][A-Za-z\s]{2,28})?\)?$/);
      const name = (m ? m[1] : t).replace(/\s+/g, ' ').trim();
      const level = m && m[2] && LEVEL_WORDS.test(m[2]) ? m[2].trim() : (LEVEL_WORDS.test(t) ? (t.match(LEVEL_WORDS)?.[0] ?? '') : '');
      if (!name || !/^[A-Za-z]/.test(name)) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: name.slice(0, 40), level: level ? level[0].toUpperCase() + level.slice(1).toLowerCase() : '' });
    }
  }
  return out.slice(0, 10);
}

/** Hobbies / interests — short comma or bullet separated items. */
function parseHobbies(contentLines: string[] | undefined): string[] {
  if (!contentLines || !contentLines.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of contentLines.slice(0, 10)) {
    const line = stripBullet(raw);
    if (!line || isJunk(line)) continue;
    for (const part of line.split(/\s*[,;•·|]\s*/)) {
      const t = part.replace(/^[\-–—\s]+|[\s.]+$/g, '').trim();
      if (t.length < 3 || t.length > 40 || !/[A-Za-z]{3}/.test(t)) continue;
      if (/\d{4}/.test(t)) continue; // dates leak in from neighbouring sections
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  }
  return out.slice(0, 16);
}

function parseSummary(contentLines: string[] | undefined): string {
  if (!contentLines || !contentLines.length) return '';
  const txt = contentLines
    .map(stripBullet)
    .filter(l => l.length > 1 && !isJunk(l))
    .slice(0, 12)
    .join(' ');
  return txt.slice(0, 1800).trim();
}

/**
 * The line under the name is almost always the target role ("Software
 * Developer"). Prefer it over inferring the headline from the last job title —
 * it is what the candidate wants to be hired as.
 */
function findHeadline(text: string, name?: string): string {
  const lines = splitLines(text).map(l => l.trim()).filter(l => !isJunk(l));
  let start = 0;
  if (name) {
    const idx = lines.findIndex(l => l.toLowerCase() === name.toLowerCase());
    if (idx >= 0) start = idx + 1;
  }
  for (let i = start; i < Math.min(start + 5, lines.length); i++) {
    const raw = lines[i];
    if (!raw || raw.length > 60) continue;
    if (/@|https?:|www\.|\d{4}|\d{6}/.test(raw)) continue;
    const cleaned = raw.replace(/^[|•·\-–—\s]+|[|•·\-–—\s]+$/g, '').trim();
    if (!cleaned || cleaned.length < 3) continue;
    if (HEADER_WORD.test(cleaned) && !HEADLINE_WORDS.test(cleaned)) continue;
    if (DEGREE_KW.test(cleaned)) continue;
    if (cleaned.split(/\s+/).length > 6) continue;
    if (HEADLINE_WORDS.test(cleaned)) return cleaned.slice(0, 100);
  }
  return '';
}

// ═════════════════════════════════════════════════════════════════════════════
// Top-level parse
// ═════════════════════════════════════════════════════════════════════════════

const EXTRA_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'React Native', 'Node.js', 'Python', 'Java', 'SQL', 'AWS', 'Azure', 'GCP', 'Docker',
  'Kubernetes', 'Git', 'HTML', 'CSS', 'Tailwind', 'Next.js', 'Angular', 'Vue', 'Express', 'MongoDB', 'PostgreSQL', 'MySQL',
  'Firebase', 'Redis', 'GraphQL', 'REST API', 'CI/CD', 'Jenkins', 'Linux', 'Figma', 'Photoshop', 'Illustrator', 'Excel',
  'Power BI', 'Tableau', 'Pandas', 'NumPy', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'C++', 'C#',
  'PHP', 'Laravel', 'Spring Boot', 'Django', 'Flutter', 'Kotlin', 'Swift', 'Android', 'iOS', 'Go', 'Rust', 'Bash',
  'Communication', 'Leadership', 'Problem Solving', 'Decision Making', 'Teamwork', 'SEO', 'Digital Marketing',
  'Google Ads', 'Meta Ads', 'Content Writing', 'Salesforce', 'SAP', 'Tally', 'Jira', 'Agile', 'Scrum', 'Canva',
  'Google Analytics', 'AutoCAD', 'MATLAB', 'Selenium', 'Cypress', 'Redux', 'Bootstrap', 'jQuery', 'Microservices',
  'Kafka', 'Spark', 'Hadoop', 'Terraform', 'Ansible', 'MS Office', 'PowerPoint', 'Word', 'Outlook', 'HubSpot',
];

const KNOWN_LANGS = ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Odia', 'French', 'German', 'Spanish', 'Arabic', 'Mandarin', 'Chinese', 'Japanese', 'Korean', 'Sanskrit', 'Konkani', 'Nepali'];

function pushUnique(list: string[], value: string, max = 40, maxLen = 42) {
  const t = value.trim().replace(/^[-–—•·\s]+|[\s.]+$/g, '');
  if (t.length < 2 || t.length > maxLen) return;
  if (list.some(x => x.toLowerCase() === t.toLowerCase())) return;
  if (list.length >= max) return;
  list.push(t);
}

function sameJob(a: Partial<ExperienceItem>, b: Partial<ExperienceItem>): boolean {
  const as = (a.start || '').toLowerCase();
  const bs = (b.start || '').toLowerCase();
  if (as && bs && as === bs) return true;
  const ac = `${a.role || ''} ${a.company || ''}`.toLowerCase();
  const bc = `${b.role || ''} ${b.company || ''}`.toLowerCase();
  if (ac.trim().length > 6 && bc.trim().length > 6 && (ac.includes(bc.slice(0, 12)) || bc.includes(ac.slice(0, 12)))) return true;
  return false;
}

function consumedLine(line: string, blob: string): boolean {
  const words = line.toLowerCase().split(/[^a-z0-9+#.]/).filter(w => w.length > 2);
  if (!words.length) return true;
  const hit = words.filter(w => blob.includes(w)).length;
  return hit / words.length >= 0.55;
}

/** Second pass: headers are optional. Anything the first pass missed still lands in a field. */
function deepenParse(text: string, parsed: ParsedSections): ParsedSections {
  const lines = splitLines(text).map(l => l.trim()).filter(l => l.length > 0);
  const out: ParsedSections = {
    ...parsed,
    contact: { ...parsed.contact },
    skills: [...parsed.skills],
    experience: parsed.experience.map(e => ({ ...e, bullets: [...(e.bullets || [])] })),
    education: [...parsed.education],
    projects: [...parsed.projects],
    certs: [...parsed.certs],
    achievements: [...parsed.achievements],
    languages: [...(parsed.languages || [])],
    hobbies: [...(parsed.hobbies || [])],
  };

  for (const line of lines) {
    const inline = line.match(/^(skills?|technical skills|tools|expertise|languages?(?:\s+known)?|hobbies(?:\s+and\s+interests)?|interests)\s*[:\-–]\s*(.+)$/i);
    if (!inline) continue;
    const kind = inline[1].toLowerCase();
    const rest = inline[2];
    if (/skill|tool|expertise/.test(kind)) {
      for (const part of rest.split(/\s*[,;|•·]\s*/)) pushUnique(out.skills, part);
    } else if (kind.startsWith('lang')) {
      for (const part of rest.split(/\s*[,;|•·]\s*/)) {
        const name = part.replace(/\([^)]*\)/g, '').replace(/[-–:].*$/, '').trim();
        const level = (part.match(LEVEL_WORDS)?.[0] || '').trim();
        if (name && !out.languages.some(l => (l.name || '').toLowerCase() === name.toLowerCase())) {
          out.languages.push({ name: name.slice(0, 40), level });
        }
      }
    } else {
      for (const part of rest.split(/\s*[,;|•·]\s*/)) pushUnique(out.hobbies, part, 16, 40);
    }
  }

  if (out.skills.length < 12) {
    for (const line of lines) {
      if (DATE_RANGE.test(line) || /@|\d{5,}/.test(line)) continue;
      if (line.length > 180) continue;
      const parts = line.split(/\s*[,;|•·]\s*/).map(s => s.trim()).filter(Boolean);
      if (parts.length < 3 || parts.length > 14) continue;
      if (parts.some(p => p.length > 36 || p.split(/\s+/).length > 4 || /\d{3,}/.test(p))) continue;
      if (parts.filter(p => /[A-Za-z]{2}/.test(p)).length < 3) continue;
      for (const part of parts) pushUnique(out.skills, part);
    }
  }
  const lower = text.toLowerCase();
  for (const skill of EXTRA_SKILLS) {
    if (out.skills.length >= 40) break;
    if (hasSkill(lower, skill)) pushUnique(out.skills, skill);
  }

  const dateIdx: number[] = [];
  lines.forEach((l, i) => { if (DATE_RANGE.test(l)) dateIdx.push(i); });
  for (const i of dateIdx) {
    if (out.experience.length >= 16) break;
    const block: string[] = [];
    for (let j = i - 1; j >= Math.max(0, i - 2); j--) {
      if (!lines[j] || isBullet(lines[j]) || DATE_RANGE.test(lines[j]) || lines[j].length > 90) break;
      if (detectSections([lines[j]]).length) break;
      block.unshift(lines[j]);
    }
    block.push(lines[i]);
    for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
      if (DATE_RANGE.test(lines[j]) && !isBullet(lines[j])) break;
      if (detectSections([lines[j]]).length) break;
      block.push(lines[j]);
    }
    const joined = block.join(' ');
    if (DEGREE_KW.test(joined) && !HEADLINE_WORDS.test(joined)) continue;
    const jobs = parseExperience(block);
    for (const job of jobs) {
      if (!job.role && !(job.bullets || []).length) continue;
      if (out.experience.some(e => sameJob(e, job))) continue;
      out.experience.push(job);
    }
  }

  if (!out.education.length) {
    const eduLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (!DEGREE_KW.test(lines[i]) || lines[i].length > 160) continue;
      eduLines.push(lines[i]);
      const next = lines[i + 1];
      if (next && next.length < 140 && (SCHOOL_KW.test(next) || ANY_YEAR.test(next) || DEGREE_KW.test(next))) eduLines.push(next);
      eduLines.push('');
    }
    if (eduLines.length) out.education = parseEducation(eduLines);
  }

  if (!out.languages.length) {
    for (const line of lines) {
      const hits = KNOWN_LANGS.filter(name => new RegExp(`\\b${name}\\b`, 'i').test(line));
      if (hits.length < 2) continue;
      for (const name of hits) {
        if (!out.languages.some(l => (l.name || '').toLowerCase() === name.toLowerCase())) {
          out.languages.push({ name, level: '' });
        }
      }
      break;
    }
  }

  if (!out.summary || out.summary.trim().length < 40) {
    const buf: string[] = [];
    for (const l of lines) {
      if (detectSections([l]).length) { if (buf.length) break; continue; }
      if (out.contact.name && l.toLowerCase() === out.contact.name.toLowerCase()) continue;
      if (isNameLine(l.replace(/^(?:mr|mrs|ms|dr)\.?\s+/i, ''))) continue;
      if (/@|linkedin|github/i.test(l) && l.length < 100) continue;
      if (HEADLINE_WORDS.test(l) && l.length < 60 && l.split(/\s+/).length <= 6 && !/[.!?]$/.test(l)) continue;
      if (l.length < 28) continue;
      buf.push(stripBullet(l));
      if (buf.join(' ').length > 120) break;
    }
    const para = buf.join(' ').slice(0, 1800).trim();
    if (para.length >= 40) out.summary = para;
  }

  const blob = JSON.stringify(out).toLowerCase();
  for (const line of lines) {
    if (out.achievements.length >= 16) break;
    const l = stripBullet(line);
    if (l.length < 18 || l.length > 240) continue;
    if (isJunk(l) || detectSections([line]).length) continue;
    if (/@|https?:|linkedin\.com|github\.com/i.test(l) && l.length < 90) continue;
    if (consumedLine(l, blob)) continue;
    out.achievements.push(l.slice(0, 300));
  }

  if ((!out.summary || out.summary.length < 20) && text.trim().length > 40) {
    out.summary = lines.filter(l => l.length > 12).slice(0, 8).join(' ').slice(0, 1800);
  }
  return out;
}

export function parseResumeText(rawText: string, opts?: { ocr?: boolean }): ParsedSections {
  // OCR output needs its spacing/typo artefacts repaired before section
  // detection — otherwise "Node . js" and "Work Experience" (merged into the
  // line above) never match a real keyword.
  const text = sanitizeInput(opts?.ocr ? repairOcrText(rawText) : rawText, 30000);
  const lines = splitLines(text);
  const contact = extractContactInfo(text);
  const sections = detectSections(lines);
  const contents = sectionContents(lines, sections);

  return deepenParse(text, {
    contact,
    headline: findHeadline(text, contact.name),
    summary: parseSummary(contents.summary),
    experience: parseExperience(contents.experience || []),
    education: parseEducation(contents.education || []),
    skills: parseSkills(contents.skills, text),
    projects: parseProjects(contents.projects || []),
    certs: parseCerts(contents.certifications || []),
    achievements: parseAchievements(contents.achievements || []),
    languages: parseLanguages(contents.languages),
    hobbies: parseHobbies(contents.hobbies),
    rawText: text,
  });
}

export function parsedToResume(parsed: ParsedSections, fieldId?: string): Resume {
  const resume = emptyResume();
  resume.fieldId = fieldId || inferFieldId(`${parsed.headline || ''}\n${parsed.rawText}`);
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
  if (parsed.headline) resume.personal.headline = parsed.headline.slice(0, 100);
  resume.summary = parsed.summary || '';
  resume.skills = [...parsed.skills];
  resume.achievements = [...parsed.achievements];
  resume.hobbies = [...(parsed.hobbies || [])];
  resume.languages = (parsed.languages || []).map(l => ({
    id: uid(),
    name: (l.name || '').slice(0, 40),
    level: (l.level || '').slice(0, 40),
  })).filter(l => l.name);
  resume.experience = parsed.experience.map(exp => ({
    id: uid(),
    role: (exp.role || '').slice(0, 100),
    company: (exp.company || '').slice(0, 100),
    location: (exp.location || '').slice(0, 60),
    start: (exp.start || '').slice(0, 20),
    end: (exp.end || '').slice(0, 20),
    current: !!exp.current,
    bullets: (exp.bullets || []).map(b => b.slice(0, 400)).filter(Boolean).slice(0, 12),
  }));
  resume.education = parsed.education.map(edu => ({
    id: uid(),
    degree: (edu.degree || '').slice(0, 100),
    school: (edu.school || '').slice(0, 100),
    location: (edu.location || '').slice(0, 60),
    year: (edu.year || '').slice(0, 30),
    note: (edu.note || '').slice(0, 160),
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
  if (!resume.personal.headline) {
    const firstRole = parsed.experience.find(e => e.role)?.role;
    if (firstRole) resume.personal.headline = firstRole.slice(0, 100);
  }
  if (!resume.bestExperience) {
    const quantified = resume.experience.flatMap(e => e.bullets).find(b => /\d/.test(b) && b.length > 28);
    resume.bestExperience = (resume.achievements.find(a => a.length > 20) || quantified || '').slice(0, 500);
  }
  return resume;
}

function inferFieldId(text: string): string {
  const blob = text.toLowerCase();
  const hints: Array<[string, RegExp]> = [
    ['data', /\b(data scientist|data analyst|machine learning|power bi|tableau|data engineer|pandas|tensorflow)\b/g],
    ['marketing', /\b(seo|google ads|meta ads|digital marketing|content market|social media|brand manager)\b/g],
    ['sales', /\b(sales executive|business development|account manager|inside sales|quota)\b/g],
    ['finance', /\b(chartered accountant|financial analyst|tally|gst\b|audit|bookkeep|accounts executive)\b/g],
    ['hr', /\b(human resource|talent acquisition|recruiter|payroll|hr executive|hr manager)\b/g],
    ['design', /\b(ui\/ux|graphic designer|illustrator|visual designer|product designer)\b/g],
    ['healthcare', /\b(nurse|mbbs|pharmacist|clinical|patient care|hospital)\b/g],
    ['education', /\b(teacher|professor|curriculum|classroom|academic coordinator)\b/g],
    ['operations', /\b(operations executive|supply chain|procurement|logistics|warehouse)\b/g],
    ['it', /\b(developer|software engineer|frontend|backend|full stack|devops|programmer|react|node\.?js|python)\b/g],
  ];
  let best = 'it';
  let bestN = 0;
  for (const [id, re] of hints) {
    const n = blob.match(re)?.length || 0;
    if (n > bestN) { best = id; bestN = n; }
  }
  return best;
}

export interface ParseFileOptions {
  onProgress?: (p: PdfProgress) => void;
  /** Skip the PDF text layer and OCR every page (used by "Re-run with OCR"). */
  forceOcr?: boolean;
  /** OCR tweaks (tests inject a canvas-free image encoder + local model). */
  ocr?: OcrRunOptions;
  /** Test hook: replace the PDF page rasteriser. */
  renderPage?: (page: any, num: number) => Promise<any>;
}

export async function parseResumeFile(
  file: File,
  opts?: ParseFileOptions,
): Promise<ParseResumeResult> {
  const format = detectFormat(file);
  let meta: ParseMeta | undefined;
  let usedOcr = false;
  try {
    let text = '';
    let resume: Resume | null = null;
    let parsed: ParsedSections | null = null;

    if (format === 'json') {
      const jsonResume = await extractFromJson(file);
      if (jsonResume) return { resume: jsonResume, parsed: null, text: JSON.stringify(jsonResume).slice(0, 1000), format };
      throw new Error('Invalid JSON resume format');
    }

    let photoDataUrl = '';
    if (format === 'pdf') {
      const pdf = await extractPdfSmart(file, opts?.onProgress, {
        forceOcr: opts?.forceOcr,
        renderPage: opts?.renderPage,
        ocr: opts?.ocr,
      });
      text = pdf.text;
      usedOcr = pdf.ocrPages > 0;
      photoDataUrl = pdf.photoDataUrl || '';
      meta = {
        method: pdf.method,
        pages: pdf.pages,
        textChars: pdf.textChars,
        ocrChars: pdf.ocrChars,
        ocrConfidence: pdf.ocrConfidence,
        ocrPages: pdf.ocrPages,
        warning: pdf.warning,
      };
    } else if (format === 'image') {
      const img = await extractFromImage(file, opts?.onProgress);
      text = img.text;
      usedOcr = true;
      meta = { method: 'ocr', textChars: 0, ocrChars: img.imageChars, ocrConfidence: img.confidence, ocrPages: 1, warning: img.warning };
    } else if (format === 'txt') text = await extractFromTxt(file);
    else if (format === 'docx') text = await extractFromDocx(file);
    else throw new Error(`Unsupported format: ${file.name}. Please upload PDF, DOCX, TXT, JPG, PNG or JSON.`);

    if (!text || text.trim().length < 20) {
      throw new Error(
        format === 'pdf'
          ? 'No readable text found in this PDF — it looks like a scanned image with too little detail to read. Re-scan at 300 DPI, upload a photo (JPG/PNG) instead, or use a text-based PDF/DOCX/TXT.'
          : 'Could not extract text from file. The file may be corrupted. Please try another format or copy-paste manually.',
      );
    }

    parsed = parseResumeText(text, { ocr: usedOcr || format === 'image' });
    resume = parsedToResume(parsed);
    if (photoDataUrl) resume.personal.photo = photoDataUrl;
    return { resume, parsed, text: parsed.rawText, format, meta };
  } catch (e: any) {
    return { resume: null, parsed: null, text: '', format, meta, error: e?.message || 'Failed to parse resume' };
  }
}