/**
 * Own adapter editors opened through the injected popup contract.
 * Nested decisions keep their own modal identity and normal close protection.
 */
import { transientSurfaces } from "../../../reuse/transient-surfaces.js";

export function createAdapterSettingsPopup(openPopup) {
    let active = false;
    return async (options) => {
        if (active) return openPopup(options);
        active = true;
        const lifetime = new AbortController();
        let surface;
        try {
            return await openPopup({
                ...options,
                onOpen(overlay, dismiss, api) {
                    const content = overlay.querySelector(".popup-body");
                    if (!content)
                        throw new Error("adapter_settings_surface_unavailable");
                    overlay.setAttribute("data-component-settings-popup", "");
                    content.setAttribute("data-component-settings-content", "");
                    if (surface !== overlay) {
                        transientSurfaces.register(
                            overlay,
                            dismiss,
                            lifetime.signal,
                        );
                        surface = overlay;
                    }
                    options.onOpen?.(overlay, dismiss, api);
                },
            });
        } finally {
            lifetime.abort();
            active = false;
        }
    };
}
