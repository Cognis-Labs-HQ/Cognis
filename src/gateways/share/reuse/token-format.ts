import { createHash, randomBytes, randomUUID } from "node:crypto";

export function hashShareSecret(secret: string): string {
    return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function issueShareTokenValue(): {
    tokenId: string;
    secret: string;
    tokenValue: string;
    tokenHash: string;
} {
    const tokenId = randomUUID();
    const secret = randomBytes(24).toString("base64url");
    return {
        tokenId,
        secret,
        tokenValue: `shr_${tokenId}.${secret}`,
        tokenHash: hashShareSecret(secret),
    };
}

export function parseShareToken(rawToken: string): {
    tokenId: string;
    secret: string;
    tokenHash: string;
} | null {
    const normalizedToken = String(rawToken ?? "").trim();
    if (!normalizedToken.startsWith("shr_")) {
        return null;
    }
    const tokenBody = normalizedToken.slice(4);
    const dotIndex = tokenBody.indexOf(".");
    if (dotIndex <= 0 || dotIndex === tokenBody.length - 1) {
        return null;
    }
    const tokenId = tokenBody.slice(0, dotIndex).trim();
    const secret = tokenBody.slice(dotIndex + 1).trim();
    if (!tokenId || !secret) {
        return null;
    }
    return {
        tokenId,
        secret,
        tokenHash: hashShareSecret(secret),
    };
}
