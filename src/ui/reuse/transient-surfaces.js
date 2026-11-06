/**
 * Owns transient UI surfaces by their actual element across bundled and direct imports.
 * Public export: transientSurfaces — registers a surface and attaches a consumer lifetime.
 * @example transientSurfaces.register(panel, closePanel, panelSignal);
 * @example transientSurfaces.attachLifetime(panel, tutorialGroupSignal);
 */
import { uiCtx } from "./ui-ctx.js";

function createRegistry() {
    const surfaces = new WeakMap();
    return {
        /** @param {object} element Surface identity. @param {Function} close Owner's close operation. @param {AbortSignal} signal Owner lifetime. @returns {void} */
        register(element, close, signal) {
            if (
                !element ||
                typeof element !== "object" ||
                typeof close !== "function"
            )
                throw new TypeError("invalid_transient_surface");
            signal.throwIfAborted();
            const entry = { close, signal };
            surfaces.set(element, entry);
            signal.addEventListener(
                "abort",
                () => {
                    if (surfaces.get(element) === entry)
                        surfaces.delete(element);
                },
                { once: true },
            );
        },
        /** @param {object} element Registered surface. @param {AbortSignal} signal Consumer lifetime. @returns {boolean} Whether a live surface was attached. */
        attachLifetime(element, signal) {
            signal.throwIfAborted();
            const entry = surfaces.get(element);
            if (!entry || entry.signal.aborted) return false;
            const close = () => {
                if (surfaces.get(element) === entry && !entry.signal.aborted)
                    entry.close();
            };
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

if (!uiCtx.capabilities.get("ui:transientSurfaces"))
    uiCtx.capabilities.contribute("ui:transientSurfaces", createRegistry());

export const transientSurfaces = uiCtx.capabilities.get("ui:transientSurfaces");
