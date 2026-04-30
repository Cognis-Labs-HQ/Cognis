import { createHmac } from 'node:crypto';

export interface JwtClaims {
  sub: string;
  role: 'user' | 'teacher' | 'moderator' | 'admin';
  iat: number;
  exp: number;
  name?: string;
}

const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me';

function b64url(input: string) {
  return Buffer.from(input).toString('base64url');
}

export function signJwt(claims: JwtClaims): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify(claims));
  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export function verifyJwt(token: string): JwtClaims | null {
  const [header, payload, sig] = token.split('.');
  if (!header || !payload || !sig) return null;
  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  if (sig !== expected) return null;
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtClaims;
  if (claims.exp < Math.floor(Date.now() / 1000)) return null;
  return claims;
}
