import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { openPopup } from "../../reuse/popup.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { initSecuritySection } from "./security.js";

const root = document.querySelector("#app");
const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.administration");

async function loadModules() {
    const response = await apiFetch("/api/v1/modules");
    const payload = await response.json();
    return payload.data ?? [];
}

async function loadIntegrity() {
    const response = await apiFetch("/api/v1/modules/integrity");
    const payload = await response.json();
    return payload.data ?? [];
}

async function toggleModule(moduleId, action) {
    await apiFetch(
        `/api/v1/modules/${encodeURIComponent(moduleId)}/${action}`,
        { method: "POST" },
    );
}

async function loadGateways() {
    const res = await apiFetch("/api/v1/gateways");
    if (!res.ok) return [];
    const payload = await res.json();
    return payload.data ?? [];
}

async function loadGatewayAdapters(gatewayId) {
    const res = await apiFetch(
        `/api/v1/gateways/${encodeURIComponent(gatewayId)}/adapters`,
    );
    if (!res.ok) return [];
    const payload = await res.json();
    return payload.data ?? [];
}

function getStatePill(status) {
    if (status === "enabled")
        return {
            label: i18n.t("ui.app.admin.state.active"),
            className: "pill-active",
        };
    if (status === "available")
        return {
            label: i18n.t("ui.app.admin.state.available"),
            className: "pill-available",
        };
    return {
        label: i18n.t("ui.app.admin.state.disabled"),
        className: "pill-disabled",
    };
}

function renderDetailsList(mod) {
    const details = [
        [i18n.t("ui.reuse.generic.id"), mod.id],
        [i18n.t("ui.reuse.generic.version"), mod.version],
        [
            i18n.t("ui.app.admin.publisher"),
            mod.publisher || i18n.t("ui.app.admin.unknown"),
        ],
        [i18n.t("ui.reuse.generic.class"), mod.class],
        [
            i18n.t("ui.app.admin.capabilities"),
            (mod.capabilities || []).join(", ") || i18n.t("ui.app.admin.none"),
        ],
    ];

    return details
        .map(
            ([key, value]) =>
                `<li class="module-detail-item"><span class="module-detail-key">${key}</span><span class="module-detail-value">${value}</span></li>`,
        )
        .join("");
}

function renderModulesContent(modules) {
    return modules
        .map((mod) => {
            const pill = getStatePill(mod.status);
            const disableBlocked = mod.class === "core";

            return `
        <details class="module-row" data-module="${mod.id}">
          <summary>
            <span><strong>${mod.name}</strong></span>
            <span class="state-pill ${pill.className}">${pill.label}</span>
            <span class="module-chevron">▾</span>
          </summary>
          <div class="module-meta">
            <ul class="module-details">${renderDetailsList(mod)}</ul>
            <label class="switch">
              <input type="checkbox" data-module="${mod.id}" ${mod.status === "enabled" ? "checked" : ""} ${disableBlocked ? "disabled" : ""} />
              <span class="slider"></span>
            </label>
          </div>
        </details>
      `;
        })
        .join("");
}

function renderGatewayDetailsList(gw) {
    const details = [
        [i18n.t("ui.reuse.generic.id"), escapeHtml(gw.id)],
        [i18n.t("ui.reuse.generic.version"), escapeHtml(gw.version ?? "")],
        [
            i18n.t("ui.app.admin.publisher"),
            escapeHtml(gw.publisher || i18n.t("ui.app.admin.unknown")),
        ],
    ];
    if (gw.description) {
        details.push([
            i18n.t("ui.app.admin.description"),
            escapeHtml(gw.description),
        ]);
    }
    return details
        .map(
            ([key, value]) =>
                `<li class="module-detail-item"><span class="module-detail-key">${key}</span><span class="module-detail-value">${value}</span></li>`,
        )
        .join("");
}

function renderGatewaysContent(gateways) {
    if (!gateways.length) {
        return `<p>${i18n.t("ui.app.admin.no_gateways")}</p>`;
    }
    return gateways
        .map(
            (gw) => `
        <details class="module-row" data-gateway="${escapeHtml(gw.id)}">
          <summary>
            <span><strong>${escapeHtml(gw.name)}</strong></span>
            <span class="state-pill pill-active">${i18n.t("ui.app.admin.state.active")}</span>
            <span class="module-chevron">▾</span>
          </summary>
          <div class="module-meta">
            <ul class="module-details">${renderGatewayDetailsList(gw)}</ul>
          </div>
        </details>
      `,
        )
        .join("");
}

