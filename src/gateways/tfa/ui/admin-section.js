export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
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

    function renderContent() {
        return `
      <div class="security-settings-form">
        <div class="components-section">
          <h3 class="components-section-heading">
            ${escapeHtml(i18n.t("gateway.tfa.admin.enforce_all_users_label"))}
          </h3>
          <p>${escapeHtml(i18n.t("gateway.tfa.admin.enforce_all_users_hint"))}</p>
          <div class="security-field-row">
            <label class="switch">
              <input id="tfa-admin-enforce-all-users" type="checkbox" ${enforceAllUsers ? "checked" : ""} />
              <span class="slider"></span>
            </label>
          </div>
          <div class="security-field-row">
            <button class="btn-animated" type="button" id="tfa-admin-save-btn">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
          </div>
        </div>
      </div>
    `;
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
        label: i18n.t("gateway.tfa.admin.section_title"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-tfa-layout",
            heading: i18n.t("gateway.tfa.admin.section_title"),
            elements: [
                {
                    id: "tfa-administration-enforcement",
                    label: i18n.t("gateway.tfa.admin.section_title"),
                    pinned: true,
                    render: () => renderContent(),
                },
            ],
            onRender: (rootElement) => {
                bindInteractions(rootElement);
            },
        },
    };
}
