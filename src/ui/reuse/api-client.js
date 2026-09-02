/**
 * Authenticated fetch wrapper. Reads the Bearer token from localStorage
 * and attaches it as an Authorization header on every request.
 * `requestTargetsApi(path)` identifies relative and same-origin API URLs so
 * other reusable loaders can select this authenticated transport.
 *
 * Usage:
 *   const res = await apiFetch('/api/v1/users');
 *   const res = await apiFetch('/api/v1/items', { method: 'POST', ... });
 *
 * @param {string} path
 * @param {RequestInit & { accessToken?: string, suppressAccessDeniedEvent?: boolean, suppressConnectionRecoveryToast?: boolean }} [options]
 * @returns {Promise<Response>}
 */
import { showToast } from "./toast.js";

const RETRYABLE_SERVER_STATUS_CODES = new Set([502, 503, 504]);
const RETRYABLE_SERVER_STATUS_MESSAGE_REGEX = new RegExp(
    `\\b(${[...RETRYABLE_SERVER_STATUS_CODES].join("|")})\\b`,
);
const CONNECTION_RECOVERY_POPUP_SUPPRESSION_WINDOW_MS = 5_000;
const CONNECTION_RECOVERY_POLL_INTERVAL_MS = 5_000;
const API_REQUEST_TIMEOUT_MS = 30_000;
const connectionRecoveryFailureMarker = Symbol("connectionRecoveryFailure");
const connectionRecoveryStatesKey = Symbol.for(
    "cognis.connectionRecoveryStates",
);
const connectionRecoveryStates =
    globalThis[connectionRecoveryStatesKey] ??
    (globalThis[connectionRecoveryStatesKey] = new Map());

let connectionRecoveryPrompt = "";
let connectionRestoredPrompt = "";

export function configureConnectionRecoveryPrompt(
    message,
    restoredMessage = "",
) {
    if (typeof message !== "string") return;
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    connectionRecoveryPrompt = trimmedMessage;
    connectionRestoredPrompt = String(restoredMessage).trim();
}

export function requestTargetsApi(path) {
    if (typeof path !== "string") return false;
    if (path.startsWith("/api/")) return true;
    try {
        const parsed = new URL(path, window.location.origin);
        return (
            parsed.origin === window.location.origin &&
            parsed.pathname.startsWith("/api/")
        );
    } catch {
        return false;
    }
}

function getConnectionRecoveryState() {
    const origin = window.location.origin;
    if (!connectionRecoveryStates.has(origin)) {
        connectionRecoveryStates.set(origin, {
            didShowToast: false,
            dismissToast: null,
            lastSignalAt: 0,
            pollTimer: null,
        });
    }
    return connectionRecoveryStates.get(origin);
}

function showConnectionRecoveryToast(state) {
    if (state.didShowToast || !connectionRecoveryPrompt) return;
    state.didShowToast = true;
    state.lastSignalAt = Date.now();
    state.dismissToast = showToast(connectionRecoveryPrompt, {
        variant: "warning",
        permanent: true,
    });
    scheduleConnectionRecoveryCheck(state);
}

function showConnectionRestoredToast(state) {
    state.dismissToast?.();
    state.dismissToast = null;
    state.didShowToast = false;
    if (!connectionRestoredPrompt) return;
    showToast(connectionRestoredPrompt, {
        variant: "info",
        onDismiss: () => window.location.reload(),
    });
}

async function checkConnectionRecovery(state) {
    try {
        const response = await fetch("/api/v1/system/healthcheck", {
            cache: "no-store",
        });
        if (response.ok) {
            showConnectionRestoredToast(state);
            return;
        }
    } catch {}
    scheduleConnectionRecoveryCheck(state);
}

function scheduleConnectionRecoveryCheck(state) {
    if (!state.didShowToast || state.pollTimer !== null) return;
    state.pollTimer = setTimeout(() => {
        state.pollTimer = null;
        void checkConnectionRecovery(state);
    }, CONNECTION_RECOVERY_POLL_INTERVAL_MS);
}