function renderAdapterEntry(adapter, gatewayId) {
    const escapedAdapterId = escapeHtml(adapter.senderId);
    const escapedName = escapeHtml(adapter.name);
    const statePillClass = adapter.active ? "pill-active" : "pill-available";
    const stateLabel = adapter.active
        ? i18n.t("ui.app.admin.state.active")
        : i18n.t("ui.app.admin.state.available");
    const missingAlert = !adapter.active
        ? `<span class="provider-missing-alert" aria-label="${i18n.t("ui.app.admin.notif.provider_missing_config")}">❗</span>`
        : "";
    return `
    <div
      class="provider-card provider-card--entry"
      data-adapter-id="${escapedAdapterId}"
      data-gateway-id="${escapeHtml(gatewayId)}"
      role="button"
      tabindex="0"
    >
      <span class="provider-entry-name"><strong>${escapedName}</strong>${missingAlert}</span>
      <span class="state-pill ${statePillClass}">${stateLabel}</span>
    </div>
  `;
}

function renderAdaptersContent(allAdapters) {
    if (!allAdapters.length) {
        return `<p>${i18n.t("ui.app.admin.no_adapters")}</p>`;
    }
    const active = allAdapters.filter((a) => a.active);
    const available = allAdapters.filter((a) => !a.active);
    const activeRows = active.length
        ? active.map((a) => renderAdapterEntry(a, a._gatewayId)).join("")
        : `<p>${i18n.t("ui.app.admin.notif.no_active")}</p>`;
    const availableRows = available.length
        ? available.map((a) => renderAdapterEntry(a, a._gatewayId)).join("")
        : `<p>${i18n.t("ui.app.admin.notif.no_available")}</p>`;
    return `
    <h3>${i18n.t("ui.app.admin.notif.active_providers")}</h3>
    ${activeRows}
    <h3>${i18n.t("ui.app.admin.notif.available_providers")}</h3>
    ${availableRows}
  `;
}

function renderComponentsDropdown(activeTab) {
    const tabs = [
        { id: "modules", label: i18n.t("ui.reuse.modules") },
        { id: "gateways", label: i18n.t("ui.app.admin.gateways") },
        { id: "adapters", label: i18n.t("ui.app.admin.adapters") },
    ];
    const options = tabs
        .map(
            (t) =>
                `<option value="${t.id}"${activeTab === t.id ? " selected" : ""}>${t.label}</option>`,
        )
        .join("");
    return `
    <div class="components-tab-bar">
      <select class="components-tab-select theme-select" aria-label="${i18n.t("ui.app.admin.components")}">
        ${options}
      </select>
    </div>
  `;
}

function renderComponentsContent(activeTab, modules, gateways, allAdapters) {
    const dropdown = renderComponentsDropdown(activeTab);
    let body = "";
    if (activeTab === "modules") {
        body = renderModulesContent(modules);
    } else if (activeTab === "gateways") {
        body = renderGatewaysContent(gateways);
    } else {
        body = renderAdaptersContent(allAdapters);
    }
    return `${dropdown}<div class="components-tab-content">${body}</div>`;
}

function renderIntegrityContent(integrityRows) {
    if (!integrityRows.length)
        return `<p>${i18n.t("ui.app.admin.no_integrity")}</p>`;

    const byModule = new Map();
    for (const row of integrityRows) {
        if (!byModule.has(row.moduleId)) byModule.set(row.moduleId, []);
        byModule.get(row.moduleId).push(row);
    }

    const sections = [];
    for (const [moduleId, rows] of byModule) {
        const items = rows
            .map((row) => {
                const mismatchDetails =
                    row.status !== "ok"
                        ? ` (${i18n.t("ui.app.admin.expected")} ${row.expected}, ${i18n.t("ui.app.admin.got")} ${row.actual ?? i18n.t("ui.app.admin.missing")})`
                        : "";
                return `<li class="integrity-${row.status}">${row.file}: ${row.status}${mismatchDetails}</li>`;
            })
            .join("");
        sections.push(`
      <div class="integrity-module">
        <h3>${moduleId}</h3>
        <ul class="integrity-list">${items}</ul>
      </div>
    `);
    }
    return sections.join("");
}

