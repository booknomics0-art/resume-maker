/**
 * CraftCV Advanced Resume Parser
 * Parses PDF, DOCX, TXT, JSON resumes and extracts structured data
 * Uses regex heuristics, NLP-like patterns, and section detection
 */

import { emptyResume, uid, type Resume, type ExperienceItem, type EducationItem, type ProjectItem } from './types';
import { sanitizeInput } from './security';

export type SupportedFormat = 'pdf' | 'docx' | 'txt' | 'json' | 'unknown';

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

export async function extractFromPdf(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const uint8 = new Uint8Array(arrayBuffer);
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const raw = decoder.decode(uint8);
        const parenRegex = /\(([^)]+)\)/g;
        let match;
        const fragments: string[] = [];
        while ((match = parenRegex.exec(raw)) !== null) {
          const fragment = match[1];
          if (fragment.length > 2 && !/^[0-9\s.\-]+$/.test(fragment) && !/^\\/.test(fragment)) {
            fragments.push(fragment);
          }
        }
        let text = '';
        if (fragments.length > 10) {
          text = fragments.join(' ').replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
        } else {
          const asciiRegex = /[A-Za-z0-9@.,\-_\/():\s]{4,}/g;
          const asciiMatches = raw.match(asciiRegex) || [];
          text = asciiMatches.filter(s => s.trim().length > 3 && /[a-zA-Z]{2,}/.test(s)).join(' ');
        }
        text = text.replace(/\s+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
        if (text.length < 50) {
          resolve(`PDF text extraction limited. File: ${file.name} (${Math.round(file.size/1024)}KB). Please manually copy-paste content or use our guided import.`);
        } else {
          resolve(text);
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read PDF'));
    reader.readAsArrayBuffer(file);
  });
}

export async function extractFromDocx(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const raw = decoder.decode(new Uint8Array(arrayBuffer));
        const textRegex = /<w:t[^>]*>([^<]+)<\/w:t>/g;
        const fragments: string[] = [];
        let m;
        while ((m = textRegex.exec(raw)) !== null) {
          fragments.push(m[1]);
        }
        if (fragments.length > 0) {
          resolve(fragments.join(' ').replace(/\s+/g, ' ').trim());
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

interface ParsedSections {
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
  rawText: string;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+91[\s\-]?)?[6-9]\d{9}|(?:\+?\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/g;
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_\/]+/gi;
const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9\-]+\.(?:com|dev|io|in|co|org|net)[^\s]*/gi;

const SECTION_HEADERS = {
  summary: ['summary', 'objective', 'profile', 'about me', 'professional summary', 'career objective'],
  experience: ['experience', 'work experience', 'employment', 'work history', 'professional experience', 'career history'],
  education: ['education', 'academic', 'qualification', 'academic background', 'educational background'],
  skills: ['skills', 'technical skills', 'core skills', 'competencies', 'expertise', 'technologies'],
  projects: ['projects', 'personal projects', 'academic projects', 'key projects'],
  certifications: ['certification', 'certificates', 'certifications', 'licenses'],
  achievements: ['achievement', 'accomplishment', 'award', 'honor'],
};

function findSection(text: string, keywords: string[]): { index: number; header: string } | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      const before = lower.slice(Math.max(0, idx - 30), idx);
      const after = lower.slice(idx, idx + kw.length + 20);
      if (before.includes('\n') || idx < 50 || after.includes('\n')) {
        return { index: idx, header: kw };
      }
    }
  }
  return null;
}

function extractContactInfo(text: string): ParsedSections['contact'] {
  const contact: ParsedSections['contact'] = {};
  const emails = text.match(EMAIL_REGEX);
  if (emails && emails.length > 0) contact.email = emails[0].toLowerCase();
  const phones = text.match(PHONE_REGEX);
  if (phones && phones.length > 0) contact.phone = phones[0].trim();
  const linkedins = text.match(LINKEDIN_REGEX);
  if (linkedins && linkedins.length > 0) contact.linkedin = linkedins[0];
  const urls = text.match(URL_REGEX);
  if (urls) {
    const nonLinkedIn = urls.filter(u => !u.toLowerCase().includes('linkedin'));
    if (nonLinkedIn.length > 0) contact.website = nonLinkedIn[0];
  }
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.length > 5 && line.length < 50 && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/.test(line)) {
      if (!line.includes('@') && !/\d{4,}/.test(line)) {
        contact.name = line;
        break;
      }
    }
  }
  const cityPattern = /(?:Location|City|Based in|Residing in)?\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*(?:India)?/gi;
  const cityMatch = cityPattern.exec(text);
  if (cityMatch) {
    const potentialCity = cityMatch[1];
    if (potentialCity.length < 20 && !potentialCity.includes('@')) contact.city = potentialCity;
  }
  return contact;
}

function extractSkills(text: string): string[] {
  const skillSection = findSection(text, SECTION_HEADERS.skills);
  let skillText = skillSection ? text.slice(skillSection.index, skillSection.index + 800) : text;
  const commonSkills = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'SQL', 'AWS', 'Docker', 'Git',
    'HTML', 'CSS', 'Next.js', 'Angular', 'Vue', 'Express', 'MongoDB', 'PostgreSQL', 'MySQL',
    'REST APIs', 'GraphQL', 'CI/CD', 'Kubernetes', 'Jenkins', 'Figma', 'Photoshop', 'Illustrator',
    'Communication', 'Leadership', 'Team Management', 'Problem Solving', 'Decision Making',
    'Excel', 'Power BI', 'Tableau', 'Pandas', 'Machine Learning', 'Data Analysis',
  ];
  const found: string[] = [];
  const lowerSkillText = skillText.toLowerCase();
  for (const skill of commonSkills) {
    if (lowerSkillText.includes(skill.toLowerCase())) found.push(skill);
  }
  const parts = skillText.split(/[,•\n|]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 30);
  for (const part of parts) {
    if (/^[A-Za-z0-9\s.+#\/\-]+$/.test(part) && part.split(' ').length <= 3) {
      if (!found.includes(part) && part.length > 2) found.push(part);
    }
  }
  return [...new Set(found)].slice(0, 15);
}

