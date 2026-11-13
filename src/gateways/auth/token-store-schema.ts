import type { AccessRole } from "@cognis/core";

export interface AccessTokenRecord {
    subject: string;
    role: AccessRole;
    providerId: string;
    expiresAt: number | null;
    issuedAt: number;
    setupPending: boolean;
    purpose: "session" | "password-reset" | "share";
}

const recordKeys = [
    "subject",
    "role",
    "providerId",
    "expiresAt",
    "issuedAt",
    "setupPending",
    "purpose",
];

function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseTokenStoreEnvelope(value: unknown): {
    tokens: unknown[];
    revokedTokens: unknown[];
} {
    if (
        !isObject(value) ||
        value.version !== 2 ||
        Object.keys(value).length !== 3 ||
        !Array.isArray(value.tokens) ||
        !Array.isArray(value.revokedTokens)
    )
        throw new Error("unsupported_access_token_store");
    return { tokens: value.tokens, revokedTokens: value.revokedTokens };
}

export function parseTokenStoreEntry(
    value: unknown,
    now: number,
): [string, AccessTokenRecord] | null {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const [tokenHash, record] = value;
    if (
        typeof tokenHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(tokenHash) ||
        !isObject(record)
    )
        return null;
    if (
        Object.keys(record).length !== recordKeys.length ||
        recordKeys.some((key) => !Object.hasOwn(record, key))
    )
        return null;
    const {
        subject,
        role,
        providerId,
        expiresAt,
        issuedAt,
        setupPending,
        purpose,
    } = record;
    if (
        typeof subject !== "string" ||
        !subject.trim() ||
        subject !== subject.trim()
    )
        return null;
    if (
        typeof providerId !== "string" ||
        !providerId.trim() ||
        providerId !== providerId.trim()
    )
        return null;
    if (
        role !== "user" &&
        role !== "teacher" &&
        role !== "moderator" &&
        role !== "admin" &&
        role !== "owner"
    )
        return null;
    if (
        typeof issuedAt !== "number" ||
        !Number.isSafeInteger(issuedAt) ||
        issuedAt < 0 ||
        issuedAt > now
    )
        return null;
    if (
        expiresAt !== null &&
        (typeof expiresAt !== "number" ||
            !Number.isSafeInteger(expiresAt) ||
            expiresAt < issuedAt)
    )
        return null;
    if (typeof setupPending !== "boolean") return null;
    if (
        purpose !== "session" &&
        purpose !== "password-reset" &&
        purpose !== "share"
    )
        return null;
    if (setupPending && purpose !== "session") return null;
    return [
        tokenHash,
        {
            subject,
            role,
            providerId,
            expiresAt,
            issuedAt,
            setupPending,
            purpose,
        },
    ];
}
