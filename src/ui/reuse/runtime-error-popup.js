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
 * @param {{
 *   error?: unknown,
 *   context?: string,
 *   consoleEntries?: Array<{ timestamp: string, level: string, message: string }>,
 * }} options
 * @returns {Promise<void>}
 */

import { openPopup } from "./popup.js";
import { createI18n } from "./i18n.js";
import { escapeHtml } from "./escape-html.js";

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

function pushConsoleEntry(level, argumentsList) {
    const message = argumentsList.map(stringifyConsoleArgument).join(" ");
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
        console[consoleMethodName] = (...argumentsList) => {
            pushConsoleEntry(consoleMethodName, argumentsList);
            originalConsoleMethod.apply(console, argumentsList);
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

function getConsoleEntriesMarkup(
    i18n,
    consoleEntries = consoleEntryBuffer.slice(-MAX_CONSOLE_ENTRY_COUNT),
) {
    if (!consoleEntries.length) {
        return `<p>${escapeHtml(i18n.t("ui.reuse.runtime_error_popup_console_empty"))}</p>`;
    }
    const renderedEntries = consoleEntries
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
    consoleEntries,
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
                };
                return fallbackLabels[key] ?? key;
            },
        }));

        const popupBody = () => `
            <div class="popup-error-report">
                <section>
                    <h3>${escapeHtml(i18n.t("ui.reuse.runtime_error_popup_summary"))}</h3>
                    <pre class="popup-error-report-trace">${escapeHtml(normalizedErrorMessage)}</pre>
                </section>
                <section>
                    <h3>${escapeHtml(i18n.t("ui.reuse.runtime_error_popup_context"))}</h3>
                    <pre class="popup-error-report-trace">${escapeHtml(context || "unknown")}</pre>
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

        await openPopup({
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
    } finally {
        popupOpen = false;
    }
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
            const eventContext = resourceLoadError
                ? "Window resource load error"
                : "Window runtime error";
            openRuntimeErrorPopup({
                error: runtimeError ?? event.message,
                context: eventContext,
            }).catch(() => {});
        },
        true,
    );

    window.addEventListener("unhandledrejection", (event) => {
        openRuntimeErrorPopup({
            error: event.reason,
            context: "Unhandled Promise Rejection",
        }).catch(() => {});
    });
}