async function confirmConnectionFailure() {
    try {
        const response = await fetch("/api/v1/system/healthcheck", {
            cache: "no-store",
        });
        return isRetryableServerStatusCode(response.status);
    } catch {
        return true;
    }
}

async function signalConnectionFailure(error) {
    if (!(await confirmConnectionFailure())) return;
    const state = getConnectionRecoveryState();
    showConnectionRecoveryToast(state);
    markConnectionRecoveryFailure(error);
}

function markConnectionRecoveryFailure(value) {
    if (!value || (typeof value !== "object" && typeof value !== "function")) {
        return value;
    }
    try {
        value[connectionRecoveryFailureMarker] = true;
    } catch {}
    return value;
}

function parseRetryableStatusCodeFromMessage(message) {
    if (typeof message !== "string") return null;
    const normalizedMessage = message.trim();
    if (!normalizedMessage) return null;
    const statusMatch = normalizedMessage.match(
        RETRYABLE_SERVER_STATUS_MESSAGE_REGEX,
    );
    if (!statusMatch) return null;
    return Number(statusMatch[1]);
}

function isRetryableServerStatusCode(status) {
    return RETRYABLE_SERVER_STATUS_CODES.has(Number(status));
}

function isRecentConnectionRecoverySignal() {
    const connectionRecoveryState = getConnectionRecoveryState();
    return (
        connectionRecoveryState.lastSignalAt > 0 &&
        Date.now() - connectionRecoveryState.lastSignalAt <=
            CONNECTION_RECOVERY_POPUP_SUPPRESSION_WINDOW_MS
    );
}

function isMarkedConnectionRecoveryFailure(value) {
    const seen = new Set();
    let currentValue = value;
    while (
        currentValue &&
        (typeof currentValue === "object" || typeof currentValue === "function")
    ) {
        if (seen.has(currentValue)) return false;
        seen.add(currentValue);
        if (currentValue[connectionRecoveryFailureMarker] === true) {
            return true;
        }
        currentValue = currentValue.cause;
    }
    return false;
}

export function shouldSuppressConnectionRecoveryPopup(error) {
    if (!isRecentConnectionRecoverySignal()) return false;
    if (isMarkedConnectionRecoveryFailure(error)) return true;
    if (isRetryableServerStatusCode(error?.status)) return true;
    return isRetryableServerStatusCode(
        parseRetryableStatusCodeFromMessage(error?.message),
    );
}

export async function apiFetch(path, options = {}) {
    const {
        accessToken,
        suppressAccessDeniedEvent = false,
        suppressConnectionRecoveryToast = false,
        timeoutMs = API_REQUEST_TIMEOUT_MS,
        ...requestOptions
    } = options ?? {};
    const token = String(
        accessToken ?? localStorage.getItem("cognis_access_token") ?? "",
    ).trim();
    const headers = new Headers(requestOptions.headers);
    if (token) {
        headers.set("authorization", `Bearer ${token}`);
    }
    const timeoutSignal = globalThis.AbortSignal?.timeout?.(timeoutMs);
    const signal = requestOptions.signal
        ? (globalThis.AbortSignal?.any?.([
              requestOptions.signal,
              timeoutSignal,
          ]) ?? requestOptions.signal)
        : timeoutSignal;
    try {
        const response = await fetch(path, {
            ...requestOptions,
            headers,
            signal,
        });
        if (
            (response.status === 401 || response.status === 403) &&
            !suppressAccessDeniedEvent &&
            requestTargetsApi(path) &&
            typeof window !== "undefined"
        ) {
            window.dispatchEvent(
                new CustomEvent("cognis:api-access-denied", {
                    detail: { path, status: response.status },
                }),
            );
        }
        if (
            token &&
            !suppressConnectionRecoveryToast &&
            requestTargetsApi(path) &&
            RETRYABLE_SERVER_STATUS_CODES.has(response.status)
        ) {
            await signalConnectionFailure(response);
        }
        return response;
    } catch (error) {
        if (
            token &&
            !suppressConnectionRecoveryToast &&
            requestTargetsApi(path) &&
            error?.name !== "AbortError"
        ) {
            await signalConnectionFailure(error);
        }
        throw error;
    }
}
