import { randomBytes, createHash } from 'node:crypto';

export type AccessRole = 'user' | 'teacher' | 'moderator' | 'admin';

interface AccessTokenRecord {
  subject: string;
  role: AccessRole;
  expiresAt: number | null;
}

const tokenStore = new Map<string, AccessTokenRecord>();

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function issueAccessToken(subject: string, role: AccessRole, ttlSeconds: number | null): string {
  const token = `cgs_${randomBytes(32).toString('base64url')}`;
  const expiresAt = ttlSeconds === null ? null : Date.now() + ttlSeconds * 1000;
  tokenStore.set(hashToken(token), { subject, role, expiresAt });
  return token;
}

export function verifyAccessToken(token: string): { sub: string; role: AccessRole } | null {
  const record = tokenStore.get(hashToken(token));
  if (!record) return null;
  if (record.expiresAt !== null && record.expiresAt < Date.now()) {
    tokenStore.delete(hashToken(token));
    return null;
  }
  return { sub: record.subject, role: record.role };
}
