export function createSubPageGuard({ getState, lifetime, openPopup, actions }) {
    let pending;
    return () => {
        if (!lifetime.isCurrent()) return Promise.resolve(false);
        if (pending) return pending;
        const { changesBar, securitySection, gatewaySections, i18n } =
            getState();
        if (!changesBar?.isAnyDirty()) return Promise.resolve(true);
        pending = actions
            .run("leaveSection", {
                check: () => {
                    if (!lifetime.isCurrent()) lifetime.signal.throwIfAborted();
                },
                confirm: () =>
                    openPopup({
                        title: i18n.t("ui.reuse.unsaved_changes"),
                        body: `<p>${i18n.t("ui.reuse.leave_page_warning")}</p>`,
                        signal: lifetime.signal,
                        variant: "warning",
                        closeButtonVariant: "neutral",
                        actions: [
                            {
                                id: "stay",
                                label: i18n.t("ui.reuse.stay"),
                                variant: "neutral",
                            },
                            {
                                id: "discard",
                                label: i18n.t("ui.reuse.discard_and_leave"),
                                variant: "cancel",
                            },
                        ],
                    }),
                discard: () => {
                    securitySection?.discard();
                    changesBar.markDirty("security", false);
                    gatewaySections.forEach((section) => section.discard?.());
                },
            })
            .catch((error) => {
                if (lifetime.signal.aborted) return false;
                throw error;
            })
            .finally(() => {
                pending = null;
            });
        return pending;
    };
}
