/**
 * Authentication gateway admin section.
 *
 * Contributes the Security panel to the Administration page.
 * Exported as a browser ES module; the admin page dynamically imports it
 * via the UIRegistry mechanism.
 *
 * Public exports:
 *   createAdminSection({ i18n, apiFetch, escapeHtml, openPopup }) — returns a
 *     page-composer-compatible element definition with a dataReady promise.
 *
 * Usage:
 *   const mod = await import("/static/gateways/auth/admin-section.js");
 *   const def = mod.createAdminSection({ i18n, apiFetch, escapeHtml, openPopup });
 *   await def.dataReady;
 *
 * @param {{ i18n: object, apiFetch: Function, escapeHtml: Function, openPopup: Function }} deps
 * @returns {{ id: string, label: string, dataReady: Promise<void>, subComposerOptions: object }}
 */
export function createAdminSection({ i18n, apiFetch, escapeHtml, openPopup }) {
    let adapters = [];

    const dataReady = apiFetch("/api/v1/gateways/auth/adapters")
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((payload) => {
            adapters = payload.data ?? [];
        });

    function renderProviders() {
        if (!adapters.length) {
            return `<p class="auth-providers-empty">${i18n.t("ui.app.admin.security.no_providers")}</p>`;
        }
        return adapters
            .map(
                (adapter) => `
      <div class="auth-provider-row">
        <span class="auth-provider-name">${escapeHtml(adapter.name)}</span>
        <span class="auth-provider-status ${adapter.enabled ? "auth-provider-status--enabled" : "auth-provider-status--disabled"}">
          ${adapter.enabled ? i18n.t("ui.app.admin.state.active") : i18n.t("ui.app.admin.state.disabled")}
        </span>
        <button class="btn-animated auth-provider-toggle-btn" type="button"
          data-adapter-id="${escapeHtml(adapter.id)}"
          data-enabled="${adapter.enabled}">
          ${adapter.enabled ? i18n.t("ui.reuse.generic.disable") : i18n.t("ui.reuse.generic.enable")}
        </button>
        ${
            adapter.schema && adapter.schema.length > 0
                ? `<button class="btn-animated auth-provider-config-btn" type="button"
              data-adapter-id="${escapeHtml(adapter.id)}">
              ${i18n.t("ui.app.admin.security.configure")}
            </button>`
                : ""
        }
      </div>
    `,
            )
            .join("");
    }

    function bindProviders(root) {
        const toggleBtns = root.querySelectorAll(".auth-provider-toggle-btn");
        toggleBtns.forEach((btn) => {
            btn.addEventListener("click", async () => {
                const adapterId = btn.dataset.adapterId;
                const isEnabled = btn.dataset.enabled === "true";
                const action = isEnabled ? "disable" : "enable";
                await apiFetch(
                    `/api/v1/gateways/auth/adapters/${adapterId}/${action}`,
                    {
                        method: "POST",
                    },
                );
                const res = await apiFetch("/api/v1/gateways/auth/adapters");
                if (res.ok) {
                    const payload = await res.json();
                    adapters = payload.data ?? [];
                    const panel = root.querySelector(".auth-providers-panel");
                    if (panel) panel.innerHTML = renderProviders();
                    bindProviders(root);
                }
            });
        });
    }

    return {
        id: "security",
        label: i18n.t("ui.app.admin.security"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-security-layout",
            heading: i18n.t("ui.app.admin.security"),
            elements: [
                {
                    id: "auth-providers",
                    label: i18n.t("ui.app.admin.security.providers"),
                    pinned: true,
                    render: () =>
                        `<div class="auth-providers-panel">${renderProviders()}</div>`,
                },
            ],
            onRender: (root) => {
                bindProviders(root);
            },
        },
    };
}
