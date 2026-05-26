/**
 * Global runtime error reporting popup for dashboard pages.
 *
 * Public exports:
 *   installRuntimeErrorHandlers() — installs window error/rejection listeners
 *     and captures recent console output for debugging.
 *   openRuntimeErrorPopup(options) — opens a popup containing error summary,
 *     stack trace, and captured console lines users can share in bug reports.
 *
 * Usage:
 *   import {
 *     installRuntimeErrorHandlers,
 *     openRuntimeErrorPopup,
 *   } from './runtime-error-popup.js';
 *
 *   installRuntimeErrorHandlers();
 *   await openRuntimeErrorPopup({
 *     error: caughtError,
 *     context: 'Route load failed for /profile/demo',
 *   });
 *
 * Notes:
 *   installRuntimeErrorHandlers() wraps console methods to record recent log
 *   lines for report popups. The original console methods are still invoked for
 *   normal devtools output, but the wrapped methods have a different function
 *   identity than the native console methods.
 *
 * @param {{
 *   error?: unknown,
 *   context?: string,
 *   contextKey?: string,
 *   contextDetail?: string,
 *   consoleEntries?: Array<{ timestamp: string, level: string, message: string }>,
 * }} options
 * @returns {Promise<void>}
 */

import { openPopup } from "./popup.js";
import { createI18n } from "./i18n.js";
import { escapeHtml } from "./escape-html.js";
import {
    getCurrentRoutePath,
    normalizeSameOriginRoutePath,
} from "./route-path.js";

const MAX_CONSOLE_ENTRY_COUNT = 30;
const POPUP_DEDUPLICATION_WINDOW_MILLISECONDS = 1500;
const consoleEntryBuffer = [];
const originalConsoleMethods = new Map();

let i18nPromise = null;
let handlersInstalled = false;
let popupOpen = false;
let recentPopupSignature = "";
let recentPopupTimestamp = 0;

function getI18nPromise() {
    if (!i18nPromise) {
        i18nPromise = createI18n();
    }
    return i18nPromise;
}

