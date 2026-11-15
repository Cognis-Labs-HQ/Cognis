/**
 * Owns shared popup stylesheet attempts and cancelable preparation waiters.
 * Public exports: popupPreparation resolves the shared resource owner;
 * waitForPopupPreparation cancels one wait without canceling shared work.
 * @example const ready = popupPreparation(ctx).ensureStylesheet();
 */

const POPUP_STYLESHEET_URL = "/static/styles/popup.css";
const POPUP_STYLESHEET_CACHE = "cognis-popup-styles-v1";
const CACHED_STYLESHEET_ID = "popup-cached-styles";
const ATTEMPT_MS = 5_000;
const CACHE_MS = 1_000;

function log(operation, error) {
    console.error("[popup] Failed to prepare stylesheet", {
        component: "ui.popup",
        operation,
        href: POPUP_STYLESHEET_URL,
        errorName: error?.name,
    });
}

function boundedAttempt(work, milliseconds) {
    let active = true;
    let cleanup = () => {};
    let timeout;
    const lifetime = {
        get active() {
            return active;
        },
        cleanup(callback) {
            cleanup = callback;
        },
    };
    return new Promise((resolve, reject) => {
        timeout = setTimeout(
            () => reject(new Error("popup_stylesheet_timeout")),
            milliseconds,
        );
        Promise.resolve()
            .then(() => work(lifetime))
            .then(resolve, reject);
    }).finally(() => {
        active = false;
        clearTimeout(timeout);
        cleanup();
    });
}

/**
 * @param {object} ctx Shared browser capability context.
 * @returns {{ensureStylesheet: Function, primeStylesheet: Function, reportFailure: Function}} Resource owner.
 */
export function popupPreparation(ctx) {
    const existing = ctx.capabilities.get("ui:popupPreparation");
    if (existing) return existing;
    let stylesheetReady = null;
    let stylesheetRefresh = null;
    const failedLinks = new WeakSet();
    const loadedLinks = new WeakSet();
    const reportedFailures = new WeakSet();

    async function getCache() {
        if (typeof globalThis.caches === "undefined") return null;
        return globalThis.caches.open(POPUP_STYLESHEET_CACHE);
    }

    async function installCachedStylesheet(lifetime) {
        if (
            document
                .querySelector(`#${CACHED_STYLESHEET_ID}`)
                ?.textContent?.trim()
        )
            return true;
        await stylesheetRefresh;
        if (!lifetime.active) return false;
        const stylesheetCache = await getCache();
        const cachedResponse =
            await stylesheetCache?.match(POPUP_STYLESHEET_URL);
        if (!cachedResponse?.ok) return false;
        const text = await cachedResponse.text();
        if (!lifetime.active || !text.trim()) return false;
        const cachedStylesheet =
            document.querySelector(`#${CACHED_STYLESHEET_ID}`) ??
            document.createElement("style");
        cachedStylesheet.id = CACHED_STYLESHEET_ID;
        cachedStylesheet.textContent = text;
        if (!cachedStylesheet.isConnected)
            document.head.appendChild(cachedStylesheet);
        return true;
    }

    function installNetworkStylesheet(lifetime) {
        const existingLink = [
            ...document.querySelectorAll(
                `link[href="${POPUP_STYLESHEET_URL}"]`,
            ),
        ].find((link) => !failedLinks.has(link));
        if (
            existingLink &&
            (existingLink.sheet || loadedLinks.has(existingLink))
        )
            return;
        const owned = !existingLink;
        const link = existingLink ?? document.createElement("link");
        return new Promise((resolve, reject) => {
            let loaded = false;
            const onLoad = () => {
                loaded = true;
                loadedLinks.add(link);
                resolve();
            };
            const onError = () =>
                reject(new Error("popup_stylesheet_load_failed"));
            lifetime.cleanup(() => {
                link.removeEventListener("load", onLoad);
                link.removeEventListener("error", onError);
                if (!loaded) {
                    failedLinks.add(link);
                    if (owned) link.remove();
                }
            });
            link.addEventListener("load", onLoad);
            link.addEventListener("error", onError);
            if (owned) {
                link.rel = "stylesheet";
                link.href = POPUP_STYLESHEET_URL;
                link.dataset.resourceErrorHandled = "true";
                document.head.appendChild(link);
            }
        });
    }

    function ensureStylesheet() {
        if (stylesheetReady) return stylesheetReady;
        stylesheetReady = boundedAttempt(async (lifetime) => {
            const healthy = [
                ...document.querySelectorAll(
                    `link[href="${POPUP_STYLESHEET_URL}"]`,
                ),
            ].some(
                (link) =>
                    !failedLinks.has(link) &&
                    (link.sheet || loadedLinks.has(link)),
            );
            if (healthy) return;
            try {
                if (await boundedAttempt(installCachedStylesheet, CACHE_MS))
                    return;
            } catch (error) {
                log("readStylesheetCache", error);
                // Continue with installNetworkStylesheet below.
            }
            if (lifetime.active) await installNetworkStylesheet(lifetime);
        }, ATTEMPT_MS).catch((error) => {
            stylesheetReady = null;
            log("loadStylesheet", error);
            throw error;
        });
        return stylesheetReady;
    }

    function primeStylesheet() {
        if (stylesheetRefresh) return stylesheetRefresh;
        stylesheetRefresh = boundedAttempt(async (lifetime) => {
            const stylesheetCache = await getCache();
            if (
                !stylesheetCache ||
                typeof globalThis.fetch !== "function" ||
                !lifetime.active
            )
                return;
            const response = await globalThis.fetch(POPUP_STYLESHEET_URL, {
                cache: "no-cache",
                credentials: "same-origin",
            });
            if (!response.ok)
                throw new Error("popup_stylesheet_response_failed");
            const text = await response.clone().text();
            if (!text.trim())
                throw new Error("popup_stylesheet_response_empty");
            if (!lifetime.active) return;
            await stylesheetCache.put(POPUP_STYLESHEET_URL, response.clone());
            if (!lifetime.active) return;
            const installedStylesheet = globalThis.document?.querySelector(
                `#${CACHED_STYLESHEET_ID}`,
            );
            if (installedStylesheet) installedStylesheet.textContent = text;
        }, ATTEMPT_MS)
            .catch((error) => {
                const log = console.error.bind(console);
                log(
                    `[popup] Failed to refresh stylesheet cache for "${POPUP_STYLESHEET_URL}":`,
                    error,
                );
            })
            .finally(() => {
                stylesheetRefresh = null;
            });
        return stylesheetRefresh;
    }

    function reportFailure(error, notify) {
        if (reportedFailures.has(error)) return;
        reportedFailures.add(error);
        notify();
    }

    const owner = { ensureStylesheet, primeStylesheet, reportFailure };
    ctx.capabilities.contribute("ui:popupPreparation", owner);
    return owner;
}

/**
 * @param {Promise<*>} preparation Shared preparation work.
 * @param {AbortSignal} [signal] Opening lifetime.
 * @returns {Promise<*>} Prepared value, or null on cancellation.
 */
export function waitForPopupPreparation(preparation, signal) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            signal?.removeEventListener("abort", onAbort);
            callback(value);
        };
        const onAbort = () => finish(resolve, null);
        signal?.addEventListener("abort", onAbort, { once: true });
        preparation.then(
            (value) => finish(resolve, value),
            (error) => finish(reject, error),
        );
        if (signal?.aborted) onAbort();
    });
}
