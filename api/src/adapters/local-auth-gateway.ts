import { createHash, randomBytes } from 'node:crypto';
import type { AuthContext, AuthGateway } from '@cognis/core';

interface StoredAccount {
  passwordHash: string;
  isAdmin: boolean;
  enabled: boolean;
}

export interface LocalAccountStore {
  register(username: string, password: string, isAdmin?: boolean): { username: string; isAdmin: boolean; enabled: boolean };
  verify(username: string, password: string): AuthContext | null;
  has(username: string): boolean;
  list(): Array<{ username: string; isAdmin: boolean; enabled: boolean }>;
  setRole(username: string, role: 'user' | 'teacher' | 'moderator' | 'admin'): void;
  setPassword(username: string, password: string): void;
  setEnabled(username: string, enabled: boolean): void;
  delete(username: string): void;
}

export class InMemoryLocalAccountStore implements LocalAccountStore {
  private readonly accounts = new Map<string, StoredAccount>();

  register(username: string, password: string, isAdmin = false) {
    if (this.accounts.has(username)) throw new Error('username_taken');
    this.accounts.set(username, { passwordHash: hash(password), isAdmin, enabled: true });
    return { username, isAdmin, enabled: true };
  }

  verify(username: string, password: string): AuthContext | null {
    const account = this.accounts.get(username);
    if (!account || !account.enabled || account.passwordHash !== hash(password)) return null;
    return { accountId: username, provider: 'local', externalUserId: username, isAdmin: account.isAdmin };
  }

  has(username: string) { return this.accounts.has(username); }

  list() {
    return [...this.accounts.entries()].map(([username, account]) => ({ username, isAdmin: account.isAdmin, enabled: account.enabled }));
  }

  setRole(username: string, role: 'user' | 'teacher' | 'moderator' | 'admin') {
    const account = this.accounts.get(username);
    if (!account) throw new Error('not_found');
    account.isAdmin = role === 'admin';
  }

  setPassword(username: string, password: string) {
    const account = this.accounts.get(username);
    if (!account) throw new Error('not_found');
    account.passwordHash = hash(password);
  }

  setEnabled(username: string, enabled: boolean) {
    const account = this.accounts.get(username);
    if (!account) throw new Error('not_found');
    account.enabled = enabled;
  }

  delete(username: string) {
    this.accounts.delete(username);
  }
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
