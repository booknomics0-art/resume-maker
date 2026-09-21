// Local persistence + a fully written sample resume (human-toned).

import { emptyResume, uid, type Resume } from './types';

const KEY = 'craftcv.resumes.v1';

/** Ensures older resumes saved before v2 (no photo/hobbies/bestExperience) never crash the app. */
function normalize(raw: unknown): Resume {
  const base = emptyResume();
  const r = (raw ?? {}) as Partial<Resume>;
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
}

export function loadResumes(): Resume[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.map(normalize) : [];
  } catch {
    return [];
  }
}

export function saveResumes(list: Resume[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function upsertResume(r: Resume) {
  const list = loadResumes();
  const next = { ...r, updatedAt: Date.now() };
  const i = list.findIndex((x) => x.id === r.id);
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  saveResumes(list);
  return next;
}

export function deleteResume(id: string) {
  saveResumes(loadResumes().filter((r) => r.id !== id));
}

export function duplicateResume(id: string): Resume | null {
  const src = loadResumes().find((r) => r.id === id);
  if (!src) return null;
  const copy: Resume = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.name = `${src.name} (copy)`;
  copy.createdAt = Date.now();
  copy.updatedAt = Date.now();
  upsertResume(copy);
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
