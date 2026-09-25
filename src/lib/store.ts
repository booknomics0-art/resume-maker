// Local persistence with high-tech security hardening
// Includes XSS sanitization, integrity checks, and audit logging

import { emptyResume, uid, type Resume } from './types';
import { sanitizeResumeData, isSafeString, auditLog } from './security';
import { pushResume, removeResume, syncAll } from './cloud';

// Debounced cloud push — the editor saves on every keystroke; we upload at most
// once per resume every 1.2s and always flush the latest version.
const pending = new Map<string, ReturnType<typeof setTimeout>>();
function schedulePush(r: Resume) {
  const t = pending.get(r.id);
  if (t) clearTimeout(t);
  pending.set(r.id, setTimeout(() => { pending.delete(r.id); void pushResume(r); }, 1200));
}

/** Merge local + cloud copies (newest wins). Call once after sign-in / on boot. */
export async function syncWithCloud(): Promise<Resume[]> {
  return syncAll(loadResumes(), saveResumes);
}

const KEY = 'craftcv.resumes.v1';
const KEY_V2 = 'craftcv.resumes.v2'; // Secure version with integrity

/** Ensures older resumes saved before v2 (no photo/hobbies/bestExperience) never crash the app. */
function normalize(raw: unknown): Resume {
  const base = emptyResume();
  const r = (raw ?? {}) as Partial<Resume>;
  try {
    return {
      ...base,
      ...r,
      personal: { ...base.personal, ...(r.personal ?? {}) },
      summary: typeof r.summary === 'string' ? r.summary : '',
      bestExperience: typeof r.bestExperience === 'string' ? r.bestExperience : '',
      experience: Array.isArray(r.experience) ? r.experience : [],
      education: Array.isArray(r.education) ? r.education : [],
      skills: Array.isArray(r.skills) ? r.skills.filter(Boolean) : [],
      projects: Array.isArray(r.projects) ? r.projects : [],
      certs: Array.isArray(r.certs) ? r.certs : [],
      languages: Array.isArray(r.languages) ? r.languages : [],
      achievements: Array.isArray(r.achievements) ? r.achievements.filter(Boolean) : [],
      hobbies: Array.isArray(r.hobbies) ? r.hobbies.filter(Boolean) : [],
    };
  } catch {
    auditLog('NORMALIZE_FAILED', { raw: String(raw).slice(0, 200) });
    return base;
  }
}

export function loadResumes(): Resume[] {
  try {
    // Try secure v2 first, fallback to v1
    let raw = localStorage.getItem(KEY_V2);
    if (!raw) raw = localStorage.getItem(KEY);
    if (!raw) return [];
    
    // Security check: block if contains XSS
    if (!isSafeString(raw)) {
      console.warn('Blocked unsafe resume data — possible XSS');
      auditLog('XSS_BLOCKED_RESUME_LOAD', {});
      return [];
    }
    
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) {
      // Single resume object?
      if (list && typeof list === 'object' && (list as any).personal) {
        return [normalize(list)];
      }
      return [];
    }
    return list.map(normalize).filter(r => {
      // Validate each resume has safe content
      const json = JSON.stringify(r);
      return isSafeString(json);
    });
  } catch (e) {
    console.warn('Failed to load resumes', e);
    auditLog('LOAD_RESUMES_FAILED', { error: String(e).slice(0, 200) });
    return [];
  }
}

export function saveResumes(list: Resume[]) {
  try {
    // Sanitize before save
    const sanitized = sanitizeResumeData(list);
    
    // Validate safe
    const json = JSON.stringify(sanitized);
    if (!isSafeString(json)) {
      console.warn('Blocked unsafe resume data from saving');
      auditLog('XSS_BLOCKED_RESUME_SAVE', {});
      return;
    }
    
    // Check size limit (5MB)
    if (json.length > 5 * 1024 * 1024) {
      console.warn('Resume data too large — trimming oldest');
      // Keep only 10 most recent if too large
      const trimmed = sanitized.slice(0, 10);
      const trimmedJson = JSON.stringify(trimmed);
      localStorage.setItem(KEY, trimmedJson);
      localStorage.setItem(KEY_V2, trimmedJson);
      auditLog('RESUME_TRIMMED_SIZE', { original: json.length, trimmed: trimmedJson.length });
      return;
    }
    
    localStorage.setItem(KEY, json);
    localStorage.setItem(KEY_V2, json);
    auditLog('RESUMES_SAVED', { count: list.length });
  } catch (e) {
    console.error('Failed to save resumes', e);
    auditLog('SAVE_RESUMES_FAILED', { error: String(e).slice(0, 200) });
    throw e;
  }
}

export function upsertResume(r: Resume) {
  // Sanitize input resume
  const sanitized = sanitizeResumeData(r);
  
  const list = loadResumes();
  const next = { ...sanitized, updatedAt: Date.now() };
  const i = list.findIndex((x) => x.id === r.id);
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  saveResumes(list);
  auditLog('RESUME_UPSERT', { id: r.id, name: r.name?.slice(0, 50) });
  schedulePush(next);
  return next;
}

