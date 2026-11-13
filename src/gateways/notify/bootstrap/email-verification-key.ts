/** Encodes the notification owner's opaque account/email verification identity. */
export function emailVerificationKey(accountId: string, email: string): string {
    return JSON.stringify([accountId, email]);
}

/** Decodes a verified token's identity without treating SSO namespace colons as separators. */
export function parseEmailVerificationKey(
    key: string,
): [string, string] | null {
    try {
        const value: unknown = JSON.parse(key);
        return Array.isArray(value) &&
            value.length === 2 &&
            value.every((part) => typeof part === "string" && part.length > 0)
            ? (value as [string, string])
            : null;
    } catch {
        // A token whose opaque identity is malformed cannot authorize verification.
        return null;
    }
}
