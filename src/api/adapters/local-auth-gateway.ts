import { createHash, randomBytes } from 'node:crypto';
import type { AuthContext, AuthGateway } from '@cognis/core';

interface StoredAccount {
    passwordHash: string;
    isAdmin: boolean;
    enabled: boolean;
    lastLogin: string | null;
}

export interface LocalAccountStore {
    register(username: string, password: string, isAdmin?: boolean): Promise<{ username: string; isAdmin: boolean; enabled: boolean }>;
    verify(username: string, password: string): Promise<AuthContext | null>;
    has(username: string): Promise<boolean>;
    list(): Promise<Array<{ username: string; isAdmin: boolean; enabled: boolean }>>;
    setRole(username: string, role: 'user' | 'teacher' | 'moderator' | 'admin'): Promise<void>;
    setPassword(username: string, password: string): Promise<void>;
    setEnabled(username: string, enabled: boolean): Promise<void>;
    delete(username: string): Promise<void>;
    getInfo(username: string): Promise<{ username: string; createdAt: string | null; lastLogin: string | null } | null>;
    updateLastLogin(username: string): Promise<void>;
}

export class VolatileLocalAccountStore implements LocalAccountStore {
    private readonly accounts = new Map<string, StoredAccount>();

    async register(username: string, password: string, isAdmin = false) {
        if (this.accounts.has(username)) throw new Error('username_taken');
        this.accounts.set(username, { passwordHash: hash(password), isAdmin, enabled: true, lastLogin: null });
        return { username, isAdmin, enabled: true };
    }

    async verify(username: string, password: string): Promise<AuthContext | null> {
        const account = this.accounts.get(username);
        if (!account || !account.enabled || account.passwordHash !== hash(password)) return null;
        return { accountId: username, provider: 'local', externalUserId: username, isAdmin: account.isAdmin };
    }

    async has(username: string) { return this.accounts.has(username); }

    async list() {
        return [...this.accounts.entries()].map(([username, account]) => ({ username, isAdmin: account.isAdmin, enabled: account.enabled }));
    }

    async setRole(username: string, role: 'user' | 'teacher' | 'moderator' | 'admin') {
        const account = this.accounts.get(username);
        if (!account) throw new Error('not_found');
        account.isAdmin = role === 'admin';
    }

    async setPassword(username: string, password: string) {
        const account = this.accounts.get(username);
        if (!account) throw new Error('not_found');
        account.passwordHash = hash(password);
    }

    async setEnabled(username: string, enabled: boolean) {
        const account = this.accounts.get(username);
        if (!account) throw new Error('not_found');
        account.enabled = enabled;
    }

    async delete(username: string) {
        this.accounts.delete(username);
    }

    async getInfo(username: string): Promise<{ username: string; createdAt: string | null; lastLogin: string | null } | null> {
        const account = this.accounts.get(username);
        if (!account) return null;
        return { username, createdAt: null, lastLogin: account.lastLogin };
    }

    async updateLastLogin(username: string): Promise<void> {
        const account = this.accounts.get(username);
        if (!account) return;
        account.lastLogin = new Date().toISOString();
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
        if (!(await this.store.has(username))) await this.store.register(username, password, true);
        return { accountId: username, provider: 'local', externalUserId: username, isAdmin: true };
    }

    static generatePassword() { return randomBytes(12).toString('base64url'); }
}
