import { createEnvelopeLoader } from "./remote-envelope.js";
import { createKeyringIdentityGuard } from "./identity-guard.js";
import { createSessionUnlockCache } from "./session-unlock.js";
import { keyringStorageKeys } from "./storage-keys.js";
import {
    requestKeyringPassword,
    requestKeyringSetup,
} from "./password-prompts.js";
export { resolveKeyringSetupPassword } from "./password-prompts.js";
import {
    dispatchKeyringEvent,
    showKeyringLifecycleToast,
} from "./lifecycle-notifications.js";
import { retireSessionUnlockCache } from "./retire-session-cache.js";
import { KEYRING_RELOCK_OPTIONS } from "./relock-options.js";
import {
    decodeBytes,
    deriveKey,
    decryptVault,
    encodeBytes,
    normalizeEntry,
    selectKeyringEnvelope,
} from "./crypto.js";
export { selectKeyringEnvelope } from "./crypto.js";
import {
    registerKeyringCapabilities,
    registerKeyringLoginFlow,
} from "./capabilities.js";
import { createRelockPreference } from "./relock-preference.js";
import { loadKeyringI18n } from "./resources.js";
import {
    boundedKeyringActivity,
    createActivityPersistence,
    recordKeyringActivity,
} from "./activity.js";

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

const KEYRING_API = "/api/v1/auth/keyring";
const DEFAULT_ITERATIONS = 310_000;
let vaultBinding = null;
let vaultKey = null;
let vaultData = null;
let vaultSalt = null;
let vaultIterations = DEFAULT_ITERATIONS;
let relockTimer = null;
let relockDeadline = 0;
let accountInstanceId = "";
let temporaryKeyringAccountId = "";
let unlockRequestPromise = null;
let keyringAccessSuppressed = false;
let persistenceQueue = Promise.resolve();
let keyringStateVersion = 0;
let keyringExists = false;
let metadataResolved = false;

function keyringStorage() {
    return temporaryKeyringAccountId ? sessionStorage : localStorage;
}

const sessionUnlock = createSessionUnlockCache({
    assertBinding: (binding) => identityGuard.assertBinding(binding),
});
const identityGuard = createKeyringIdentityGuard({
    readActor: () => ({
        origin: globalThis.location?.origin,
        accountId: localStorage.getItem("cognis_account"),
        token: localStorage.getItem("cognis_access_token"),
    }),
    onInvalidate(previous, previousActor) {
        sessionUnlock.remove(previous);
        keyringStateVersion++;
        clearVault();
        keyringExists = false;
        metadataResolved = false;
        temporaryKeyringAccountId = "";
        accountInstanceId = "";
        unlockRequestPromise = null;
        keyringAccessSuppressed = false;
        if (previousActor) dispatchKeyringEvent("identityChanged");
    },
});
function keyringStorageKey() {
    return keyringStorageKeys(identityGuard.currentBinding()).vault;
}
function relockStorageKey() {
    return keyringStorageKeys(identityGuard.currentBinding()).relock;
}
function deferredSetupKey() {
    return keyringStorageKeys(identityGuard.currentBinding()).deferred;
}
function requestOptions(binding = identityGuard.currentBinding()) {
    identityGuard.assertBinding(binding);
    return {
        accessToken: binding.actor.token,
        signal: binding.actor.controller.signal,
    };
}

function scheduleRelock({ resetDeadline = false } = {}) {
    clearTimeout(relockTimer);
    if (temporaryKeyringAccountId || !isKeyringUnlocked()) return;
    const minutes = getKeyringRelockMinutes();
    if (minutes <= 0) {
        relockDeadline = 0;
        return sessionUnlock.remember(vaultBinding, vaultKey, relockDeadline);
    }
    if (resetDeadline || !relockDeadline)
        relockDeadline = Date.now() + minutes * 60_000;
    relockTimer = setTimeout(
        lockKeyring,
        Math.max(0, relockDeadline - Date.now()),
    );
    return sessionUnlock.remember(vaultBinding, vaultKey, relockDeadline);
}

