/**
 * Publishes search-popup ownership through the shared browser context.
 * Public export: searchPopupLifetime — tracks the current popup and attaches an external lifetime.
 * @example searchPopupLifetime.attachLifetime(tutorialSessionSignal);
 */
import { uiCtx } from "../ui-ctx.js";

function createLifetime() {
    let current;
    return {
        /** @param {Function} close Popup close operation. @param {AbortSignal} signal Popup lifetime. @returns {void} */
        track(close, signal) {
            const entry = { close, signal };
            current = entry;
            signal.addEventListener(
                "abort",
                () => {
                    if (current === entry) current = undefined;
                },
                { once: true },
            );
        },
        /** @param {AbortSignal} signal Consumer lifetime. @returns {boolean} Whether the current popup was attached. */
        attachLifetime(signal) {
            signal.throwIfAborted();
            const entry = current;
            if (!entry || entry.signal.aborted) return false;
            const close = () => entry.close();
            signal.addEventListener("abort", close, { once: true });
            entry.signal.addEventListener(
                "abort",
                () => signal.removeEventListener("abort", close),
                { once: true },
            );
            return true;
        },
    };
}

if (!uiCtx.capabilities.get("ui:searchPopup"))
    uiCtx.capabilities.contribute("ui:searchPopup", createLifetime());

export const searchPopupLifetime = uiCtx.capabilities.get("ui:searchPopup");
