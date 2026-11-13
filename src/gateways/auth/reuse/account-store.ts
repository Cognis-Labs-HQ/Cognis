import {
    createAccountId,
    isPrivateAccountId,
    usernameBase,
    usernameWithSuffix,
} from "./usernames.js";
/**
 * Account-store contract and volatile test implementation owned by the Auth
 * gateway. Concrete adapters implement this boundary; API routes receive it
 * through gateway bootstrap wiring and do not depend on adapter internals.
 */

import { createHash, pbkdf2Sync } from "node:crypto";
import type { AuthContext } from "@cognis/core";

export interface LocalAccountStore {
    getUsername(accountId: string): Promise<string | null>;
    ensureExternalAccount?(identity: {
        accountId: string;
        accountNamespace?: string;
        username?: string;
        provider: string;
        externalUserId: string;
        email?: string;
        displayName?: string;
        role?: string;
    }): Promise<string>;
    resolveExternalAccountId?(
        provider: string,
        externalUserId: string,
    ): Promise<string | null>;
    isExternalIdentityDeleted?(
        provider: string,
        externalUserId: string,
    ): Promise<boolean>;
    removeExternalIdentitiesByPrefix?(
        provider: string,
        externalUserIdPrefix: string,
    ): Promise<string[]>;
    register(
        username: string,
        password: string,
        role?: "user" | "teacher" | "moderator" | "admin",
        displayName?: string,
    ): Promise<{
        username: string;
        enabled: boolean;
        role: string;
    }>;
    verify(username: string, password: string): Promise<AuthContext | null>;
    has(username: string): Promise<boolean>;
    list(): Promise<
        Array<{
            accountId: string;
            username: string;
            enabled: boolean;
            isFounder: boolean;
            role?: string;
            provider?: string;
        }>
    >;
    setRole(
        username: string,
        role: "user" | "teacher" | "moderator" | "admin",
    ): Promise<void>;
    setPassword(username: string, password: string): Promise<void>;
    setEnabled(username: string, enabled: boolean): Promise<void>;
    delete(
        username: string,
        options?: { recordExternalIdentityDeletion?: boolean },
    ): Promise<void>;
    getInfo(username: string): Promise<{
        accountId: string;
        username: string;
        createdAt: string | null;
        lastLogin: string | null;
        enabled: boolean;
        isFounder: boolean;
        role?: string;
        provider?: string;
    } | null>;
    updateLastLogin(username: string): Promise<void>;
    setFounder(username: string, isFounder: boolean): Promise<void>;
    isFounder(username: string): Promise<boolean>;
    exists(username: string): Promise<boolean>;
    getDisplayName(username: string): Promise<string | null>;
}

interface StoredAccount {
    passwordHash: string;
    passwordHistoryHashes: string[];
    isFounder: boolean;
    enabled: boolean;
    lastLogin: string | null;
    displayName: string | null;
    role: "user" | "teacher" | "moderator" | "admin";
    provider: string;
}

function hashPassword(input: string): string {
    return pbkdf2Sync(input, "volatile-store", 1000, 32, "sha256").toString(
        "hex",
    );
}

const VOLATILE_PASSWORD_HISTORY_LIMIT = 10;

/** Lowercases a username to enable case-insensitive lookups. */
export function normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
}

export function normalizeExternalAccountId(
    provider: string,
    accountId: string,
): string {
    const providerNamespace = normalizeUsername(provider);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(providerNamespace)) {
        throw new Error("invalid_external_account_namespace");
    }
    const normalizedAccountId = normalizeUsername(accountId);
    const providerPrefix = `${providerNamespace}:`;
    return normalizedAccountId.startsWith(providerPrefix)
        ? normalizedAccountId
        : `${providerPrefix}${normalizedAccountId}`;
}

export function externalIdentityFingerprint(
    provider: string,
    externalUserId: string,
): string {
    return createHash("sha256")
        .update(`${provider}\0${externalUserId}`, "utf8")
        .digest("hex");
}

/**
 * Validates username format: printable ASCII only, max 25 characters,
 * and must be all-lowercase (case-insensitive storage is enforced by
 * requiring lower-case at input rather than silently normalizing).
 * Returns null when valid, or an error code string when invalid.
 */
export function validateUsername(username: string): string | null {
    if (!username) return "username_required";
    if (username.length > 25) return "username_too_long";
    if (!/^[\x21-\x7E]+$/.test(username)) return "username_invalid";
    if (username !== username.toLowerCase()) return "username_not_lowercase";
    return null;
}

