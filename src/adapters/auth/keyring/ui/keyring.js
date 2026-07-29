/**
 * Encrypted user keyring for secrets that follow an authenticated account.
 * Values are encrypted in the browser; the server API receives only the opaque
 * AES-GCM vault so components and infrastructure never persist plaintext.
 *
 * Public exports:
 *   unlockKeyring(password) — unlocks the newest local or server vault.
 *   requestKeyringUnlock() — opens the shared unlock prompt when required.
 *   setupKeyringAfterLogin(password) — initializes or unlocks after login.
 *   lockKeyring() — forgets decrypted values and the derived key.
 *   isKeyringUnlocked() — reports whether decrypted values are available.
 *   getKeyringValue(id) / setKeyringValue(id, value, metadata) — read/write.
 *   deleteKeyringValue(id) / listKeyringEntries() — manage stored entries.
 *   resolveKeyringValue(id, options) — validate a stored value and recover by
 *     prompting or an authoritative fallback when it is invalid.
 *   getKeyringRelockMinutes() / setKeyringRelockMinutes(minutes) — relocking.
 *   createKeyringScope(componentName) — component-attributed access helpers.
 *   activateTemporaryKeyring(accountId, passphrase) — opens a session-only
 *     guest vault that remains unlocked for the guest identity lifetime.
 *   endTemporaryKeyring() — removes the browser copy when that identity ends.
 *
 * Usage:
 *   await unlockKeyring(loginPassword);
 *   await setKeyringValue('meeting:123:password', secret, { label: 'Meeting' });
 *   const password = await resolveKeyringValue('meeting:123:password', {
 *     request: { component: 'Meetings', action: 'join', process: 'meeting 123' },
 *     validate: value => value.length > 0,
 *     prompt: ({ invalid }) => askForPassword(invalid),
 *   });
 *
 * @param {string} password Account password used only to derive an AES key.
 * @returns {Promise<boolean>} Whether the vault was successfully unlocked.
 */

const keyringApiModule = await import(
    typeof window === "undefined"
        ? "../../../../ui/reuse/api-client.js"
        : "/static/reuse/api-client.js"
);
const keyringContextModule = await import(
    typeof window === "undefined"
        ? "../../../../ui/reuse/ui-ctx.js"
        : "/static/reuse/ui-ctx.js"
);
const { apiFetch } = keyringApiModule;
const { uiCtx } = keyringContextModule;
if (typeof window !== "undefined") {
    await import("/static/reuse/flow-registry.js");
}

const STORAGE_KEY = "cognis_secure_keyring";
const RELOCK_STORAGE_KEY = "cognis_secure_keyring_relock_minutes";
const KEYRING_API = "/api/v1/auth/keyring";
const DEFAULT_ITERATIONS = 310_000;
const MAX_KEYRING_EVENTS = 100;
let vaultKey = null;
let vaultData = null;
let vaultSalt = null;
let vaultIterations = DEFAULT_ITERATIONS;
let relockTimer = null;
let lastVaultEnvelope = null;
let temporaryKeyringAccountId = "";
let unlockRequestPromise = null;
let keyringI18nPromise = null;
const pendingValues = new Map();

function loadKeyringI18n() {
    keyringI18nPromise ??= import("/static/reuse/i18n.js").then(
        ({ createI18n }) =>
            createI18n({
                componentStringBaseUrls: [
                    "/static/adapters/auth/keyring/languages",
                ],
            }),
    );
    return keyringI18nPromise;
}

function keyringStorageKey() {
    const accountId = String(
        localStorage.getItem("cognis_account") ?? "",
    ).trim();
    return accountId
        ? `${STORAGE_KEY}:${encodeURIComponent(accountId)}`
        : STORAGE_KEY;
}

function keyringStorage() {
    return temporaryKeyringAccountId ? sessionStorage : localStorage;
}

