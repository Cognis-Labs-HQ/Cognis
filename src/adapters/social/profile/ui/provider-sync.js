import { showToast } from "/static/reuse/toast.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

function resolveExternalProfileSync() {
    const providerId = localStorage.getItem("cognis_provider_id");
    const registry = uiCtx.capabilities.get("auth:externalProfileSync");
    return providerId &&
        providerId !== "local" &&
        registry?.supports(providerId)
        ? { providerId, registry }
        : null;
}

export function resolveExternalProfileProvider() {
    return resolveExternalProfileSync()?.providerId ?? null;
}

export function bindExternalProfileSync({
    root,
    dropdown,
    menuButton,
    i18n,
    applyProfile,
}) {
    root.querySelector(".profile-provider-sync-btn")?.addEventListener(
        "click",
        async () => {
            const profileSync = resolveExternalProfileSync();
            if (!profileSync) return;
            dropdown.hidden = true;
            menuButton.setAttribute("aria-expanded", "false");
            try {
                await profileSync.registry.synchronize({
                    providerId: profileSync.providerId,
                });
                await applyProfile();
                showToast(i18n.t("ui.app.profile.provider_sync_complete"), {
                    variant: "success",
                });
            } catch {
                showToast(i18n.t("ui.app.profile.provider_sync_failed"), {
                    variant: "error",
                });
            }
        },
    );
}
