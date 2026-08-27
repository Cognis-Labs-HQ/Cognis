import {
    dispatchKeyringEvent,
    showKeyringLifecycleToast,
} from "./lifecycle-notifications.js";
import { createSessionUnlockStore } from "./session-unlock-store.js";

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

const sessionUnlockStore = createSessionUnlockStore({
    getAccountInstanceId: () => accountInstanceId,
    getSessionUnlockId: sessionUnlockId,
    isTemporaryKeyring: () => Boolean(temporaryKeyringAccountId),
});
const clearSessionUnlockKey = sessionUnlockStore.clear;
const readSessionUnlockKey = sessionUnlockStore.read;
const sessionUnlockExpiryKey = sessionUnlockStore.expiryKey;
const writeSessionUnlockKey = sessionUnlockStore.write;

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
    if (temporaryKeyringAccountId) {
        return {
            resolved: true,
            envelope: null,
            accountInstanceId: temporaryKeyringAccountId,
            derivationIterations: DEFAULT_ITERATIONS,
        };
    }
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
    if (remoteState.resolved && !remoteState.envelope) return null;
    if (!remoteState.resolved) return localEnvelope;
    return envelopeTimestamp(remoteState.envelope) >
        envelopeTimestamp(localEnvelope)
        ? remoteState.envelope
        : localEnvelope;
}

async function syncEnvelope(envelope) {
    if (temporaryKeyringAccountId) return;
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
    const unlocked = await activateVault(
        key,
        stored,
        remoteState,
        salt,
        iterations,
    );
    if (unlocked && !stored) {
        await showKeyringLifecycleToast(
            "adapter.auth.keyring.created",
            "success",
            loadKeyringI18n,
        );
        dispatchKeyringEvent("created");
    }
    return unlocked;
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
    const isGuestSession =
        uiCtx.capabilities.get("session:isGuest")?.() === true;
    if (isGuestSession) {
        const ensureGuestKeyring = uiCtx.capabilities.get(
            "session:ensureGuestKeyring",
        );
        return Boolean(await ensureGuestKeyring?.());
    }
    if (temporaryKeyringAccountId) return false;
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
    const [{ openPopup }, { escapeHtml }, { createFormBuilder }] =
        await Promise.all([
            import("/static/reuse/popup.js"),
            import("/static/reuse/escape-html.js"),
            import("/static/reuse/form-builder.js"),
        ]);
    const formBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "keyring-unlock-form",
            includeSubmitButton: false,
            fields: [
                {
                    name: "password",
                    label: prompt,
                    type: "password",
                    required: true,
                    attributes: { autocomplete: "current-password" },
                },
            ],
        },
    );
    let formController = null;
    const result = await openPopup({
        title: i18n.t("adapter.auth.keyring.unlock_title"),
        body: `<div class="stack"><p>${escapeHtml(message)}</p>${formBuilder.render()}</div>`,
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
            const formElement = overlay.querySelector("#keyring-unlock-form");
            if (formElement instanceof HTMLFormElement) {
                formController = formBuilder.attach(formElement);
                formElement.elements.namedItem("password")?.focus();
            }
        },
        onAction: (actionId) =>
            actionId !== "unlock" || Boolean(formController?.validateAll(true)),
    });
    if (result !== "unlock" || !formController) return "";
    return String(formController.getValues().password ?? "");
}

async function requestKeyringSetup(accountPassword) {
    const [{ openPopup }, { escapeHtml }, { createFormBuilder }] =
        await Promise.all([
            import("/static/reuse/popup.js"),
            import("/static/reuse/escape-html.js"),
            import("/static/reuse/form-builder.js"),
        ]);
    const i18n = await loadKeyringI18n();
    const formBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "keyring-setup-form",
            includeSubmitButton: false,
            fields: [
                {
                    name: "password",
                    labelKey: "adapter.auth.keyring.setup_password",
                    type: "password",
                    required: true,
                    attributes: { autocomplete: "new-password" },
                },
                {
                    name: "confirmation",
                    labelKey: "adapter.auth.keyring.setup_confirm_password",
                    type: "password",
                    required: true,
                    attributes: { autocomplete: "new-password" },
                    criteria: [
                        {
                            id: "keyring-password-match",
                            type: "custom",
                            test: (value, values) => value === values.password,
                            messageKey:
                                "adapter.auth.keyring.setup_password_mismatch",
                            mode: "submit",
                        },
                    ],
                },
            ],
        },
    );
    let formController = null;
    const result = await openPopup({
        title: i18n.t("adapter.auth.keyring.setup_title"),
        body: `<div class="stack"><p>${escapeHtml(i18n.t("adapter.auth.keyring.setup_message"))}</p>${formBuilder.render()}</div>`,
        actions: [
            {
                id: "setup",
                label: i18n.t("adapter.auth.keyring.setup_action"),
                variant: "confirm",
            },
            ...(accountPassword
                ? [
                      {
                          id: "use-account-password",
                          label: i18n.t(
                              "adapter.auth.keyring.setup_use_account_password",
                          ),
                          variant: "neutral",
                      },
                  ]
                : []),
        ],
        onOpen(overlay) {
            const formElement = overlay.querySelector("#keyring-setup-form");
            if (formElement instanceof HTMLFormElement) {
                formController = formBuilder.attach(formElement);
                formElement.elements.namedItem("password")?.focus();
            }
        },
        onAction: (actionId) =>
            actionId !== "setup" || Boolean(formController?.validateAll(true)),
    });
    if (result === "use-account-password") return accountPassword;
    if (result !== "setup" || !formController) return "";
    return String(formController.getValues().password ?? "");
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
    await showKeyringLifecycleToast(
        "adapter.auth.keyring.destroyed",
        "warning",
        loadKeyringI18n,
    );
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
    if (options.promptWhenLocked === false && !isKeyringUnlocked()) return null;
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
