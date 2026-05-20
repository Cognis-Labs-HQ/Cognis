/**
 * Authentication gateway admin section.
 *
 * Contributes the Authentication panel to the Administration page, covering
 * authentication adapter management and the password policy configuration.
 * Exported as a browser ES module; the admin page dynamically imports it
 * via the UIRegistry mechanism.
 *
 * Public exports:
 *   createAdminSection({ i18n, apiFetch, escapeHtml, openPopup, showToast }) — returns a
 *     page-composer-compatible element definition with a dataReady promise.
 *
 * Usage:
 *   const mod = await import("/static/gateways/auth/admin-section.js");
 *   const def = mod.createAdminSection({ i18n, apiFetch, escapeHtml, openPopup, showToast });
 *   await def.dataReady;
 *
 * @param {{ i18n: object, apiFetch: Function, escapeHtml: Function, openPopup: Function, showToast: Function }} deps
 * @returns {{ id: string, label: string, dataReady: Promise<void>, subComposerOptions: object }}
 */
export function createAdminSection({
    i18n,
    apiFetch,
    escapeHtml,
    openPopup,
    showToast,
}) {
    let adapters = [];
    let passwordPolicy = {
        minLength: 8,
        requireUppercase: false,
        requireLowercase: false,
        requireDigit: false,
        requireSpecial: false,
    };

    const dataReady = Promise.all([
        apiFetch("/api/v1/gateways/auth/adapters")
            .then((res) => (res.ok ? res.json() : { data: [] }))
            .then((payload) => {
                adapters = payload.data ?? [];
            }),
        apiFetch("/api/v1/auth/password-policy")
            .then((res) => (res.ok ? res.json() : { data: {} }))
            .then((payload) => {
                if (payload.data && typeof payload.data === "object") {
                    passwordPolicy = {
                        minLength:
                            typeof payload.data.minLength === "number"
                                ? payload.data.minLength
                                : 8,
                        requireUppercase:
                            payload.data.requireUppercase === true,
                        requireLowercase:
                            payload.data.requireLowercase === true,
                        requireDigit: payload.data.requireDigit === true,
                        requireSpecial: payload.data.requireSpecial === true,
                    };
                }
            }),
    ]).then(() => undefined);

    function renderAdapters() {
        if (!adapters.length) {
            return `<p class="auth-providers-empty">${i18n.t("gateway.auth.no_providers")}</p>`;
        }
        return adapters
            .map((adapter) => {
                const hasConfig = adapter.schema && adapter.schema.length > 0;
                const configBtn = hasConfig
                    ? `<button class="btn-animated auth-provider-config-btn" type="button"
                data-adapter-id="${escapeHtml(adapter.id)}">
                ${i18n.t("ui.reuse.configure")}
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
            ${adapter.enabled ? i18n.t("ui.reuse.disable") : i18n.t("ui.reuse.enable")}
          </button>
          ${configBtn}
        </div>
      `;
            })
            .join("");
    }

    function renderPasswordPolicy() {
        return `
      <div class="auth-password-policy">
        <div class="auth-policy-field">
          <label for="auth-policy-min-length">${i18n.t("gateway.auth.policy_min_length")}</label>
          <input
            id="auth-policy-min-length"
            class="auth-policy-input"
            type="number"
            min="1"
            max="128"
            value="${escapeHtml(String(passwordPolicy.minLength))}"
          />
        </div>
        <div class="auth-policy-toggles">
          ${renderPolicyToggle("auth-policy-require-uppercase", "gateway.auth.policy_require_uppercase", "requireUppercase")}
          ${renderPolicyToggle("auth-policy-require-lowercase", "gateway.auth.policy_require_lowercase", "requireLowercase")}
          ${renderPolicyToggle("auth-policy-require-digit", "gateway.auth.policy_require_digit", "requireDigit")}
          ${renderPolicyToggle("auth-policy-require-special", "gateway.auth.policy_require_special", "requireSpecial")}
        </div>
        <div class="auth-policy-actions">
          <button class="btn-confirm btn-animated auth-policy-save-btn" type="button">
            ${i18n.t("ui.reuse.save")}
          </button>
        </div>
      </div>
    `;
    }

    function renderPolicyToggle(id, labelKey, fieldName) {
        const checked = passwordPolicy[fieldName] ? " checked" : "";
        return `
      <div class="auth-policy-toggle-row">
        <label for="${escapeHtml(id)}">${i18n.t(labelKey)}</label>
        <label class="switch">
          <input id="${escapeHtml(id)}" type="checkbox" name="${escapeHtml(fieldName)}"${checked} />
          <span class="slider"></span>
        </label>
      </div>
    `;
    }

    async function openAdapterConfig(adapterId, adapterName, schema) {
        const configRes = await apiFetch(
            `/api/v1/gateways/auth/adapters/${encodeURIComponent(adapterId)}/config`,
        );
        const configPayload = configRes.ok ? await configRes.json() : {};
        const storedConfig = configPayload.data ?? {};

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
                    label: i18n.t("ui.reuse.save"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
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
            showToast(i18n.t("ui.app.admin.settings_saved"), {
                variant: "success",
            });
        }

        return result;
    }

    function bindAdapters(root) {
        const toggleBtns = root.querySelectorAll(".auth-provider-toggle-btn");
        toggleBtns.forEach((btn) => {
            btn.addEventListener("click", async () => {
                const adapterId = btn.dataset.adapterId;
                const isEnabled = btn.dataset.enabled === "true";
                const adapter = adapters.find(
                    (adapter) => adapter.id === adapterId,
                );

                if (!isEnabled && adapter) {
                    const hasConfig =
                        adapter.schema && adapter.schema.length > 0;
                    if (hasConfig) {
                        const result = await openAdapterConfig(
                            adapterId,
                            adapter.name,
                            adapter.schema,
                        );
                        if (result !== "save") return;
                    }
                }

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
                    if (panel) panel.innerHTML = renderAdapters();
                    bindAdapters(root);
                }
            });
        });

        const configBtns = root.querySelectorAll(".auth-provider-config-btn");
        configBtns.forEach((btn) => {
            btn.addEventListener("click", async () => {
                const adapterId = btn.dataset.adapterId;
                const adapter = adapters.find(
                    (adapter) => adapter.id === adapterId,
                );
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
                        if (panel) panel.innerHTML = renderAdapters();
                        bindAdapters(root);
                    }
                }
            });
        });
    }

    function bindPasswordPolicy(root) {
        const saveBtn = root.querySelector(".auth-policy-save-btn");
        if (!saveBtn) return;
        saveBtn.addEventListener("click", async () => {
            const minLengthInput = root.querySelector(
                "#auth-policy-min-length",
            );
            const rawMin =
                minLengthInput instanceof HTMLInputElement
                    ? parseInt(minLengthInput.value, 10)
                    : 8;
            const updatedPolicy = {
                minLength: Number.isFinite(rawMin) && rawMin >= 1 ? rawMin : 8,
                requireUppercase: Boolean(
                    root.querySelector(
                        '#auth-policy-require-uppercase input[type="checkbox"]',
                    )?.checked,
                ),
                requireLowercase: Boolean(
                    root.querySelector(
                        '#auth-policy-require-lowercase input[type="checkbox"]',
                    )?.checked,
                ),
                requireDigit: Boolean(
                    root.querySelector(
                        '#auth-policy-require-digit input[type="checkbox"]',
                    )?.checked,
                ),
                requireSpecial: Boolean(
                    root.querySelector(
                        '#auth-policy-require-special input[type="checkbox"]',
                    )?.checked,
                ),
            };
            const res = await apiFetch("/api/v1/auth/password-policy", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(updatedPolicy),
            });
            if (res.ok) {
                passwordPolicy = updatedPolicy;
                showToast(i18n.t("ui.app.admin.settings_saved"), {
                    variant: "success",
                });
            } else {
                showToast(i18n.t("ui.app.admin.security.save_failed"), {
                    variant: "error",
                });
            }
        });
    }

    return {
        id: "authentication",
        label: i18n.t("ui.reuse.authentication"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-auth-layout",
            heading: i18n.t("ui.reuse.authentication"),
            elements: [
                {
                    id: "auth-providers",
                    label: i18n.t("ui.reuse.adapters"),
                    pinned: true,
                    render: () =>
                        `<div class="auth-providers-panel">${renderAdapters()}</div>`,
                },
                {
                    id: "auth-password-policy",
                    label: i18n.t("gateway.auth.password_policy"),
                    pinned: true,
                    render: () => renderPasswordPolicy(),
                },
            ],
            onRender: (root) => {
                bindAdapters(root);
                bindPasswordPolicy(root);
            },
        },
    };
}
