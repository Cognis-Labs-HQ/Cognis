/**
 * Publishes host-owned feedback and logging capabilities to browser components.
 *
 * Public exports:
 * - `registerFeedbackCapabilities()` — registers toast, error-popup, and server-log functions on `uiCtx`.
 *
 * @example
 * ```js
 * import { uiCtx } from '/static/reuse/ui-ctx.js';
 * uiCtx.capabilities.get('ui:showToast')?.('Saved.', { variant: 'success' });
 * await uiCtx.capabilities.get('ui:log')?.('info', 'Module saved settings', {
 *   component: 'module:example',
 * });
 * ```
 */

import { apiFetch } from "./api-client.js";
import { openRuntimeErrorPopup } from "./runtime-error-popup.js";
import { showToast } from "./toast.js";
import { uiCtx } from "./ui-ctx.js";

/**
 * Registers the browser feedback capability surface once.
 *
 * @returns {void}
 */
export function registerFeedbackCapabilities() {
    uiCtx.capabilities.contribute("ui:showToast", showToast);
    uiCtx.capabilities.contribute("ui:openErrorPopup", openRuntimeErrorPopup);
    uiCtx.capabilities.contribute(
        "ui:log",
        async (level, message, meta = {}) => {
            const response = await apiFetch("/api/v1/logging/entries", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ level, message, meta }),
            });
            if (!response.ok) {
                throw new Error(
                    `Server logging failed with HTTP ${response.status}`,
                );
            }
        },
    );
}

registerFeedbackCapabilities();