function relockStorageKey() {
    const accountId = String(
        localStorage.getItem("cognis_account") ?? "",
    ).trim();
    return accountId
        ? `${RELOCK_STORAGE_KEY}:${encodeURIComponent(accountId)}`
        : RELOCK_STORAGE_KEY;
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
    if (temporaryKeyringAccountId) return;
    const minutes = getKeyringRelockMinutes();
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

function loadLocalEnvelope() {
    try {
        return JSON.parse(
            keyringStorage().getItem(keyringStorageKey()) ||
                (temporaryKeyringAccountId
                    ? null
                    : localStorage.getItem(STORAGE_KEY)) ||
                "null",
        );
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
    keyringStorage().setItem(keyringStorageKey(), JSON.stringify(envelope));
    lastVaultEnvelope = envelope;
    await syncEnvelope(envelope);
}

function recordKeyringEvent(type, identifier = "") {
    if (!vaultData) return;
    vaultData.events ??= [];
    vaultData.events.push({
        type: String(type),
        identifier: String(identifier),
        timestamp: new Date().toISOString(),
    });
    vaultData.events = vaultData.events.slice(-MAX_KEYRING_EVENTS);
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cognis:keyring-event"));
    }
}

function persistRecordedEvent() {
    void persistVault().catch(() => undefined);
}

export async function unlockKeyring(password) {
    const normalizedPassword = String(password ?? "");
    if (!normalizedPassword) return false;
    clearVault(false);
    const localEnvelope = loadLocalEnvelope();
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
    vaultData.preferences ??= {};
    const storedRelockMinutes = localStorage.getItem(relockStorageKey());
    if (storedRelockMinutes !== null) {
        vaultData.preferences.relockMinutes = Math.max(
            0,
            Number(storedRelockMinutes) || 0,
        );
    } else {
        localStorage.setItem(
            relockStorageKey(),
            String(vaultData.preferences.relockMinutes ?? 0),
        );
    }
    for (const [id, entry] of Object.entries(vaultData.values)) {
        vaultData.values[id] = normalizeEntry(entry, id);
    }
    for (const [id, entry] of pendingValues) vaultData.values[id] = entry;
    pendingValues.clear();
    recordKeyringEvent("unlock");
    if (remoteEnvelope === stored && stored) {
        keyringStorage().setItem(keyringStorageKey(), JSON.stringify(stored));
    }
    await persistVault();
    scheduleRelock();
    return true;
}

export function lockKeyring() {
    if (temporaryKeyringAccountId) return Promise.resolve();
    clearVault(true);
    return Promise.resolve(
        uiCtx.capabilities.get("auth:invalidatePasswordConfirmation")?.(),
    ).catch(() => {});
}

export async function activateTemporaryKeyring(accountId, passphrase) {
    const normalizedAccountId = String(accountId ?? "").trim();
    const normalizedPassphrase = String(passphrase ?? "");
    if (!normalizedAccountId || !normalizedPassphrase) return false;
    if (localStorage.getItem("cognis_account") !== normalizedAccountId) {
        return false;
    }
    temporaryKeyringAccountId = normalizedAccountId;
    const unlocked = await unlockKeyring(normalizedPassphrase);
    if (!unlocked) temporaryKeyringAccountId = "";
    return unlocked;
}

export function endTemporaryKeyring() {
    if (!temporaryKeyringAccountId) return;
    const storageKey = keyringStorageKey();
    clearVault(true);
    sessionStorage.removeItem(storageKey);
    temporaryKeyringAccountId = "";
}

export function isKeyringUnlocked() {
    return Boolean(vaultData && vaultKey);
}

function normalizeUnlockRequest(request) {
    const normalizedRequest = {
        component: String(request?.component ?? "").trim(),
        action: String(request?.action ?? "").trim(),
        process: String(request?.process ?? "").trim(),
    };
    if (Object.values(normalizedRequest).some((value) => !value)) {
        throw new Error("keyring_unlock_request_context_required");
    }
    return normalizedRequest;
}

export async function requestKeyringUnlock(options = {}) {
    const request = normalizeUnlockRequest(options.request);
    if (isKeyringUnlocked()) return true;
    if (unlockRequestPromise) return unlockRequestPromise;
    unlockRequestPromise = (async () => {
        const i18n = options.i18n ?? (await loadKeyringI18n());
        const message = i18n
            .t("adapter.auth.keyring.unlock_message")
            .replace("{{component}}", request.component)
            .replace("{{action}}", request.action)
            .replace("{{process}}", request.process);
        const passwordPrompt = options.passwordPrompt ?? requestKeyringPassword;
        const password = await passwordPrompt({ i18n, message });
        if (!password) return false;
        const unlocked = await unlockKeyring(password);
        if (!unlocked) {
            const { showToast } = await import("/static/reuse/toast.js");
            showToast(i18n.t("adapter.auth.keyring.unlock_failed"), {
                variant: "warning",
            });
        }
        return unlocked;
    })().finally(() => {
        unlockRequestPromise = null;
    });
    return unlockRequestPromise;
}

async function requestKeyringPassword({ i18n, message }) {
    const [{ openPopup }, { escapeHtml }] = await Promise.all([
        import("/static/reuse/popup.js"),
        import("/static/reuse/escape-html.js"),
    ]);
    let passwordInput = null;
    const result = await openPopup({
        title: i18n.t("adapter.auth.keyring.unlock_title"),
        body: `<label class="stack"><span style="white-space: pre-line">${escapeHtml(message)}</span><input id="keyring-unlock-password" type="password" autocomplete="current-password" required /></label>`,
        actions: [
            {
                id: "unlock",
                label: i18n.t("adapter.auth.keyring.unlock_action"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("adapter.auth.keyring.cancel_action"),
                variant: "cancel",
            },
        ],
        onOpen(overlay) {
            passwordInput = overlay.querySelector("#keyring-unlock-password");
            passwordInput?.focus();
        },
        onAction: (actionId) =>
            actionId !== "unlock" || Boolean(passwordInput?.value),
    });
    return result === "unlock" ? String(passwordInput?.value ?? "") : "";
}

async function requestKeyringSetup(accountPassword) {
    const [{ openPopup }, { escapeHtml }] = await Promise.all([
        import("/static/reuse/popup.js"),
        import("/static/reuse/escape-html.js"),
    ]);
    const i18n = await loadKeyringI18n();
    let passwordInput = null;
    const result = await openPopup({
        title: i18n.t("adapter.auth.keyring.setup_title"),
        body: `<label class="stack"><span>${escapeHtml(i18n.t("adapter.auth.keyring.setup_message"))}</span><input id="keyring-setup-password" type="password" autocomplete="new-password" placeholder="${escapeHtml(i18n.t("adapter.auth.keyring.setup_placeholder"))}" /></label><p class="muted">${escapeHtml(i18n.t("adapter.auth.keyring.setup_hint"))}</p>`,
        actions: [
            {
                id: "setup",
                label: i18n.t("adapter.auth.keyring.setup_action"),
                variant: "confirm",
            },
        ],
        onOpen(overlay) {
            passwordInput = overlay.querySelector("#keyring-setup-password");
            passwordInput?.focus();
        },
        onAction: () => Boolean(passwordInput?.value || accountPassword),
    });
    return result === "setup"
        ? resolveKeyringSetupPassword(passwordInput?.value, accountPassword)
        : "";
}

export function resolveKeyringSetupPassword(enteredPassword, accountPassword) {
    return String(enteredPassword || accountPassword || "");
}

export async function setupKeyringAfterLogin(
    accountPassword,
    {
        requestSetupPassword = requestKeyringSetup,
        requestUnlock = requestKeyringUnlock,
    } = {},
) {
    const localEnvelope = loadLocalEnvelope();
    const remoteEnvelope = await loadRemoteEnvelope();
    if (localEnvelope || remoteEnvelope) {
        if (accountPassword && (await unlockKeyring(accountPassword))) {
            return { setup: false, unlocked: true };
        }
        const i18n = await loadKeyringI18n();
        const unlocked = await requestUnlock({
            i18n,
            request: {
                component: i18n.t("adapter.auth.keyring.request_component"),
                action: i18n.t("adapter.auth.keyring.request_action_unlock"),
                process: i18n.t("adapter.auth.keyring.request_process_session"),
            },
        });
        return { setup: false, unlocked };
    }
    const encryptionPassword = await requestSetupPassword(accountPassword);
    const unlocked = encryptionPassword
        ? await unlockKeyring(encryptionPassword)
        : false;
    return { setup: true, unlocked };
}

export function getKeyringValue(id) {
    const normalizedId = String(id);
    const entry = vaultData
        ? vaultData.values?.[normalizedId]
        : pendingValues.get(normalizedId);
    if (vaultData) {
        recordKeyringEvent("read", normalizedId);
        persistRecordedEvent();
        scheduleRelock();
    }
    return entry ? normalizeEntry(entry, normalizedId).value : null;
}

export async function setKeyringValue(id, value, metadata = {}) {
    const normalizedId = String(id);
    const entry = {
        value: String(value),
        label: String(metadata.label ?? normalizedId),
        source: String(metadata.componentName ?? metadata.source ?? "Cognis"),
        updatedAt: new Date().toISOString(),
    };
    if (!vaultData) {
        pendingValues.set(normalizedId, entry);
        return;
    }
    vaultData.values ??= {};
    vaultData.values[normalizedId] = entry;
    recordKeyringEvent("write", normalizedId);
    await persistVault();
    scheduleRelock();
}

export function createKeyringScope(componentName) {
    const source = String(componentName ?? "").trim() || "Cognis";
    return {
        get: getKeyringValue,
        list: listKeyringEntries,
        delete: deleteKeyringValue,
        set(id, value, metadata = {}) {
            return setKeyringValue(id, value, {
                ...metadata,
                componentName: source,
            });
        },
        resolve(id, options = {}) {
            return resolveKeyringValue(id, {
                ...options,
                request: {
                    ...options.request,
                    component: source,
                },
                metadata: {
                    ...options.metadata,
                    componentName: source,
                },
            });
        },
    };
}

export async function deleteKeyringValue(id) {
    const normalizedId = String(id);
    pendingValues.delete(normalizedId);
    if (!vaultData?.values || !(normalizedId in vaultData.values)) return false;
    delete vaultData.values[normalizedId];
    recordKeyringEvent("delete", normalizedId);
    await persistVault();
    scheduleRelock();
    return true;
}

export function listKeyringEntries() {
    if (!vaultData) return [];
    scheduleRelock();
    const values = vaultData?.values ?? Object.fromEntries(pendingValues);
    return Object.entries(values)
        .map(([id, entry]) => ({ id, ...normalizeEntry(entry, id) }))
        .sort((left, right) => left.label.localeCompare(right.label));
}

export function listKeyringEvents() {
    if (!vaultData) return [];
    return [...(vaultData.events ?? [])].reverse();
}

export async function clearKeyringValues() {
    if (!vaultData) return false;
    vaultData.values = {};
    pendingValues.clear();
    recordKeyringEvent("clear");
    await persistVault();
    scheduleRelock();
    return true;
}

export async function changeKeyringPassword(password) {
    const normalizedPassword = String(password ?? "");
    if (!vaultData || !normalizedPassword) return false;
    vaultSalt = crypto.getRandomValues(new Uint8Array(16));
    vaultIterations = DEFAULT_ITERATIONS;
    vaultKey = await deriveKey(normalizedPassword, vaultSalt, vaultIterations);
    recordKeyringEvent("password-change");
    await persistVault();
    scheduleRelock();
    return true;
}

export async function resolveKeyringValue(id, options = {}) {
    if (
        !(await requestKeyringUnlock({
            request: options.request,
        }))
    ) {
        return null;
    }
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
    const stored = localStorage.getItem(relockStorageKey());
    if (stored !== null) return Math.max(0, Number(stored) || 0);
    return Math.max(0, Number(vaultData?.preferences?.relockMinutes ?? 0));
}

export async function setKeyringRelockMinutes(minutes) {
    const normalizedMinutes = Math.max(0, Number(minutes) || 0);
    localStorage.setItem(relockStorageKey(), String(normalizedMinutes));
    if (vaultData) {
        vaultData.preferences ??= {};
        vaultData.preferences.relockMinutes = normalizedMinutes;
        await persistVault();
        scheduleRelock();
    }
}

uiCtx.capabilities.contribute("keyring:get", getKeyringValue);
uiCtx.capabilities.contribute("keyring:set", setKeyringValue);
uiCtx.capabilities.contribute("keyring:delete", deleteKeyringValue);
uiCtx.capabilities.contribute("keyring:list", listKeyringEntries);
uiCtx.capabilities.contribute("keyring:listEvents", listKeyringEvents);
uiCtx.capabilities.contribute("keyring:clear", clearKeyringValues);
uiCtx.capabilities.contribute("keyring:changePassword", changeKeyringPassword);
uiCtx.capabilities.contribute("keyring:resolve", resolveKeyringValue);
uiCtx.capabilities.contribute("keyring:lock", lockKeyring);
uiCtx.capabilities.contribute("keyring:unlock", unlockKeyring);
uiCtx.capabilities.contribute("keyring:requestUnlock", requestKeyringUnlock);
uiCtx.capabilities.contribute("keyring:isUnlocked", isKeyringUnlocked);
uiCtx.capabilities.contribute(
    "keyring:activateTemporary",
    activateTemporaryKeyring,
);

if (uiCtx.flowExists("complete-login")) {
    uiCtx.extendFlow(
        "complete-login",
        "setup-account-services",
        { id: "auth-keyring:setup-after-login" },
        (stageContext) =>
            setupKeyringAfterLogin(
                String(stageContext.input?.accountPassword ?? ""),
            ),
    );
}
uiCtx.capabilities.contribute("keyring:endTemporary", endTemporaryKeyring);
uiCtx.capabilities.contribute("keyring:forComponent", createKeyringScope);
uiCtx.capabilities.contribute(
    "keyring:getRelockMinutes",
    getKeyringRelockMinutes,
);
uiCtx.capabilities.contribute(
    "keyring:setRelockMinutes",
    setKeyringRelockMinutes,
);
