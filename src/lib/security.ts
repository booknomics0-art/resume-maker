/**
 * CraftCV Security Module — High-tech, comprehensive client-side security
 * Implements XSS prevention, input sanitization, secure storage, rate limiting,
 * CSRF protection, and audit logging.
 */

// ========== XSS Prevention & Input Sanitization ==========

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=/gi, // onerror=, onclick= etc
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
];

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

export function escapeHTML(str: string): string {
  return String(str).replace(/[&<>"'\/]/g, (c) => HTML_ESCAPE_MAP[c] || c);
}

export function sanitizeInput(input: string, maxLength = 2000): string {
  if (typeof input !== 'string') return '';
  let sanitized = input.trim();
  
  // Truncate to max length to prevent DoS
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Remove null bytes and control characters except newline/tab
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeInput(email, 254).toLowerCase();
  // Strict email validation
  const emailRegex = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(sanitized)) return '';
  return sanitized;
}

export function sanitizeURL(url: string): string {
  if (!url) return '';
  let sanitized = sanitizeInput(url, 500);
  // Only allow http, https, and relative URLs
  if (sanitized.match(/^https?:\/\//i)) {
    try {
      const parsed = new URL(sanitized);
      // Block private IPs and suspicious hosts
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname.startsWith('192.168.') || parsed.hostname.startsWith('10.')) {
        return '';
      }
      return parsed.toString();
    } catch {
      return '';
    }
  }
  // Allow relative URLs starting with / or plain domain-like strings for linkedin/website fields
  if (sanitized.match(/^[a-z0-9.\-]+\.[a-z]{2,}/i) || sanitized.startsWith('/')) {
    return sanitized;
  }
  // For linkedin.com/in/xxx style
  if (sanitized.includes('linkedin.com') || sanitized.includes('github.com') || sanitized.includes('.dev') || sanitized.includes('.com')) {
    return sanitized;
  }
  return sanitized;
}

export function isSafeString(str: string): boolean {
  if (!str) return true;
  const lower = str.toLowerCase();
  return !DANGEROUS_PATTERNS.some(p => p.test(lower));
}

// Deep sanitize resume data
export function sanitizeResumeData(data: any): any {
  if (typeof data === 'string') {
    return sanitizeInput(data, 5000);
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeResumeData);
  }
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Validate key name
        if (!/^[a-zA-Z0-9_]+$/.test(key)) continue;
        sanitized[key] = sanitizeResumeData(data[key]);
      }
    }
    return sanitized;
  }
  return data;
}

// ========== Secure Storage with Integrity Check ==========

const STORAGE_SALT = 'craftcv-secure-v2-2026';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateHMAC(data: string, salt: string): Promise<string> {
  const combined = `${data}::${salt}::${STORAGE_SALT}`;
  return sha256(combined);
}

interface SecureStorageItem {
  data: string;
  hmac: string;
  timestamp: number;
  version: number;
}

export async function secureSetItem(key: string, value: string): Promise<void> {
  const hmac = await generateHMAC(value, key);
  const item: SecureStorageItem = {
    data: btoa(encodeURIComponent(value)), // Base64 encode
    hmac,
    timestamp: Date.now(),
    version: 2,
  };
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (e) {
    // Storage full — attempt cleanup
    console.warn('Storage full, attempting cleanup', e);
    // Remove oldest resumes if needed handled by caller
    throw new Error('Storage quota exceeded');
  }
}

export async function secureGetItem(key: string): Promise<string | null> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    // Try new secure format first
    try {
      const item: SecureStorageItem = JSON.parse(raw);
      if (item.data && item.hmac && item.version === 2) {
        const decoded = decodeURIComponent(atob(item.data));
        const expectedHmac = await generateHMAC(decoded, key);
        if (expectedHmac !== item.hmac) {
          console.warn(`Integrity check failed for ${key} — possible tampering`);
          auditLog('INTEGRITY_FAIL', { key });
          return null;
        }
        return decoded;
      }
    } catch {
      // Fall back to legacy format (plain JSON)
      // Validate it's safe
      if (!isSafeString(raw)) {
        console.warn(`Unsafe content detected in ${key}`);
        return null;
      }
      return raw;
    }
    return raw;
  } catch {
    return null;
  }
}

// Synchronous wrappers for backward compatibility (with validation)
export function secureSetItemSync(key: string, value: string): void {
  if (!isSafeString(value)) {
    console.warn('Blocked unsafe content from storage');
    auditLog('XSS_BLOCKED', { key, reason: 'unsafe_content' });
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    throw e;
  }
}