function clearVault() {
    const hadPlaintext = Boolean(vaultData);
    clearTimeout(relockTimer);
    relockTimer = null;
    vaultBinding = null;
    vaultKey = null;
    vaultData = null;
    vaultSalt = null;
    relockDeadline = 0;
    if (hadPlaintext) dispatchKeyringEvent("locked");
}

const loadRemoteEnvelope = createEnvelopeLoader({
    apiFetch,
    identityGuard,
    apiPath: KEYRING_API,
    temporaryAccount: () => temporaryKeyringAccountId,
    defaultIterations: DEFAULT_ITERATIONS,
    onRead: (resolved) => {
        metadataResolved = resolved;
    },
});

function loadLocalEnvelope() {
    const binding = identityGuard.currentBinding();
    if (!binding) return null;
    try {
        const envelope = JSON.parse(
            keyringStorage().getItem(keyringStorageKey()) || "null",
        );
        return envelope?.origin === binding.origin &&
            envelope.accountId === binding.accountId &&
            envelope.accountInstanceId === binding.accountInstanceId
            ? envelope
            : null;
    } catch {
        return null;
    }
}
function removeLocalEnvelope() {
    if (identityGuard.currentBinding())
        keyringStorage().removeItem(keyringStorageKey());
}

async function syncEnvelope(envelope, binding) {
    identityGuard.assertBinding(binding);
    if (temporaryKeyringAccountId) return;
    let response;
    try {
        response = await apiFetch(KEYRING_API, {
            method: "PUT",
            ...requestOptions(binding),
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ vault: envelope }),
        });
    } catch (error) {
        identityGuard.assertBinding(binding);
        if (error?.name === "AbortError") throw error;
        return;
    }
    identityGuard.assertBinding(binding);
    if (response.status === 401 || response.status === 403)
        identityGuard.reject(binding.actor);
    if (!response.ok) {
        const error = new Error("keyring_sync_rejected");
        error.status = response.status;
        throw error;
    }
}

async function persistVaultSnapshot(expectedStateVersion) {
    if (expectedStateVersion !== keyringStateVersion) return;
    const binding = vaultBinding;
    identityGuard.assertBinding(binding);
    if (!vaultKey || !vaultData || !vaultSalt)
        throw new Error("keyring_locked");
    vaultData.events = boundedKeyringActivity(vaultData.events);
    const initializationVector = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: initializationVector },
        vaultKey,
        new TextEncoder().encode(JSON.stringify(vaultData)),
    );
    identityGuard.assertBinding(binding);
    if (expectedStateVersion !== keyringStateVersion) return;
    const envelope = {
        version: 1,
        accountInstanceId,
        iterations: vaultIterations,
        salt: encodeBytes(vaultSalt),
        iv: encodeBytes(initializationVector),
        cipher: encodeBytes(new Uint8Array(cipher)),
        updatedAt: new Date().toISOString(),
    };
    identityGuard.assertBinding(binding);
    if (expectedStateVersion !== keyringStateVersion) return;
    keyringStorage().setItem(
        keyringStorageKey(),
        JSON.stringify({
            ...envelope,
            origin: binding.origin,
            accountId: binding.accountId,
        }),
    );
    await syncEnvelope(envelope, binding);
}

function persistVault() {
    const expectedStateVersion = keyringStateVersion;
    const persistence = persistenceQueue.then(() =>
        persistVaultSnapshot(expectedStateVersion),
    );
    persistenceQueue = persistence.catch(() => undefined);
    return persistence;
}

