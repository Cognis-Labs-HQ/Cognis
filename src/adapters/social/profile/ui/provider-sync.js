import { isOffline } from "/static/reuse/offline-state.js";
import { showToast } from "/static/reuse/toast.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

const pendingSyncs = new WeakSet();

function resolveExternalProfileSync() {
    if (isOffline()) return null;
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
    isCurrent,
    signal,
}) {
    const button = root.querySelector(".profile-provider-sync-btn");
    button?.addEventListener(
        "click",
        async () => {
            if (pendingSyncs.has(isCurrent) || !isCurrent()) return;
            const profileSync = resolveExternalProfileSync();
            if (!profileSync) return;
            pendingSyncs.add(isCurrent);
            button.disabled = true;
            dropdown.hidden = true;
            menuButton.setAttribute("aria-expanded", "false");
            try {
                await profileSync.registry.synchronize({
                    providerId: profileSync.providerId,
                });
                if (!isCurrent()) return;
                if ((await applyProfile()) === false || !isCurrent()) return;
                showToast(i18n.t("ui.app.profile.provider_sync_complete"), {
                    variant: "success",
                });
            } catch (error) {
                if (error?.code === "missing_translation") throw error;
                console.error("[profile] external synchronization failed", {
                    component: "social-profile",
                    operation: "synchronizeProfile",
                    errorName: error?.name,
                });
                if (isCurrent())
                    showToast(i18n.t("ui.app.profile.provider_sync_failed"), {
                        variant: "error",
                    });
            } finally {
                pendingSyncs.delete(isCurrent);
                if (isCurrent()) button.disabled = false;
            }
        },
        { signal },
    );
}
