/**
 * Cryptographic utilities shared across the API and adapter layers.
 *
 * Public exports:
 *   sha256Of(content) — lowercase hex SHA-256 digest of a UTF-8 string.
 *   getDataEncryptionKey() — reads DATA_ENCRYPTION_KEY from the environment.
 *   deriveScopedKey(scope, secret) — derives a per-scope AES-256-GCM CryptoKey
 *     via HKDF-SHA-256. The scope string namespaces the key (e.g.
 *     'user:notifications:alice', 'mfa:bob', 'media:room42'), so any subsystem
 *     that needs to encrypt sensitive data at rest can derive an isolated key
 *     without sharing the underlying server secret.
 *   encryptPayload(key, plaintext) — AES-GCM encryption; returns hex iv +
 *     ciphertext (including the GCM authentication tag).
 *   decryptPayload(key, iv, ciphertext) — AES-GCM decryption; returns the
 *     original UTF-8 plaintext. Throws on authentication failure.
 *
 * @example
 *   const secret = getDataEncryptionKey();
 *   const key = await deriveScopedKey('user:notifications:alice', secret);
 *   const { iv, ciphertext } = await encryptPayload(key, JSON.stringify(data));
 *   const plain = await decryptPayload(key, iv, ciphertext);
 *
 * @module api/reuse/crypto
 */

import { createHash } from "node:crypto";

const ENCRYPT_ALG = "AES-GCM";
const IV_BYTES = 12;
const KEY_BITS = 256;
const HKDF_SALT = new TextEncoder().encode("cognis-data-v1");
const DEFAULT_INSECURE_KEY_MATERIAL =
    "default-insecure-key-set-DATA_ENCRYPTION_KEY";

/**
 * @param content - UTF-8 string to hash.
 * @returns Lowercase hex-encoded SHA-256 digest.
 */
export function sha256Of(content: string): string {
    return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Reads the server-side data encryption key from the DATA_ENCRYPTION_KEY
 * environment variable. Returns an empty string if the variable is unset;
 * callers should log a warning in that case as data will be encrypted with a
 * deployment-wide default key.
 */
export function getDataEncryptionKey(): string {
    return process.env.DATA_ENCRYPTION_KEY ?? "";
}

/**
 * Derives a per-scope AES-256-GCM CryptoKey using HKDF-SHA-256.
 *
 * The scope string is mixed into the HKDF `info` parameter, so different
 * scopes derive cryptographically independent keys from the same server
 * secret. Use a stable, namespaced scope per subsystem and entity, for
 * example: `user:notifications:${username}` or `media:room:${roomId}`.
 *
 * @param scope - Stable namespaced identifier for the data being encrypted.
 * @param serverSecret - Server-side secret string from getDataEncryptionKey().
 * @returns A non-extractable CryptoKey for encrypt/decrypt operations.
 */
export async function deriveScopedKey(
    scope: string,
    serverSecret: string,
): Promise<CryptoKey> {
    const subtle = globalThis.crypto.subtle;
    const enc = new TextEncoder();
    const keyMaterial =
        serverSecret.length > 0
            ? enc.encode(serverSecret)
            : enc.encode(DEFAULT_INSECURE_KEY_MATERIAL);

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
            info: enc.encode(scope),
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
 * @param key - A CryptoKey derived from deriveScopedKey().
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
 * @param key - The CryptoKey used to encrypt (derived from deriveScopedKey()).
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
