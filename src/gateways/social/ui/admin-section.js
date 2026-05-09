/**
 * Social gateway admin section.
 *
 * Contributes the Social gateway overview panel to the Administration page.
 * Exported as a browser ES module; the admin page dynamically imports it
 * via the UIRegistry mechanism.
 *
 * Public exports:
 *   createAdminSection({ i18n, apiFetch, escapeHtml, openPopup, showToast }) — returns a
 *     page-composer-compatible element definition with a dataReady promise.
 *
 * Usage:
 *   const mod = await import("/static/gateways/social/admin-section.js");
 *   const def = mod.createAdminSection({ i18n, apiFetch, escapeHtml, openPopup, showToast });
 *   await def.dataReady;
 *
 * @param {{ i18n: object, apiFetch: Function, escapeHtml: Function, openPopup: Function, showToast: Function }} deps
 * @returns {{ id: string, label: string, dataReady: Promise<void>, subComposerOptions: object }}
 */
export function createAdminSection({ i18n, apiFetch, escapeHtml }) {
    let adapters = [];

    const dataReady = apiFetch("/api/v1/gateways/social/adapters").then(
        async (response) => {
            if (!response.ok) return;
            const payload = await response.json();
            adapters = payload.data ?? [];
        },
    );

    function renderContent() {
        if (!adapters.length) {
            return `<p>${escapeHtml(i18n.t("ui.app.admin.no_adapters"))}</p>`;
        }

        const rows = adapters
            .map((adapter) => {
                const adapterId = adapter.id ?? "";
                const adapterName = adapter.name ?? adapterId;
                const isActive = !!(adapter.active ?? adapter.enabled);
                const statePill = isActive
                    ? `<span class="pill-active">${escapeHtml(i18n.t("ui.app.admin.state.active"))}</span>`
                    : `<span class="pill-available">${escapeHtml(i18n.t("ui.app.admin.state.available"))}</span>`;
                return `
        <tr>
          <td><strong>${escapeHtml(adapterName)}</strong></td>
          <td><code>${escapeHtml(adapterId)}</code></td>
          <td>${statePill}</td>
        </tr>`;
            })
            .join("");

        return `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead>
            <tr>
              <th>${escapeHtml(i18n.t("ui.app.admin.adapters"))}</th>
              <th>${escapeHtml(i18n.t("ui.reuse.generic.id"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.admin.state.active"))}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>`;
    }

    return {
        id: "social",
        label: i18n.t("ui.app.profile.section.social"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-social-layout",
            heading: i18n.t("ui.app.profile.section.social"),
            elements: [
                {
                    id: "social-adapters",
                    label: i18n.t("ui.app.admin.adapters"),
                    pinned: true,
                    render: () => renderContent(),
                },
            ],
        },
    };
}
