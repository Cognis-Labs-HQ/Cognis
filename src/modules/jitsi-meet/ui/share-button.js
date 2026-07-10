export function bindShareButton({ root, signal, state, i18n }) {
    const shareButton = root.querySelector("#jitsi-share-meeting-btn");
    if (!(shareButton instanceof HTMLButtonElement)) {
        return;
    }
    const bindSignal = signal ?? new AbortController().signal;
    shareButton.addEventListener(
        "click",
        async () => {
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
        { signal: bindSignal },
    );
}
