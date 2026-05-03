/**
 * Unique-token link verification utility.
 *
 * Generates cryptographically random tokens for use in one-click email
 * verification links. Each token maps to an opaque key (e.g. "username:email")
 * and expires after a configurable duration. A token is consumed on first use.
 *
 * At most one token is active per key at any time — issuing a new token
 * revokes any previous token for the same key.
 */

import { randomBytes } from 'node:crypto';

export interface VerifyTokenStore {
  set(token: string, key: string, expiresAt: number): void;
  get(token: string): { key: string; expiresAt: number } | undefined;
  delete(token: string): void;
  deleteByKey(key: string): void;
  findTokenByKey(key: string): string | undefined;
}

export class InMemoryVerifyTokenStore implements VerifyTokenStore {
  private readonly entries = new Map<string, { key: string; expiresAt: number }>();

  set(token: string, key: string, expiresAt: number): void {
    this.entries.set(token, { key, expiresAt });
  }

  get(token: string): { key: string; expiresAt: number } | undefined {
    return this.entries.get(token);
  }

  delete(token: string): void {
    this.entries.delete(token);
  }

  deleteByKey(key: string): void {
    for (const [token, entry] of this.entries) {
      if (entry.key === key) {
        this.entries.delete(token);
      }
    }
  }

  findTokenByKey(key: string): string | undefined {
    for (const [token, entry] of this.entries) {
      if (entry.key === key) return token;
    }
    return undefined;
  }
}

export function generateVerifyToken(): string {
  return randomBytes(32).toString('hex');
}

export class VerifyTokenService {
  constructor(
    private readonly store: VerifyTokenStore,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /**
   * Issues a new token for `key`. Any previous token for the same key is revoked.
   *
   * @param key      Opaque identifier (e.g. "username:email")
   * @param expiryMs Milliseconds until the token expires (default: 15 minutes)
   * @returns The generated token string
   */
  issue(key: string, expiryMs = 15 * 60 * 1000): string {
    this.store.deleteByKey(key);
    const token = generateVerifyToken();
    this.store.set(token, key, this.now() + expiryMs);
    return token;
  }

  /**
   * Verifies a token. On success, consumes the token and returns the associated
   * key. Returns null if the token is unknown, expired, or already used.
   */
  verify(token: string): string | null {
    const entry = this.store.get(token);
    if (!entry) return null;
    if (this.now() > entry.expiresAt) {
      this.store.delete(token);
      return null;
    }
    this.store.delete(token);
    return entry.key;
  }

  /** Returns true if the specific token is still in the store and not expired, without consuming it. */
  isLive(token: string): boolean {
    const entry = this.store.get(token);
    if (!entry) return false;
    if (this.now() > entry.expiresAt) {
      this.store.delete(token);
      return false;
    }
    return true;
  }

  /** Returns true if there is a live (unexpired) pending token for `key`. */
  hasPending(key: string): boolean {
    const token = this.store.findTokenByKey(key);
    if (!token) return false;
    const entry = this.store.get(token);
    if (!entry) return false;
    if (this.now() > entry.expiresAt) {
      this.store.delete(token);
      return false;
    }
    return true;
  }
}