/**
 * In-memory implementation of LocalAccountStore for use in tests.
 * No persistence — state resets on every instantiation.
 * Not suitable for production: passwords use a fixed salt and low PBKDF2
 * iteration count for test-execution speed.
 */
export class VolatileLocalAccountStore implements LocalAccountStore {
    private readonly names = new Map<
        string,
        { username: string; provider: string; base: string }
    >();
    private reserveName(
        accountId: string,
        provider: string,
        proposed: string,
    ): void {
        if (this.names.has(accountId)) return;
        const base = usernameBase(proposed);
        if (
            [...this.names.values()].some(
                (name) => name.provider === provider && name.base === base,
            )
        )
            throw new Error("provider_username_taken");
        let username = base;
        while (
            [...this.names.values()].some((name) => name.username === username)
        )
            username = usernameWithSuffix(base);
        this.names.set(accountId, { username, provider, base });
    }
    async getUsername(accountId: string): Promise<string | null> {
        return this.names.get(accountId)?.username ?? null;
    }

    private readonly accounts = new Map<string, StoredAccount>();
    private readonly externalIdentities = new Map<string, string>();
    private readonly externalIdentityFingerprints = new Map<string, string>();
    private readonly deletedExternalIdentities = new Set<string>();

    async ensureExternalAccount(identity: {
        accountId: string;
        accountNamespace?: string;
        username?: string;
        provider: string;
        externalUserId: string;
        displayName?: string;
        role?: string;
    }): Promise<string> {
        const normalizedAccountId = normalizeExternalAccountId(
            identity.accountNamespace ?? identity.provider,
            identity.accountId,
        );
        const identityId = `${identity.provider}:${identity.externalUserId}`;
        const identityFingerprint = externalIdentityFingerprint(
            identity.provider,
            identity.externalUserId,
        );
        this.deletedExternalIdentities.delete(identityFingerprint);
        const mappedAccountId = this.externalIdentities.get(identityId);
        const accountId =
            mappedAccountId ??
            (isPrivateAccountId(identity.accountId)
                ? identity.accountId
                : createAccountId());
        if (!mappedAccountId && this.accounts.has(accountId)) {
            throw new Error("external_account_id_conflict");
        }
        this.reserveName(
            accountId,
            identity.provider,
            identity.username ?? normalizedAccountId,
        );
        this.externalIdentities.set(identityId, accountId);
        this.externalIdentityFingerprints.set(identityId, identityFingerprint);
        const existingAccount = this.accounts.get(accountId);
        if (existingAccount) {
            existingAccount.displayName =
                identity.displayName?.trim() || existingAccount.displayName;
            return accountId;
        }
        this.accounts.set(accountId, {
            passwordHash: "external-account-no-local-password",
            passwordHistoryHashes: [],
            isFounder: false,
            enabled: true,
            lastLogin: null,
            displayName:
                identity.displayName?.trim() ||
                this.names.get(accountId)!.username,
            role:
                identity.role === "teacher" ||
                identity.role === "moderator" ||
                identity.role === "admin"
                    ? identity.role
                    : "user",
            provider: identity.provider,
        });
        return accountId;
    }

    async resolveExternalAccountId(
        provider: string,
        externalUserId: string,
    ): Promise<string | null> {
        return (
            this.externalIdentities.get(`${provider}:${externalUserId}`) ?? null
        );
    }

    async isExternalIdentityDeleted(
        provider: string,
        externalUserId: string,
    ): Promise<boolean> {
        return this.deletedExternalIdentities.has(
            externalIdentityFingerprint(provider, externalUserId),
        );
    }

    async removeExternalIdentitiesByPrefix(
        provider: string,
        externalUserIdPrefix: string,
    ): Promise<string[]> {
        const accountIds = new Set<string>();
        for (const [identityId, accountId] of this.externalIdentities) {
            if (!identityId.startsWith(`${provider}:${externalUserIdPrefix}`)) {
                continue;
            }
            this.externalIdentities.delete(identityId);
            this.externalIdentityFingerprints.delete(identityId);
            accountIds.add(accountId);
        }
        return [...accountIds];
    }

