import { profileUiClient } from "./client.js";
import { updateNavbarAvatar } from "/static/layouts/dashboard-layout.js";
import { showToast } from "/static/reuse/toast.js";

/** Apply an accepted profile only while its editor still owns the page. @returns {Promise<boolean>} */
export async function saveProfileFields(
    fields,
    {
        getState,
        setState,
        refreshProfileCards,
        bindProfileHeroEvents,
        i18n,
        isCurrent = () => true,
        awaitCloseDecision = async () => {},
    },
) {
    const log = (level, message, error) =>
        console[level](message, {
            component: "social-profile",
            operation: "saveProfile",
            errorName: error?.name,
        });
    if (!isCurrent()) return false;
    let receipt;
    try {
        const response = await profileUiClient.updateProfile(fields);
        if (!response.ok) throw new Error("profile_save_failed");
        receipt = await response.json();
        if (
            receipt?.queued !== true &&
            (!receipt?.data ||
                typeof receipt.data !== "object" ||
                Array.isArray(receipt.data) ||
                typeof receipt.data.displayName !== "string")
        )
            throw new Error("profile_save_unconfirmed");
    } catch (error) {
        log("error", "[profile] save was not accepted", error);
        await awaitCloseDecision();
        if (isCurrent())
            showToast(
                i18n.t(
                    error?.message === "offline_outbox_full"
                        ? "ui.reuse.offline_buffer_full_body"
                        : "ui.app.profile.save_failed",
                ),
                { variant: "error" },
            );
        return false;
    }
    log("info", "[profile] save accepted");
    await awaitCloseDecision();
    if (!isCurrent()) return true;
    const nextProfile =
        receipt.queued === true
            ? { ...getState().profile, ...fields, queued: true }
            : receipt.data;
    setState({ profile: nextProfile });
    showToast(i18n.t("ui.app.profile.saved"), { variant: "success" });
    try {
        localStorage.setItem("cognis_display_name", nextProfile.displayName);
    } catch (error) {
        log(
            "error",
            "[profile] saved display name cache refresh failed",
            error,
        );
    }
    try {
        refreshProfileCards(["hero", "social-links", "posts-new"]);
        bindProfileHeroEvents();
    } catch (error) {
        log("error", "[profile] saved profile view refresh failed", error);
    }
    void updateNavbarAvatar().catch((error) =>
        log("error", "[profile] navbar refresh failed", error),
    );
    return true;
}
