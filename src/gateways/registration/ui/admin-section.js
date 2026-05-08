export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
    let registrationsEnabled = false;

    const dataReady = apiFetch("/api/v1/system/security")
        .then((res) => (res.ok ? res.json() : { data: {} }))
        .then((payload) => {
            registrationsEnabled = payload?.data?.registrationsEnabled === true;
        });

    function renderContent() {
        return `
      <div class="security-settings-form">
        <label class="security-field-label" for="registration-open-toggle">
          ${escapeHtml(i18n.t("ui.app.admin.security.enable_registrations_label"))}
          <span class="security-field-hint">${escapeHtml(i18n.t("ui.app.admin.security.enable_registrations_hint"))}</span>
        </label>
        <div class="security-field-row">
          <input id="registration-open-toggle" type="checkbox" ${registrationsEnabled ? "checked" : ""} />
          <button id="registration-open-save" class="btn-confirm btn-animated" type="button">${escapeHtml(i18n.t("ui.reuse.generic.save"))}</button>
        </div>
      </div>
    `;
    }

    function bind(root) {
        const saveButton = root.querySelector("#registration-open-save");
        const toggle = root.querySelector("#registration-open-toggle");
        if (
            !(saveButton instanceof HTMLButtonElement) ||
            !(toggle instanceof HTMLInputElement)
        ) {
            return;
        }
        saveButton.addEventListener("click", async () => {
            const currentRes = await apiFetch("/api/v1/system/security");
            const currentPayload = currentRes.ok
                ? await currentRes.json()
                : { data: {} };
            const trustedDomains = Array.isArray(
                currentPayload?.data?.trustedDomains,
            )
                ? currentPayload.data.trustedDomains
                : [];
            const res = await apiFetch("/api/v1/system/security", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    trustedDomains,
                    registrationsEnabled: toggle.checked,
                }),
            });
            if (!res.ok) {
                showToast(i18n.t("ui.app.admin.security.save_failed"), {
                    variant: "error",
                });
                return;
            }
            registrationsEnabled = toggle.checked;
            showToast(i18n.t("ui.app.admin.security.saved"), {
                variant: "success",
            });
        });
    }

    return {
        id: "registration",
        label: i18n.t("ui.reuse.menu.invite"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-registration-layout",
            heading: i18n.t("ui.reuse.menu.invite"),
            elements: [
                {
                    id: "registration-settings",
                    label: i18n.t("ui.reuse.menu.invite"),
                    pinned: true,
                    render: () => renderContent(),
                },
            ],
            onRender: (root) => {
                bind(root);
            },
        },
    };
}
