/**
 * PWA registration helper.
 *
 * Public exports:
 * - registerServiceWorker(options) — registers /sw.js at root scope so the
 *   service worker can control every page (login, dashboard, etc.) in the
 *   installed PWA. Safe to call from any page entry point; it no-ops when
 *   service workers are not supported (e.g. non-secure contexts, older
 *   browsers, automated test runs without `navigator.serviceWorker`). Updates wait until existing controlled tabs close so a release does not
 *   replace the asset cache underneath a running page.
 * - capturePwaInstallPrompt() — buffers the `beforeinstallprompt` event so
 *   that a future "Install Cognis" UI control can call `prompt()` on it.
 *
 * Usage:
 *   import { registerServiceWorker } from '../reuse/pwa.js';
 *   registerServiceWorker();
 *
 * @returns {void}
 */

import { offlineEnabled } from "./offline-state.js";

let deferredInstallPrompt = null;

/**
 * Register the Cognis service worker at the site root scope.
 *
 * @param {{ scriptUrl?: string, scope?: string }} [options]
 * @returns {Promise<ServiceWorkerRegistration | null>} the registration, or
 *          null when service workers are unavailable in this environment.
 */
export async function registerServiceWorker(options = {}) {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
        return null;
    }
    if (typeof window !== "undefined" && window.__cognisSwRegistered) {
        return window.__cognisSwRegistered;
    }

    const scriptUrl = options.scriptUrl || "/sw.js";
    const scope = options.scope || "/";

    const registrationPromise = navigator.serviceWorker
        .register(scriptUrl, { scope })
        .then((registration) => {
            const syncPreference = () =>
                navigator.serviceWorker.controller?.postMessage({
                    type: "COGNIS_OFFLINE_PREFERENCE",
                    enabled: offlineEnabled(),
                });
            syncPreference();
            navigator.serviceWorker.addEventListener?.(
                "controllerchange",
                syncPreference,
            );
            return registration;
        })
        .catch((error) => {
            // Registration failures are non-fatal — the app still works,
            // just without offline / install support. Surface to the console
            // so they are visible during development. Clear the cached
            // promise so a later call (e.g. after a transient network blip
            // or a manual page-level retry) can attempt registration again
            // instead of returning the cached null forever.
            console.warn(
                "[cognis-pwa] service worker registration failed",
                error,
            );
            if (
                typeof window !== "undefined" &&
                window.__cognisSwRegistered === registrationPromise
            ) {
                window.__cognisSwRegistered = null;
            }
            return null;
        });

    if (typeof window !== "undefined") {
        window.__cognisSwRegistered = registrationPromise;
    }

    return registrationPromise;
}

/**
 * Capture the browser's `beforeinstallprompt` event (Chromium / Edge) so the
 * deferred prompt can be triggered later from a UI affordance. Firefox and
 * Safari do not fire this event; on those browsers users install via the
 * browser menu instead.
 *
 * @returns {void}
 */
export function capturePwaInstallPrompt() {
    if (typeof window === "undefined") return;
    if (window.__cognisInstallPromptCaptured) return;
    window.__cognisInstallPromptCaptured = true;
    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
    });
    window.addEventListener("appinstalled", () => {
        deferredInstallPrompt = null;
    });
}

/**
 * Returns the buffered install prompt, if any, so a UI control can invoke it.
 *
 * @returns {BeforeInstallPromptEvent | null}
 */
export function getDeferredInstallPrompt() {
    return deferredInstallPrompt;
}
