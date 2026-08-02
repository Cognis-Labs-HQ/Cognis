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
const DEFERRED_SETUP_KEY = "cognis_keyring_setup_pending";
const SESSION_UNLOCK_DATABASE = "cognis-keyring-session";
const SESSION_UNLOCK_STORE = "keys";
const SESSION_UNLOCK_MARKER = "cognis_keyring_session_unlocked";
const SESSION_UNLOCK_EXPIRES_AT = "cognis_keyring_session_expires_at";
let vaultKey = null;
let vaultData = null;
let vaultSalt = null;
let vaultIterations = DEFAULT_ITERATIONS;
let relockTimer = null;
let lastVaultEnvelope = null;
let accountInstanceId = "";
let temporaryKeyringAccountId = "";
let unlockRequestPromise = null;
let keyringAccessSuppressed = false;
let keyringI18nPromise = null;
let persistenceQueue = Promise.resolve();
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
    const chunkSize = 32_768;
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(
            ...bytes.subarray(offset, offset + chunkSize),
        );
    }
    return btoa(binary);
}

function decodeBytes(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function sessionUnlockId() {
    return keyringStorageKey();
}

function sessionUnlockMarkerKey() {
    return `${SESSION_UNLOCK_MARKER}:${encodeURIComponent(sessionUnlockId())}`;
}

function sessionUnlockExpiryKey() {
    return `${SESSION_UNLOCK_EXPIRES_AT}:${encodeURIComponent(sessionUnlockId())}`;
}

function openSessionUnlockDatabase() {
    if (typeof indexedDB === "undefined") return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(SESSION_UNLOCK_DATABASE, 1);
        request.onupgradeneeded = () => {
            if (
                !request.result.objectStoreNames.contains(SESSION_UNLOCK_STORE)
            ) {
                request.result.createObjectStore(SESSION_UNLOCK_STORE, {
                    keyPath: "id",
                });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function writeSessionUnlockKey(key) {
    if (temporaryKeyringAccountId) return;
    const database = await openSessionUnlockDatabase().catch(() => null);
    if (!database) return;
    const written = await new Promise((resolve, reject) => {
        const transaction = database.transaction(
            SESSION_UNLOCK_STORE,
            "readwrite",
        );
        transaction.objectStore(SESSION_UNLOCK_STORE).put({
            id: sessionUnlockId(),
            key,
            accountInstanceId,
        });
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    }).catch(() => false);
    database.close();
    if (written) sessionStorage.setItem(sessionUnlockMarkerKey(), "1");
}

async function readSessionUnlockKey() {
    if (temporaryKeyringAccountId) return null;
    if (sessionStorage.getItem(sessionUnlockMarkerKey()) !== "1") {
        await clearSessionUnlockKey();
        return null;
    }
    const database = await openSessionUnlockDatabase().catch(() => null);
    if (!database) return null;
    const record = await new Promise((resolve, reject) => {
        const transaction = database.transaction(
            SESSION_UNLOCK_STORE,
            "readonly",
        );
        const request = transaction
            .objectStore(SESSION_UNLOCK_STORE)
            .get(sessionUnlockId());
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
    }).catch(() => null);
    database.close();
    if (
        record?.accountInstanceId &&
        accountInstanceId &&
        record.accountInstanceId !== accountInstanceId
    ) {
        await clearSessionUnlockKey();
        return null;
    }
    return record?.key ?? null;
}

async function clearSessionUnlockKey() {
    sessionStorage.removeItem(sessionUnlockMarkerKey());
    sessionStorage.removeItem(sessionUnlockExpiryKey());
    const database = await openSessionUnlockDatabase().catch(() => null);
    if (!database) return;
    await new Promise((resolve) => {
        const transaction = database.transaction(
            SESSION_UNLOCK_STORE,
            "readwrite",
        );
        transaction.objectStore(SESSION_UNLOCK_STORE).delete(sessionUnlockId());
        transaction.oncomplete = resolve;
        transaction.onerror = resolve;
    });
    database.close();
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

function scheduleRelock({ resetDeadline = false } = {}) {
    clearTimeout(relockTimer);
    if (temporaryKeyringAccountId) return;
    const minutes = getKeyringRelockMinutes();
    if (minutes <= 0) {
        sessionStorage.removeItem(sessionUnlockExpiryKey());
        return;
    }
    const storedDeadline = Number(
        sessionStorage.getItem(sessionUnlockExpiryKey()),
    );
    const deadline =
        resetDeadline || !Number.isFinite(storedDeadline)
            ? Date.now() + minutes * 60_000
            : storedDeadline;
    sessionStorage.setItem(sessionUnlockExpiryKey(), String(deadline));
    relockTimer = setTimeout(lockKeyring, Math.max(0, deadline - Date.now()));
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
        if (!response.ok) return { resolved: false, envelope: null };
        const payload = await response.json();
        return {
            resolved: true,
            envelope: payload?.data?.vault ?? null,
            accountInstanceId: String(payload?.data?.accountInstanceId ?? ""),
            derivationIterations: Number(
                payload?.data?.policy?.derivationIterations ??
                    DEFAULT_ITERATIONS,
            ),
        };
    } catch {
        return { resolved: false, envelope: null };
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

function removeLocalEnvelope() {
    keyringStorage().removeItem(keyringStorageKey());
    if (!temporaryKeyringAccountId) localStorage.removeItem(STORAGE_KEY);
}

function envelopeTimestamp(envelope) {
    const timestamp = Date.parse(String(envelope?.updatedAt ?? ""));
    return Number.isFinite(timestamp) ? timestamp : 0;
}

export function selectKeyringEnvelope(localEnvelope, remoteState) {
    const localAccountInstanceId = String(
        localEnvelope?.accountInstanceId ?? "",
    );
    const remoteAccountInstanceId = String(remoteState.accountInstanceId ?? "");
    if (
        remoteState.resolved &&
        localAccountInstanceId &&
        remoteAccountInstanceId &&
        localAccountInstanceId !== remoteAccountInstanceId
    ) {
        return null;
    }
    if (remoteState.resolved && !remoteState.envelope) return localEnvelope;
    if (!remoteState.resolved) return localEnvelope;
    return envelopeTimestamp(remoteState.envelope) >
        envelopeTimestamp(localEnvelope)
        ? remoteState.envelope
        : localEnvelope;
}

async function syncEnvelope(envelope) {
    let response;
    try {
        response = await apiFetch(KEYRING_API, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ vault: envelope }),
        });
    } catch {
        // The encrypted local copy remains authoritative while offline.
        return;
    }
    if (!response.ok) {
        const error = new Error("keyring_sync_rejected");
        error.status = response.status;
        throw error;
    }
}

async function persistVaultSnapshot() {
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
        accountInstanceId,
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

function persistVault() {
    const persistence = persistenceQueue.then(() => persistVaultSnapshot());
    persistenceQueue = persistence.catch(() => undefined);
    return persistence;
}

function dispatchKeyringEvent(type, identifier = "") {
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("cognis:keyring-event", {
                detail: {
                    type: String(type),
                    identifier: String(identifier),
                },
            }),
        );
    }
}
function recordKeyringEvent(type, identifier = "") {
    if (!vaultData) return;
    vaultData.events ??= [];
    vaultData.events.push({
        type: String(type),
        identifier: String(identifier),
        timestamp: new Date().toISOString(),
    });
    dispatchKeyringEvent(type, identifier);
}
function persistRecordedEvent() {
    void persistVault().catch(() => undefined);
}

async function activateVault(
    key,
    stored,
    remoteState,
    salt = stored?.salt
        ? decodeBytes(stored.salt)
        : crypto.getRandomValues(new Uint8Array(16)),
    iterations = Number(
        stored?.iterations ??
            remoteState.derivationIterations ??
            DEFAULT_ITERATIONS,
    ),
    { preserveRelockDeadline = false } = {},
) {
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
    if (remoteState.envelope === stored && stored) {
        keyringStorage().setItem(keyringStorageKey(), JSON.stringify(stored));
    }
    await persistVault();
    await writeSessionUnlockKey(key);
    scheduleRelock({ resetDeadline: !preserveRelockDeadline });
    return true;
}

export async function unlockKeyring(password) {
    const normalizedPassword = String(password ?? "");
    if (!normalizedPassword) return false;
    clearVault(false);
    const localEnvelope = loadLocalEnvelope();
    const remoteState = await loadRemoteEnvelope();
    accountInstanceId =
        remoteState.accountInstanceId ||
        String(localEnvelope?.accountInstanceId ?? "");
    const stored = selectKeyringEnvelope(localEnvelope, remoteState);
    if (remoteState.resolved && localEnvelope && !stored) {
        removeLocalEnvelope();
    }
    const salt = stored?.salt
        ? decodeBytes(stored.salt)
        : crypto.getRandomValues(new Uint8Array(16));
    const iterations = Number(
        stored?.iterations ??
            remoteState.derivationIterations ??
            DEFAULT_ITERATIONS,
    );
    const key = await deriveKey(normalizedPassword, salt, iterations);
    return activateVault(key, stored, remoteState, salt, iterations);
}

async function restoreSessionUnlock(stored, remoteState) {
    const relockMinutes = getKeyringRelockMinutes();
    const storedDeadline = Number(
        sessionStorage.getItem(sessionUnlockExpiryKey()),
    );
    if (
        relockMinutes > 0 &&
        (!Number.isFinite(storedDeadline) || storedDeadline <= Date.now())
    ) {
        await clearSessionUnlockKey();
        return false;
    }
    const key = await readSessionUnlockKey();
    if (!key) return false;
    clearVault(false);
    const restored = await activateVault(
        key,
        stored,
        remoteState,
        undefined,
        undefined,
        {
            preserveRelockDeadline: true,
        },
    );
    if (!restored) await clearSessionUnlockKey();
    return restored;
}

async function restoreCurrentSessionUnlock() {
    const localEnvelope = loadLocalEnvelope();
    const remoteState = await loadRemoteEnvelope();
    accountInstanceId =
        remoteState.accountInstanceId ||
        String(localEnvelope?.accountInstanceId ?? "");
    const stored = selectKeyringEnvelope(localEnvelope, remoteState);
    if (remoteState.resolved && localEnvelope && !stored) {
        removeLocalEnvelope();
        await clearSessionUnlockKey();
        return false;
    }
    return stored ? restoreSessionUnlock(stored, remoteState) : false;
}

export async function lockKeyring() {
    if (temporaryKeyringAccountId) return Promise.resolve();
    clearVault(true);
    sessionStorage.removeItem(sessionUnlockExpiryKey());
    await clearSessionUnlockKey();
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
    if (keyringAccessSuppressed && options.manual !== true) return false;
    if (unlockRequestPromise) return unlockRequestPromise;
    unlockRequestPromise = (async () => {
        if (await restoreCurrentSessionUnlock()) return true;
        const i18n = options.i18n ?? (await loadKeyringI18n());
        const message = i18n
            .t("adapter.auth.keyring.unlock_message")
            .replace("{{component}}", request.component)
            .replace("{{action}}", request.action)
            .replace("{{process}}", request.process);
        const prompt = i18n.t("adapter.auth.keyring.unlock_prompt");
        const passwordPrompt = options.passwordPrompt ?? requestKeyringPassword;
        const password = await passwordPrompt({ i18n, message, prompt });
        if (!password) {
            suppressKeyringAccess();
            return false;
        }
        const unlocked = await unlockKeyring(password);
        if (!unlocked) {
            const { showToast } = await import("/static/reuse/toast.js");
            showToast(i18n.t("adapter.auth.keyring.unlock_failed"), {
                variant: "warning",
            });
        }
        if (unlocked && options.manual === true) resumeKeyringAccess();
        return unlocked;
    })().finally(() => {
        unlockRequestPromise = null;
    });
    return unlockRequestPromise;
}

function dispatchKeyringAccessState() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
        new CustomEvent("cognis:keyring-access-state", {
            detail: { suppressed: keyringAccessSuppressed },
        }),
    );
    void renderManualUnlockButton();
}

