import { createHash, randomBytes } from 'node:crypto';
import type { AuthContext, AuthGateway } from '@cognis/core';

export interface LocalAccountStore {
  register(username: string, password: string, isAdmin?: boolean): { username: string; isAdmin: boolean };
  verify(username: string, password: string): AuthContext | null;
  has(username: string): boolean;
}

export class InMemoryLocalAccountStore implements LocalAccountStore {
  private readonly accounts = new Map<string, { passwordHash: string; isAdmin: boolean }>();
  register(username: string, password: string, isAdmin = false) {
    if (this.accounts.has(username)) throw new Error('username_taken');
    this.accounts.set(username, { passwordHash: hash(password), isAdmin });
    return { username, isAdmin };
  }
  verify(username: string, password: string): AuthContext | null {
    const account = this.accounts.get(username);
    if (!account || account.passwordHash !== hash(password)) return null;
    return { accountId: username, provider: 'local', externalUserId: username, isAdmin: account.isAdmin };
  }
  has(username: string) { return this.accounts.has(username); }
}

function hash(input: string) { return createHash('sha256').update(input).digest('hex'); }

export class LocalAuthGateway implements AuthGateway {
  constructor(private readonly store: LocalAccountStore) {}

  async authenticate(token: string): Promise<AuthContext | null> {
    const payload = JSON.parse(token) as { username?: string; password?: string };
    return this.store.verify(String(payload.username ?? ''), String(payload.password ?? ''));
  }

  async createLocalAdmin(username: string, password: string): Promise<AuthContext> {
    if (!this.store.has(username)) this.store.register(username, password, true);
    return { accountId: username, provider: 'local', externalUserId: username, isAdmin: true };
  }

  static generatePassword() { return randomBytes(12).toString('base64url'); }
}
