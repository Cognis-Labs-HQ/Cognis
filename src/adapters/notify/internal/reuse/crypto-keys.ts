/**
 * Per-user AES-GCM encryption key derivation for the internal notification store.
 *
 * Each user's notification content is encrypted with a unique AES-256-GCM key
 * derived from a server-side secret and the user's account ID using HKDF-SHA-256.
 * Notifications remain encrypted at rest; decryption requires both the key
 * material held by the running server and the correct user ID.
 *
 * Public exports:
 *   getServerSecret()    — reads NOTIFICATION_ENCRYPT_SECRET from the environment.
 *   deriveUserKey(userId, serverSecret) — derives a per-user CryptoKey via HKDF.
 *   encryptPayload(key, plaintext) — AES-GCM encryption; returns hex iv + ciphertext.
 *   decryptPayload(key, iv, ciphertext) — AES-GCM decryption; returns plaintext.
 *
 * @example
 *   const secret = getServerSecret();
 *   const key = await deriveUserKey('alice', secret);
 *   const { iv, ciphertext } = await encryptPayload(key, JSON.stringify(payload));
 *   const plain = await decryptPayload(key, iv, ciphertext);
 *
 * @module notify-internal/reuse/crypto-keys
 */

const ENCRYPT_ALG = "AES-GCM";
const IV_BYTES = 12;
const KEY_BITS = 256;
const HKDF_SALT = new TextEncoder().encode("cognis-notifications-v1");

/**
 * Reads the server secret from the NOTIFICATION_ENCRYPT_SECRET environment
 * variable. Returns an empty string if the variable is not set; callers should
 * log a warning in that case as notifications will be encrypted with a
 * deployment-wide default key.
 */
export function getServerSecret(): string {
    return process.env.NOTIFICATION_ENCRYPT_SECRET ?? "";
}

/**
 * Derives a per-user AES-256-GCM CryptoKey using HKDF-SHA-256.
 *
 * @param userId - The account ID (username) of the notification recipient.
 * @param serverSecret - The server-side secret string from getServerSecret().
 * @returns A non-extractable CryptoKey for encrypt/decrypt operations.
 */
export async function deriveUserKey(
    userId: string,
    serverSecret: string,
): Promise<CryptoKey> {
    const subtle = globalThis.crypto.subtle;
    const enc = new TextEncoder();
    const keyMaterial =
        serverSecret.length > 0
            ? enc.encode(serverSecret)
            : enc.encode(
                  "default-insecure-key-set-NOTIFICATION_ENCRYPT_SECRET",
              );

    const baseKey = await subtle.importKey(
        "raw",
        keyMaterial,
        { name: "HKDF" },
        false,
        ["deriveKey"],
    );

    return subtle.deriveKey(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: HKDF_SALT,
            info: enc.encode(`user:${userId}`),
        },
        baseKey,
        { name: ENCRYPT_ALG, length: KEY_BITS },
        false,
        ["encrypt", "decrypt"],
    );
}

/**
 * Encrypts plaintext with AES-256-GCM using the provided key.
 *
 * @param key - A CryptoKey derived from deriveUserKey().
 * @param plaintext - The UTF-8 string to encrypt.
 * @returns Hex-encoded IV and ciphertext (including the GCM authentication tag).
 */
export async function encryptPayload(
    key: CryptoKey,
    plaintext: string,
): Promise<{ iv: string; ciphertext: string }> {
    const subtle = globalThis.crypto.subtle;
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const encrypted = await subtle.encrypt(
        { name: ENCRYPT_ALG, iv },
        key,
        new TextEncoder().encode(plaintext),
    );
    return {
        iv: Buffer.from(iv).toString("hex"),
        ciphertext: Buffer.from(encrypted).toString("hex"),
    };
}

/**
 * Decrypts AES-256-GCM ciphertext using the provided key.
 *
 * @param key - The CryptoKey used to encrypt (derived from deriveUserKey()).
 * @param iv - Hex-encoded IV returned by encryptPayload().
 * @param ciphertext - Hex-encoded ciphertext returned by encryptPayload().
 * @returns The decrypted UTF-8 string.
 * @throws If the key, IV, or ciphertext does not match (authentication failure).
 */
export async function decryptPayload(
    key: CryptoKey,
    iv: string,
    ciphertext: string,
): Promise<string> {
    const subtle = globalThis.crypto.subtle;
    const decrypted = await subtle.decrypt(
        { name: ENCRYPT_ALG, iv: Buffer.from(iv, "hex") },
        key,
        Buffer.from(ciphertext, "hex"),
    );
    return new TextDecoder().decode(decrypted);
}