function normalizeErrorMessage(value) {
    if (value instanceof Error) {
        return value.message || value.name || "Unknown error";
    }
    if (typeof value === "string") {
        const normalizedValue = value.trim();
        return normalizedValue || "Unknown error";
    }
    if (value == null) {
        return "Unknown error";
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function normalizeErrorStack(value) {
    if (value instanceof Error && value.stack) {
        return value.stack;
    }
    if (typeof value === "string") {
        return value;
    }
    if (value == null) {
        return "";
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function stringifyConsoleArgument(value) {
    if (value instanceof Error) {
        return normalizeErrorStack(value);
    }
    if (typeof value === "string") {
        return value;
    }
    if (value == null) {
        return String(value);
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function pushConsoleEntry(level, consoleArguments) {
    const message = consoleArguments.map(stringifyConsoleArgument).join(" ");
    consoleEntryBuffer.push({
        timestamp: new Date().toISOString(),
        level,
        message: message.trim(),
    });
    if (consoleEntryBuffer.length > MAX_CONSOLE_ENTRY_COUNT) {
        consoleEntryBuffer.splice(
            0,
            consoleEntryBuffer.length - MAX_CONSOLE_ENTRY_COUNT,
        );
    }
}

function installConsoleCapture() {
    const consoleMethodNames = ["error", "warn", "info", "log"];
    for (const consoleMethodName of consoleMethodNames) {
        const originalConsoleMethod = console[consoleMethodName];
        if (typeof originalConsoleMethod !== "function") continue;
        if (originalConsoleMethods.has(consoleMethodName)) continue;
        originalConsoleMethods.set(consoleMethodName, originalConsoleMethod);
        console[consoleMethodName] = (...consoleArguments) => {
            pushConsoleEntry(consoleMethodName, consoleArguments);
            originalConsoleMethod.apply(console, consoleArguments);
        };
    }
}

function buildResourceLoadError(event) {
    const eventTarget = event?.target;
    if (!eventTarget || eventTarget === window) return null;
    const resourceUrl =
        eventTarget instanceof HTMLScriptElement
            ? eventTarget.src
            : eventTarget instanceof HTMLLinkElement
              ? eventTarget.href
              : eventTarget instanceof HTMLImageElement
                ? eventTarget.src
                : "";
    if (!resourceUrl) return null;
    return new Error(`Failed to load resource: ${resourceUrl}`);
}

function buildPopupSignature({ context, errorMessage, errorStack }) {
    return [context, errorMessage, errorStack].join("|");
}

function shouldSuppressPopup(signature) {
    const now = Date.now();
    const isDuplicate =
        signature === recentPopupSignature &&
        now - recentPopupTimestamp < POPUP_DEDUPLICATION_WINDOW_MILLISECONDS;
    recentPopupSignature = signature;
    recentPopupTimestamp = now;
    return isDuplicate;
}

function getConsoleEntriesMarkup(i18n, consoleEntries = null) {
    const effectiveConsoleEntries = Array.isArray(consoleEntries)
        ? consoleEntries
        : consoleEntryBuffer.slice(-MAX_CONSOLE_ENTRY_COUNT);
    if (!effectiveConsoleEntries.length) {
        return `<p>${escapeHtml(i18n.t("ui.reuse.runtime_error_popup_console_empty"))}</p>`;
    }
    const renderedEntries = effectiveConsoleEntries
        .map(
            (entry) =>
                `${escapeHtml(entry.timestamp)} [${escapeHtml(String(entry.level).toUpperCase())}] ${escapeHtml(entry.message || "")}`,
        )
        .join("\n");
    return `<pre class="popup-error-report-trace">${renderedEntries}</pre>`;
}

export async function openRuntimeErrorPopup({
    error,
    context = "",
    contextKey = "",
    contextDetail = "",
    consoleEntries,
    previousRoute = "",
} = {}) {
    const normalizedErrorMessage = normalizeErrorMessage(error);
    const normalizedErrorStack = normalizeErrorStack(error);
    const popupSignature = buildPopupSignature({
        context,
        errorMessage: normalizedErrorMessage,
        errorStack: normalizedErrorStack,
    });
    if (popupOpen || shouldSuppressPopup(popupSignature)) {
        return;
    }

    popupOpen = true;
    try {
        const currentRoutePath = getCurrentRoutePath();
        const previousRoutePath = resolvePreviousRoutePath(previousRoute);
        const i18n = await getI18nPromise().catch(() => ({
            t(key) {
                const fallbackLabels = {
                    "ui.reuse.runtime_error_popup_title":
                        "Runtime Error Detected",
                    "ui.reuse.runtime_error_popup_summary": "Error Summary",
                    "ui.reuse.runtime_error_popup_context": "Technical Context",
                    "ui.reuse.runtime_error_popup_page_url": "Page URL",
                    "ui.reuse.runtime_error_popup_stack": "Stack Trace",
                    "ui.reuse.runtime_error_popup_console": "Console Trace",
                    "ui.reuse.runtime_error_popup_console_empty":
                        "No recent console entries were captured.",
                    "ui.reuse.runtime_error_context_window_resource":
                        "Window Resource Load Error",
                    "ui.reuse.runtime_error_context_window_runtime":
                        "Window Runtime Error",
                    "ui.reuse.runtime_error_context_unhandled_rejection":
                        "Unhandled Promise Rejection",
                    "ui.reuse.runtime_error_context_route_mount":
                        "Route Mount Failed",
                    "ui.reuse.runtime_error_context_route_load":
                        "Route Load Failed",
                };
                return fallbackLabels[key] ?? key;
            },
        }));
        const contextParts = [];
        const localizedContext = contextKey ? i18n.t(contextKey) : "";
        if (localizedContext) contextParts.push(localizedContext);
        else if (context) contextParts.push(context);
        if (contextDetail) contextParts.push(contextDetail);
        const resolvedContext = contextParts.join(": ") || "unknown";
        const brandName = i18n.t("ui.shared.brand.name");

        const popupBody = () => `
            <div class="popup-error-report">
                <div class="popup-error-report-brand">
                    <img src="/static/assets/icons/cognis-icon.png" alt="${escapeHtml(brandName)}" class="popup-error-report-brand-icon" />
                    <span class="popup-error-report-brand-name">${escapeHtml(brandName)}</span>
                </div>
                <section>
                    <h3>${escapeHtml(i18n.t("ui.reuse.runtime_error_popup_summary"))}</h3>
                    <pre class="popup-error-report-trace">${escapeHtml(normalizedErrorMessage)}</pre>
                </section>
                <section>
                    <h3>${escapeHtml(i18n.t("ui.reuse.runtime_error_popup_context"))}</h3>
                    <pre class="popup-error-report-trace">${escapeHtml(resolvedContext)}</pre>
                </section>
                <section>
                    <h3>${escapeHtml(i18n.t("ui.reuse.runtime_error_popup_page_url"))}</h3>
                    <pre class="popup-error-report-trace">${escapeHtml(window.location.href)}</pre>
                </section>
                <section>
                    <h3>${escapeHtml(i18n.t("ui.reuse.runtime_error_popup_stack"))}</h3>
                    <pre class="popup-error-report-trace">${escapeHtml(normalizedErrorStack || normalizedErrorMessage)}</pre>
                </section>
                <section>
                    <h3>${escapeHtml(i18n.t("ui.reuse.runtime_error_popup_console"))}</h3>
                    ${getConsoleEntriesMarkup(i18n, consoleEntries)}
                </section>
            </div>
        `;

        const popupAction = await openPopup({
            title: i18n.t("ui.reuse.runtime_error_popup_title"),
            body: popupBody,
            variant: "danger",
            maxWidth: "960px",
            actions: [
                {
                    id: "close",
                    label: i18n.t("ui.reuse.dismiss"),
                    variant: "confirm",
                },
            ],
        });
        if (popupAction === null) {
            navigateToPreviousRouteIfDifferent(
                currentRoutePath,
                previousRoutePath,
            );
        }
    } finally {
        popupOpen = false;
    }
}

function normalizeRoutePath(routePath) {
    return normalizeSameOriginRoutePath(routePath, { logFailures: true });
}

function getPreviousRoutePathFromReferrer() {
    if (
        typeof document === "undefined" ||
        typeof document.referrer !== "string" ||
        !document.referrer
    ) {
        return "";
    }
    return normalizeRoutePath(document.referrer);
}

function getPreviousRoutePathFromHistoryState() {
    if (typeof window === "undefined") return "";
    return normalizeRoutePath(window.history.state?.previousRouterPage);
}

function resolvePreviousRoutePath(explicitPreviousRoute) {
    const explicitRoutePath = normalizeRoutePath(explicitPreviousRoute);
    if (explicitRoutePath) return explicitRoutePath;
    const stateRoutePath = getPreviousRoutePathFromHistoryState();
    if (stateRoutePath) return stateRoutePath;
    return getPreviousRoutePathFromReferrer();
}

function navigateToPreviousRouteIfDifferent(
    currentRoutePath,
    previousRoutePath,
) {
    if (typeof window === "undefined") return;
    const normalizedCurrentRoutePath = normalizeRoutePath(currentRoutePath);
    const normalizedPreviousRoutePath = normalizeRoutePath(previousRoutePath);
    if (!normalizedCurrentRoutePath || !normalizedPreviousRoutePath) return;
    if (normalizedCurrentRoutePath === normalizedPreviousRoutePath) return;
    const normalizedLatestRoutePath = normalizeRoutePath(getCurrentRoutePath());
    if (normalizedLatestRoutePath !== normalizedCurrentRoutePath) return;
    window.history.back();
}

export function installRuntimeErrorHandlers() {
    if (handlersInstalled) return;
    handlersInstalled = true;

    installConsoleCapture();

    window.addEventListener(
        "error",
        (event) => {
            const resourceLoadError = buildResourceLoadError(event);
            const runtimeError = resourceLoadError ?? event.error;
            openRuntimeErrorPopup({
                error: runtimeError ?? event.message,
                contextKey: resourceLoadError
                    ? "ui.reuse.runtime_error_context_window_resource"
                    : "ui.reuse.runtime_error_context_window_runtime",
            }).catch(() => {});
        },
        true,
    );

    window.addEventListener("unhandledrejection", (event) => {
        openRuntimeErrorPopup({
            error: event.reason,
            contextKey: "ui.reuse.runtime_error_context_unhandled_rejection",
        }).catch(() => {});
    });
}
