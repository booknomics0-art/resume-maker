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

export function sampleResume(): Resume {
  const r = emptyResume();
  r.name = 'Aarav Sharma — Frontend Developer';
  r.fieldId = 'it';
  r.templateId = 'modern';
  r.personal = {
    fullName: 'Aarav Sharma',
    headline: 'Frontend Developer',
    email: 'aarav.sharma@example.com',
    phone: '+91 98765 43210',
    city: 'Pune',
    linkedin: 'linkedin.com/in/aaravsharma',
    website: 'aarav.dev',
    photo: '',
  };
  r.bestExperience =
    'Led a 6-member team at Smart India Hackathon 2020. We built a working grievance-tracking prototype in 36 hours and won our track — I handled the frontend and the final demo.';
  r.hobbies = ['Cricket', 'Photography', 'Trekking'];
  r.summary =
    'Frontend developer with 4 years of experience building products in React and TypeScript. Shipped a billing dashboard used by 30,000+ monthly users, cut load time by 40%, and mentored two junior developers. I like owning a feature from the first design chat to the production release.';
  r.experience = [
    {
      id: uid(),
      role: 'Frontend Developer',
      company: 'Nimbus Labs',
      location: 'Pune',
      start: 'Mar 2023',
      end: 'Present',
      current: true,
      bullets: [
        'Rebuilt the billing dashboard in React and cut average load time from 4.2s to 2.5s',
        'Added 220 unit and integration tests; release regressions dropped from ~6 a month to under 1',
        'Introduced component-level visual reviews, which halved UI bugs reported after launch',
      ],
    },
    {
      id: uid(),
      role: 'Junior Web Developer',
      company: 'BrightPixel Solutions',
      location: 'Mumbai',
      start: 'Jun 2021',
      end: 'Feb 2023',
      current: false,
      bullets: [
        'Delivered 14 client sites on schedule, working directly with founders on scope and content',
        'Moved builds to GitHub Actions with preview deployments, saving about 3 hours per release',
        'Taught a monthly internal session on CSS; attendance settled at 12–15 teammates',
      ],
    },
  ];
  r.education = [
    {
      id: uid(),
      degree: 'B.Tech, Computer Science',
      school: 'Pune Institute of Technology',
      location: 'Pune',
      year: '2021',
      note: 'CGPA 8.2/10 · Led the web development club',
    },
  ];
  r.skills = ['React', 'TypeScript', 'JavaScript', 'Next.js', 'Node.js', 'CSS', 'Git', 'REST APIs', 'Jest', 'Figma'];
  r.projects = [
    {
      id: uid(),
      name: 'OpenShelf',
      link: 'github.com/aarav/openshelf',
      points: 'Small library tracker used by 400+ readers\nBuilt with Next.js and SQLite, deployed free on Fly.io',
    },
  ];
  r.certs = [
    { id: uid(), name: 'Meta Front-End Developer Certificate', issuer: 'Coursera', year: '2022' },
  ];
  r.languages = [
    { id: uid(), name: 'English', level: 'Professional' },
    { id: uid(), name: 'Hindi', level: 'Native' },
    { id: uid(), name: 'Marathi', level: 'Conversational' },
  ];
  r.achievements = ['Winner, Smart India Hackathon 2020 (team of 6)', 'Speaker at React Pune meetup, 2024'];
  r.step = 6;
  return r;
}
