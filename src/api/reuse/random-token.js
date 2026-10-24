import { randomBytes } from "node:crypto";

export function createUrlSafeRandomToken(byteLength = 18) {
    const normalizedByteLength = Number(byteLength);
    if (!Number.isInteger(normalizedByteLength) || normalizedByteLength < 1) {
        throw new Error("Token byte length must be a positive integer.");
    }
    return randomBytes(normalizedByteLength).toString("base64url");
}