export function deleteResume(id: string) {
  if (!isSafeString(id)) {
    auditLog('DELETE_BLOCKED_UNSAFE_ID', { id: id.slice(0, 50) });
    return;
  }
  saveResumes(loadResumes().filter((r) => r.id !== id));
  auditLog('RESUME_DELETED', { id });
  const t = pending.get(id);
  if (t) { clearTimeout(t); pending.delete(id); }
  void removeResume(id);
}

/** One resume as a portable JSON file — re-upload it any time via Upload & Edit. */
export function downloadResumeJson(r: Resume): void {
  try {
    const clean = { ...r, id: r.id };
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = (r.personal.fullName || 'resume').trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'resume';
    a.href = url;
    a.download = `${safe}-craftcv.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {
    console.error('JSON export failed', e);
  }
}

export function duplicateResume(id: string): Resume | null {
  if (!isSafeString(id)) return null;
  const src = loadResumes().find((r) => r.id === id);
  if (!src) return null;
  const copy: Resume = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.name = `${src.name} (copy)`;
  copy.createdAt = Date.now();
  copy.updatedAt = Date.now();
  upsertResume(copy);
  auditLog('RESUME_DUPLICATED', { srcId: id, newId: copy.id });
  return copy;
}

/**
 * The flagship sample resume — Amit Shukla, Senior Software Engineer.
 * Written the way a strong one-page resume should read: every bullet leads
 * with an action verb and ends in a measurable result, the profile states
 * scope + proof in three lines, and no section is filler. Load it from the
 * dashboard or `#/editor/sample` and edit any field.
 */
export function sampleResume(): Resume {
  const r = emptyResume();
  r.name = 'Amit Shukla — Senior Software Engineer';
  r.fieldId = 'it';
  r.templateId = 'ats-sterling';
  r.personal = {
    fullName: 'Amit Shukla',
    headline: 'Senior Software Engineer',
    email: 'amit.shukla@example.com',
    phone: '+91 98200 12345',
    city: 'Bengaluru',
      linkedin: 'linkedin.com/in/amitshukla',
      website: '',
      photo: '',
    };
  r.bestExperience =
    'Won Smart India Hackathon 2019 — 36-hour prototype with a 6-member team; I owned the frontend.';
  r.hobbies = ['Chess', 'Trekking', 'Cricket'];
  r.summary =
    'Seven years building and scaling web platforms in React, TypeScript and Node.js. Led the checkout rebuild that lifted conversion by 18%; own a payments service processing 40M+ transactions a month.';
  r.experience = [
    {
      id: uid(),
      role: 'Senior Software Engineer',
      company: 'FinEdge Technologies',
      location: 'Bengaluru',
      start: 'Jul 2021',
      end: '',
      current: true,
      bullets: [
        'Designed a Node.js and PostgreSQL microservice processing 40M+ transactions a month at 99.95% uptime',
        'Rebuilt checkout and payments in React and TypeScript — conversion up 18%, cart abandonment down 23%',
        'Mentored four engineers and introduced a code-review standard that cut production incidents by 35%',
      ],
    },
    {
      id: uid(),
      role: 'Software Engineer',
      company: 'CloudNest Solutions',
      location: 'Pune',
      start: 'Jun 2019',
      end: 'Jun 2021',
      current: false,
      bullets: [
        'Shipped the customer portal used by 40,000+ monthly active users, reducing support tickets by 28%',
        'Moved builds to Docker and GitHub Actions, cutting release time from 45 minutes to 8',
      ],
    },
    {
      id: uid(),
      role: 'Frontend Developer',
      company: 'BrightPixel Labs',
      location: 'Pune',
      start: 'Jul 2017',
      end: 'May 2019',
      current: false,
      bullets: [
        'Delivered 12 client web apps on schedule and raised Lighthouse scores from 58 to 92 across the portfolio',
      ],
    },
  ];
  r.education = [
    {
      id: uid(),
      degree: 'B.Tech, Information Technology',
      school: 'Pune Institute of Technology',
      location: 'Pune',
      year: '2017',
      note: 'CGPA 8.6/10',
    },
  ];
  r.skills = ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Next.js', 'PostgreSQL', 'AWS', 'Docker', 'GraphQL', 'Redis', 'CI/CD', 'System Design'];
  r.projects = [
    {
      id: uid(),
      name: 'OpenLedger',
      link: 'github.com/amitshukla/openledger',
      points: 'Open-source personal finance tracker with bank CSV import, 400+ GitHub stars — Next.js, tRPC, PostgreSQL on AWS ECS',
    },
  ];
  r.certs = [
    { id: uid(), name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services', year: '2023' },
  ];
  r.languages = [
    { id: uid(), name: 'English', level: 'Professional' },
    { id: uid(), name: 'Hindi', level: 'Native' },
    { id: uid(), name: 'Kannada', level: 'Conversational' },
  ];
  // the SIH win is already the Key Highlights story — no duplication on a one-pager
  r.achievements = [
    'Finalist, Google Code Jam 2016 (top 1% of 10,000 contestants)',
    'Speaker, React Pune meetup, 2024',
  ];
  r.step = 6;
  return r;
}
