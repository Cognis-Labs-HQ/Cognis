import { profileUiClient } from "./client.js";
import { updateNavbarAvatar } from "/static/layouts/dashboard-layout.js";
import { showToast } from "/static/reuse/toast.js";

/**
 * Apply the acknowledged or durably queued profile before refreshing its views.
 * @returns {Promise<void>}
 */
export async function saveProfileFields(
    fields,
    { getState, setState, refreshProfileCards, bindProfileHeroEvents, i18n },
) {
    let delivered = false;
    try {
        const response = await profileUiClient.updateProfile(fields);
        if (!response.ok) throw new Error("profile_save_failed");
        const receipt = await response.json();
        delivered = true;
        showToast(
            i18n.t(
                receipt.queued
                    ? "ui.reuse.offline_changes_queued"
                    : "ui.app.profile.saved",
            ),
            { variant: receipt.queued ? "info" : "success" },
        );
        localStorage.setItem("cognis_display_name", fields.displayName);
        setState({
            profile: receipt.queued
                ? { ...getState().profile, ...fields, queued: true }
                : receipt.data,
        });
        refreshProfileCards(["hero", "social-links", "posts-new"]);
        bindProfileHeroEvents();
        void updateNavbarAvatar().catch((error) =>
            console.error("[profile] navbar refresh failed", {
                operation: "refreshAfterSave",
                errorName: error?.name,
            }),
        );
    } catch (error) {
        if (delivered) {
            console.error("[profile] saved profile view refresh failed", {
                operation: "refreshAfterSave",
                errorName: error?.name,
            });
            return;
        }
        showToast(
            i18n.t(
                error.message === "offline_outbox_full"
                    ? "ui.reuse.offline_buffer_full_body"
                    : "ui.app.profile.save_failed",
            ),
            { variant: "error" },
        );
    }
}
