/** Save only dirty owners and retain the shared bar until every draft is clean. */
export function createAdministrationSave({
    securitySection,
    gatewaySections,
    markDirty,
    refresh,
    i18n,
    showToast,
    log,
}) {
    let saving = false;
    return async () => {
        if (saving) throw new Error("save_pending");
        saving = true;
        let owner = "security";
        try {
            if (securitySection.isDirty()) {
                await securitySection.save();
                markDirty("security", securitySection.isDirty());
            }
            for (const section of gatewaySections) {
                if (!section.isDirty?.()) continue;
                owner = section.id;
                await section.save?.();
                markDirty(section.id, Boolean(section.isDirty?.()));
                log?.("info", "administration_section_saved", {
                    component: "administration",
                    operation: "save",
                    section: owner,
                });
            }
            owner = "components";
            await refresh();
        } catch (error) {
            log?.("error", "administration_save_failed", {
                component: "administration",
                operation: "save",
                section: owner,
            });
            showToast(i18n.t("ui.reuse.save_failed"), { variant: "error" });
            throw error;
        } finally {
            saving = false;
        }
        // The shared bar retains its dirty map when the callback rejects.
        if (
            securitySection.isDirty() ||
            gatewaySections.some((section) => section.isDirty?.())
        ) {
            throw new Error("unsaved_changes_remain");
        }
        showToast(i18n.t("ui.app.admin.settings_saved"), {
            variant: "success",
        });
    };
}