const persistRecordedEvent = createActivityPersistence({
    persist: persistVault,
    getStateVersion: () => keyringStateVersion,
    isUnlocked: () => Boolean(vaultData),
});

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
    deadline,
) {
    const binding = remoteState.binding;
    identityGuard.assertBinding(binding);
    const version = keyringStateVersion;
    let decrypted;
    try {
        decrypted = await decryptVault(key, stored);
    } catch {
        return false;
    }
    identityGuard.assertBinding(binding);
    if (version !== keyringStateVersion) return false;
    vaultData = decrypted;
    vaultBinding = binding;
    vaultKey = key;
    vaultSalt = salt;
    vaultIterations = iterations;
    vaultData.values ??= {};
    vaultData.preferences ??= {};
    const storedRelockMinutes = keyringStorage().getItem(relockStorageKey());
    if (storedRelockMinutes !== null) {
        vaultData.preferences.relockMinutes = Math.max(
            0,
            Number(storedRelockMinutes) || 0,
        );
    } else {
        keyringStorage().setItem(
            relockStorageKey(),
            String(vaultData.preferences.relockMinutes ?? 0),
        );
    }
    for (const [id, entry] of Object.entries(vaultData.values)) {
        vaultData.values[id] = normalizeEntry(entry, id);
    }
    recordKeyringActivity(vaultData, "unlock");
    if (remoteState.envelope === stored && stored) {
        keyringStorage().setItem(
            keyringStorageKey(),
            JSON.stringify({
                ...stored,
                origin: binding.origin,
                accountId: binding.accountId,
            }),
        );
    }
    await persistVault();
    identityGuard.assertBinding(binding);
    if (version !== keyringStateVersion) return false;
    if (deadline !== undefined) relockDeadline = deadline;
    await scheduleRelock({ resetDeadline: deadline === undefined });
    return isKeyringUnlocked();
}

async function openVault(password, { create = false } = {}) {
    const normalizedPassword = String(password ?? "");
    if (!normalizedPassword) return false;
    keyringStateVersion++;
    clearVault();
    const remoteState = await loadRemoteEnvelope();
    if (!remoteState.binding) return false;
    identityGuard.assertBinding(remoteState.binding);
    const localEnvelope = loadLocalEnvelope();
    accountInstanceId =
        remoteState.accountInstanceId ||
        String(localEnvelope?.accountInstanceId ?? "");
    const stored = selectKeyringEnvelope(localEnvelope, remoteState);
    keyringExists = Boolean(stored);
    if (remoteState.resolved && localEnvelope && !stored) {
        removeLocalEnvelope();
    }
    if (!stored && (!create || !remoteState.resolved)) return false;
    const salt = stored?.salt
        ? decodeBytes(stored.salt)
        : crypto.getRandomValues(new Uint8Array(16));
    const iterations = Number(
        stored?.iterations ??
            remoteState.derivationIterations ??
            DEFAULT_ITERATIONS,
    );
    const expectedVersion = keyringStateVersion;
    const key = await deriveKey(normalizedPassword, salt, iterations, true);
    identityGuard.assertBinding(remoteState.binding);
    if (expectedVersion !== keyringStateVersion) return false;
    const unlocked = await activateVault(
        key,
        stored,
        remoteState,
        salt,
        iterations,
    );
    if (unlocked && !stored) {
        keyringExists = true;
        await showKeyringLifecycleToast(
            "adapter.auth.keyring.created",
            "success",
            loadKeyringI18n,
        );
        dispatchKeyringEvent("created");
    }
    return unlocked;
}

export async function unlockKeyring(password) {
    return openVault(password);
}

async function restoreCurrentSessionUnlock() {
    const remoteState = await loadRemoteEnvelope();
    if (!remoteState.binding) return false;
    identityGuard.assertBinding(remoteState.binding);
    const localEnvelope = loadLocalEnvelope();
    accountInstanceId =
        remoteState.accountInstanceId ||
        String(localEnvelope?.accountInstanceId ?? "");
    const stored = selectKeyringEnvelope(localEnvelope, remoteState);
    keyringExists = Boolean(stored);
    if (!remoteState.resolved || !stored) {
        if (remoteState.resolved) sessionUnlock.remove(remoteState.binding);
        return false;
    }
    const restored = await sessionUnlock.restore(remoteState.binding);
    if (!restored) return false;
    const unlocked = await activateVault(
        restored.key,
        stored,
        remoteState,
        undefined,
        undefined,
        restored.deadline,
    );
    if (!unlocked) sessionUnlock.remove(remoteState.binding);
    return unlocked;
}

