import { ensurePageStylesheet } from "/static/reuse/page-styles.js";
import {
    DEFAULT_PASSWORD_POLICY,
    normalizePasswordPolicy,
} from "/static/gateways/auth/password-policy.js";

let adminTemplatePromise = null;

function loadAdminTemplate() {
    if (!adminTemplatePromise) {
        adminTemplatePromise = fetch("/static/gateways/auth/admin-section.html")
            .then((response) => response.text())
            .catch(() => "");
    }
    return adminTemplatePromise;
}

function parsePolicyCount(value, fallbackValue = 0) {
    const parsedValue = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return fallbackValue;
    }
    return parsedValue;
}

function parsePolicyMinLength(value, fallbackValue = 8) {
    const parsedValue = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsedValue) || parsedValue < 1) {
        return fallbackValue;
    }
    return parsedValue;
}

export function createAdminSection({
    i18n,
    apiFetch,
    escapeHtml,
    openPopup,
    showToast,
}) {
    const stylesheetReady = ensurePageStylesheet(
        "/static/gateways/auth/admin-section.css",
    );

    let adapters = [];
    let passwordPolicy = { ...DEFAULT_PASSWORD_POLICY };
    let adminTemplate = "";

    const dataReady = Promise.all([
        stylesheetReady,
        loadAdminTemplate().then((template) => {
            adminTemplate = template;
        }),
        apiFetch("/api/v1/gateways/auth/adapters")
            .then((response) => (response.ok ? response.json() : { data: [] }))
            .then((payload) => {
                adapters = payload.data ?? [];
            }),
        apiFetch("/api/v1/auth/password-policy")
            .then((response) => (response.ok ? response.json() : { data: {} }))
            .then((payload) => {
                passwordPolicy = normalizePasswordPolicy(
                    payload.data,
                    DEFAULT_PASSWORD_POLICY,
                );
            }),
    ]).then(() => undefined);

    function renderProviders() {
        if (!adapters.length) {
            return `<p class="auth-providers-empty">${escapeHtml(i18n.t("gateway.auth.no_providers"))}</p>`;
        }
        return adapters
            .map((adapter) => {
                const adapterId = String(adapter.id ?? "").trim();
                const adapterName = String(adapter.name ?? adapterId).trim();
                const adapterEnabled = adapter.enabled === true;
                const hasConfig =
                    Array.isArray(adapter.schema) && adapter.schema.length > 0;
                const configButton = hasConfig
                    ? `<button class="btn-animated auth-provider-config-btn" type="button" data-adapter-id="${escapeHtml(adapterId)}">${escapeHtml(i18n.t("ui.reuse.configure"))}</button>`
                    : "";

                if (adapter.locked) {
                    return `
          <div class="auth-provider-row">
            <span class="auth-provider-name">${escapeHtml(adapterName)}</span>
            <span class="auth-provider-status auth-provider-status--enabled">${escapeHtml(i18n.t("ui.app.admin.state.active"))}</span>
            <span class="auth-provider-locked">${escapeHtml(i18n.t("ui.app.admin.gateway.required"))}</span>
            ${configButton}
          </div>
        `;
                }

                return `
        <div class="auth-provider-row">
          <span class="auth-provider-name">${escapeHtml(adapterName)}</span>
          <span class="auth-provider-status ${adapterEnabled ? "auth-provider-status--enabled" : "auth-provider-status--disabled"}">${escapeHtml(adapterEnabled ? i18n.t("ui.app.admin.state.active") : i18n.t("ui.app.admin.state.disabled"))}</span>
          <button class="btn-animated auth-provider-toggle-btn" type="button" data-adapter-id="${escapeHtml(adapterId)}" data-enabled="${adapterEnabled ? "true" : "false"}">${escapeHtml(adapterEnabled ? i18n.t("ui.reuse.disable") : i18n.t("ui.reuse.enable"))}</button>
          ${configButton}
        </div>
      `;
            })
            .join("");
    }

    function renderContent() {
        const template = adminTemplate || "";
        return template
            .replace("{{providers}}", renderProviders())
            .replaceAll(
                "{{policyHeading}}",
                escapeHtml(i18n.t("gateway.auth.policy_heading")),
            )
            .replaceAll(
                "{{minLengthLabel}}",
                escapeHtml(i18n.t("gateway.auth.policy_min_length")),
            )
            .replaceAll(
                "{{minLengthValue}}",
                escapeHtml(String(passwordPolicy.minLength)),
            )
            .replaceAll(
                "{{uppercaseLabel}}",
                escapeHtml(i18n.t("gateway.auth.policy_require_uppercase")),
            )
            .replaceAll(
                "{{uppercaseValue}}",
                escapeHtml(String(passwordPolicy.requireUppercase)),
            )
            .replaceAll(
                "{{lowercaseLabel}}",
                escapeHtml(i18n.t("gateway.auth.policy_require_lowercase")),
            )
            .replaceAll(
                "{{lowercaseChecked}}",
                passwordPolicy.requireLowercase ? " checked" : "",
            )
            .replaceAll(
                "{{digitLabel}}",
                escapeHtml(i18n.t("gateway.auth.policy_require_digit")),
            )
            .replaceAll(
                "{{digitValue}}",
                escapeHtml(String(passwordPolicy.requireDigit)),
            )
            .replaceAll(
                "{{specialLabel}}",
                escapeHtml(i18n.t("gateway.auth.policy_require_special")),
            )
            .replaceAll(
                "{{specialValue}}",
                escapeHtml(String(passwordPolicy.requireSpecial)),
            )
            .replaceAll(
                "{{providersHeading}}",
                escapeHtml(i18n.t("ui.reuse.adapters")),
            )
            .replaceAll("{{saveLabel}}", escapeHtml(i18n.t("ui.reuse.save")));
    }

    async function openAdapterConfig(adapterId, adapterName, schema) {
        const configResponse = await apiFetch(
            `/api/v1/gateways/auth/adapters/${encodeURIComponent(adapterId)}/config`,
        );
        const configPayload = configResponse.ok
            ? await configResponse.json()
            : {};
        const storedConfig = configPayload.data ?? {};

        function renderConfigForm() {
            const fields = schema
                .map((field) => {
                    const fieldKey = String(field.key ?? "").trim();
                    const fieldLabel = String(field.label ?? fieldKey).trim();
                    const currentValue = storedConfig[fieldKey] ?? "";
                    const requiredAttribute = field.required ? " required" : "";
                    const requiredMark = field.required
                        ? ' <span class="auth-config-required">*</span>'
                        : "";

                    if (field.type === "boolean") {
                        const checked =
                            currentValue === true || currentValue === "true"
                                ? " checked"
                                : "";
                        return `
              <div class="auth-config-field-row">
                <label class="auth-config-label">${escapeHtml(fieldLabel)}${requiredMark}</label>
                <label class="switch">
                  <input type="checkbox" name="${escapeHtml(fieldKey)}"${checked} />
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
              <label class="auth-config-label" for="auth-cfg-${escapeHtml(fieldKey)}">${escapeHtml(fieldLabel)}${requiredMark}</label>
              <input id="auth-cfg-${escapeHtml(fieldKey)}" class="auth-config-input" type="${inputType}" name="${escapeHtml(fieldKey)}" value="${escapeHtml(String(currentValue))}"${requiredAttribute} />
            </div>`;
                })
                .join("");

            return `<form class="auth-config-form" autocomplete="off">${fields}</form>`;
        }

        let formElement = null;
        const popupResult = await openPopup({
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
                formElement = overlay.querySelector(".auth-config-form");
            },
        });

        if (popupResult !== "save" || !formElement) {
            return popupResult;
        }

        const config = {};
        formElement.querySelectorAll("[name]").forEach((field) => {
            if (!(field instanceof HTMLInputElement)) {
                return;
            }
            if (field.type === "checkbox") {
                config[field.name] = field.checked;
                return;
            }
            if (field.type === "number") {
                config[field.name] = Number(field.value);
                return;
            }
            config[field.name] = field.value;
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
        return popupResult;
    }

    async function refreshAdapters() {
        const response = await apiFetch("/api/v1/gateways/auth/adapters");
        if (!response.ok) {
            return;
        }
        const payload = await response.json();
        adapters = payload.data ?? [];
    }

    function bindAdapters(root) {
        root.querySelectorAll(".auth-provider-toggle-btn").forEach((button) => {
            button.addEventListener("click", async () => {
                const adapterId = String(button.dataset.adapterId ?? "").trim();
                const isEnabled = button.dataset.enabled === "true";
                const adapter = adapters.find(
                    (entry) => entry.id === adapterId,
                );
                if (!adapterId || !adapter) {
                    return;
                }

                if (!isEnabled) {
                    const hasConfig =
                        Array.isArray(adapter.schema) &&
                        adapter.schema.length > 0;
                    if (hasConfig) {
                        const popupResult = await openAdapterConfig(
                            adapterId,
                            String(adapter.name ?? adapterId),
                            adapter.schema,
                        );
                        if (popupResult !== "save") {
                            return;
                        }
                    }
                }

                const action = isEnabled ? "disable" : "enable";
                await apiFetch(
                    `/api/v1/gateways/auth/adapters/${encodeURIComponent(adapterId)}/${action}`,
                    {
                        method: "POST",
                    },
                );
                await refreshAdapters();
                const panel = root.querySelector(".auth-providers-panel");
                if (panel) {
                    panel.innerHTML = renderProviders();
                    bindAdapters(root);
                }
            });
        });

        root.querySelectorAll(".auth-provider-config-btn").forEach((button) => {
            button.addEventListener("click", async () => {
                const adapterId = String(button.dataset.adapterId ?? "").trim();
                const adapter = adapters.find(
                    (entry) => entry.id === adapterId,
                );
                if (!adapter) {
                    return;
                }
                const popupResult = await openAdapterConfig(
                    adapterId,
                    String(adapter.name ?? adapterId),
                    adapter.schema,
                );
                if (popupResult !== "save") {
                    return;
                }
                await refreshAdapters();
                const panel = root.querySelector(".auth-providers-panel");
                if (panel) {
                    panel.innerHTML = renderProviders();
                    bindAdapters(root);
                }
            });
        });
    }

    function bindPasswordPolicy(root) {
        const saveButton = root.querySelector(".auth-policy-save-btn");
        if (!(saveButton instanceof HTMLButtonElement)) {
            return;
        }
        saveButton.addEventListener("click", async () => {
            const minLengthInput = root.querySelector(
                "#auth-policy-min-length",
            );
            const uppercaseInput = root.querySelector(
                "#auth-policy-require-uppercase",
            );
            const lowercaseInput = root.querySelector(
                "#auth-policy-require-lowercase",
            );
            const digitInput = root.querySelector("#auth-policy-require-digit");
            const specialInput = root.querySelector(
                "#auth-policy-require-special",
            );
            const updatedPolicy = {
                minLength:
                    minLengthInput instanceof HTMLInputElement
                        ? parsePolicyMinLength(
                              minLengthInput.value,
                              passwordPolicy.minLength,
                          )
                        : passwordPolicy.minLength,
                requireUppercase:
                    uppercaseInput instanceof HTMLInputElement
                        ? parsePolicyCount(
                              uppercaseInput.value,
                              passwordPolicy.requireUppercase,
                          )
                        : passwordPolicy.requireUppercase,
                requireLowercase:
                    lowercaseInput instanceof HTMLInputElement
                        ? lowercaseInput.checked
                        : passwordPolicy.requireLowercase,
                requireDigit:
                    digitInput instanceof HTMLInputElement
                        ? parsePolicyCount(
                              digitInput.value,
                              passwordPolicy.requireDigit,
                          )
                        : passwordPolicy.requireDigit,
                requireSpecial:
                    specialInput instanceof HTMLInputElement
                        ? parsePolicyCount(
                              specialInput.value,
                              passwordPolicy.requireSpecial,
                          )
                        : passwordPolicy.requireSpecial,
            };
            const response = await apiFetch("/api/v1/auth/password-policy", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(updatedPolicy),
            });
            if (!response.ok) {
                showToast(i18n.t("ui.app.admin.security.save_failed"), {
                    variant: "error",
                });
                return;
            }
            passwordPolicy = updatedPolicy;
            showToast(i18n.t("ui.app.admin.settings_saved"), {
                variant: "success",
            });
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
                    render: () => renderContent(),
                },
            ],
            onRender: (root) => {
                bindAdapters(root);
                bindPasswordPolicy(root);
            },
        },
    };
}
