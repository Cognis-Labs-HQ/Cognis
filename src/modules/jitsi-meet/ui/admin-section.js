export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
    let currentBaseUrl = "";

    const dataReady = apiFetch("/api/v1/modules/jitsi-meet/admin/settings")
        .then((response) => (response.ok ? response.json() : { data: {} }))
        .then((payload) => {
            currentBaseUrl = String(payload?.data?.baseUrl ?? "").trim();
        });

    function render() {
        return `
      <div class="jitsi-module-admin-panel">
        <label class="jitsi-module-admin-field">
          <span>${escapeHtml(i18n.t("module.jitsi_meet.admin.base_url_label"))}</span>
          <input
            type="url"
            name="jitsiBaseUrl"
            placeholder="${escapeHtml(i18n.t("module.jitsi_meet.admin.base_url_placeholder"))}"
            value="${escapeHtml(currentBaseUrl)}"
          />
        </label>
        <div class="jitsi-module-admin-actions">
          <button type="button" class="btn-animated" data-jitsi-save>
            ${escapeHtml(i18n.t("ui.reuse.save"))}
          </button>
        </div>
      </div>
    `;
    }

    function onRender(root) {
        const saveButton = root.querySelector("[data-jitsi-save]");
        const input = root.querySelector('input[name="jitsiBaseUrl"]');
        if (!(saveButton instanceof HTMLButtonElement)) return;
        if (!(input instanceof HTMLInputElement)) return;

        saveButton.addEventListener("click", async () => {
            const baseUrl = input.value.trim();
            if (!baseUrl) {
                showToast(i18n.t("module.jitsi_meet.admin.base_url_required"), {
                    variant: "warning",
                });
                return;
            }

            const response = await apiFetch(
                "/api/v1/modules/jitsi-meet/admin/settings",
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ baseUrl }),
                },
            );

            if (!response.ok) {
                showToast(i18n.t("ui.reuse.save_failed"), { variant: "error" });
                return;
            }

            currentBaseUrl = baseUrl;
            showToast(i18n.t("ui.app.admin.settings_saved"), {
                variant: "success",
            });
        });
    }

    return {
        id: "module-jitsi-meet-settings",
        label: i18n.t("module.jitsi_meet.admin.section_title"),
        dataReady,
        subComposerOptions: {
            heading: i18n.t("module.jitsi_meet.admin.section_title"),
            elements: [
                {
                    id: "module-jitsi-meet-settings-form",
                    label: i18n.t("module.jitsi_meet.admin.section_title"),
                    pinned: true,
                    render,
                    onRender,
                },
            ],
        },
    };
}