function bindModuleToggles() {
    root.querySelectorAll('input[type="checkbox"][data-module]').forEach(
        (toggle) => {
            toggle.addEventListener("change", async () => {
                const moduleId = toggle.dataset.module;
                const previousState = !toggle.checked;
                const action = toggle.checked ? "enable" : "disable";

                if (action === "disable") {
                    const result = await openPopup({
                        title: i18n.t("ui.app.admin.disable_confirm"),
                        body: `<strong>${moduleId}</strong>`,
                        variant: "danger",
                        actions: [
                            {
                                id: "confirm",
                                label: i18n.t("ui.reuse.generic.disable"),
                                variant: "confirm",
                            },
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.popup.cancel"),
                                variant: "cancel",
                            },
                        ],
                    });
                    if (result !== "confirm") {
                        toggle.checked = previousState;
                        return;
                    }
                }

                await toggleModule(moduleId, action);
                modules = await loadModules();
                composer.refresh(elements);
            });
        },
    );
}

function bindIntegrityRerun() {
    const rerunButton = root.querySelector("#rerun-integrity");
    if (!rerunButton) return;
    rerunButton.addEventListener("click", async () => {
        /** @type {HTMLButtonElement} */
        const btn = rerunButton;
        btn.disabled = true;
        btn.textContent = i18n.t("ui.app.admin.checking");
        integrityRows = await loadIntegrity();
        composer.refresh(elements);
    });
}

async function loadAdminSections() {
    const res = await apiFetch("/api/v1/admin/sections");
    if (!res.ok) return [];
    const payload = await res.json();
    return payload.data ?? [];
}

async function loadGatewaySection(section) {
    try {
        const mod = await import(section.scriptUrl);
        if (typeof mod.createAdminSection !== "function") return null;
        const def = mod.createAdminSection({
            i18n,
            apiFetch,
            escapeHtml,
            openPopup,
        });
        if (def.dataReady) await def.dataReady;
        return def;
    } catch {
        return null;
    }
}

function renderGenericAdapterForm(descriptors, requiredFields) {
    const requiredSet = new Set(requiredFields);
    const requiredTooltip = i18n.t("ui.app.admin.notif.required_field");
    const conflictTitle = i18n.t("ui.app.admin.notif.field_env_conflict");

    function fieldLabel(name, labelText, inputHtml) {
        const descriptor = descriptors[name];
        const isRequired = requiredSet.has(name);
        const isEmpty = !descriptor?.effectiveValue;
        const hasConflict = descriptor?.envConflict === true;
        const requiredClass =
            isRequired && isEmpty
                ? " provider-field-required provider-field-missing"
                : "";
        const labelTitle =
            isRequired && isEmpty ? ` title="${requiredTooltip}"` : "";
        const conflictWarning = hasConflict
            ? `<span class="provider-field-env-warning" title="${conflictTitle}">⚠</span>`
            : "";
        return `<label class="provider-popup-field${requiredClass}"${labelTitle}>${labelText}${inputHtml}${conflictWarning}</label>`;
    }

    const fieldKeys = Object.keys(descriptors).filter(
        (name) => name !== "enabled",
    );

    const textFieldKeys = fieldKeys.filter((name) => {
        const rawValue = descriptors[name]?.effectiveValue;
        return !(
            rawValue === true ||
            rawValue === false ||
            rawValue === "true" ||
            rawValue === "false"
        );
    });
    const boolFieldKeys = fieldKeys.filter((name) => {
        const rawValue = descriptors[name]?.effectiveValue;
        return (
            rawValue === true ||
            rawValue === false ||
            rawValue === "true" ||
            rawValue === "false"
        );
    });

    const textFieldsHtml = textFieldKeys
        .map((name) => {
            const descriptor = descriptors[name];
            const val = escapeHtml(descriptor?.effectiveValue ?? "");
            const isPassword =
                name.toLowerCase().includes("password") ||
                name.toLowerCase().includes("secret");
            const isPort =
                name === "port" || name.toLowerCase().endsWith("port");

            let inputHtml;
            if (isPassword) {
                inputHtml = `<input name="${escapeHtml(name)}" type="password" value="" />`;
            } else if (isPort) {
                inputHtml = `<input name="${escapeHtml(name)}" type="number" value="${val}" />`;
            } else {
                inputHtml = `<input name="${escapeHtml(name)}" type="text" value="${val}" />`;
            }

            return fieldLabel(name, name, inputHtml);
        })
        .join("");

    const boolFieldsHtml = boolFieldKeys.length
        ? `<div class="provider-option-toggles">${boolFieldKeys
              .map((name) => {
                  const rawValue = descriptors[name]?.effectiveValue;
                  const checked =
                      rawValue === true || rawValue === "true"
                          ? " checked"
                          : "";
                  return `<div class="provider-option-row">
          <span class="provider-option-label">${escapeHtml(name)}</span>
          <label class="switch">
            <input name="${escapeHtml(name)}" type="checkbox"${checked} />
            <span class="slider"></span>
          </label>
        </div>`;
              })
              .join("")}</div>`
        : "";

    return `
    <div class="provider-popup-form">
      <div class="provider-popup-toggle-row">
        <span class="provider-popup-toggle-label">${i18n.t("ui.app.admin.notif.enable_provider")}</span>
        <label class="switch provider-popup-switch">
          <input type="checkbox" name="enabled" class="provider-enable-toggle" disabled />
          <span class="slider"></span>
        </label>
      </div>
      <div class="provider-fields">
        ${textFieldsHtml}
      </div>
      ${boolFieldsHtml}
      <div class="provider-test-row">
        <input class="provider-test-input" type="email" placeholder="${i18n.t("ui.app.admin.notif.test_email_to")}" />
        <button class="btn-animated provider-test-btn" type="button">${i18n.t("ui.app.admin.notif.test_email")}</button>
        <span class="provider-test-status"></span>
      </div>
    </div>
  `;
}

