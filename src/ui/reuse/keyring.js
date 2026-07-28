/**
 * Encrypted user keyring for secrets that follow an authenticated account.
 * Values are encrypted in the browser; the server API receives only the opaque
 * AES-GCM vault so components and infrastructure never persist plaintext.
 *
 * Public exports:
 *   unlockKeyring(password) — unlocks the newest local or server vault.
 *   lockKeyring() — forgets decrypted values and the derived key.
 *   getKeyringValue(id) / setKeyringValue(id, value, metadata) — read/write.
 *   deleteKeyringValue(id) / listKeyringEntries() — manage stored entries.
 *   resolveKeyringValue(id, options) — validate a stored value and recover by
 *     prompting or an authoritative fallback when it is invalid.
 *   getKeyringRelockMinutes() / setKeyringRelockMinutes(minutes) — relocking.
 *
 * Usage:
 *   await unlockKeyring(loginPassword);
 *   await setKeyringValue('meeting:123:password', secret, { label: 'Meeting' });
 *   const password = await resolveKeyringValue('meeting:123:password', {
 *     validate: value => value.length > 0,
 *     prompt: ({ invalid }) => askForPassword(invalid),
 *   });
 *
 * @param {string} password Account password used only to derive an AES key.
 * @returns {Promise<boolean>} Whether the vault was successfully unlocked.
 */

import { apiFetch } from "./api-client.js";
import { uiCtx } from "./ui-ctx.js";

const STORAGE_KEY = "cognis_secure_keyring";
const KEYRING_API = "/api/v1/auth/keyring";
const DEFAULT_ITERATIONS = 310_000;
let vaultKey = null;
let vaultData = null;
let vaultSalt = null;
let vaultIterations = DEFAULT_ITERATIONS;
let relockTimer = null;
let lastVaultEnvelope = null;
const pendingValues = new Map();

function keyringStorageKey() {
    const accountId = String(
        localStorage.getItem("cognis_account") ?? "",
    ).trim();
    return accountId
        ? `${STORAGE_KEY}:${encodeURIComponent(accountId)}`
        : STORAGE_KEY;
}

function encodeBytes(bytes) {
    return btoa(String.fromCharCode(...bytes));
}

function decodeBytes(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function normalizeEntry(value, id) {
    if (value && typeof value === "object" && "value" in value) {
        return {
            value: String(value.value ?? ""),
            label: String(value.label ?? id),
            source: String(value.source ?? "user"),
            updatedAt: String(value.updatedAt ?? new Date(0).toISOString()),
        };
    }
    return {
        value: String(value ?? ""),
        label: String(id),
        source: "legacy",
        updatedAt: new Date(0).toISOString(),
    };
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

function clearVault(clearPendingValues) {
    clearTimeout(relockTimer);
    relockTimer = null;
    vaultKey = null;
    vaultData = null;
    vaultSalt = null;
    lastVaultEnvelope = null;
    if (clearPendingValues) pendingValues.clear();
}

async function loadRemoteEnvelope() {
    try {
        const response = await apiFetch(KEYRING_API);
        if (!response.ok) return null;
        const payload = await response.json();
        return payload?.data?.vault ?? null;
    } catch {
        return null;
    }
}

function envelopeTimestamp(envelope) {
    const timestamp = Date.parse(String(envelope?.updatedAt ?? ""));
    return Number.isFinite(timestamp) ? timestamp : 0;
}

async function syncEnvelope(envelope) {
    try {
        await apiFetch(KEYRING_API, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ vault: envelope }),
        });
    } catch {
        // The encrypted local copy remains authoritative while offline.
    }
}

async function persistVault() {
    if (!vaultKey || !vaultData || !vaultSalt)
        throw new Error("keyring_locked");
    const initializationVector = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: initializationVector },
        vaultKey,
        new TextEncoder().encode(JSON.stringify(vaultData)),
    );
    const envelope = {
        version: 1,
        iterations: vaultIterations,
        salt: encodeBytes(vaultSalt),
        iv: encodeBytes(initializationVector),
        cipher: encodeBytes(new Uint8Array(cipher)),
        updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(keyringStorageKey(), JSON.stringify(envelope));
    lastVaultEnvelope = envelope;
    await syncEnvelope(envelope);
}

