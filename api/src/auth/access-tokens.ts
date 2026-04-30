import { randomBytes, createHash } from 'node:crypto';

export type AccessRole = 'user' | 'teacher' | 'moderator' | 'admin';

interface AccessTokenRecord {
  subject: string;
  role: AccessRole;
  expiresAt: number | null;
}

const tokenStore = new Map<string, AccessTokenRecord>();
const MAX_TOKEN_STORE_SIZE = 10_000;

function pruneExpiredTokens(now = Date.now()) {
  for (const [tokenHash, record] of tokenStore.entries()) {
    if (record.expiresAt !== null && record.expiresAt < now) tokenStore.delete(tokenHash);
  }
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function issueAccessToken(subject: string, role: AccessRole, ttlSeconds: number | null): string {
  pruneExpiredTokens();
  if (tokenStore.size >= MAX_TOKEN_STORE_SIZE) {
    throw new Error('access_token_store_capacity_reached');
  }
  const token = `cgs_${randomBytes(32).toString('base64url')}`;
  const expiresAt = ttlSeconds === null ? null : Date.now() + ttlSeconds * 1000;
  tokenStore.set(hashToken(token), { subject, role, expiresAt });
  return token;
}

export function verifyAccessToken(token: string): { sub: string; role: AccessRole } | null {
  pruneExpiredTokens();
  const tokenHash = hashToken(token);
  const record = tokenStore.get(tokenHash);
  if (!record) return null;
  if (record.expiresAt !== null && record.expiresAt < Date.now()) {
    tokenStore.delete(tokenHash);
    return null;
  }
  return { sub: record.subject, role: record.role };
}
