import { uiCtx } from "/static/reuse/ui-ctx.js";

/**
 * Wires the Jitsi Meet "share meeting" button.
 *
 * The button element itself is created by the Share gateway's client
 * capability (`mountShareButton`), not by this module, so the Share gateway
 * remains the sole authority over share buttons: if the Share gateway is
 * disabled its static asset is never served, the dynamic import below fails,
 * and no share button (and therefore no share flow) is ever created for
 * this meeting.
 */

export async function bindShareButton({
    root,
    signal,
    state,
    i18n,
    deferAloneParticipantPrompt,
}) {
    const shareButtonSlot = root.querySelector("#jitsi-share-button-slot");
    if (!(shareButtonSlot instanceof HTMLElement)) {
        return;
    }
    const existingButton = shareButtonSlot.querySelector("#share-resource-btn");
    if (existingButton instanceof HTMLButtonElement) {
        // Already mounted from a prior composer render pass — just refresh
        // its disabled state in case the meeting activity status changed.
        existingButton.disabled = !state.jitsiConferenceJoined;
        return;
    }

    let shareButtonModule;
    try {
        shareButtonModule =
            await import("/static/gateways/share/ui/reuse/share-button.js");
    } catch {
        // Share gateway unavailable — no share button is created.
        return;
    }

    if (typeof shareButtonModule?.mountShareButton !== "function") {
        return;
    }

    const shareButton = shareButtonModule.mountShareButton({
        container: shareButtonSlot,
        label: i18n.t("module.jitsi_meet.share.button"),
        id: "share-resource-btn",
        signal,
        onClick: async () => {
            if (!state.meeting?.id || !state.jitsiConferenceJoined) {
                return;
            }
            const openShareLinksPopup = uiCtx.capabilities.get(
                "share:openLinksPopup",
            );
            if (typeof openShareLinksPopup !== "function") return;
            const { buildShareCallbacks } = await import("./share-adapter.js");
            // Opening the share popup pauses the local user's attention on
            // the meeting for an unpredictable amount of time. Defer the
            // "alone in meeting" overlay for the duration so it doesn't fire
            // spuriously while other participants are simply not yet
            // reflected in the next state poll, then defer it again once the
            // popup closes to cover the time it takes to resume interacting.
            deferAloneParticipantPrompt?.();
            try {
                await openShareLinksPopup({
                    supportsReadOnly: false,
                    title: i18n.t("module.jitsi_meet.share.popup_title"),
                    labels: {
                        empty: i18n.t("module.jitsi_meet.share.empty"),
                        untitled: i18n.t("module.jitsi_meet.share.untitled"),
                        copyLink: i18n.t("module.jitsi_meet.share.copy_link"),
                        revoke: i18n.t("module.jitsi_meet.share.revoke"),
                        shareOptions: i18n.t(
                            "module.jitsi_meet.share.share_options_label",
                        ),
                        mail: i18n.t("ui.reuse.mail"),
                        label: i18n.t("module.jitsi_meet.share.label"),
                        labelPlaceholder: i18n.t(
                            "module.jitsi_meet.share.label_placeholder",
                        ),
                        expiryLabel: i18n.t(
                            "module.jitsi_meet.share.expiry_label",
                        ),
                        password: i18n.t(
                            "module.jitsi_meet.share.password_optional",
                        ),
                        passwordPlaceholder: i18n.t(
                            "module.jitsi_meet.share.password_placeholder",
                        ),
                        statusActive: i18n.t(
                            "module.jitsi_meet.share.status_active",
                        ),
                        statusExpired: i18n.t(
                            "module.jitsi_meet.share.status_expired",
                        ),
                        expiresAtLabel: i18n.t(
                            "module.jitsi_meet.share.expires_at_label",
                        ),
                        expiredAtLabel: i18n.t(
                            "module.jitsi_meet.share.expired_at_label",
                        ),
                        generateLink: i18n.t(
                            "module.jitsi_meet.share.generate_link",
                        ),
                        done: i18n.t("ui.reuse.done"),
                        createFailed: i18n.t(
                            "module.jitsi_meet.share.create_failed",
                        ),
                        copySuccess: i18n.t(
                            "module.jitsi_meet.share.copy_success",
                        ),
                        copyFailed: i18n.t(
                            "module.jitsi_meet.share.copy_failed",
                        ),
                        deleteFailed: i18n.t(
                            "module.jitsi_meet.share.delete_failed",
                        ),
                    },
                    ...buildShareCallbacks(state.meeting.id),
                });
            } finally {
                deferAloneParticipantPrompt?.();
            }
        },
    });
    if (shareButton instanceof HTMLButtonElement) {
        shareButton.disabled = !state.jitsiConferenceJoined;
    }
}
