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
            .map((adapter) => {
                const hasConfig = adapter.schema && adapter.schema.length > 0;
                const configBtn = hasConfig
                    ? `<button class="btn-animated auth-provider-config-btn" type="button"
                data-adapter-id="${escapeHtml(adapter.id)}">
                ${i18n.t("ui.app.admin.security.configure")}
              </button>`
                    : "";

                if (adapter.locked) {
                    return `
          <div class="auth-provider-row">
            <span class="auth-provider-name">${escapeHtml(adapter.name)}</span>
            <span class="auth-provider-status auth-provider-status--enabled">
              ${i18n.t("ui.app.admin.state.active")}
            </span>
            <span class="auth-provider-locked">${i18n.t("ui.app.admin.gateway.required")}</span>
            ${configBtn}
          </div>
        `;
                }

                return `
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
          ${configBtn}
        </div>
      `;
            })
            .join("");
    }

    async function openAdapterConfig(adapterId, adapterName, schema) {
        const configRes = await apiFetch(
            `/api/v1/gateways/auth/adapters/${encodeURIComponent(adapterId)}/config`,
        );
        const configPayload = configRes.ok ? await configRes.json() : {};
        const storedConfig = configPayload.data?.config ?? {};

        function renderConfigForm() {
            const fields = schema
                .map((field) => {
                    const currentVal = storedConfig[field.key] ?? "";
                    const requiredAttr = field.required ? " required" : "";
                    const requiredMark = field.required
                        ? ' <span class="auth-config-required">*</span>'
                        : "";

                    if (field.type === "boolean") {
                        const checked =
                            currentVal === true || currentVal === "true"
                                ? " checked"
                                : "";
                        return `
              <div class="auth-config-field-row">
                <label class="auth-config-label">
                  ${escapeHtml(field.label)}${requiredMark}
                </label>
                <label class="switch">
                  <input type="checkbox" name="${escapeHtml(field.key)}"${checked} />
                  <span class="slider"></span>
                </label>
              </div>`;
                    }

                    const inputType =
                        field.type === "password"
                            ? "password"
                            : field.type === "number"
                              ? "number"
                              : "text";
                    return `
            <div class="auth-config-field-row">
              <label class="auth-config-label" for="auth-cfg-${escapeHtml(field.key)}">
                ${escapeHtml(field.label)}${requiredMark}
              </label>
              <input
                id="auth-cfg-${escapeHtml(field.key)}"
                class="auth-config-input"
                type="${inputType}"
                name="${escapeHtml(field.key)}"
                value="${escapeHtml(String(currentVal))}"
                ${requiredAttr}
              />
            </div>`;
                })
                .join("");

            return `<form class="auth-config-form" autocomplete="off">${fields}</form>`;
        }

        let formEl = null;
        const result = await openPopup({
            title: adapterName,
            body: renderConfigForm,
            maxWidth: "560px",
            actions: [
                {
                    id: "save",
                    label: i18n.t("ui.reuse.generic.save"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.popup.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen: (overlay) => {
                formEl = overlay.querySelector(".auth-config-form");
            },
        });

        if (result === "save" && formEl) {
            const config = {};
            formEl.querySelectorAll("[name]").forEach((field) => {
                if (field instanceof HTMLInputElement) {
                    if (field.type === "checkbox") {
                        config[field.name] = field.checked;
                    } else if (field.type === "number") {
                        config[field.name] = Number(field.value);
                    } else {
                        config[field.name] = field.value;
                    }
                }
            });
            await apiFetch(
                `/api/v1/gateways/auth/adapters/${encodeURIComponent(adapterId)}/config`,
                {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(config),
                },
            );
        }

        return result;
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

        const configBtns = root.querySelectorAll(".auth-provider-config-btn");
        configBtns.forEach((btn) => {
            btn.addEventListener("click", async () => {
                const adapterId = btn.dataset.adapterId;
                const adapter = adapters.find((a) => a.id === adapterId);
                if (!adapter) return;
                const result = await openAdapterConfig(
                    adapterId,
                    adapter.name,
                    adapter.schema,
                );
                if (result === "save") {
                    const res = await apiFetch(
                        "/api/v1/gateways/auth/adapters",
                    );
                    if (res.ok) {
                        const payload = await res.json();
                        adapters = payload.data ?? [];
                        const panel = root.querySelector(
                            ".auth-providers-panel",
                        );
                        if (panel) panel.innerHTML = renderProviders();
                        bindProviders(root);
                    }
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
