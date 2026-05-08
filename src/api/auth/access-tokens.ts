import { randomBytes, createHash } from "node:crypto";
import {
    existsSync,
    mkdirSync,
    readFileSync,
    renameSync,
    writeFileSync,
} from "node:fs";
import path from "node:path";

export type AccessRole = "user" | "teacher" | "moderator" | "admin";

interface AccessTokenRecord {
    subject: string;
    role: AccessRole;
    expiresAt: number | null;
}

const tokenStore = new Map<string, AccessTokenRecord>();
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
        value === "admin"
    );
}

function persistTokenStore() {
    try {
        const parent = path.dirname(tokenStorePath);
        mkdirSync(parent, { recursive: true });
        const payload = JSON.stringify(
            { version: 1, tokens: Array.from(tokenStore.entries()) },
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
            console.warn(
                `[auth] failed to persist access token store at ${tokenStorePath}: ${message}`,
            );
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
        const parsed = JSON.parse(raw) as { tokens?: unknown };
        if (!Array.isArray(parsed.tokens)) {
            return;
        }

        for (const entry of parsed.tokens) {
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
            const expiresAt = (record as { expiresAt?: unknown }).expiresAt;

            if (typeof subject !== "string" || !isAccessRole(role)) continue;
            if (expiresAt !== null && typeof expiresAt !== "number") continue;
            if (expiresAt !== null && expiresAt < now) continue;

            tokenStore.set(tokenHash, { subject, role, expiresAt });
            if (tokenStore.size >= MAX_TOKEN_STORE_SIZE) break;
        }
        hasWarnedLoadFailure = false;
    } catch (error) {
        tokenStore.clear();
        if (!hasWarnedLoadFailure) {
            const message =
                error instanceof Error ? error.message : String(error);
            console.warn(
                `[auth] failed to load access token store at ${tokenStorePath}: ${message}`,
            );
            hasWarnedLoadFailure = true;
        }
    }
}

function pruneExpiredTokens(now = Date.now()) {
    let removed = false;
    for (const [tokenHash, record] of tokenStore.entries()) {
        if (record.expiresAt !== null && record.expiresAt < now) {
            tokenStore.delete(tokenHash);
            removed = true;
        }
    }
    if (removed) {
        persistTokenStore();
    }
}

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

loadTokenStore();

export function issueAccessToken(
    subject: string,
    role: AccessRole,
    ttlSeconds: number | null,
): string {
    pruneExpiredTokens();
    if (tokenStore.size >= MAX_TOKEN_STORE_SIZE) {
        throw new Error("access_token_store_capacity_reached");
    }
    const token = `cgs_${randomBytes(32).toString("base64url")}`;
    const expiresAt =
        ttlSeconds === null ? null : Date.now() + ttlSeconds * 1000;
    tokenStore.set(hashToken(token), { subject, role, expiresAt });
    persistTokenStore();
    return token;
}

export function verifyAccessToken(
    token: string,
): { sub: string; role: AccessRole } | null {
    pruneExpiredTokens();
    const tokenHash = hashToken(token);
    const record = tokenStore.get(tokenHash);
    if (!record) return null;
    if (record.expiresAt !== null && record.expiresAt < Date.now()) {
        tokenStore.delete(tokenHash);
        persistTokenStore();
        return null;
    }
    return { sub: record.subject, role: record.role };
}

export function revokeAccessTokensForSubject(subject: string): number {
    let removed = 0;
    for (const [tokenHash, record] of tokenStore.entries()) {
        if (record.subject !== subject) continue;
        tokenStore.delete(tokenHash);
        removed++;
    }
    if (removed > 0) {
        persistTokenStore();
    }
    return removed;
}
