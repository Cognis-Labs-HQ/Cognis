import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

export function generateSharePassword(): string {
    return randomBytes(9).toString("base64url");
}

const SHARE_PASSWORD_KDF_ALGO = "pbkdf2_sha512";
const SHARE_PASSWORD_KDF_DIGEST = "sha512";
const SHARE_PASSWORD_KDF_ITERATIONS = 210000;
const SHARE_PASSWORD_KDF_KEYLEN = 32;

export function hashSharePassword(password: string): string {
    const normalized = String(password ?? "");
    const salt = randomBytes(16);
    const derived = pbkdf2Sync(
        normalized,
        salt,
        SHARE_PASSWORD_KDF_ITERATIONS,
        SHARE_PASSWORD_KDF_KEYLEN,
        SHARE_PASSWORD_KDF_DIGEST,
    );
    return `${SHARE_PASSWORD_KDF_ALGO}$${SHARE_PASSWORD_KDF_ITERATIONS}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifySharePassword(
    password: string,
    storedHash: string,
): boolean {
    const normalized = String(password ?? "");
    const encoded = String(storedHash ?? "");
    const parts = encoded.split("$");
    if (parts.length === 4 && parts[0] === SHARE_PASSWORD_KDF_ALGO) {
        const iterations = Number(parts[1]);
        const saltHex = parts[2];
        const expectedHex = parts[3];
        if (!Number.isFinite(iterations) || iterations <= 0) {
            return false;
        }
        const salt = Buffer.from(saltHex, "hex");
        const expected = Buffer.from(expectedHex, "hex");
        const actual = pbkdf2Sync(
            normalized,
            salt,
            iterations,
            expected.length || SHARE_PASSWORD_KDF_KEYLEN,
            SHARE_PASSWORD_KDF_DIGEST,
        );
        return (
            expected.length === actual.length &&
            timingSafeEqual(expected, actual)
        );
    }
    return false;
}
