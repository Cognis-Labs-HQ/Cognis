/**
 * Encrypted browser keyring for secrets that should follow an authenticated
 * session without being stored as plaintext.
 *
 * Public exports:
 *   unlockKeyring(password) — derives the in-memory vault key at login.
 *   lockKeyring() — immediately forgets the derived key and decrypted values.
 *   getKeyringValue(id) — retrieves a secret by capability-owned identifier.
 *   setKeyringValue(id, value) — encrypts and persists a secret.
 *   getKeyringRelockMinutes() / setKeyringRelockMinutes(minutes) — controls
 *     automatic relocking; zero keeps the keyring open until logout.
 *
 * Usage:
 *   await unlockKeyring(loginPassword);
 *   await setKeyringValue('share:token-id', sharePassword);
 *   const password = getKeyringValue('share:token-id');
 *
 * @param {string} password Account password used only to derive an AES key.
 * @returns {Promise<boolean>} Whether the vault was successfully unlocked.
 */

import { uiCtx } from "./ui-ctx.js";

const STORAGE_KEY = "cognis_secure_keyring";
const DEFAULT_ITERATIONS = 310_000;
let vaultKey = null;
let vaultData = null;
let vaultSalt = null;
let vaultIterations = DEFAULT_ITERATIONS;
let relockTimer = null;

function encodeBytes(bytes) {
    return btoa(String.fromCharCode(...bytes));
}

function decodeBytes(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function deriveKey(password, salt, iterations) {
    const material = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
}

function scheduleRelock() {
    clearTimeout(relockTimer);
    const minutes = Number(vaultData?.preferences?.relockMinutes ?? 0);
    if (minutes > 0) relockTimer = setTimeout(lockKeyring, minutes * 60_000);
}

async function persistVault() {
    if (!vaultKey || !vaultData) throw new Error("keyring_locked");
    const salt = vaultSalt;
    if (!salt) throw new Error("keyring_locked");
    const initializationVector = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: initializationVector },
        vaultKey,
        new TextEncoder().encode(JSON.stringify(vaultData)),
    );
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            version: 1,
            iterations: vaultIterations,
            salt: encodeBytes(salt),
            iv: encodeBytes(initializationVector),
            cipher: encodeBytes(new Uint8Array(cipher)),
        }),
    );
}

export async function unlockKeyring(password) {
    const normalizedPassword = String(password ?? "");
    if (!normalizedPassword) return false;
    lockKeyring();
    let stored;
    try {
        stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
        return false;
    }
    const salt = stored?.salt
        ? decodeBytes(stored.salt)
        : crypto.getRandomValues(new Uint8Array(16));
    const iterations = Number(stored?.iterations ?? DEFAULT_ITERATIONS);
    const key = await deriveKey(normalizedPassword, salt, iterations);
    try {
        vaultData = stored?.cipher
            ? JSON.parse(
                  new TextDecoder().decode(
                      await crypto.subtle.decrypt(
                          { name: "AES-GCM", iv: decodeBytes(stored.iv) },
                          key,
                          decodeBytes(stored.cipher),
                      ),
                  ),
              )
            : { values: {}, preferences: { relockMinutes: 0 } };
    } catch {
        vaultData = null;
        return false;
    }
    vaultKey = key;
    vaultSalt = salt;
    vaultIterations = iterations;
    if (!stored) await persistVault();
    scheduleRelock();
    return true;
}

export function lockKeyring() {
    clearTimeout(relockTimer);
    relockTimer = null;
    vaultKey = null;
    vaultData = null;
    vaultSalt = null;
}

export function getKeyringValue(id) {
    if (!vaultData) return null;
    scheduleRelock();
    return vaultData.values?.[String(id)] ?? null;
}

export async function setKeyringValue(id, value) {
    if (!vaultData) throw new Error("keyring_locked");
    vaultData.values ??= {};
    vaultData.values[String(id)] = String(value);
    await persistVault();
    scheduleRelock();
}

export function getKeyringRelockMinutes() {
    return vaultData ? Number(vaultData.preferences?.relockMinutes ?? 0) : null;
}

export async function setKeyringRelockMinutes(minutes) {
    if (!vaultData) throw new Error("keyring_locked");
    vaultData.preferences ??= {};
    vaultData.preferences.relockMinutes = Math.max(0, Number(minutes) || 0);
    await persistVault();
    scheduleRelock();
}

uiCtx.capabilities.contribute("keyring:get", getKeyringValue);
uiCtx.capabilities.contribute("keyring:set", setKeyringValue);
uiCtx.capabilities.contribute("keyring:lock", lockKeyring);
uiCtx.capabilities.contribute(
    "keyring:getRelockMinutes",
    getKeyringRelockMinutes,
);
uiCtx.capabilities.contribute(
    "keyring:setRelockMinutes",
    setKeyringRelockMinutes,
);
