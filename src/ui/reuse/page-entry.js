/**
 * Page-entry loading helpers for direct page mounts and SPA transitions.
 *
 * Public exports:
 *   beginPageLoading() — starts a tracked client-side page-loading task and
 *     returns an idempotent cleanup function that hides the overlay when the
 *     task is released.
 *   mountWhenDirect(mount, options) — runs a page mount on direct URL loads
 *     while skipping SPA-router navigations and automatically updates the
 *     loading overlay state around the mount.
 *
 * Usage example:
 *   import { mountWhenDirect } from '/static/reuse/page-entry.js';
 *   export async function mount(root) { ... }
 *   await mountWhenDirect(mount);
 */

import { createI18n, readPreferredLanguages } from "./i18n.js";

const activePageLoadingTokens = new Set();
let nextPageLoadingToken = 0;
let loadingOverlayMounted = false;
let loadingOverlayElement = null;
let loadingWheelMessageElement = null;
let loadingMessageTimer = null;
let loadingMessageIndex = 0;
let loadingI18nPromise = null;
let loadingMessages = null;
let pageUnloadListenersRegistered = false;

const LOADING_MESSAGE_INTERVAL_MILLISECONDS = 1800;
const LOADING_MESSAGE_KEYS = [
    "ui.reuse.loading_joke_1",
    "ui.reuse.loading_joke_2",
    "ui.reuse.loading_joke_3",
    "ui.reuse.loading_joke_4",
];
const FALLBACK_LOADING_MESSAGES = [
    "Cognis shouldn't be this slow, isn't it 2026?",
    "Polishing pixels... apparently one by one.",
    "Loading... at a speed historians can appreciate.",
    "We promise this spinner is judging us too.",
];

function createLoadingOverlayElement() {
    if (typeof document.createElement !== "function") return null;
    const overlay = document.createElement("div");
    overlay.className = "page-loading-overlay";
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-hidden", "true");

    const spinner = document.createElement("div");
    spinner.className = "page-loading-overlay__spinner";

    const message = document.createElement("p");
    message.className = "page-loading-overlay__message";
    message.textContent = FALLBACK_LOADING_MESSAGES[0];

    overlay.append(spinner, message);
    return { overlay, message };
}

function ensureLoadingOverlay() {
    if (loadingOverlayMounted) return;
    const body = document.body;
    if (!body || typeof body.append !== "function") return;
    const created = createLoadingOverlayElement();
    if (!created) return;

    loadingOverlayElement = created.overlay;
    loadingWheelMessageElement = created.message;
    body.append(loadingOverlayElement);
    body.dataset.pageLoadingOverlayMounted = "true";
    loadingOverlayMounted = true;
}

function loadLoadingMessagesI18n() {
    if (loadingI18nPromise) return loadingI18nPromise;
    let preferredLanguages = ["en"];
    try {
        preferredLanguages = readPreferredLanguages();
    } catch {}
    loadingI18nPromise = createI18n({
        preferredLanguages,
    })
        .then((i18n) => {
            const translated = LOADING_MESSAGE_KEYS.map((key) =>
                i18n.t(key),
            ).filter((value) => typeof value === "string" && value.trim());
            loadingMessages = translated.length
                ? translated
                : FALLBACK_LOADING_MESSAGES;
            return loadingMessages;
        })
        .catch(() => {
            loadingMessages = FALLBACK_LOADING_MESSAGES;
            return loadingMessages;
        });
    return loadingI18nPromise;
}

function getActiveLoadingMessages() {
    return loadingMessages?.length
        ? loadingMessages
        : FALLBACK_LOADING_MESSAGES;
}

function renderLoadingMessage(index) {
    if (!loadingWheelMessageElement) return;
    const messages = getActiveLoadingMessages();
    if (!messages.length) return;
    const safeIndex =
        ((index % messages.length) + messages.length) % messages.length;
    loadingMessageIndex = safeIndex;
    loadingWheelMessageElement.textContent = messages[safeIndex];
}

function startLoadingMessageRotation() {
    if (loadingMessageTimer) return;
    renderLoadingMessage(loadingMessageIndex);
    loadingMessageTimer = setInterval(() => {
        renderLoadingMessage(loadingMessageIndex + 1);
    }, LOADING_MESSAGE_INTERVAL_MILLISECONDS);
}

function stopLoadingMessageRotation() {
    if (loadingMessageTimer) {
        clearInterval(loadingMessageTimer);
        loadingMessageTimer = null;
    }
}

function registerPageUnloadListeners() {
    if (pageUnloadListenersRegistered) return;
    pageUnloadListenersRegistered = true;
    if (
        typeof window === "undefined" ||
        typeof window.addEventListener !== "function"
    ) {
        return;
    }
    const markPageAsLoading = () => {
        const body = document.body;
        if (!body) return;
        body.dataset.pageReady = "false";
        body.setAttribute("aria-busy", "true");
    };
    window.addEventListener("beforeunload", markPageAsLoading);
    window.addEventListener("pagehide", markPageAsLoading);
}

function updatePageLoadingState() {
    const body = document.body;
    if (!body) return;
    ensureLoadingOverlay();
    const pendingLoadCount = activePageLoadingTokens.size;
    if (pendingLoadCount > 0) {
        body.dataset.pageReady = "false";
        body.setAttribute("aria-busy", "true");
        loadingOverlayElement?.setAttribute("aria-hidden", "false");
        startLoadingMessageRotation();
        void loadLoadingMessagesI18n()
            .then(() => {
                renderLoadingMessage(loadingMessageIndex);
            })
            .catch(() => {});
        return;
    }
    body.dataset.pageReady = "true";
    body.setAttribute("aria-busy", "false");
    loadingOverlayElement?.setAttribute("aria-hidden", "true");
    stopLoadingMessageRotation();
}

/**
 * Shows the shared page-loading overlay for a new client-side load task.
 *
 * @returns {() => void}
 */
export function beginPageLoading() {
    const token = nextPageLoadingToken++;
    let released = false;
    activePageLoadingTokens.add(token);
    updatePageLoadingState();
    return () => {
        if (released) return;
        released = true;
        endPageLoading(token);
    };
}

/**
 * Hides the shared page-loading overlay once a client-side load task finishes.
 *
 * @param {number} token - Loading token returned by beginPageLoading().
 * @returns {void}
 */
function endPageLoading(token) {
    activePageLoadingTokens.delete(token);
    updatePageLoadingState();
}

/**
 * Runs a page mount on direct URL loads while skipping SPA-router navigations.
 *
 * @param {(root: Element | null) => Promise<unknown>} mount - Page mount
 *   function for the current entry module.
 * @param {{ rootSelector?: string }} [options] - Direct-mount options.
 * @returns {Promise<void>}
 */
export async function mountWhenDirect(mount, { rootSelector = "#app" } = {}) {
    if (globalThis.__spaRouter) return;
    registerPageUnloadListeners();
    const finishPageLoading = beginPageLoading();
    try {
        await mount(document.querySelector(rootSelector));
    } finally {
        finishPageLoading();
    }
}
