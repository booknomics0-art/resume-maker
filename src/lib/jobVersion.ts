import { auditLog, isSafeString, sanitizeInput } from './security';
import { loadResumes, upsertResume } from './store';
import { uid, type Resume } from './types';

const JD_KEY = 'craftcv.jd.v1';
const MAX_JD_LENGTH = 20_000;
const MAX_SAVED_JDS = 20;

export interface JobVersionInput {
  company: string;
  role: string;
  jobDescription?: string;
}

function loadJobDescriptions(): Record<string, string> {
  try {
    const raw = localStorage.getItem(JD_KEY);
    if (!raw || !isSafeString(raw)) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveJobDescription(resumeId: string, value: string): void {
  if (!resumeId || !isSafeString(resumeId)) return;
  const clean = sanitizeInput(value, MAX_JD_LENGTH);
  const map = loadJobDescriptions();
  if (clean) map[resumeId] = clean;
  else delete map[resumeId];

  const ids = Object.keys(map);
  if (ids.length > MAX_SAVED_JDS) {
    for (const id of ids.slice(0, ids.length - MAX_SAVED_JDS)) delete map[id];
  }

  const json = JSON.stringify(map);
  if (!isSafeString(json)) return;
  try { localStorage.setItem(JD_KEY, json); } catch { /* ATS can still work without persistence */ }
}

export function buildJobSpecificCopy(src: Resume, input: JobVersionInput, now = Date.now(), newId = uid()): Resume | null {
  const company = sanitizeInput(input.company, 120);
  const role = sanitizeInput(input.role, 120);
  if (!company || !role) return null;

  const copy: Resume = JSON.parse(JSON.stringify(src));
  const rootSourceId = src.application?.kind === 'job-specific' ? src.application.sourceResumeId : src.id;
  const rootSourceName = src.application?.kind === 'job-specific' ? src.application.sourceResumeName : src.name;

  copy.id = newId;
  copy.name = `${role} — ${company}`;
  copy.createdAt = now;
  copy.updatedAt = now;
  copy.personal = { ...copy.personal, headline: role };
  copy.application = {
    kind: 'job-specific',
    sourceResumeId: rootSourceId,
    sourceResumeName: rootSourceName,
    company,
    role,
    createdAt: now,
  };
  return copy;
}

export function createJobSpecificResume(sourceId: string, input: JobVersionInput): Resume | null {
  if (!sourceId || !isSafeString(sourceId)) return null;
  const src = loadResumes().find((resume) => resume.id === sourceId);
  if (!src) return null;

  const copy = buildJobSpecificCopy(src, input);
  if (!copy) return null;

  const saved = upsertResume(copy);
  saveJobDescription(saved.id, input.jobDescription ?? '');
  auditLog('JOB_SPECIFIC_RESUME_CREATED', {
    sourceResumeId: saved.application?.sourceResumeId ?? sourceId,
    newResumeId: saved.id,
    company: saved.application?.company ?? '',
    role: saved.application?.role ?? '',
    hasJobDescription: !!input.jobDescription?.trim(),
  });
  return saved;
}
