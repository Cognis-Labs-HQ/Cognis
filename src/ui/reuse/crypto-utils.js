/**
 * Browser-side cryptographic helpers for AES-GCM operations.
 *
 * Public exports:
 * - `hexToBytes(hex)` Converts a hex string to a `Uint8Array`.
 * - `bytesToHex(bytes)` Converts a `Uint8Array` to a lowercase hex string.
 * - `importRoomKey(hex, usages)` Imports a raw AES-GCM key from a hex string.
 *
 * @example
 * ```js
 * import { hexToBytes, bytesToHex, importRoomKey } from '/static/reuse/crypto-utils.js';
 * const key = await importRoomKey(keyHex, ['encrypt', 'decrypt']);
 * const iv  = crypto.getRandomValues(new Uint8Array(12));
 * ```
 *
 * @param {string} hex Lowercase hex string (even length).
 * @returns {Uint8Array} Raw bytes.
 */

export function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

/**
 * @param {Uint8Array} bytes
 * @returns {string} Lowercase hex string.
 */
export function bytesToHex(bytes) {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * @param {string} hex Raw AES-GCM key as a hex string.
 * @param {KeyUsage[]} [usages] Allowed key operations. Defaults to `['encrypt', 'decrypt']`.
 * @returns {Promise<CryptoKey>}
 */
export async function importRoomKey(hex, usages = ["encrypt", "decrypt"]) {
    return crypto.subtle.importKey(
        "raw",
        hexToBytes(hex),
        { name: "AES-GCM" },
        false,
        usages,
    );
}
