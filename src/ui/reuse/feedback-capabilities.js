/**
 * Publishes host feedback capabilities to browser components.
 *
 * Public exports:
 * - `registerFeedbackCapabilities()` — registers toast and error-popup functions on `uiCtx`.
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
}

registerFeedbackCapabilities();