export async function restoreKeyringSession() {
    return isKeyringUnlocked() || restoreCurrentSessionUnlock();
}

export async function readKeyringState() {
    await restoreKeyringSession();
    if (
        !identityGuard.currentBinding() ||
        (!metadataResolved && !keyringExists)
    ) {
        throw new Error("keyring_metadata_unavailable");
    }
    return {
        exists: keyringExists || Boolean(loadLocalEnvelope()),
        unlocked: isKeyringUnlocked(),
    };
}

export async function lockKeyring() {
    if (temporaryKeyringAccountId) return Promise.resolve();
    sessionUnlock.clearActor(identityGuard.snapshot());
    if (!identityGuard.currentBinding()) return;
    sessionUnlock.remove(identityGuard.currentBinding());
    keyringStateVersion++;
    clearVault();
    dispatchKeyringEvent("locked");
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
    identityGuard.snapshot();
    temporaryKeyringAccountId = normalizedAccountId;
    const unlocked = await openVault(normalizedPassphrase, { create: true });
    if (!unlocked) temporaryKeyringAccountId = "";
    return unlocked;
}

export function endTemporaryKeyring() {
    if (!temporaryKeyringAccountId) return;
    const binding = vaultBinding;
    if (binding) {
        const keys = keyringStorageKeys(binding);
        sessionStorage.removeItem(keys.vault);
        sessionStorage.removeItem(keys.relock);
    }
    clearVault();
    temporaryKeyringAccountId = "";
}

export function isKeyringUnlocked() {
    if (relockDeadline && relockDeadline <= Date.now()) {
        void lockKeyring();
        return false;
    }
    const binding = identityGuard.currentBinding();
    return Boolean(
        binding && vaultBinding === binding && vaultData && vaultKey,
    );
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
    const actor = identityGuard.snapshot();
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
    const pendingUnlock = (async () => {
        if (await restoreCurrentSessionUnlock()) return true;
        identityGuard.assertCurrent(actor);
        if (!identityGuard.currentBinding() || !keyringExists) return false;
        const i18n = options.i18n ?? (await loadKeyringI18n());
        const message = i18n
            .t("adapter.auth.keyring.unlock_message")
            .replace("{{component}}", request.component)
            .replace("{{action}}", request.action)
            .replace("{{process}}", request.process);
        const prompt = i18n.t("adapter.auth.keyring.unlock_prompt");
        const passwordPrompt = options.passwordPrompt ?? requestKeyringPassword;
        const password = await passwordPrompt({
            i18n,
            message,
            prompt,
            signal: actor?.controller.signal,
        });
        identityGuard.assertCurrent(actor);
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
        if (unlockRequestPromise === pendingUnlock) unlockRequestPromise = null;
    });
    unlockRequestPromise = pendingUnlock;
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

export async function setupKeyringAfterLogin(
    accountPassword,
    { requestSetupPassword = requestKeyringSetup, deferNewSetup = false } = {},
) {
    const remoteState = await loadRemoteEnvelope();
    if (!remoteState.binding) return false;
    identityGuard.assertBinding(remoteState.binding);
    const localEnvelope = loadLocalEnvelope();
    accountInstanceId =
        remoteState.accountInstanceId ||
        String(localEnvelope?.accountInstanceId ?? "");
    clearVault();
    const storedEnvelope = selectKeyringEnvelope(localEnvelope, remoteState);
    keyringExists = Boolean(storedEnvelope);
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
        sessionStorage.setItem(deferredSetupKey(), "1");
        return { setup: false, unlocked: false, deferred: true };
    }
    const encryptionPassword = await requestSetupPassword(accountPassword, {
        signal: remoteState.binding.actor.controller.signal,
        setRelockMinutes: setKeyringRelockMinutes,
        getRelockMinutes: getKeyringRelockMinutes,
    });
    identityGuard.assertBinding(remoteState.binding);
    const unlocked = encryptionPassword
        ? await openVault(encryptionPassword, { create: true })
        : false;
    if (unlocked) sessionStorage.removeItem(deferredSetupKey());
    return { setup: true, unlocked };
}