export async function unlockKeyring(password) {
    const normalizedPassword = String(password ?? "");
    if (!normalizedPassword) return false;
    clearVault(false);
    let localEnvelope = null;
    try {
        localEnvelope = JSON.parse(
            localStorage.getItem(keyringStorageKey()) ||
                localStorage.getItem(STORAGE_KEY) ||
                "null",
        );
    } catch {
        localEnvelope = null;
    }
    const remoteEnvelope = await loadRemoteEnvelope();
    const stored =
        envelopeTimestamp(remoteEnvelope) > envelopeTimestamp(localEnvelope)
            ? remoteEnvelope
            : localEnvelope;
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
    lastVaultEnvelope = stored;
    vaultData.values ??= {};
    for (const [id, entry] of Object.entries(vaultData.values)) {
        vaultData.values[id] = normalizeEntry(entry, id);
    }
    for (const [id, entry] of pendingValues) vaultData.values[id] = entry;
    pendingValues.clear();
    if (remoteEnvelope === stored && stored) {
        localStorage.setItem(keyringStorageKey(), JSON.stringify(stored));
    }
    if (!stored || Object.keys(vaultData.values).length > 0)
        await persistVault();
    scheduleRelock();
    return true;
}

export function lockKeyring() {
    clearVault(true);
}

export function getKeyringValue(id) {
    const normalizedId = String(id);
    const entry = vaultData
        ? vaultData.values?.[normalizedId]
        : pendingValues.get(normalizedId);
    if (vaultData) scheduleRelock();
    return entry ? normalizeEntry(entry, normalizedId).value : null;
}

export async function setKeyringValue(id, value, metadata = {}) {
    const normalizedId = String(id);
    const entry = {
        value: String(value),
        label: String(metadata.label ?? normalizedId),
        source: String(metadata.source ?? "user"),
        updatedAt: new Date().toISOString(),
    };
    if (!vaultData) {
        pendingValues.set(normalizedId, entry);
        return;
    }
    vaultData.values ??= {};
    vaultData.values[normalizedId] = entry;
    await persistVault();
    scheduleRelock();
}

export async function deleteKeyringValue(id) {
    const normalizedId = String(id);
    pendingValues.delete(normalizedId);
    if (!vaultData?.values || !(normalizedId in vaultData.values)) return false;
    delete vaultData.values[normalizedId];
    await persistVault();
    scheduleRelock();
    return true;
}

export function listKeyringEntries() {
    const values = vaultData?.values ?? Object.fromEntries(pendingValues);
    return Object.entries(values)
        .map(([id, entry]) => ({ id, ...normalizeEntry(entry, id) }))
        .sort((left, right) => left.label.localeCompare(right.label));
}

export async function resolveKeyringValue(id, options = {}) {
    const stored = getKeyringValue(id);
    if (stored !== null) {
        let valid = true;
        try {
            valid = options.validate ? await options.validate(stored) : true;
        } catch {
            valid = false;
        }
        if (valid) return stored;
        await deleteKeyringValue(id);
        options.onInvalid?.(id);
    }
    const replacement = options.fallback
        ? await options.fallback({ invalid: stored !== null })
        : options.prompt
          ? await options.prompt({ invalid: stored !== null })
          : null;
    if (
        replacement === null ||
        replacement === undefined ||
        replacement === ""
    ) {
        return null;
    }
    await setKeyringValue(id, replacement, options.metadata);
    return String(replacement);
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
uiCtx.capabilities.contribute("keyring:delete", deleteKeyringValue);
uiCtx.capabilities.contribute("keyring:list", listKeyringEntries);
uiCtx.capabilities.contribute("keyring:resolve", resolveKeyringValue);
uiCtx.capabilities.contribute("keyring:lock", lockKeyring);
uiCtx.capabilities.contribute(
    "keyring:getRelockMinutes",
    getKeyringRelockMinutes,
);
uiCtx.capabilities.contribute(
    "keyring:setRelockMinutes",
    setKeyringRelockMinutes,
);
