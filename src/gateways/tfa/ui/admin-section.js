export function createAdminSection({ i18n, apiFetch, showToast }) {
    let enforceAllUsers = false;

    const dataReady = apiFetch("/api/v1/system/security")
        .then(async (response) => {
            if (!response.ok) {
                enforceAllUsers = false;
                return;
            }
            const payload = await response.json().catch(() => null);
            enforceAllUsers = payload?.data?.enforceTfaForAllUsers === true;
        })
        .catch(() => {
            enforceAllUsers = false;
        });

    function buildContent() {
        return [
            {
                id: "tfa-enforcement",
                items: [
                    {
                        type: "title",
                        text: i18n.t(
                            "ui.app.admin.security.tfa_enforce_all_users_label",
                        ),
                    },
                    {
                        type: "text",
                        text: i18n.t(
                            "ui.app.admin.security.tfa_enforce_all_users_hint",
                        ),
                    },
                    {
                        type: "toggle",
                        id: "tfa-admin-enforce-all-users",
                        checked: enforceAllUsers,
                    },
                    {
                        type: "button",
                        id: "tfa-admin-save-btn",
                        text: i18n.t("ui.reuse.save"),
                    },
                ],
            },
        ];
    }

    function bindInteractions(rootElement) {
        const saveButton = rootElement.querySelector("#tfa-admin-save-btn");
        const toggle = rootElement.querySelector(
            "#tfa-admin-enforce-all-users",
        );
        if (
            !(saveButton instanceof HTMLButtonElement) ||
            !(toggle instanceof HTMLInputElement)
        ) {
            return;
        }
        saveButton.onclick = async () => {
            const response = await apiFetch("/api/v1/system/security", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ enforceTfaForAllUsers: toggle.checked }),
            });
            if (!response.ok) {
                showToast(i18n.t("ui.reuse.save_failed"), { variant: "error" });
                return;
            }
            enforceAllUsers = toggle.checked;
            showToast(i18n.t("ui.app.admin.security.saved"), {
                variant: "success",
            });
        };
    }

    return {
        id: "tfa-administration",
        label: i18n.t("gateway.tfa.settings.section_title"),
        parentSectionId: "security",
        dataReady,
        get content() {
            return buildContent();
        },
        onRender: (rootElement) => {
            bindInteractions(rootElement);
        },
    };
}
