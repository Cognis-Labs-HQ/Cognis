import { randomBytes, createHash } from "node:crypto";
import {
    existsSync,
    mkdirSync,
    readFileSync,
    renameSync,
    writeFileSync,
} from "node:fs";
import path from "node:path";
import { logAppEvent as log } from "../../api/logger.js";

export type AccessRole = "user" | "teacher" | "moderator" | "admin" | "owner";

interface AccessTokenRecord {
    subject: string;
    role: AccessRole;
    providerId: string;
    expiresAt: number | null;
    issuedAt?: number;
    tfaSetupPending?: boolean;
}

const tokenStore = new Map<string, AccessTokenRecord>();
const revokedTokenStore = new Map<string, AccessTokenRecord>();
const verifiedAtByToken = new Map<string, number>();
const MAX_TOKEN_STORE_SIZE = 10_000;
const tokenStorePath =
    process.env.COGNIS_ACCESS_TOKEN_STORE_PATH ??
    "/app/config/access-tokens.json";
let hasWarnedPersistFailure = false;
let hasWarnedLoadFailure = false;

function isAccessRole(value: unknown): value is AccessRole {
    return (
        value === "user" ||
        value === "teacher" ||
        value === "moderator" ||
        value === "admin" ||
        value === "owner"
    );
}

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
            const message =
                error instanceof Error ? error.message : String(error);
            log("warn", "Failed to persist access token store.", {
                component: "auth",
                path: tokenStorePath,
                error: message,
            });
            hasWarnedPersistFailure = true;
        }
        // Keep API available even if persistence is not writable in a given runtime.
    }
}

function loadTokenStore(now = Date.now()) {
    try {
        if (!existsSync(tokenStorePath)) {
            return;
        }
        const raw = readFileSync(tokenStorePath, "utf8");
        const parsed = JSON.parse(raw) as {
            tokens?: unknown;
            revokedTokens?: unknown;
        };
        if (!Array.isArray(parsed.tokens)) {
            return;
        }

        const loadEntries = (
            entries: unknown[],
            store: Map<string, AccessTokenRecord>,
        ) => {
            for (const entry of entries) {
                if (!Array.isArray(entry) || entry.length !== 2) continue;
                const [tokenHash, record] = entry;
                if (
                    typeof tokenHash !== "string" ||
                    !record ||
                    typeof record !== "object"
                )
                    continue;

                const subject = (record as { subject?: unknown }).subject;
                const role = (record as { role?: unknown }).role;
                const providerId = (record as { providerId?: unknown })
                    .providerId;
                const expiresAt = (record as { expiresAt?: unknown }).expiresAt;
                const issuedAt = (record as { issuedAt?: unknown }).issuedAt;
                const tfaSetupPending = (
                    record as { tfaSetupPending?: unknown }
                ).tfaSetupPending;

                if (typeof subject !== "string" || !isAccessRole(role))
                    continue;
                if (typeof providerId !== "string" || !providerId.trim())
                    continue;
                if (expiresAt !== null && typeof expiresAt !== "number")
                    continue;
                if (expiresAt !== null && expiresAt < now) continue;
                if (issuedAt !== undefined && typeof issuedAt !== "number")
                    continue;
                if (
                    tfaSetupPending !== undefined &&
                    typeof tfaSetupPending !== "boolean"
                ) {
                    continue;
                }

                store.set(tokenHash, {
                    subject,
                    role,
                    providerId,
                    expiresAt,
                    issuedAt,
                    tfaSetupPending,
                });
                if (store.size >= MAX_TOKEN_STORE_SIZE) break;
            }
        };

        loadEntries(parsed.tokens, tokenStore);

        if (Array.isArray(parsed.revokedTokens)) {
            loadEntries(parsed.revokedTokens, revokedTokenStore);
        }

        hasWarnedLoadFailure = false;
    } catch (error) {
        tokenStore.clear();
        revokedTokenStore.clear();
        if (!hasWarnedLoadFailure) {
            const message =
                error instanceof Error ? error.message : String(error);
            log("warn", "Failed to load access token store.", {
                component: "auth",
                path: tokenStorePath,
                error: message,
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
    tfaSetupPending: boolean;
} | null {
    const stored = getStoredAccessTokenRecord(token);
    if (!stored) return null;
    return {
        sub: stored.record.subject,
        role: stored.record.role,
        providerId: stored.record.providerId,
        revoked: stored.revoked,
        tfaSetupPending: stored.record.tfaSetupPending === true,
    };
}

export function verifyAccessToken(token: string): {
    sub: string;
    role: AccessRole;
    providerId: string;
    tfaSetupPending: boolean;
} | null {
    const stored = getStoredAccessTokenRecord(token);
    if (!stored || stored.revoked) return null;
    return {
        sub: stored.record.subject,
        role: stored.record.role,
        providerId: stored.record.providerId,
        tfaSetupPending: stored.record.tfaSetupPending === true,
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
        removed++;
    }
    if (removed > 0) {
        persistTokenStore();
    }
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
        tfaSetupPending?: boolean;
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
        tfaSetupPending: options?.tfaSetupPending === true,
    });
    persistTokenStore();
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
    const now = Date.now();
    if (record.issuedAt && now - record.issuedAt <= windowMs) return true;
    const lastVerified = verifiedAtByToken.get(tokenHash);
    return lastVerified !== undefined && now - lastVerified <= windowMs;
}

/**
 * Records that the user successfully confirmed their password for this token.
 * Subsequent calls to isTokenVerificationFresh within the window return true.
 */
export function recordTokenVerification(rawToken: string): void {
    const tokenHash = hashToken(rawToken);
    if (!tokenStore.has(tokenHash)) return;
    verifiedAtByToken.set(tokenHash, Date.now());
}