function suppressKeyringAccess() {
    keyringAccessSuppressed = true;
    dispatchKeyringAccessState();
}

function resumeKeyringAccess() {
    keyringAccessSuppressed = false;
    dispatchKeyringAccessState();
}

async function renderManualUnlockButton() {
    if (typeof document === "undefined") return;
    let button = document.querySelector("#keyring-manual-unlock");
    if (!keyringAccessSuppressed) {
        button?.remove();
        return;
    }
    const i18n = await loadKeyringI18n();
    if (!(button instanceof HTMLButtonElement)) {
        const { ensurePageStylesheet } =
            await import("/static/reuse/page-styles.js");
        await ensurePageStylesheet(
            "/static/adapters/auth/keyring/keyring-controls.css",
        );
        button = document.createElement("button");
        button.id = "keyring-manual-unlock";
        button.type = "button";
        button.className = "keyring-manual-unlock";
        button.textContent = "🔒";
        document.querySelector(".app-shell")?.append(button);
    }
    button.title = i18n.t("adapter.auth.keyring.manual_unlock");
    button.setAttribute(
        "aria-label",
        i18n.t("adapter.auth.keyring.manual_unlock"),
    );
    button.onclick = async () => {
        await requestKeyringUnlock({
            manual: true,
            request: {
                component: i18n.t("adapter.auth.keyring.component_name"),
                action: i18n.t("adapter.auth.keyring.request_action_unlock"),
                process: i18n.t("adapter.auth.keyring.request_process_keyring"),
            },
        });
    };
}

