/**
 * LocalAccountStore interface and volatile test double.
 *
 * Why this lives in src/api/reuse/ rather than in the auth adapter:
 *   The Auth gateway registers route factories (auth routes, user management
 *   routes) that live under src/api/routes/. Those route factories accept a
 *   LocalAccountStore parameter so they stay free of any concrete adapter
 *   import. Placing this interface in the API-layer reuse directory is the
 *   narrowest location that satisfies both the route factories and the adapter
 *   without creating a circular dependency.
 *
 *   The concrete DB-backed implementation (DbLocalAccountStore) lives in
 *   src/adapters/auth/local/store.ts and is only imported by the Auth gateway
 *   bootstrap, which is the sole point of wiring.
 *
 * Exports:
 *   LocalAccountStore         — abstract interface for route factories.
 *   VolatileLocalAccountStore — in-memory test double (no persistence).
 *
 * Adding a new account-store backend?
 *   Implement LocalAccountStore in your adapter directory and wire it in
 *   src/gateways/auth/bootstrap.ts. Do not modify this file.
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
        role?: "user" | "teacher" | "moderator" | "admin",
    ): Promise<{
        username: string;
        enabled: boolean;
        role: string;
    }>;
    verify(username: string, password: string): Promise<AuthContext | null>;
    has(username: string): Promise<boolean>;
    list(): Promise<
        Array<{
            username: string;
            enabled: boolean;
            isFounder: boolean;
            role?: string;
        }>
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
        enabled: boolean;
        isFounder: boolean;
        role?: string;
    } | null>;
    updateLastLogin(username: string): Promise<void>;
    setFounder(username: string, isFounder: boolean): Promise<void>;
    isFounder(username: string): Promise<boolean>;
    exists(username: string): Promise<boolean>;
    getDisplayName(username: string): Promise<string | null>;
}

interface StoredAccount {
    passwordHash: string;
    isFounder: boolean;
    enabled: boolean;
    lastLogin: string | null;
    displayName: string | null;
    role: "user" | "teacher" | "moderator" | "admin";
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

    async register(
        username: string,
        password: string,
        role: "user" | "teacher" | "moderator" | "admin" = "user",
    ) {
        if (this.accounts.has(username)) throw new Error("username_taken");
        this.accounts.set(username, {
            passwordHash: hashPassword(password),
            isFounder: false,
            enabled: true,
            lastLogin: null,
            displayName: username,
            role,
        });
        return {
            username,
            enabled: true,
            role,
        };
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
            role: account.role,
        };
    }

    async has(username: string) {
        return this.accounts.has(username);
    }

    async list() {
        return [...this.accounts.entries()].map(([username, account]) => ({
            username,
            enabled: account.enabled,
            isFounder: account.isFounder,
            role: account.role,
        }));
    }

    async setRole(
        username: string,
        role: "user" | "teacher" | "moderator" | "admin",
    ) {
        const account = this.accounts.get(username);
        if (!account) throw new Error("not_found");
        account.role = role;
    }

    async setPassword(username: string, password: string) {
        const account = this.accounts.get(username);
        if (!account) throw new Error("not_found");
        account.passwordHash = hashPassword(password);
    }

    async setFounder(username: string, isFounder: boolean) {
        const account = this.accounts.get(username);
        if (!account) throw new Error("not_found");
        account.isFounder = isFounder;
    }

    async isFounder(username: string): Promise<boolean> {
        const account = this.accounts.get(username);
        if (!account) return false;
        return account.isFounder;
    }

    async exists(username: string): Promise<boolean> {
        return this.accounts.has(username);
    }

    async getDisplayName(username: string): Promise<string | null> {
        const account = this.accounts.get(username);
        if (!account) return null;
        return account.displayName ?? username;
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
        enabled: boolean;
        isFounder: boolean;
        role?: string;
    } | null> {
        const account = this.accounts.get(username);
        if (!account) return null;
        return {
            username,
            createdAt: null,
            lastLogin: account.lastLogin,
            enabled: account.enabled,
            isFounder: account.isFounder,
            role: account.role,
        };
    }

    async updateLastLogin(username: string): Promise<void> {
        const account = this.accounts.get(username);
        if (!account) return;
        account.lastLogin = new Date().toISOString();
    }
}
