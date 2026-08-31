/**
 * FormShield — shared validation, honeypot, rate limit, field encryption sim, retention.
 */

export type FieldRule = {
  name: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
};

export type ValidationIssue = { field: string; message: string };

export type RateBucket = { count: number; windowStart: number };

export type StoredSubmission = {
  id: string;
  encryptedFields: Record<string, string>;
  createdAt: number;
  retainUntil: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Simple reversible XOR "encryption at rest" simulation (demo only). */
export function simulateEncrypt(value: string, key: string): string {
  const out: number[] = [];
  for (let i = 0; i < value.length; i++) {
    out.push(value.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(Uint8Array.from(out)).toString("base64");
}

export function simulateDecrypt(cipherB64: string, key: string): string {
  const bytes = Buffer.from(cipherB64, "base64");
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]! ^ key.charCodeAt(i % key.length));
  }
  return out;
}

export function validateFields(
  data: Record<string, string>,
  rules: FieldRule[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const rule of rules) {
    const raw = data[rule.name] ?? "";
    const value = raw.trim();
    if (rule.required && !value) {
      issues.push({ field: rule.name, message: "Required" });
      continue;
    }
    if (!value) continue;
    if (rule.minLength != null && value.length < rule.minLength) {
      issues.push({ field: rule.name, message: `Min length ${rule.minLength}` });
    }
    if (rule.maxLength != null && value.length > rule.maxLength) {
      issues.push({ field: rule.name, message: `Max length ${rule.maxLength}` });
    }
    if (rule.email && !EMAIL_RE.test(value)) {
      issues.push({ field: rule.name, message: "Invalid email" });
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      issues.push({ field: rule.name, message: "Invalid format" });
    }
  }
  return issues;
}

/** Honeypot: if a hidden field is filled, treat as bot. */
export function isHoneypotTriggered(data: Record<string, string>, field = "website"): boolean {
  const v = data[field];
  return typeof v === "string" && v.trim().length > 0;
}

export function checkRateLimit(
  buckets: Map<string, RateBucket>,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { allowed: boolean; remaining: number } {
  const existing = buckets.get(key);
  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1 };
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

export function encryptSensitiveFields(
  data: Record<string, string>,
  sensitive: string[],
  key: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = sensitive.includes(k) ? simulateEncrypt(v, key) : v;
  }
  return out;
}

export function applyRetention(
  store: Map<string, StoredSubmission>,
  now = Date.now(),
): number {
  let removed = 0;
  for (const [id, row] of store) {
    if (row.retainUntil <= now) {
      store.delete(id);
      removed += 1;
    }
  }
  return removed;
}

export function createSubmission(
  encryptedFields: Record<string, string>,
  retentionMs: number,
  now = Date.now(),
): StoredSubmission {
  const id = `sub_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    encryptedFields,
    createdAt: now,
    retainUntil: now + retentionMs,
  };
}
