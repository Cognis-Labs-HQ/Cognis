import test from 'node:test';
import assert from 'node:assert/strict';
import { signJwt, verifyJwt } from '../src/auth/jwt.js';
import { requireAuth } from '../src/auth/guard.js';

test('jwt signs and verifies', () => {
  const token = signJwt({ sub: 'u1', role: 'admin', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+60 });
  const claims = verifyJwt(token);
  assert.equal(claims?.sub, 'u1');
});

test('guard enforces role scopes', () => {
  const token = signJwt({ sub: 'u1', role: 'user', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+60 });
  let status = 0;
  const claims = requireAuth({ headers: { authorization: `Bearer ${token}` } } as any, { writeHead(code: number){status=code;}, end(){} } as any, 'admin');
  assert.equal(claims, null);
  assert.equal(status, 403);
});
