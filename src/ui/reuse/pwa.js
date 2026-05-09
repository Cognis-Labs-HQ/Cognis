/**
 * PWA registration helper.
 *
 * Public exports:
 * - registerServiceWorker(options) — registers /sw.js at root scope so the
 *   service worker can control every page (login, dashboard, etc.) in the
 *   installed PWA. Safe to call from any page entry point; it no-ops when
 *   service workers are not supported (e.g. non-secure contexts, older
 *   browsers, automated test runs without `navigator.serviceWorker`). When a
 *   waiting worker is detected it triggers an immediate `SKIP_WAITING` so a
 *   fresh `/sw.js` rolls out on the next page load.
 * - capturePwaInstallPrompt() — buffers the `beforeinstallprompt` event so
 *   that a future "Install Cognis" UI control can call `prompt()` on it.
 *
 * Usage:
 *   import { registerServiceWorker } from '../reuse/pwa.js';
 *   registerServiceWorker();
 *
 * @returns {void}
 */

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
            if (registration.waiting) {
                registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
            registration.addEventListener("updatefound", () => {
                const installing = registration.installing;
                if (!installing) return;
                installing.addEventListener("statechange", () => {
                    if (
                        installing.state === "installed" &&
                        navigator.serviceWorker.controller
                    ) {
                        installing.postMessage({ type: "SKIP_WAITING" });
                    }
                });
            });
            return registration;
        })
        .catch((error) => {
            // Registration failures are non-fatal — the app still works,
            // just without offline / install support. Surface to the console
            // so they are visible during development.
            console.warn(
                "[cognis-pwa] service worker registration failed",
                error,
            );
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
