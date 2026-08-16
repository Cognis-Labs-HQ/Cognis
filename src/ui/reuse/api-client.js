/**
 * Authenticated fetch wrapper. Reads the Bearer token from localStorage
 * and attaches it as an Authorization header on every request.
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
const API_REQUEST_TIMEOUT_MS = 30_000;
const connectionRecoveryFailureMarker = Symbol("connectionRecoveryFailure");

let connectionRecoveryPrompt = "";
let didShowConnectionRecoveryToast = false;
let lastConnectionRecoverySignalAt = 0;

export function configureConnectionRecoveryPrompt(message) {
    if (typeof message !== "string") return;
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    connectionRecoveryPrompt = trimmedMessage;
}

function requestTargetsApi(path) {
    if (typeof path !== "string") return false;
    if (path.startsWith("/api/")) return true;
    try {
        const parsed = new URL(path, window.location.origin);
        return parsed.pathname.startsWith("/api/");
    } catch {
        return false;
    }
}

function showConnectionRecoveryToast() {
    lastConnectionRecoverySignalAt = Date.now();
    if (didShowConnectionRecoveryToast || !connectionRecoveryPrompt) return;
    didShowConnectionRecoveryToast = true;
    showToast(connectionRecoveryPrompt, {
        variant: "warning",
        permanent: true,
    });
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
    return (
        lastConnectionRecoverySignalAt > 0 &&
        Date.now() - lastConnectionRecoverySignalAt <=
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
            showConnectionRecoveryToast();
        }
        return response;
    } catch (error) {
        if (
            token &&
            !suppressConnectionRecoveryToast &&
            requestTargetsApi(path) &&
            error?.name !== "AbortError"
        ) {
            showConnectionRecoveryToast();
            markConnectionRecoveryFailure(error);
        }
        throw error;
    }
}
