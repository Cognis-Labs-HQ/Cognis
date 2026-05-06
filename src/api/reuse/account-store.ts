/**
 * Abstract account-store interface used by the API layer. Concrete
 * implementations (DB-backed) live in the auth adapters; this definition keeps
 * route handlers free of any adapter-specific import.
 *
 * @example
 *   import type { LocalAccountStore } from '../../reuse/account-store.js';
 *   export function createUserRoutes(accountStore: LocalAccountStore) { ... }
 *
 * @param register - Create a new account.
 * @param verify   - Verify credentials and return an auth context on success.
 */

import { pbkdf2Sync } from "node:crypto";
import type { AuthContext } from "@cognis/core";

export interface LocalAccountStore {
    register(
        username: string,
        password: string,
        isAdmin?: boolean,
    ): Promise<{ username: string; isAdmin: boolean; enabled: boolean }>;
    verify(username: string, password: string): Promise<AuthContext | null>;
    has(username: string): Promise<boolean>;
    list(): Promise<
        Array<{ username: string; isAdmin: boolean; enabled: boolean }>
    >;
    setRole(
        username: string,
        role: "user" | "teacher" | "moderator" | "admin",
    ): Promise<void>;
    setPassword(username: string, password: string): Promise<void>;
    setEnabled(username: string, enabled: boolean): Promise<void>;
    delete(username: string): Promise<void>;
    getInfo(username: string): Promise<{
        username: string;
        createdAt: string | null;
        lastLogin: string | null;
    } | null>;
    updateLastLogin(username: string): Promise<void>;
}

interface StoredAccount {
    passwordHash: string;
    isAdmin: boolean;
    enabled: boolean;
    lastLogin: string | null;
}

function hashPassword(input: string): string {
    return pbkdf2Sync(input, "volatile-store", 1000, 32, "sha256").toString(
        "hex",
    );
}

/**
 * In-memory implementation of LocalAccountStore for use in tests.
 * No persistence — state resets on every instantiation.
 * Not suitable for production: passwords use a fixed salt and low PBKDF2
 * iteration count for test-execution speed.
 */
export class VolatileLocalAccountStore implements LocalAccountStore {
    private readonly accounts = new Map<string, StoredAccount>();

    async register(username: string, password: string, isAdmin = false) {
        if (this.accounts.has(username)) throw new Error("username_taken");
        this.accounts.set(username, {
            passwordHash: hashPassword(password),
            isAdmin,
            enabled: true,
            lastLogin: null,
        });
        return { username, isAdmin, enabled: true };
    }

    async verify(
        username: string,
        password: string,
    ): Promise<AuthContext | null> {
        const account = this.accounts.get(username);
        if (
            !account ||
            !account.enabled ||
            account.passwordHash !== hashPassword(password)
        ) {
            return null;
        }
        return {
            accountId: username,
            provider: "local",
            externalUserId: username,
            isAdmin: account.isAdmin,
        };
    }

    async has(username: string) {
        return this.accounts.has(username);
    }

    async list() {
        return [...this.accounts.entries()].map(([username, account]) => ({
            username,
            isAdmin: account.isAdmin,
            enabled: account.enabled,
        }));
    }

    async setRole(
        username: string,
        role: "user" | "teacher" | "moderator" | "admin",
    ) {
        const account = this.accounts.get(username);
        if (!account) throw new Error("not_found");
        account.isAdmin = role === "admin";
    }

    async setPassword(username: string, password: string) {
        const account = this.accounts.get(username);
        if (!account) throw new Error("not_found");
        account.passwordHash = hashPassword(password);
    }

    async setEnabled(username: string, enabled: boolean) {
        const account = this.accounts.get(username);
        if (!account) throw new Error("not_found");
        account.enabled = enabled;
    }

    async delete(username: string) {
        this.accounts.delete(username);
    }

    async getInfo(username: string): Promise<{
        username: string;
        createdAt: string | null;
        lastLogin: string | null;
    } | null> {
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