async function openAdapterConfig(gatewayId, adapterId, name) {
    const configUrl = `/api/v1/gateways/${encodeURIComponent(gatewayId)}/adapters/${encodeURIComponent(adapterId)}/config`;
    const testUrl = `/api/v1/gateways/${encodeURIComponent(gatewayId)}/adapters/${encodeURIComponent(adapterId)}/test`;

    const res = await apiFetch(configUrl);
    if (!res.ok) return;
    const payload = await res.json();
    const dbData = payload.data ?? {};
    const envData = payload.envValues ?? {};
    const requiredFields = Array.isArray(payload.requiredFields)
        ? payload.requiredFields
        : [];

    const fieldNames = new Set([
        ...Object.keys(dbData),
        ...Object.keys(envData),
        ...requiredFields,
    ]);
    const descriptors = {};
    for (const field of fieldNames) {
        const rawDb = dbData[field];
        const rawEnv = envData[field];
        const dbValue =
            rawDb != null && rawDb !== "" ? String(rawDb) : undefined;
        const envValue =
            rawEnv != null && rawEnv !== "" ? String(rawEnv) : undefined;
        let effectiveValue;
        let source;
        if (dbValue !== undefined) {
            effectiveValue = dbValue;
            source = "db";
        } else if (envValue !== undefined) {
            effectiveValue = envValue;
            source = "env";
        } else {
            effectiveValue = undefined;
            source = "none";
        }
        descriptors[field] = {
            dbValue,
            envValue,
            effectiveValue,
            source,
            envConflict:
                dbValue !== undefined &&
                envValue !== undefined &&
                dbValue !== envValue,
            required: requiredFields.includes(field),
        };
    }

    let popupFormEl = null;

    const result = await openPopup({
        title: name,
        body: renderGenericAdapterForm(descriptors, requiredFields),
        maxWidth: "640px",
        actions: [
            {
                id: "save",
                label: i18n.t("ui.app.admin.notif.save_settings"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.popup.cancel"),
                variant: "cancel",
            },
        ],
        onOpen: (overlay) => {
            popupFormEl = overlay.querySelector(".provider-popup-form");
            if (!popupFormEl) return;

            const toggle = popupFormEl.querySelector(".provider-enable-toggle");
            if (!toggle) return;

            function requiredAllFilled() {
                return requiredFields.every((field) => {
                    const input = popupFormEl.querySelector(
                        `[name="${CSS.escape(field)}"]`,
                    );
                    return (
                        input instanceof HTMLInputElement &&
                        input.value.trim() !== ""
                    );
                });
            }

            function updateRequiredHighlights() {
                const requiredTooltip = i18n.t(
                    "ui.app.admin.notif.required_field",
                );
                for (const field of requiredFields) {
                    const input = popupFormEl.querySelector(
                        `[name="${CSS.escape(field)}"]`,
                    );
                    if (!(input instanceof HTMLInputElement)) continue;
                    const label = input.closest("label");
                    const isEmpty = input.value.trim() === "";
                    if (label) {
                        label.classList.toggle(
                            "provider-field-required",
                            isEmpty,
                        );
                        label.classList.toggle(
                            "provider-field-missing",
                            isEmpty,
                        );
                        if (isEmpty) {
                            label.setAttribute("title", requiredTooltip);
                        } else {
                            label.removeAttribute("title");
                        }
                    }
                }
            }

            function syncToggle() {
                const allFilled = requiredAllFilled();
                toggle.disabled = !allFilled;
                if (!allFilled) {
                    toggle.checked = false;
                }
            }

            const enabledValue = descriptors["enabled"]?.effectiveValue;
            const isEnabledByConfig =
                enabledValue !== "false" && enabledValue !== false;
            if (requiredAllFilled()) {
                toggle.disabled = false;
                toggle.checked = isEnabledByConfig;
            }

            popupFormEl.addEventListener("input", () => {
                updateRequiredHighlights();
                syncToggle();
            });

            const authDisabledCheckbox = popupFormEl.querySelector(
                '[name="authDisabled"]',
            );
            const authFieldsEl = popupFormEl.querySelector(
                ".provider-auth-fields",
            );
            if (
                authDisabledCheckbox instanceof HTMLInputElement &&
                authFieldsEl instanceof HTMLElement
            ) {
                authFieldsEl.style.display = authDisabledCheckbox.checked
                    ? "none"
                    : "grid";
                authDisabledCheckbox.addEventListener("change", () => {
                    authFieldsEl.style.display = authDisabledCheckbox.checked
                        ? "none"
                        : "grid";
                });
            }

            const testBtn = popupFormEl.querySelector(".provider-test-btn");
            const testInput = popupFormEl.querySelector(".provider-test-input");
            const testStatus = popupFormEl.querySelector(
                ".provider-test-status",
            );

            if (testBtn && testInput) {
                testBtn.addEventListener("click", async () => {
                    const to =
                        testInput instanceof HTMLInputElement
                            ? testInput.value.trim()
                            : "";
                    const config = {};
                    popupFormEl.querySelectorAll("[name]").forEach((field) => {
                        if (field instanceof HTMLInputElement) {
                            if (field.type === "checkbox") {
                                config[field.name] = field.checked;
                            } else {
                                config[field.name] =
                                    field.name === "port"
                                        ? Number(field.value)
                                        : field.value;
                            }
                        } else if (field instanceof HTMLSelectElement) {
                            config[field.name] = field.value;
                        }
                    });
                    const testRes = await apiFetch(testUrl, {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ to, config }),
                    });
                    if (testStatus) {
                        testStatus.textContent = testRes.ok
                            ? i18n.t("ui.app.admin.notif.test_sent")
                            : i18n.t("ui.app.admin.notif.test_failed");
                    }
                });
            }
        },
    });

    if (result === "save" && popupFormEl) {
        const config = {};
        popupFormEl.querySelectorAll("[name]").forEach((field) => {
            if (field instanceof HTMLInputElement) {
                if (field.type === "checkbox") {
                    config[field.name] = field.checked;
                } else {
                    config[field.name] =
                        field.name === "port"
                            ? Number(field.value)
                            : field.value;
                }
            } else if (field instanceof HTMLSelectElement) {
                config[field.name] = field.value;
            }
        });
        await apiFetch(configUrl, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(config),
        });
        allAdapters = await loadAllAdapters(gateways);
        composer.refresh(elements);
    }
}

