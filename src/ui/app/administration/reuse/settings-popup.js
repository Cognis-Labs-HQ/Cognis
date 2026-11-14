/**
 * Own adapter editors opened through the injected popup contract.
 * Nested decisions keep their own modal identity and normal close protection.
 */
import { transientSurfaces } from "../../../reuse/transient-surfaces.js";

export function createAdapterSettingsPopup(
    openPopup,
    { gatewayId, adapterId, signal },
) {
    if (!gatewayId || !adapterId)
        throw new TypeError("adapter_settings_identity_required");
    let active = false;
    return async (options) => {
        if (active) return openPopup(options);
        if (signal?.aborted) return null;
        active = true;
        const lifetime = new AbortController();
        let surface;
        let dismissSurface;
        const cancel = () => dismissSurface?.();
        signal?.addEventListener("abort", cancel, { once: true });
        try {
            return await openPopup({
                ...options,
                onOpen(overlay, dismiss, api) {
                    const content = overlay.querySelector(".popup-body");
                    if (!content)
                        throw new Error("adapter_settings_surface_unavailable");
                    overlay.setAttribute("data-component-settings-popup", "");
                    overlay.setAttribute(
                        "data-adapter-settings-gateway",
                        gatewayId,
                    );
                    overlay.setAttribute("data-adapter-settings-id", adapterId);
                    content.setAttribute("data-component-settings-content", "");
                    if (surface !== overlay) {
                        transientSurfaces.register(
                            overlay,
                            dismiss,
                            lifetime.signal,
                        );
                        surface = overlay;
                    }
                    dismissSurface = dismiss;
                    if (signal?.aborted) {
                        dismiss();
                        return;
                    }
                    options.onOpen?.(overlay, dismiss, api);
                },
            });
        } finally {
            signal?.removeEventListener("abort", cancel);
            lifetime.abort();
            active = false;
        }
    };
}