async function requestKeyringPassword({ i18n, message, prompt = "" }) {
    const [{ openPopup }, { escapeHtml }] = await Promise.all([
        import("/static/reuse/popup.js"),
        import("/static/reuse/escape-html.js"),
    ]);
    let passwordInput = null;
    const result = await openPopup({
        title: i18n.t("adapter.auth.keyring.unlock_title"),
        body: `<label class="stack"><span>${escapeHtml(message)}</span><span>${escapeHtml(prompt)}</span><input id="keyring-unlock-password" type="password" autocomplete="current-password" required /></label>`,
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
        onAction: () => true,
    });
    if (result !== "setup") return "";
    const selectedPassword = resolveKeyringSetupPassword(
        passwordInput?.value,
        accountPassword,
    );
    if (selectedPassword) return selectedPassword;
    return requestKeyringPassword({
        i18n,
        message: i18n.t("adapter.auth.keyring.setup_account_password_message"),
    });
}

export function resolveKeyringSetupPassword(enteredPassword, accountPassword) {
    return String(enteredPassword || accountPassword || "");
}

export async function setupKeyringAfterLogin(
    accountPassword,
    { requestSetupPassword = requestKeyringSetup, deferNewSetup = false } = {},
) {
    const localEnvelope = loadLocalEnvelope();
    const remoteState = await loadRemoteEnvelope();
    accountInstanceId =
        remoteState.accountInstanceId ||
        String(localEnvelope?.accountInstanceId ?? "");
    clearVault(false);
    await clearSessionUnlockKey();
    const storedEnvelope = selectKeyringEnvelope(localEnvelope, remoteState);
    if (remoteState.resolved && localEnvelope && !storedEnvelope) {
        removeLocalEnvelope();
    }
    if (storedEnvelope) {
        if (accountPassword && (await unlockKeyring(accountPassword))) {
            return { setup: false, unlocked: true };
        }
        return { setup: false, unlocked: false };
    }
    if (deferNewSetup) {
        sessionStorage.setItem(DEFERRED_SETUP_KEY, "1");
        return { setup: false, unlocked: false, deferred: true };
    }
    const encryptionPassword = await requestSetupPassword(accountPassword);
    const unlocked = encryptionPassword
        ? await unlockKeyring(encryptionPassword)
        : false;
    if (unlocked) sessionStorage.removeItem(DEFERRED_SETUP_KEY);
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
        requestUnlock(options = {}) {
            return requestKeyringUnlock({
                ...options,
                request: {
                    ...options.request,
                    component: source,
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

export async function destroyKeyring({
    requestSetupPassword = requestKeyringSetup,
} = {}) {
    await persistenceQueue;
    const response = await apiFetch(KEYRING_API, { method: "DELETE" });
    if (!response.ok) return false;
    clearVault(true);
    removeLocalEnvelope();
    await clearSessionUnlockKey();
    dispatchKeyringEvent("destroy");
    const password = await requestSetupPassword("");
    const recreated = password ? await unlockKeyring(password) : false;
    if (recreated) resumeKeyringAccess();
    return recreated;
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
        scheduleRelock({ resetDeadline: true });
    }
}

uiCtx.capabilities.contribute("keyring:get", getKeyringValue);
uiCtx.capabilities.contribute("keyring:set", setKeyringValue);
uiCtx.capabilities.contribute("keyring:delete", deleteKeyringValue);
uiCtx.capabilities.contribute("keyring:list", listKeyringEntries);
uiCtx.capabilities.contribute("keyring:listEvents", listKeyringEvents);
uiCtx.capabilities.contribute("keyring:clear", clearKeyringValues);
uiCtx.capabilities.contribute("keyring:destroy", destroyKeyring);
uiCtx.capabilities.contribute("keyring:changePassword", changeKeyringPassword);
uiCtx.capabilities.contribute("keyring:resolve", resolveKeyringValue);
uiCtx.capabilities.contribute("keyring:lock", lockKeyring);
uiCtx.capabilities.contribute("keyring:unlock", unlockKeyring);
uiCtx.capabilities.contribute("keyring:requestUnlock", requestKeyringUnlock);
uiCtx.capabilities.contribute("keyring:isUnlocked", isKeyringUnlocked);
uiCtx.capabilities.contribute(
    "keyring:isAccessSuppressed",
    () => keyringAccessSuppressed,
);
uiCtx.capabilities.contribute(
    "keyring:hasDeferredSetup",
    () => sessionStorage.getItem(DEFERRED_SETUP_KEY) === "1",
);
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
                {
                    deferNewSetup:
                        stageContext.input?.deferNewKeyringSetup === true,
                },
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