    async register(
        username: string,
        password: string,
        role: "user" | "teacher" | "moderator" | "admin" = "user",
        displayName?: string,
    ) {
        const validationError = validateUsername(username);
        if (validationError) throw new Error(validationError);
        if (this.accounts.has(username)) throw new Error("username_taken");
        const passwordHash = hashPassword(password);
        this.reserveName(username, "local", username);
        this.accounts.set(username, {
            passwordHash,
            passwordHistoryHashes: [passwordHash],
            isFounder: false,
            enabled: true,
            lastLogin: null,
            displayName: displayName?.trim() || username,
            role,
            provider: "local",
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
        const lowercaseUsername = normalizeUsername(username);
        const account = this.accounts.get(lowercaseUsername);
        if (
            !account ||
            !account.enabled ||
            account.passwordHash !== hashPassword(password)
        ) {
            return null;
        }
        return {
            accountId: lowercaseUsername,
            externalUserId: lowercaseUsername,
            role: account.role,
            provider: account.provider,
        };
    }

    async has(username: string) {
        return this.accounts.has(normalizeUsername(username));
    }

    async list() {
        return [...this.accounts.entries()].map(([username, account]) => ({
            accountId: username,
            username: this.names.get(username)!.username,
            enabled: account.enabled,
            isFounder: account.isFounder,
            role: account.role,
            provider: account.provider,
        }));
    }

    async setRole(
        username: string,
        role: "user" | "teacher" | "moderator" | "admin",
    ) {
        const account = this.accounts.get(normalizeUsername(username));
        if (!account) throw new Error("not_found");
        account.role = role;
    }

    async setPassword(username: string, password: string) {
        const account = this.accounts.get(normalizeUsername(username));
        if (!account) throw new Error("not_found");
        const nextPasswordHash = hashPassword(password);
        if (account.passwordHistoryHashes.includes(nextPasswordHash)) {
            throw new Error("Password was used previously.");
        }
        account.passwordHash = nextPasswordHash;
        account.passwordHistoryHashes.push(nextPasswordHash);
        if (
            account.passwordHistoryHashes.length >
            VOLATILE_PASSWORD_HISTORY_LIMIT
        ) {
            account.passwordHistoryHashes.splice(
                0,
                account.passwordHistoryHashes.length -
                    VOLATILE_PASSWORD_HISTORY_LIMIT,
            );
        }
    }

    async setFounder(username: string, isFounder: boolean) {
        const account = this.accounts.get(normalizeUsername(username));
        if (!account) throw new Error("not_found");
        account.isFounder = isFounder;
    }

    async isFounder(username: string): Promise<boolean> {
        const account = this.accounts.get(normalizeUsername(username));
        if (!account) return false;
        return account.isFounder;
    }

    async exists(username: string): Promise<boolean> {
        return this.accounts.has(normalizeUsername(username));
    }

    async getDisplayName(username: string): Promise<string | null> {
        const account = this.accounts.get(normalizeUsername(username));
        if (!account) return null;
        return account.displayName ?? username;
    }

    async setEnabled(username: string, enabled: boolean) {
        const account = this.accounts.get(normalizeUsername(username));
        if (!account) throw new Error("not_found");
        account.enabled = enabled;
    }

    async delete(
        username: string,
        options: { recordExternalIdentityDeletion?: boolean } = {},
    ) {
        const accountId = normalizeUsername(username);
        for (const [identityId, mappedAccountId] of this.externalIdentities) {
            if (mappedAccountId !== accountId) continue;
            const identityFingerprint =
                this.externalIdentityFingerprints.get(identityId);
            if (
                identityFingerprint &&
                options.recordExternalIdentityDeletion !== false
            ) {
                this.deletedExternalIdentities.add(identityFingerprint);
            }
            this.externalIdentities.delete(identityId);
            this.externalIdentityFingerprints.delete(identityId);
        }
        this.accounts.delete(accountId);
        this.names.delete(accountId);
    }

    async getInfo(username: string): Promise<{
        accountId: string;
        username: string;
        createdAt: string | null;
        lastLogin: string | null;
        enabled: boolean;
        isFounder: boolean;
        role?: string;
    } | null> {
        const lowercaseUsername = normalizeUsername(username);
        const account = this.accounts.get(lowercaseUsername);
        if (!account) return null;
        return {
            accountId: lowercaseUsername,
            username: this.names.get(lowercaseUsername)!.username,
            createdAt: null,
            lastLogin: account.lastLogin,
            enabled: account.enabled,
            isFounder: account.isFounder,
            role: account.role,
            provider: account.provider,
        };
    }

    async updateLastLogin(username: string): Promise<void> {
        const account = this.accounts.get(normalizeUsername(username));
        if (!account) return;
        account.lastLogin = new Date().toISOString();
    }
}