export function parseResumeText(rawText: string): ParsedSections {
  const text = sanitizeInput(rawText, 20000);
  const contact = extractContactInfo(text);
  const skills = extractSkills(text);
  const sections: Array<{ type: string; index: number; header: string }> = [];
  for (const [type, keywords] of Object.entries(SECTION_HEADERS)) {
    const found = findSection(text, keywords);
    if (found) sections.push({ type, index: found.index, header: found.header });
  }
  sections.sort((a, b) => a.index - b.index);
  let summary = '';
  const experience: ParsedSections['experience'] = [];
  const education: ParsedSections['education'] = [];
  const projects: ParsedSections['projects'] = [];
  const summarySec = sections.find(s => s.type === 'summary');
  if (summarySec) {
    const nextIdx = sections.find(s => s.index > summarySec.index)?.index || text.length;
    const summaryRaw = text.slice(summarySec.index + summarySec.header.length, nextIdx).trim();
    summary = summaryRaw.split('\n').slice(0, 5).join(' ').slice(0, 500).trim();
  }
  const expSec = sections.find(s => s.type === 'experience');
  if (expSec) {
    const nextIdx = sections.find(s => s.index > expSec.index)?.index || text.length;
    const expRaw = text.slice(expSec.index, nextIdx);
    const expBlocks = expRaw.split(/\n{2,}|(?=\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*\d{4})|(?=\d{4}\s*[-–]\s*\d{4}|Present)/gi).filter(b => b.trim().length > 20);
    for (const block of expBlocks.slice(0, 5)) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      experience.push({
        role: lines[0]?.slice(0, 100),
        company: lines[1]?.slice(0, 100) || '',
        start: '',
        end: '',
        current: /present/i.test(block),
        bullets: lines.slice(2).filter(l => l.length > 10).slice(0, 5),
        raw: block.slice(0, 500),
      });
    }
  }
  const eduSec = sections.find(s => s.type === 'education');
  if (eduSec) {
    const nextIdx = sections.find(s => s.index > eduSec.index)?.index || text.length;
    const eduRaw = text.slice(eduSec.index, nextIdx);
    const eduBlocks = eduRaw.split(/\n{2,}/).filter(b => b.trim().length > 10);
    for (const block of eduBlocks.slice(0, 3)) {
      const yearMatch = block.match(/(19|20)\d{2}/);
      education.push({
        degree: block.split('\n')[0]?.slice(0, 100) || '',
        school: block.split('\n')[1]?.slice(0, 100) || '',
        year: yearMatch ? yearMatch[0] : '',
        raw: block.slice(0, 300),
      });
    }
  }
  return { contact, summary, experience, education, skills, projects, rawText: text };
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
  resume.skills = parsed.skills;
  resume.experience = parsed.experience.map(exp => ({
    id: uid(),
    role: (exp.role || '').slice(0, 100),
    company: (exp.company || '').slice(0, 100),
    location: '',
    start: (exp.start || '').slice(0, 20),
    end: (exp.end || '').slice(0, 20),
    current: !!exp.current,
    bullets: (exp.bullets || []).map(b => b.slice(0, 200)).slice(0, 5),
  }));
  resume.education = parsed.education.map(edu => ({
    id: uid(),
    degree: (edu.degree || '').slice(0, 100),
    school: (edu.school || '').slice(0, 100),
    location: '',
    year: (edu.year || '').slice(0, 20),
    note: '',
  }));
  if (parsed.experience.length > 0 && parsed.experience[0].role) {
    resume.personal.headline = parsed.experience[0].role || '';
  }
  return resume;
}

export async function parseResumeFile(file: File): Promise<{ resume: Resume | null; parsed: ParsedSections | null; text: string; format: SupportedFormat; error?: string }> {
  const format = detectFormat(file);
  try {
    let text = '';
    let resume: Resume | null = null;
    let parsed: ParsedSections | null = null;
    if (format === 'json') {
      const jsonResume = await extractFromJson(file);
      if (jsonResume) return { resume: jsonResume, parsed: null, text: JSON.stringify(jsonResume).slice(0, 1000), format };
      throw new Error('Invalid JSON resume format');
    }
    if (format === 'txt') text = await extractFromTxt(file);
    else if (format === 'pdf') text = await extractFromPdf(file);
    else if (format === 'docx') text = await extractFromDocx(file);
    else throw new Error(`Unsupported format: ${file.name}. Please upload PDF, DOCX, TXT, or JSON.`);
    if (!text || text.trim().length < 20) throw new Error('Could not extract text from file. File may be scanned image or corrupted. Please try TXT format or copy-paste manually.');
    parsed = parseResumeText(text);
    resume = parsedToResume(parsed);
    return { resume, parsed, text, format };
  } catch (e: any) {
    return { resume: null, parsed: null, text: '', format, error: e.message || 'Failed to parse resume' };
  }
}