function bindAdapterEntries() {
    root.querySelectorAll(
        ".provider-card--entry[data-adapter-id][data-gateway-id]",
    ).forEach((card) => {
        if (!(card instanceof HTMLElement)) return;
        const adapterId = card.dataset.adapterId;
        const gatewayId = card.dataset.gatewayId;
        if (!adapterId || !gatewayId) return;

        const adapter = allAdapters.find(
            (a) => a.senderId === adapterId && a._gatewayId === gatewayId,
        );
        if (!adapter) return;

        async function handleOpen() {
            await openAdapterConfig(gatewayId, adapterId, adapter.name);
        }

        card.addEventListener("click", handleOpen);
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpen();
            }
        });
    });
}

function bindComponentsDropdown() {
    const select = root.querySelector(".components-tab-select");
    if (!(select instanceof HTMLSelectElement)) return;
    select.addEventListener("change", () => {
        activeComponentTab = select.value;
        composer.refresh(elements);
    });
}

async function loadAllAdapters(gatewayList) {
    const results = await Promise.all(
        gatewayList.map(async (gw) => {
            const adapters = await loadGatewayAdapters(gw.id);
            return adapters.map((a) => ({ ...a, _gatewayId: gw.id }));
        }),
    );
    return results.flat();
}

let [modules, integrityRows] = await Promise.all([
    loadModules(),
    loadIntegrity(),
]);
let gateways = await loadGateways();
let allAdapters = await loadAllAdapters(gateways);
let activeComponentTab = "modules";
let composer;

