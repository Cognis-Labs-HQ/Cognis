import { randomBytes, createHash } from "node:crypto";
import {
    existsSync,
    mkdirSync,
    readFileSync,
    renameSync,
    writeFileSync,
} from "node:fs";
import path from "node:path";
import { logAppEvent as log } from "../../api/reuse/logger.js";
import type { AccessRole } from "@cognis/core";
export type { AccessRole };

import {
    parseTokenStoreEnvelope,
    parseTokenStoreEntry,
    type AccessTokenRecord,
} from "./token-store-schema.js";

const tokenStore = new Map<string, AccessTokenRecord>();
const revokedTokenStore = new Map<string, AccessTokenRecord>();
const verifiedAtByToken = new Map<string, number>();
const invalidatedVerificationTokens = new Set<string>();
const MAX_TOKEN_STORE_SIZE = 10_000;
const tokenStorePath =
    process.env.COGNIS_ACCESS_TOKEN_STORE_PATH ??
    "/app/config/access-tokens.json";
let hasWarnedPersistFailure = false;
let hasWarnedLoadFailure = false;

function persistTokenStore() {
    try {
        const parent = path.dirname(tokenStorePath);
        mkdirSync(parent, { recursive: true });
        const payload = JSON.stringify(
            {
                version: 2,
                tokens: Array.from(tokenStore.entries()),
                revokedTokens: Array.from(revokedTokenStore.entries()),
            },
            null,
            2,
        );
        const tempPath = `${tokenStorePath}.${process.pid}.tmp`;
        writeFileSync(tempPath, payload, { encoding: "utf8", mode: 0o600 });
        renameSync(tempPath, tokenStorePath);
        hasWarnedPersistFailure = false;
    } catch (error) {
        if (!hasWarnedPersistFailure) {
            log("error", "Failed to persist access token store.", {
                component: "auth",
                operation: "persistTokenStore",
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
            hasWarnedPersistFailure = true;
        }
        throw new Error("access_token_persistence_failed");
    }
}

function loadTokenStore(now = Date.now()) {
    try {
        if (!existsSync(tokenStorePath)) {
            return;
        }
        const raw = readFileSync(tokenStorePath, "utf8");
        const parsed = parseTokenStoreEnvelope(JSON.parse(raw));
        let rejected = 0;
        const seenHashes = new Set<string>();
        const rejectedHashes = new Set<string>();
        const loadEntries = (
            entries: unknown[],
            store: Map<string, AccessTokenRecord>,
        ) => {
            for (const entry of entries) {
                const entryHash =
                    Array.isArray(entry) && typeof entry[0] === "string"
                        ? entry[0]
                        : undefined;
                if (entryHash) {
                    if (seenHashes.has(entryHash))
                        rejectedHashes.add(entryHash);
                    seenHashes.add(entryHash);
                }
                const parsedEntry = parseTokenStoreEntry(entry, now);
                if (!parsedEntry) {
                    if (entryHash) rejectedHashes.add(entryHash);
                    rejected += 1;
                    continue;
                }
                const [tokenHash, record] = parsedEntry;
                if (rejectedHashes.has(tokenHash)) {
                    rejected += 1;
                    continue;
                }
                if (record.expiresAt !== null && record.expiresAt <= now)
                    continue;
                if (store.size >= MAX_TOKEN_STORE_SIZE) {
                    rejected += 1;
                    continue;
                }
                store.set(tokenHash, record);
            }
        };
        loadEntries(parsed.tokens, tokenStore);
        loadEntries(parsed.revokedTokens, revokedTokenStore);
        for (const tokenHash of [
            ...revokedTokenStore.keys(),
            ...rejectedHashes,
        ])
            tokenStore.delete(tokenHash);
        if (rejected)
            log("warn", "Rejected invalid persisted access tokens.", {
                component: "auth",
                operation: "loadTokenStore",
                rejected,
            });

        hasWarnedLoadFailure = false;
    } catch (error) {
        tokenStore.clear();
        revokedTokenStore.clear();
        if (!hasWarnedLoadFailure) {
            log("error", "Failed to load access token store.", {
                component: "auth",
                operation: "loadTokenStore",
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
            hasWarnedLoadFailure = true;
        }
    }
}

function pruneStore(
    store: Map<string, AccessTokenRecord>,
    now = Date.now(),
): boolean {
    let removed = false;
    for (const [tokenHash, record] of store.entries()) {
        if (record.expiresAt !== null && record.expiresAt < now) {
            store.delete(tokenHash);
            verifiedAtByToken.delete(tokenHash);
            invalidatedVerificationTokens.delete(tokenHash);
            removed = true;
        }
    }
    return removed;
}

function pruneExpiredTokens(now = Date.now()) {
    const removedActive = pruneStore(tokenStore, now);
    const removedRevoked = pruneStore(revokedTokenStore, now);
    if (removedActive || removedRevoked) {
        persistTokenStore();
    }
}

function getStoredAccessTokenRecord(token: string): {
    record: AccessTokenRecord;
    revoked: boolean;
} | null {
    pruneExpiredTokens();
    const tokenHash = hashToken(token);
    const record = tokenStore.get(tokenHash);
    if (record) {
        return { record, revoked: false };
    }
    const revokedRecord = revokedTokenStore.get(tokenHash);
    if (revokedRecord) {
        return { record: revokedRecord, revoked: true };
    }
    return null;
}

export function lookupAccessToken(token: string): {
    sub: string;
    role: AccessRole;
    providerId: string;
    revoked: boolean;
    setupPending: boolean;
    purpose: "session" | "password-reset" | "share";
} | null {
    const stored = getStoredAccessTokenRecord(token);
    if (!stored) return null;
    return {
        sub: stored.record.subject,
        role: stored.record.role,
        providerId: stored.record.providerId,
        revoked: stored.revoked,
        setupPending: stored.record.setupPending === true,
        purpose: stored.record.purpose ?? "session",
    };
}

export function verifyAccessToken(token: string): {
    sub: string;
    role: AccessRole;
    providerId: string;
    setupPending: boolean;
} | null;
export function verifyAccessToken(
    token: string,
    options: { purpose: "session" | "password-reset" | "share" },
): {
    sub: string;
    role: AccessRole;
    providerId: string;
    setupPending: boolean;
} | null;
export function verifyAccessToken(
    token: string,
    options?: { purpose: "session" | "password-reset" | "share" },
): {
    sub: string;
    role: AccessRole;
    providerId: string;
    setupPending: boolean;
} | null {
    const stored = getStoredAccessTokenRecord(token);
    if (!stored || stored.revoked) return null;
    const purpose = stored.record.purpose ?? "session";
    if (purpose !== (options?.purpose ?? "session")) return null;
    return {
        sub: stored.record.subject,
        role: stored.record.role,
        providerId: stored.record.providerId,
        setupPending: stored.record.setupPending === true,
    };
}

export function getAccessTokenTtlSeconds(token: string): number | null {
    const stored = getStoredAccessTokenRecord(token);
    if (!stored || stored.revoked || stored.record.expiresAt === null) {
        return null;
    }
    return Math.max(
        0,
        Math.round(
            (stored.record.expiresAt - (stored.record.issuedAt ?? Date.now())) /
                1000,
        ),
    );
}

export function consumeAccessToken(token: string): {
    sub: string;
    role: AccessRole;
    providerId: string;
    setupPending: boolean;
} | null;
export function consumeAccessToken(
    token: string,
    options: { purpose: "session" | "password-reset" | "share" },
): {
    sub: string;
    role: AccessRole;
    providerId: string;
    setupPending: boolean;
} | null;
export function consumeAccessToken(
    token: string,
    options?: { purpose: "session" | "password-reset" | "share" },
): {
    sub: string;
    role: AccessRole;
    providerId: string;
    setupPending: boolean;
} | null {
    pruneExpiredTokens();
    const tokenHash = hashToken(token);
    const record = tokenStore.get(tokenHash);
    if (!record) return null;
    const purpose = record.purpose ?? "session";
    if (purpose !== (options?.purpose ?? "session")) return null;
    tokenStore.delete(tokenHash);
    revokedTokenStore.set(tokenHash, record);
    verifiedAtByToken.delete(tokenHash);
    invalidatedVerificationTokens.delete(tokenHash);
    persistTokenStore();
    return {
        sub: record.subject,
        role: record.role,
        providerId: record.providerId,
        setupPending: record.setupPending === true,
    };
}

export function revokeAccessToken(rawToken: string): boolean {
    pruneExpiredTokens();
    const tokenHash = hashToken(rawToken);
    const record = tokenStore.get(tokenHash);
    if (!record) return false;
    if (record.expiresAt !== null && record.expiresAt < Date.now())
        return false;
    tokenStore.delete(tokenHash);
    revokedTokenStore.set(tokenHash, record);
    verifiedAtByToken.delete(tokenHash);
    invalidatedVerificationTokens.delete(tokenHash);
    persistTokenStore();
    return true;
}

export function revokeAccessTokensForSubject(subject: string): number {
    let removed = 0;
    for (const [tokenHash, record] of tokenStore.entries()) {
        if (record.subject !== subject) continue;
        tokenStore.delete(tokenHash);
        revokedTokenStore.set(tokenHash, record);
        verifiedAtByToken.delete(tokenHash);
        invalidatedVerificationTokens.delete(tokenHash);
        removed++;
    }
    if (removed > 0) {
        persistTokenStore();
    }
    return removed;
}

export function revokeSetupPendingAccessTokens(): number {
    let removed = 0;
    for (const [tokenHash, record] of tokenStore.entries()) {
        if (record.setupPending !== true) continue;
        tokenStore.delete(tokenHash);
        revokedTokenStore.set(tokenHash, record);
        verifiedAtByToken.delete(tokenHash);
        invalidatedVerificationTokens.delete(tokenHash);
        removed++;
    }
    persistTokenStore();
    return removed;
}

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

loadTokenStore();

export function issueAccessToken(
    subject: string,
    role: AccessRole,
    ttlSeconds: number | null,
    options?: {
        issuedAt?: number;
        providerId?: string;
        setupPending?: boolean;
        purpose?: "session" | "password-reset" | "share";
    },
): string {
    pruneExpiredTokens();
    if (tokenStore.size >= MAX_TOKEN_STORE_SIZE) {
        throw new Error("access_token_store_capacity_reached");
    }
    const token = `cgs_${randomBytes(32).toString("base64url")}`;
    const issuedAt = options?.issuedAt ?? Date.now();
    const normalizedProviderId =
        typeof options?.providerId === "string"
            ? options.providerId.trim()
            : "";
    const providerId = normalizedProviderId || "local";
    const expiresAt = ttlSeconds === null ? null : issuedAt + ttlSeconds * 1000;
    tokenStore.set(hashToken(token), {
        subject,
        role,
        providerId,
        expiresAt,
        issuedAt,
        setupPending: options?.setupPending === true,
        purpose: options?.purpose ?? "session",
    });
    try {
        persistTokenStore();
    } catch (error) {
        tokenStore.delete(hashToken(token));
        throw error;
    }
    return token;
}

/**
 * Returns true when the given raw token was issued or last password-verified
 * within the specified millisecond window. Used by the /auth/verify route to
 * skip re-confirmation for recently authenticated sessions.
 */
export function isTokenVerificationFresh(
    rawToken: string,
    windowMs: number,
): boolean {
    const tokenHash = hashToken(rawToken);
    const record = tokenStore.get(tokenHash);
    if (!record) return false;
    if (invalidatedVerificationTokens.has(tokenHash)) return false;
    const now = Date.now();
    if (record.issuedAt && now - record.issuedAt <= windowMs) return true;
    const lastVerified = verifiedAtByToken.get(tokenHash);
    return lastVerified !== undefined && now - lastVerified <= windowMs;
}

export function invalidateTokenVerification(rawToken: string): void {
    const tokenHash = hashToken(rawToken);
    if (!tokenStore.has(tokenHash)) return;
    verifiedAtByToken.delete(tokenHash);
    invalidatedVerificationTokens.add(tokenHash);
}

/**
 * Records that the user successfully confirmed their password for this token.
 * Subsequent calls to isTokenVerificationFresh within the window return true.
 */
export function recordTokenVerification(rawToken: string): void {
    const tokenHash = hashToken(rawToken);
    if (!tokenStore.has(tokenHash)) return;
    invalidatedVerificationTokens.delete(tokenHash);
    verifiedAtByToken.set(tokenHash, Date.now());
}
