import { showToast } from "/static/reuse/toast.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

export function resolveExternalProfileProvider() {
    const providerId = localStorage.getItem("cognis_provider_id");
    return providerId &&
        providerId !== "local" &&
        uiCtx.capabilities.get("auth:syncExternalProfile")
        ? providerId
        : null;
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
            const providerId = resolveExternalProfileProvider();
            const syncExternalProfile = uiCtx.capabilities.get(
                "auth:syncExternalProfile",
            );
            if (!providerId || !syncExternalProfile) return;
            dropdown.hidden = true;
            menuButton.setAttribute("aria-expanded", "false");
            try {
                await syncExternalProfile({ providerId });
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