export function getKeyringValue(id) {
    const normalizedId = String(id);
    if (!isKeyringUnlocked()) return null;
    const entry = vaultData.values?.[normalizedId];
    if (vaultData) {
        recordKeyringActivity(vaultData, "read", normalizedId);
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
    if (!isKeyringUnlocked()) throw new Error("keyring_locked");
    vaultData.values ??= {};
    vaultData.values[normalizedId] = entry;
    recordKeyringActivity(vaultData, "write", normalizedId);
    await persistVault();
    scheduleRelock();
}

export function createKeyringScope(componentName) {
    const source = String(componentName ?? "").trim() || "Cognis";
    let owner = identityGuard.snapshot();
    const check = () => {
        if (!owner) owner = identityGuard.snapshot();
        identityGuard.assertCurrent(owner);
    };
    const scoped =
        (operation) =>
        (...args) => {
            check();
            return operation(...args);
        };
    return {
        get: scoped(getKeyringValue),
        list: scoped(listKeyringEntries),
        delete: scoped(deleteKeyringValue),
        set(id, value, metadata = {}) {
            check();
            return setKeyringValue(id, value, {
                ...metadata,
                componentName: source,
            });
        },
        resolve(id, options = {}) {
            check();
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
            check();
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
    if (!isKeyringUnlocked()) return false;
    if (!vaultData?.values || !(normalizedId in vaultData.values)) return false;
    delete vaultData.values[normalizedId];
    recordKeyringActivity(vaultData, "delete", normalizedId);
    await persistVault();
    scheduleRelock();
    return true;
}

export function listKeyringEntries() {
    if (!isKeyringUnlocked()) return [];
    scheduleRelock();
    const values = vaultData.values ?? {};
    return Object.entries(values)
        .map(([id, entry]) => ({ id, ...normalizeEntry(entry, id) }))
        .sort((left, right) => left.label.localeCompare(right.label));
}

export function listKeyringEvents() {
    if (!isKeyringUnlocked()) return [];
    return [...(vaultData.events ?? [])].reverse();
}

export async function clearKeyringValues() {
    if (!isKeyringUnlocked()) return false;
    vaultData.values = {};
    recordKeyringActivity(vaultData, "clear");
    await persistVault();
    scheduleRelock();
    return true;
}

export async function destroyKeyring() {
    const binding = identityGuard.currentBinding();
    identityGuard.assertBinding(binding);
    await persistenceQueue;
    const response = await apiFetch(KEYRING_API, {
        method: "DELETE",
        ...requestOptions(binding),
    });
    identityGuard.assertBinding(binding);
    if (!response.ok) return false;
    clearVault();
    keyringExists = false;
    removeLocalEnvelope();
    sessionStorage.setItem(deferredSetupKey(), "1");
    dispatchKeyringEvent("destroy");
    await showKeyringLifecycleToast(
        "adapter.auth.keyring.destroyed",
        "warning",
        loadKeyringI18n,
    );
    return true;
}

export async function createKeyring({
    requestSetupPassword = requestKeyringSetup,
} = {}) {
    const remoteState = await loadRemoteEnvelope();
    identityGuard.assertBinding(remoteState.binding);
    if (
        !remoteState.resolved ||
        selectKeyringEnvelope(loadLocalEnvelope(), remoteState)
    )
        return false;
    const password = await requestSetupPassword("", {
        signal: remoteState.binding.actor.controller.signal,
        setRelockMinutes: setKeyringRelockMinutes,
        getRelockMinutes: getKeyringRelockMinutes,
    });
    identityGuard.assertBinding(remoteState.binding);
    const created = password
        ? await openVault(password, { create: true })
        : false;
    if (created) {
        sessionStorage.removeItem(deferredSetupKey());
        resumeKeyringAccess();
    }
    return created;
}

export async function clearKeyringAccountState() {
    const binding = identityGuard.currentBinding();
    if (!binding) {
        clearVault();
        return;
    }
    keyringStateVersion += 1;
    clearVault();
    keyringExists = false;
    removeLocalEnvelope();
    localStorage.removeItem(relockStorageKey());
    sessionStorage.removeItem(deferredSetupKey());
    identityGuard.reject(binding.actor);
}

export async function changeKeyringPassword(password) {
    const normalizedPassword = String(password ?? "");
    if (!isKeyringUnlocked() || !normalizedPassword) return false;
    const binding = vaultBinding;
    const expectedVersion = keyringStateVersion;
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(
        normalizedPassword,
        salt,
        DEFAULT_ITERATIONS,
        true,
    );
    identityGuard.assertBinding(binding);
    if (!isKeyringUnlocked() || expectedVersion !== keyringStateVersion)
        return false;
    vaultSalt = salt;
    vaultIterations = DEFAULT_ITERATIONS;
    vaultKey = key;
    recordKeyringActivity(vaultData, "password-change");
    await persistVault();
    await scheduleRelock();
    return true;
}

export async function resolveKeyringValue(id, options = {}) {
    const actor = identityGuard.snapshot();
    if (options.promptWhenLocked === false && !isKeyringUnlocked()) return null;
    if (
        !(await requestKeyringUnlock({
            request: options.request,
        }))
    ) {
        return null;
    }
    identityGuard.assertCurrent(actor);
    const stored = getKeyringValue(id);
    if (stored !== null) {
        let valid = true;
        try {
            valid = options.validate ? await options.validate(stored) : true;
        } catch {
            valid = false;
        }
        identityGuard.assertCurrent(actor);
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
    identityGuard.assertCurrent(actor);
    await setKeyringValue(id, replacement, options.metadata);
    return String(replacement);
}

const relockPreference = createRelockPreference({
    getVaultData: () => (isKeyringUnlocked() ? vaultData : null),
    getStorageKey: () =>
        identityGuard.currentBinding() ? relockStorageKey() : null,
    persistVault,
    scheduleRelock,
});
export const getKeyringRelockMinutes = relockPreference.getMinutes;
export const setKeyringRelockMinutes = relockPreference.setMinutes;

const registered = registerKeyringCapabilities(uiCtx, {
    get: getKeyringValue,
    set: setKeyringValue,
    delete: deleteKeyringValue,
    list: listKeyringEntries,
    listEvents: listKeyringEvents,
    clear: clearKeyringValues,
    destroy: destroyKeyring,
    create: createKeyring,
    readState: readKeyringState,
    exists: () =>
        Boolean(identityGuard.currentBinding()) &&
        (keyringExists || Boolean(loadLocalEnvelope())),
    clearAccountState: clearKeyringAccountState,
    changePassword: changeKeyringPassword,
    resolve: resolveKeyringValue,
    lock: lockKeyring,
    unlock: unlockKeyring,
    requestUnlock: requestKeyringUnlock,
    restoreSession: restoreKeyringSession,
    isUnlocked: isKeyringUnlocked,
    isAccessSuppressed: () => keyringAccessSuppressed,
    hasDeferredSetup: () =>
        Boolean(identityGuard.currentBinding()) &&
        sessionStorage.getItem(deferredSetupKey()) === "1",
    activateTemporary: activateTemporaryKeyring,
    endTemporary: endTemporaryKeyring,
    forComponent: createKeyringScope,
    getRelockMinutes: getKeyringRelockMinutes,
    setRelockMinutes: setKeyringRelockMinutes,
});

if (registered) {
    void retireSessionUnlockCache();
    registerKeyringLoginFlow(uiCtx, setupKeyringAfterLogin);
}

if (registered && typeof window !== "undefined") {
    window.addEventListener("storage", () => identityGuard.snapshot());
    window.addEventListener("pagehide", () => {
        keyringStateVersion++;
        clearVault();
    });
}