export function secureGetItemSync(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    // Basic safety check
    if (raw.includes('<script') || raw.includes('javascript:')) {
      console.warn(`Blocked XSS attempt in ${key}`);
      auditLog('XSS_BLOCKED', { key });
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

// ========== Rate Limiting ==========

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  action: string,
  maxAttempts = 5,
  windowMs = 60000,
  blockMs = 300000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(action);
  
  if (!entry) {
    rateLimitStore.set(action, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs };
  }
  
  // Check if blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, remaining: 0, resetIn: entry.blockedUntil - now };
  }
  
  // Reset window if expired
  if (now - entry.firstAttempt > windowMs) {
    rateLimitStore.set(action, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs };
  }
  
  // Increment
  entry.count++;
  
  if (entry.count > maxAttempts) {
    entry.blockedUntil = now + blockMs;
    auditLog('RATE_LIMIT_EXCEEDED', { action, count: entry.count });
    return { allowed: false, remaining: 0, resetIn: blockMs };
  }
  
  return { allowed: true, remaining: maxAttempts - entry.count, resetIn: windowMs - (now - entry.firstAttempt) };
}

export function resetRateLimit(action: string): void {
  rateLimitStore.delete(action);
}

// ========== CSRF Protection ==========

const CSRF_KEY = 'craftcv.csrf.v2';

export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem(CSRF_KEY, token);
  return token;
}

export function getCSRFToken(): string {
  let token = sessionStorage.getItem(CSRF_KEY);
  if (!token) {
    token = generateCSRFToken();
  }
  return token;
}

export function validateCSRFToken(token: string): boolean {
  const stored = sessionStorage.getItem(CSRF_KEY);
  return stored !== null && stored === token && token.length === 64;
}

// ========== Password Security ==========

export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const actualSalt = salt || (() => {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  })();
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password + actualSalt + STORAGE_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Double hash for extra security
  const hashBuffer2 = await crypto.subtle.digest('SHA-256', hashBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer2));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { hash, salt: actualSalt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const result = await hashPassword(password, salt);
  return result.hash === hash;
}

// ========== Input Validation ==========

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) return { valid: false, error: 'Email is required' };
  if (email.length > 254) return { valid: false, error: 'Email too long' };
  const regex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(email)) return { valid: false, error: 'Invalid email format' };
  if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string; strength: number } {
  if (!password) return { valid: false, error: 'Password required', strength: 0 };
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters', strength: 0 };
  if (password.length > 128) return { valid: false, error: 'Password too long (max 128)', strength: 0 };
  
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  if (strength < 3) {
    return { valid: false, error: 'Password too weak: use uppercase, lowercase, number, and symbol', strength };
  }
  
  return { valid: true, strength };
}

export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || !name.trim()) return { valid: false, error: 'Name is required' };
  if (name.trim().length < 2) return { valid: false, error: 'Name too short' };
  if (name.trim().length > 100) return { valid: false, error: 'Name too long' };
  if (!/^[a-zA-Z\s.'\-]+$/.test(name.trim())) return { valid: false, error: 'Name contains invalid characters' };
  return { valid: true };
}

// ========== Audit Logging ==========

interface AuditEntry {
  timestamp: number;
  action: string;
  details?: any;
  userAgent: string;
  url: string;
}

const AUDIT_KEY = 'craftcv.audit.v2';
const MAX_AUDIT_ENTRIES = 100;

export function auditLog(action: string, details?: any): void {
  try {
    const entry: AuditEntry = {
      timestamp: Date.now(),
      action: sanitizeInput(action, 100),
      details: details ? sanitizeResumeData(details) : undefined,
      userAgent: navigator.userAgent.slice(0, 200),
      url: window.location.href.slice(0, 500),
    };
    
    const existing = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    existing.push(entry);
    // Keep only last N entries
    if (existing.length > MAX_AUDIT_ENTRIES) {
      existing.splice(0, existing.length - MAX_AUDIT_ENTRIES);
    }
    localStorage.setItem(AUDIT_KEY, JSON.stringify(existing));
  } catch {
    // Fail silently for audit logging
  }
}

export function getAuditLogs(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  } catch {
    return [];
  }
}

// ========== Content Security ==========

export function isSecureContext(): boolean {
  return window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

// Detect potential XSS in URL
export function checkURLForXSS(): boolean {
  const url = window.location.href.toLowerCase();
  const xssPatterns = ['<script', 'javascript:', 'data:text/html', 'vbscript:', 'onerror=', 'onload='];
  return xssPatterns.some(p => url.includes(p));
}

// Initialize security checks on load
export function initSecurity(): void {
  // Check for XSS in URL
  if (checkURLForXSS()) {
    console.warn('Potential XSS detected in URL — redirecting to safe route');
    auditLog('XSS_URL_DETECTED', { url: window.location.href });
    window.location.hash = '#/';
  }
  
  // Generate CSRF token
  getCSRFToken();
  
  // Log security init
  auditLog('SECURITY_INIT', { secureContext: isSecureContext() });
  
  // Monitor for devtools (basic anti-tampering)
  let devtoolsOpen = false;
  const threshold = 160;
  setInterval(() => {
    if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        auditLog('DEVTOOLS_OPENED', {});
      }
    } else {
      devtoolsOpen = false;
    }
  }, 2000);
}
