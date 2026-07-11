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

export async function bindShareButton({ root, signal, state, i18n }) {
    const shareButtonSlot = root.querySelector("#jitsi-share-button-slot");
    if (!(shareButtonSlot instanceof HTMLElement)) {
        return;
    }
    if (shareButtonSlot.querySelector("#jitsi-share-meeting-btn")) {
        // Already mounted from a prior composer render pass.
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

    shareButtonModule.mountShareButton({
        container: shareButtonSlot,
        label: i18n.t("module.jitsi_meet.share.button"),
        id: "jitsi-share-meeting-btn",
        signal,
        onClick: async () => {
            if (!state.meeting?.id) {
                return;
            }
            const [{ openShareLinksPopup }, { buildShareCallbacks }] =
                await Promise.all([
                    import("/static/reuse/share-links-popup.js"),
                    import("./share-adapter.js"),
                ]);
            await openShareLinksPopup({
                title: i18n.t("module.jitsi_meet.share.popup_title"),
                labels: {
                    empty: i18n.t("module.jitsi_meet.share.empty"),
                    untitled: i18n.t("module.jitsi_meet.share.untitled"),
                    copyLink: i18n.t("module.jitsi_meet.share.copy_link"),
                    revoke: i18n.t("module.jitsi_meet.share.revoke"),
                    label: i18n.t("module.jitsi_meet.share.label"),
                    labelPlaceholder: i18n.t(
                        "module.jitsi_meet.share.label_placeholder",
                    ),
                    expiryLabel: i18n.t("module.jitsi_meet.share.expiry_label"),
                    generateLink: i18n.t(
                        "module.jitsi_meet.share.generate_link",
                    ),
                    done: i18n.t("ui.reuse.done"),
                    createFailed: i18n.t(
                        "module.jitsi_meet.share.create_failed",
                    ),
                    copySuccess: i18n.t("module.jitsi_meet.share.copy_success"),
                    copyFailed: i18n.t("module.jitsi_meet.share.copy_failed"),
                    deleteFailed: i18n.t(
                        "module.jitsi_meet.share.delete_failed",
                    ),
                },
                ...buildShareCallbacks(state.meeting.id),
            });
        },
    });
}