const securitySection = initSecuritySection(root, { i18n });

const sectionMeta = await loadAdminSections();
const gatewaySections = (
    await Promise.all(sectionMeta.map(loadGatewaySection))
).filter(Boolean);

const baseElements = [
    {
        id: "components",
        label: i18n.t("ui.app.admin.components"),
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-components-layout",
            heading: i18n.t("ui.app.admin.components"),
            elements: [
                {
                    id: "components-content",
                    label: i18n.t("ui.app.admin.components"),
                    pinned: true,
                    render: () =>
                        renderComponentsContent(
                            activeComponentTab,
                            modules,
                            gateways,
                            allAdapters,
                        ),
                },
            ],
            onRender: () => {
                bindComponentsDropdown();
                if (activeComponentTab === "modules") {
                    bindModuleToggles();
                } else if (activeComponentTab === "adapters") {
                    bindAdapterEntries();
                }
            },
        },
    },
    {
        id: "integrity",
        label: i18n.t("ui.reuse.file_integrity"),
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-integrity-layout",
            heading: i18n.t("ui.reuse.file_integrity"),
            elements: [
                {
                    id: "integrity-content",
                    label: i18n.t("ui.reuse.file_integrity"),
                    pinned: true,
                    render: () => `
            <div class="integrity-header">
              <button id="rerun-integrity" class="btn-confirm btn-animated" type="button">${i18n.t("ui.reuse.generic.refresh")}</button>
            </div>
            ${renderIntegrityContent(integrityRows)}
          `,
                },
            ],
            onRender: () => {
                bindIntegrityRerun();
            },
        },
    },
    {
        id: "security",
        label: i18n.t("ui.app.admin.security.title"),
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-security-layout",
            heading: i18n.t("ui.app.admin.security.title"),
            elements: [
                {
                    id: "security-content",
                    label: i18n.t("ui.app.admin.security.title"),
                    pinned: true,
                    render: () => securitySection.renderContent(),
                },
            ],
            onRender: () => {
                securitySection.init();
            },
        },
    },
];

const elements = [
    ...baseElements,
    ...gatewaySections.map((sec) => ({
        id: sec.id,
        label: sec.label,
        subComposerOptions: {
            ...sec.subComposerOptions,
            onRender: () => sec.subComposerOptions?.onRender?.(root),
        },
    })),
];

const navItems = [
    `<li><button data-composer-scroll="components">${i18n.t("ui.app.admin.components")}</button></li>`,
    `<li><button data-composer-scroll="integrity">${i18n.t("ui.reuse.file_integrity")}</button></li>`,
    `<li><button data-composer-scroll="security">${i18n.t("ui.app.admin.security.title")}</button></li>`,
    ...gatewaySections.map(
        (sec) =>
            `<li><button data-composer-scroll="${escapeHtml(sec.id)}">${escapeHtml(sec.label)}</button></li>`,
    ),
];

composer = createPageComposer(root, {
    allowCustomization: false,
    subPageNavigation: true,
    elements,
    preferenceKey: "administration-layout",
    i18n,
    pageContext: {
        title: i18n.t("ui.app.admin.page_title"),
        subtitle: i18n.t("ui.app.admin.page_subtitle"),
    },
    toolbar: [
        {
            id: "admin-nav",
            label: i18n.t("ui.app.admin.page_title"),
            render: () => `
        <h2>${i18n.t("ui.app.admin.page_title")}</h2>
        <ul>
          ${navItems.join("\n")}
        </ul>
      `,
        },
    ],
});
await composer.init();
