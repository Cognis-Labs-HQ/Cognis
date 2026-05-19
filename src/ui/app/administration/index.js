import { apiFetch } from "../../reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    extendI18n,
} from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { openPopup } from "../../reuse/popup.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { resolveModuleConfigScriptUrl } from "./module-config.js";
import { initSecuritySection } from "./security.js";
import { createUnsavedChangesBar } from "../../reuse/unsaved-changes.js";
import { updateNavbarAvatar } from "../../layouts/dashboard-layout.js";
import { showToast } from "../../reuse/toast.js";
import {
    getAdapterDisableContext,
    getGatewayAdapters,
    getGatewayEnableableAdapters,
    isModuleEnabled,
    shouldQueryGatewayAdapters,
} from "./toggle-flows.js";

let root = null;
let i18n = null;
let modules = [];
let integrityRows = [];
let gateways = [];
let allAdapters = [];
let composer = null;
let changesBar = null;
let securitySection = null;
let elements = [];

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

async function toggleGateway(gatewayId, action) {
    await apiFetch(
        `/api/v1/gateways/${encodeURIComponent(gatewayId)}/${action}`,
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

/**
 * Resolves an adapter record either from the optional override or by matching
 * the loaded adapter cache for a gateway/adapter pair.
 *
 * @param {string} gatewayId
 * @param {string} adapterId
 * @param {Record<string, unknown> | null} [adapterOverride]
 * @returns {Record<string, unknown> | null} Matching adapter record from the
 * override or adapter cache, or null when no adapter can be resolved.
 */
function findAdapterRecord(gatewayId, adapterId, adapterOverride = null) {
    if (adapterOverride) {
        return adapterOverride;
    }
    return (
        allAdapters.find(
            (adapter) =>
                (adapter.senderId ?? adapter.id) === adapterId &&
                adapter._gatewayId === gatewayId,
        ) ?? null
    );
}

/**
 * Resolves the URL for an adapter control endpoint using announced metadata
 * when present, with a standard gateway/adapter fallback path.
 *
 * @param {string} gatewayId
 * @param {string} adapterId
 * @param {string} controlName
 * @param {Record<string, unknown> | null} [adapterOverride]
 * @returns {string}
 */
function resolveAdapterControlUrl(
    gatewayId,
    adapterId,
    controlName,
    adapterOverride = null,
) {
    const adapter = findAdapterRecord(gatewayId, adapterId, adapterOverride);
    const announcedUrl = adapter?.controls?.[controlName];
    if (typeof announcedUrl === "string" && announcedUrl.length > 0) {
        return announcedUrl;
    }

    const encodedGatewayId = encodeURIComponent(gatewayId);
    const encodedAdapterId = encodeURIComponent(adapterId);
    return `/api/v1/gateways/${encodedGatewayId}/adapters/${encodedAdapterId}/${controlName}`;
}

/**
 * Synchronizes module, gateway, and adapter toggle controls after UI refresh so
 * checkbox state reflects the latest loaded runtime status. This
 * function queries the current DOM toggle nodes and should run after
 * page-composer rerender/refresh operations.
 */
function syncGatewayAndAdapterToggles() {
    const moduleStateById = new Map(
        modules.map((moduleRecord) => [moduleRecord.id, moduleRecord]),
    );
    root.querySelectorAll('input[type="checkbox"][data-module]').forEach((toggle) => {
        if (!(toggle instanceof HTMLInputElement)) return;
        const moduleId = toggle.dataset.module;
        if (!moduleId) return;
        const moduleRecord = moduleStateById.get(moduleId);
        if (!moduleRecord) return;
        const isEnabled = isModuleEnabled(moduleRecord);
        toggle.checked = isEnabled;
        toggle.defaultChecked = isEnabled;
        toggle.disabled = moduleRecord.class === "core";
    });

    const gatewayStateById = new Map(
        gateways.map((gateway) => [gateway.id, gateway]),
    );
    root.querySelectorAll(
        'input[type="checkbox"][data-gateway]:not(.adapter-toggle)',
    ).forEach((toggle) => {
        if (!(toggle instanceof HTMLInputElement)) return;
        const gatewayId = toggle.dataset.gateway;
        if (!gatewayId) return;
        const gateway = gatewayStateById.get(gatewayId);
        if (!gateway) return;
        const isEnabled = (gateway.status ?? "active") !== "disabled";
        toggle.checked = isEnabled;
        toggle.defaultChecked = isEnabled;
        toggle.disabled = gateway.required === true;
    });

    const adapterStateByKey = new Map(
        allAdapters.map((adapter) => [
            `${adapter._gatewayId}:${adapter.senderId ?? adapter.id}`,
            adapter,
        ]),
    );
    root.querySelectorAll(
        ".adapter-toggle[data-adapter][data-gateway]",
    ).forEach((toggle) => {
        if (!(toggle instanceof HTMLInputElement)) return;
        const adapterId = toggle.dataset.adapter;
        const gatewayId = toggle.dataset.gateway;
        if (!adapterId || !gatewayId) return;
        const adapter = adapterStateByKey.get(`${gatewayId}:${adapterId}`);
        if (!adapter) return;
        const gateway = gatewayStateById.get(gatewayId);
        const isGatewayDisabled = (gateway?.status ?? "active") === "disabled";
        const isEnabled = !!(adapter.active ?? adapter.enabled);
        toggle.checked = isEnabled;
        toggle.defaultChecked = isEnabled;
        toggle.disabled = isGatewayDisabled || Boolean(adapter.locked);
    });
}

function getStatePill(status) {
    if (status === "active" || status === "enabled")
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
        [i18n.t("ui.reuse.id"), mod.id],
        [i18n.t("ui.reuse.version"), mod.version],
        [
            i18n.t("ui.app.admin.publisher"),
            mod.publisher || i18n.t("ui.app.admin.unknown"),
        ],
        [i18n.t("ui.reuse.class"), mod.class],
        [
            i18n.t("ui.app.admin.capabilities"),
            (mod.capabilities || []).join(", ") || i18n.t("ui.app.admin.none"),
        ],
    ];

    const rows = details
        .map(
            ([key, value]) =>
                `<li class="module-detail-item"><span class="module-detail-key">${key}</span><span class="module-detail-value">${value}</span></li>`,
        )
        .join("");

    if (mod.requires && mod.requires.length > 0) {
        const depsHtml = renderDependencyLinks(
            mod.requires,
            "gateway-",
            gateways,
        );
        return (
            rows +
            `<li class="module-detail-item"><span class="module-detail-key">${i18n.t("ui.app.admin.gateway.dependencies")}</span><span class="module-detail-value">${depsHtml}</span></li>`
        );
    }

    return rows;
}

function renderModulesContent(modules) {
    return modules
        .map((mod) => {
            const pill = getStatePill(mod.status);
            const disableBlocked = mod.class === "core";
            const toggleTitle = i18n.t("ui.app.admin.toggle_module");
            const componentConfigScriptUrl = resolveModuleConfigScriptUrl(mod);
            const hasConfigButton = componentConfigScriptUrl.length > 0;
            const settingsButton = hasConfigButton
                ? `<button type="button" class="module-config-settings-button" data-module-config-script-url="${escapeHtml(componentConfigScriptUrl)}" data-module-id="${escapeHtml(mod.id)}" aria-label="${escapeHtml(i18n.t("ui.reuse.settings"))}" title="${escapeHtml(i18n.t("ui.reuse.settings"))}">⚙</button>`
                : "";

            return `
        <details class="module-row" data-module="${mod.id}">
          <summary class="module-row-summary">
            <span class="module-row-title"><strong>${mod.name}</strong>${settingsButton}</span>
            <span class="state-pill ${pill.className}">${pill.label}</span>
            <label class="switch switch--inline" title="${escapeHtml(toggleTitle)}">
              <input type="checkbox" data-module="${mod.id}" ${isModuleEnabled(mod) ? "checked" : ""} ${disableBlocked ? "disabled" : ""} />
              <span class="slider"></span>
            </label>
            <span class="module-chevron">▾</span>
          </summary>
          <div class="module-meta">
            <ul class="module-details">${renderDetailsList(mod)}</ul>
          </div>
        </details>
      `;
        })
        .join("");
}

function renderDependencyLinks(ids, scrollPrefix, gateways = []) {
    if (!ids || ids.length === 0) {
        return i18n.t("ui.app.admin.gateway.no_dependencies");
    }
    const gwById = new Map(gateways.map((g) => [g.id, g]));
    return ids
        .map((id) => {
            const dep = gwById.get(id);
            const label = dep ? escapeHtml(dep.name) : escapeHtml(id);
            return `<a class="dependency-link" href="#" data-scroll-to="${escapeHtml(scrollPrefix)}${escapeHtml(id)}">${label}</a>`;
        })
        .join(", ");
}

function renderGatewayDetailsList(gw, gateways) {
    const requiredLabel = gw.required
        ? i18n.t("ui.reuse.true")
        : i18n.t("ui.reuse.false");

    const details = [
        [i18n.t("ui.reuse.id"), escapeHtml(gw.id)],
        [i18n.t("ui.reuse.version"), escapeHtml(gw.version ?? "")],
        [
            i18n.t("ui.app.admin.publisher"),
            escapeHtml(gw.publisher || i18n.t("ui.app.admin.unknown")),
        ],
        [i18n.t("ui.app.admin.gateway.required"), requiredLabel],
    ];
    if (gw.description) {
        details.push([
            i18n.t("ui.app.admin.description"),
            escapeHtml(gw.description),
        ]);
    }
    const detailsRows = details
        .map(
            ([key, value]) =>
                `<li class="module-detail-item"><span class="module-detail-key">${key}</span><span class="module-detail-value">${value}</span></li>`,
        )
        .join("");
    const depsHtml = renderDependencyLinks(gw.requires, "gateway-", gateways);
    const depsRow = `<li class="module-detail-item"><span class="module-detail-key">${i18n.t("ui.app.admin.gateway.dependencies")}</span><span class="module-detail-value">${depsHtml}</span></li>`;
    return detailsRows + depsRow;
}

function renderAdapterToggle(adapter, gatewayId, isGatewayDisabled) {
    const adapterId = adapter.senderId ?? adapter.id;
    const isEnabled = !!(adapter.active ?? adapter.enabled);
    const isLocked = !!adapter.locked;
    return `<label class="switch switch--inline" title="${escapeHtml(i18n.t("ui.app.admin.toggle_adapter"))}">
      <input type="checkbox" class="adapter-toggle"
        data-adapter="${escapeHtml(adapterId)}"
        data-gateway="${escapeHtml(gatewayId)}"
        ${isEnabled ? "checked" : ""}
        ${isGatewayDisabled || isLocked ? "disabled" : ""} />
      <span class="slider"></span>
    </label>`;
}

function renderInlineAdapters(adapters, gatewayId, isGatewayDisabled) {
    if (!adapters || adapters.length === 0) return "";
    const rows = adapters
        .map((adapter) => {
            const adapterId = adapter.senderId ?? adapter.id;
            const isActive = !!(adapter.active ?? adapter.enabled);
            const statePillClass = isActive ? "pill-active" : "pill-available";
            const stateLabel = isActive
                ? i18n.t("ui.app.admin.state.active")
                : i18n.t("ui.app.admin.state.available");
            return `
        <div class="adapter-inline-row" role="button" tabindex="0"
          data-adapter-id="${escapeHtml(adapterId)}"
          data-gateway-id="${escapeHtml(gatewayId)}">
          <span class="adapter-inline-name"><strong>${escapeHtml(adapter.name ?? adapterId)}</strong></span>
          <span class="state-pill ${statePillClass}">${stateLabel}</span>
          ${renderAdapterToggle(adapter, gatewayId, isGatewayDisabled)}
        </div>
      `;
        })
        .join("");
    return `
      <div class="gateway-adapters-section">
        <span class="gateway-adapters-label">${i18n.t("ui.app.admin.adapters")}</span>
        <div class="gateway-adapters-inline">${rows}</div>
      </div>
    `;
}

function renderGatewaysContent(gateways, allAdapters) {
    if (!gateways.length) {
        return `<p>${i18n.t("ui.app.admin.no_gateways")}</p>`;
    }
    const toggleTitle = i18n.t("ui.app.admin.toggle_gateway");
    return gateways
        .map((gw) => {
            const pill = getStatePill(gw.status ?? "active");
            const isEnabled = (gw.status ?? "active") !== "disabled";
            const isGatewayDisabled = !isEnabled;
            const gwAdapters = gw.hasAdapters
                ? allAdapters.filter((a) => a._gatewayId === gw.id)
                : [];

            return `
        <details class="module-row" data-gateway="${escapeHtml(gw.id)}">
          <summary class="module-row-summary">
            <span class="module-row-title"><strong>${escapeHtml(gw.name)}</strong></span>
            <span class="state-pill ${pill.className}">${pill.label}</span>
            <label class="switch switch--inline" title="${escapeHtml(toggleTitle)}">
              <input type="checkbox" data-gateway="${escapeHtml(gw.id)}" ${isEnabled ? "checked" : ""} ${gw.required ? "disabled" : ""} />
              <span class="slider"></span>
            </label>
            <span class="module-chevron">▾</span>
          </summary>
          <div class="module-meta">
            <ul class="module-details">${renderGatewayDetailsList(gw, gateways)}</ul>
            ${renderInlineAdapters(gwAdapters, gw.id, isGatewayDisabled)}
          </div>
        </details>
      `;
        })
        .join("");
}

function renderComponentsContent(modules, gateways, allAdapters) {
    return `
    <div class="components-section">
      <h3 class="components-section-heading">${i18n.t("ui.reuse.modules")}</h3>
      <div class="components-section-body">
        ${renderModulesContent(modules)}
      </div>
    </div>
    <div class="components-section">
      <h3 class="components-section-heading">${i18n.t("ui.app.admin.gateways")}</h3>
      <div class="components-section-body">
        ${renderGatewaysContent(gateways, allAdapters)}
      </div>
    </div>
  `;
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

                if (action === "enable") {
                    const mod = modules.find((m) => m.id === moduleId);
                    const disabledDeps = (mod?.requires ?? []).filter(
                        (depId) => {
                            const dep = gateways.find((g) => g.id === depId);
                            return dep && dep.status === "disabled";
                        },
                    );
                    if (disabledDeps.length > 0) {
                        const depNames = disabledDeps.map((depId) => {
                            const dep = gateways.find((g) => g.id === depId);
                            return dep ? dep.name : depId;
                        });
                        const result = await openPopup({
                            title: i18n.t("ui.app.admin.enable_confirm_module"),
                            body: `<p>${i18n.t("ui.app.admin.enable_deps_will_enable")}</p><ul>${depNames.map((n) => `<li><strong>${escapeHtml(n)}</strong></li>`).join("")}</ul>`,
                            actions: [
                                {
                                    id: "confirm",
                                    label: i18n.t("ui.reuse.enable"),
                                    variant: "confirm",
                                },
                                {
                                    id: "cancel",
                                    label: i18n.t("ui.reuse.cancel"),
                                    variant: "cancel",
                                },
                            ],
                        });
                        if (result !== "confirm") {
                            toggle.checked = previousState;
                            return;
                        }
                        for (const depId of disabledDeps) {
                            await toggleGateway(depId, "enable");
                        }
                        gateways = await loadGateways();
                    }
                }

                if (action === "disable") {
                    const result = await openPopup({
                        title: i18n.t("ui.app.admin.disable_confirm"),
                        body: `<strong>${moduleId}</strong>`,
                        variant: "danger",
                        actions: [
                            {
                                id: "confirm",
                                label: i18n.t("ui.reuse.disable"),
                                variant: "confirm",
                            },
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
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

function bindModuleConfigureButtons() {
    root.querySelectorAll("[data-module-config-script-url]").forEach(
        (button) => {
            button.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const moduleId = button.getAttribute("data-module-id");
                const scriptUrl = button.getAttribute(
                    "data-module-config-script-url",
                );
                if (!moduleId || !scriptUrl) return;
                try {
                    const moduleUi = await import(scriptUrl);
                    if (typeof moduleUi.openModuleConfigPopup !== "function")
                        return;
                    const didSave = await moduleUi.openModuleConfigPopup({
                        i18n,
                        apiFetch,
                        openPopup,
                        showToast,
                        escapeHtml,
                        moduleId,
                    });
                    if (didSave) {
                        modules = await loadModules();
                        composer.refresh(elements);
                    }
                } catch (error) {
                    showToast(i18n.t("ui.reuse.save_failed"), {
                        variant: "error",
                    });
                    console.error(error);
                }
            });
        },
    );
}

function bindGatewayToggles() {
    root.querySelectorAll(
        'input[type="checkbox"][data-gateway]:not([data-adapter])',
    ).forEach((toggle) => {
        toggle.addEventListener("change", async () => {
            const gatewayId = toggle.dataset.gateway;
            const previousState = !toggle.checked;
            const action = toggle.checked ? "enable" : "disable";
            const gateway = gateways.find((g) => g.id === gatewayId);

            if (action === "enable") {
                const disabledDeps = (gateway?.requires ?? []).filter(
                    (depId) => {
                        const dep = gateways.find((g) => g.id === depId);
                        return dep && dep.status === "disabled";
                    },
                );
                if (disabledDeps.length > 0) {
                    const depNames = disabledDeps.map((depId) => {
                        const dep = gateways.find((g) => g.id === depId);
                        return dep ? dep.name : depId;
                    });
                    const result = await openPopup({
                        title: i18n.t("ui.app.admin.enable_confirm_gateway"),
                        body: `<p>${i18n.t("ui.app.admin.enable_deps_will_enable")}</p><ul>${depNames.map((n) => `<li><strong>${escapeHtml(n)}</strong></li>`).join("")}</ul>`,
                        actions: [
                            {
                                id: "confirm",
                                label: i18n.t("ui.reuse.enable"),
                                variant: "confirm",
                            },
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "cancel",
                            },
                        ],
                    });
                    if (result !== "confirm") {
                        toggle.checked = previousState;
                        return;
                    }
                    for (const depId of disabledDeps) {
                        await toggleGateway(depId, "enable");
                    }
                    gateways = await loadGateways();
                    allAdapters = await loadAllAdapters(gateways);
                }
                await toggleGateway(gatewayId, action);

                gateways = await loadGateways();
                allAdapters = await loadAllAdapters(gateways);

                const enableableAdapters = getGatewayEnableableAdapters(
                    allAdapters,
                    gatewayId,
                );

                if (enableableAdapters.length > 0) {
                    let popupOverlay = null;
                    const enableAdaptersResult = await openPopup({
                        title: i18n.t("ui.app.admin.enable_confirm_gateway"),
                        body: () => `
                            <p>${escapeHtml(i18n.t("ui.app.admin.enable_gateway_select_adapters"))}</p>
                            <div class="stack">${enableableAdapters
                                .map((adapter) => {
                                    const currentAdapterId =
                                        adapter.senderId ?? adapter.id;
                                    return `<label class="provider-option-row">
                                        <span class="provider-option-label">${escapeHtml(adapter.name ?? currentAdapterId)}</span>
                                        <input type="checkbox" name="gateway-enable-adapter" value="${escapeHtml(currentAdapterId)}" />
                                    </label>`;
                                })
                                .join("")}</div>
                        `,
                        actions: [
                            {
                                id: "confirm",
                                label: i18n.t("ui.reuse.enable"),
                                variant: "confirm",
                            },
                            {
                                id: "skip",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "cancel",
                            },
                        ],
                        onOpen: (overlay) => {
                            popupOverlay = overlay;
                        },
                    });
                    if (
                        enableAdaptersResult === "confirm" &&
                        popupOverlay instanceof HTMLElement
                    ) {
                        const selectedAdapterIds = [
                            ...popupOverlay.querySelectorAll(
                                'input[name="gateway-enable-adapter"]:checked',
                            ),
                        ].map((input) => input.value);
                        for (const selectedAdapterId of selectedAdapterIds) {
                            const selectedAdapter = enableableAdapters.find(
                                (adapter) =>
                                    (adapter.senderId ?? adapter.id) ===
                                    selectedAdapterId,
                            );
                            await toggleAdapter(
                                gatewayId,
                                selectedAdapterId,
                                "enable",
                                selectedAdapter ?? null,
                            );
                        }
                    }
                }
            } else {
                const liveAdapters = await loadGatewayAdapters(gatewayId);
                const gatewayDisableWarning =
                    liveAdapters.length > 0
                        ? `<p>${escapeHtml(i18n.t("ui.app.admin.disable_gateway_with_adapters_warning"))}</p>`
                        : "";
                const result = await openPopup({
                    title: i18n.t("ui.app.admin.disable_confirm_gateway"),
                    body: `${gatewayDisableWarning}<strong>${escapeHtml(gateway?.name ?? gatewayId)}</strong>`,
                    variant: "danger",
                    actions: [
                        {
                            id: "confirm",
                            label: i18n.t("ui.reuse.disable"),
                            variant: "confirm",
                        },
                        {
                            id: "cancel",
                            label: i18n.t("ui.reuse.cancel"),
                            variant: "cancel",
                        },
                    ],
                });
                if (result !== "confirm") {
                    toggle.checked = previousState;
                    return;
                }

                for (const adapter of liveAdapters) {
                    const currentAdapterId = adapter.senderId ?? adapter.id;
                    if (
                        currentAdapterId &&
                        (adapter.active ?? adapter.enabled)
                    ) {
                        await toggleAdapter(
                            gatewayId,
                            currentAdapterId,
                            "disable",
                            adapter,
                        );
                    }
                }

                await toggleGateway(gatewayId, action);
            }

            gateways = await loadGateways();
            allAdapters = await loadAllAdapters(gateways);
            window.dispatchEvent(new Event("cognis:navbar-plugins-refresh"));
            window.dispatchEvent(new Event("cognis:navbar-refresh"));
            composer.refresh(elements);
            updateNavbarAvatar().catch(() => {});
        });
    });
}

function bindSummarySliderClicks() {
    root.querySelectorAll(".module-row summary .switch--inline").forEach(
        (label) => {
            label.addEventListener("click", (e) => {
                e.stopPropagation();
            });
        },
    );
}

const EXPANDED_STATE_KEY = "admin-expanded-rows";

function saveExpandedState() {
    const openIds = [];
    root.querySelectorAll("details.module-row[open]").forEach((el) => {
        const gwId = el.dataset.gateway;
        const modId = el.dataset.module;
        if (gwId) openIds.push("gateway:" + gwId);
        else if (modId) openIds.push("module:" + modId);
    });
    try {
        sessionStorage.setItem(EXPANDED_STATE_KEY, JSON.stringify(openIds));
    } catch {}
}

function restoreExpandedState() {
    let openIds;
    try {
        openIds = JSON.parse(
            sessionStorage.getItem(EXPANDED_STATE_KEY) ?? "[]",
        );
    } catch {
        openIds = [];
    }
    const openSet = new Set(openIds);
    root.querySelectorAll("details.module-row").forEach((el) => {
        const gwId = el.dataset.gateway;
        const modId = el.dataset.module;
        const key = gwId ? "gateway:" + gwId : modId ? "module:" + modId : null;
        if (key && openSet.has(key)) {
            el.setAttribute("open", "");
        }
    });
}

function bindExpandedStateListeners() {
    root.querySelectorAll("details.module-row").forEach((el) => {
        el.addEventListener("toggle", saveExpandedState);
    });
}

function bindGatewayAdapterButtons() {
    // This function is intentionally empty — adapters are now rendered inline.
    // Previously it managed a collapsible panel; that pattern is replaced by
    // renderInlineAdapters + bindAdapterRows.
}

async function toggleAdapter(
    gatewayId,
    adapterId,
    action,
    adapterOverride = null,
) {
    await apiFetch(
        resolveAdapterControlUrl(gatewayId, adapterId, action, adapterOverride),
        { method: "POST" },
    );
}

function bindAdapterToggles() {
    root.querySelectorAll(
        ".adapter-toggle[data-adapter][data-gateway]",
    ).forEach((toggle) => {
        if (!(toggle instanceof HTMLInputElement)) return;
        toggle.addEventListener("change", async () => {
            const adapterId = toggle.dataset.adapter;
            const gatewayId = toggle.dataset.gateway;
            if (!adapterId || !gatewayId) return;
            const previouslyChecked = !toggle.checked;
            const action = toggle.checked ? "enable" : "disable";

            if (action === "enable") {
                const adapter = allAdapters.find(
                    (a) =>
                        (a.senderId ?? a.id) === adapterId &&
                        a._gatewayId === gatewayId,
                );
                const requires = adapter?.requires ?? [];
                const disabledDepNames = [];
                const disabledGatewayDeps = [];
                const disabledAdapterDeps = [];

                for (const req of requires) {
                    const parts = req.split(":");
                    if (parts.length === 2) {
                        const [depGwId, depAdapterId] = parts;
                        const depAdapter = allAdapters.find(
                            (a) =>
                                (a.senderId ?? a.id) === depAdapterId &&
                                a._gatewayId === depGwId,
                        );
                        if (
                            depAdapter &&
                            !(depAdapter.active ?? depAdapter.enabled)
                        ) {
                            disabledAdapterDeps.push({
                                gatewayId: depGwId,
                                adapterId: depAdapterId,
                            });
                            disabledDepNames.push(
                                depAdapter.name ?? depAdapterId,
                            );
                        }
                    } else {
                        const depGw = gateways.find((g) => g.id === req);
                        if (depGw && depGw.status === "disabled") {
                            disabledGatewayDeps.push(req);
                            disabledDepNames.push(depGw.name ?? req);
                        }
                    }
                }

                if (disabledDepNames.length > 0) {
                    const result = await openPopup({
                        title: i18n.t("ui.app.admin.enable_confirm_adapter"),
                        body: `<p>${i18n.t("ui.app.admin.enable_deps_will_enable")}</p><ul>${disabledDepNames.map((n) => `<li><strong>${escapeHtml(n)}</strong></li>`).join("")}</ul>`,
                        actions: [
                            {
                                id: "confirm",
                                label: i18n.t("ui.reuse.enable"),
                                variant: "confirm",
                            },
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "cancel",
                            },
                        ],
                    });
                    if (result !== "confirm") {
                        toggle.checked = previouslyChecked;
                        return;
                    }
                    for (const depGwId of disabledGatewayDeps) {
                        await toggleGateway(depGwId, "enable");
                    }
                    for (const dep of disabledAdapterDeps) {
                        const dependentAdapter = allAdapters.find(
                            (adapter) =>
                                (adapter.senderId ?? adapter.id) ===
                                    dep.adapterId &&
                                adapter._gatewayId === dep.gatewayId,
                        );
                        await toggleAdapter(
                            dep.gatewayId,
                            dep.adapterId,
                            "enable",
                            dependentAdapter ?? null,
                        );
                    }
                    gateways = await loadGateways();
                    allAdapters = await loadAllAdapters(gateways);
                }

                await toggleAdapter(
                    gatewayId,
                    adapterId,
                    "enable",
                    adapter ?? null,
                );
            }

            if (action === "disable") {
                const { isLastEnabled, targetAdapter } =
                    getAdapterDisableContext(allAdapters, gatewayId, adapterId);
                const adapterName =
                    targetAdapter?.name ??
                    targetAdapter?.senderId ??
                    targetAdapter?.id ??
                    adapterId;
                const disableWarning = isLastEnabled
                    ? `<p>${escapeHtml(i18n.t("ui.app.admin.disable_last_adapter_warning"))}</p>`
                    : "";
                const result = await openPopup({
                    title: i18n.t("ui.app.admin.disable_confirm_adapter"),
                    body: `${disableWarning}<strong>${escapeHtml(adapterName)}</strong>`,
                    variant: "danger",
                    actions: [
                        {
                            id: "confirm",
                            label: i18n.t("ui.reuse.disable"),
                            variant: "confirm",
                        },
                        {
                            id: "cancel",
                            label: i18n.t("ui.reuse.cancel"),
                            variant: "cancel",
                        },
                    ],
                });
                if (result !== "confirm") {
                    toggle.checked = previouslyChecked;
                    return;
                }

                await toggleAdapter(
                    gatewayId,
                    adapterId,
                    "disable",
                    targetAdapter ?? adapter ?? null,
                );

                if (isLastEnabled) {
                    await toggleGateway(gatewayId, "disable");
                    gateways = await loadGateways();
                }
            }

            allAdapters = await loadAllAdapters(gateways);
            window.dispatchEvent(new Event("cognis:navbar-plugins-refresh"));
            window.dispatchEvent(new Event("cognis:navbar-refresh"));
            composer.refresh(elements);
        });
    });
}

function bindAdapterRows() {
    root.querySelectorAll(
        ".adapter-inline-row[data-adapter-id][data-gateway-id]",
    ).forEach((row) => {
        if (!(row instanceof HTMLElement)) return;
        const adapterId = row.dataset.adapterId;
        const gatewayId = row.dataset.gatewayId;
        if (!adapterId || !gatewayId) return;

        const adapter = allAdapters.find(
            (a) =>
                (a.senderId ?? a.id) === adapterId &&
                a._gatewayId === gatewayId,
        ) ?? { senderId: adapterId, name: adapterId };

        if (adapter.locked) return;

        async function handleOpen(e) {
            const switchLabel = row.querySelector(".switch--inline");
            if (
                switchLabel &&
                (e.target === switchLabel || switchLabel.contains(e.target))
            )
                return;
            await openAdapterConfig(
                gatewayId,
                adapterId,
                adapter.name ?? adapterId,
                adapter,
            );
            allAdapters = await loadAllAdapters(gateways);
            composer.refresh(elements);
        }

        row.addEventListener("click", handleOpen);
        row.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpen(e);
            }
        });
    });
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

function bindDependencyLinks() {
    root.querySelectorAll(".dependency-link[data-scroll-to]").forEach(
        (link) => {
            if (!(link instanceof HTMLAnchorElement)) return;
            const targetId = link.dataset.scrollTo;
            if (!targetId) return;
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const targetElement = root.querySelector(
                    `[data-gateway="${CSS.escape(targetId.replace(/^gateway-/, ""))}"], [data-module="${CSS.escape(targetId.replace(/^module-/, ""))}"]`,
                );
                if (!(targetElement instanceof HTMLElement)) return;
                targetElement.setAttribute("open", "");
                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            });
        },
    );
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
        const sectionI18n = await extendI18n(i18n, section.stringsBaseUrl);
        const def = mod.createAdminSection({
            i18n: sectionI18n,
            apiFetch,
            escapeHtml,
            openPopup,
            showToast,
        });
        if (def.dataReady) await def.dataReady;
        return def;
    } catch {
        return null;
    }
}

/**
 * Maps a raw backend field name to a human-readable label using existing
 * i18n keys. Falls back to converting camelCase to Title Case for unknown
 * fields.
 *
 * @param {string} name
 * @returns {string}
 */
function fieldNameToLabel(name) {
    const knownLabels = {
        host: i18n.t("ui.app.admin.notif.smtp_host"),
        port: i18n.t("ui.app.admin.notif.smtp_port"),
        from: i18n.t("ui.app.admin.notif.smtp_from"),
        senderName: i18n.t("ui.app.admin.notif.smtp_sender_name"),
        user: i18n.t("ui.app.admin.notif.smtp_user"),
        password: i18n.t("ui.app.admin.notif.smtp_password"),
        secure: i18n.t("ui.app.admin.notif.smtp_secure"),
        allowSelfSigned: i18n.t("ui.app.admin.notif.smtp_allow_self_signed"),
        authDisabled: i18n.t("ui.app.admin.notif.smtp_auth_disabled"),
    };
    if (knownLabels[name]) return knownLabels[name];
    return name
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
}

function renderGenericAdapterForm(
    descriptors,
    requiredFields,
    showTestControls,
) {
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
        return `<label class="provider-popup-field${requiredClass}"${labelTitle}>${escapeHtml(labelText)}${inputHtml}${conflictWarning}</label>`;
    }

    const fieldKeys = Object.keys(descriptors).filter(
        (name) => name !== "enabled",
    );

    const authFieldNames = new Set(["user", "password"]);

    const textFieldKeys = fieldKeys.filter((name) => {
        if (name === "secure") return false;
        if (name === "authDisabled") return false;
        const rawValue = descriptors[name]?.effectiveValue;
        return !(
            rawValue === true ||
            rawValue === false ||
            rawValue === "true" ||
            rawValue === "false"
        );
    });

    const boolFieldKeys = fieldKeys.filter((name) => {
        if (name === "secure") return false;
        if (authFieldNames.has(name)) return false;
        const rawValue = descriptors[name]?.effectiveValue;
        return (
            rawValue === true ||
            rawValue === false ||
            rawValue === "true" ||
            rawValue === "false"
        );
    });

    const hasSecure = "secure" in descriptors;
    const authFieldKeys = textFieldKeys.filter((name) =>
        authFieldNames.has(name),
    );
    const nonAuthTextFieldKeys = textFieldKeys.filter(
        (name) => !authFieldNames.has(name),
    );

    const secureFieldHtml = hasSecure
        ? (() => {
              const val = descriptors["secure"]?.effectiveValue ?? "none";
              return fieldLabel(
                  "secure",
                  fieldNameToLabel("secure"),
                  `<select name="secure" class="theme-select">
                <option value="none"${val === "none" ? " selected" : ""}>${i18n.t("ui.app.admin.notif.smtp_secure_none")}</option>
                <option value="starttls"${val === "starttls" ? " selected" : ""}>${i18n.t("ui.app.admin.notif.smtp_secure_starttls")}</option>
                <option value="tls"${val === "tls" ? " selected" : ""}>${i18n.t("ui.app.admin.notif.smtp_secure_tls")}</option>
              </select>`,
              );
          })()
        : "";

    const nonAuthFieldsHtml = nonAuthTextFieldKeys
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

            return fieldLabel(name, fieldNameToLabel(name), inputHtml);
        })
        .join("");

    const authFieldsHtml = authFieldKeys
        .map((name) => {
            const descriptor = descriptors[name];
            const val = escapeHtml(descriptor?.effectiveValue ?? "");
            const inputHtml =
                name === "password"
                    ? `<input name="${escapeHtml(name)}" type="password" value="" />`
                    : `<input name="${escapeHtml(name)}" type="text" value="${val}" />`;
            return fieldLabel(name, fieldNameToLabel(name), inputHtml);
        })
        .join("");

    const authFieldsBlock =
        authFieldKeys.length > 0
            ? `<div class="provider-auth-fields">${authFieldsHtml}</div>`
            : "";

    const boolFieldsHtml = boolFieldKeys.length
        ? `<div class="provider-option-toggles">${boolFieldKeys
              .map((name) => {
                  const rawValue = descriptors[name]?.effectiveValue;
                  const checked =
                      rawValue === true || rawValue === "true"
                          ? " checked"
                          : "";
                  const isAuthDisabled = name === "authDisabled";
                  return `<div class="provider-option-row${isAuthDisabled ? " provider-auth-toggle-row" : ""}">
          <span class="provider-option-label">${escapeHtml(fieldNameToLabel(name))}</span>
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
        ${secureFieldHtml}
        ${nonAuthFieldsHtml}
      </div>
      ${authFieldsBlock}
      ${boolFieldsHtml}
      ${
          showTestControls
              ? `<div class="provider-test-row">
        <input class="provider-test-input" type="email" placeholder="${escapeHtml(i18n.t("ui.app.admin.notif.test_email_to"))}" />
        <button class="btn-animated provider-test-btn" type="button">${i18n.t("ui.app.admin.notif.test_email")}</button>
      </div>`
              : ""
      }
    </div>
  `;
}

async function openAdapterConfig(
    gatewayId,
    adapterId,
    name,
    adapterOverride = null,
) {
    const configUrl = resolveAdapterControlUrl(
        gatewayId,
        adapterId,
        "config",
        adapterOverride,
    );
    const testUrl = resolveAdapterControlUrl(
        gatewayId,
        adapterId,
        "test",
        adapterOverride,
    );

    const res = await apiFetch(configUrl);
    if (!res.ok) return;
    const payload = await res.json();
    const dbData = payload.data ?? {};
    const envData = payload.envValues ?? {};
    const requiredFields = Array.isArray(payload.requiredFields)
        ? payload.requiredFields
        : [];
    const supportsTest = payload.supportsTest === true;

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
        body: renderGenericAdapterForm(
            descriptors,
            requiredFields,
            supportsTest,
        ),
        maxWidth: "640px",
        actions: [
            {
                id: "save",
                label: i18n.t("ui.app.admin.notif.save_settings"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
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
                const isAuthOff = authDisabledCheckbox.checked;
                authFieldsEl.style.display = isAuthOff ? "none" : "";
                authDisabledCheckbox.addEventListener("change", () => {
                    authFieldsEl.style.display = authDisabledCheckbox.checked
                        ? "none"
                        : "";
                });
            }

            const testBtn = popupFormEl.querySelector(".provider-test-btn");
            const testInput = popupFormEl.querySelector(".provider-test-input");

            if (testBtn && testInput) {
                testBtn.addEventListener("click", async () => {
                    const recipient =
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
                        body: JSON.stringify({ to: recipient, config }),
                    });
                    showToast(
                        testRes.ok
                            ? i18n.t("ui.app.admin.notif.test_sent")
                            : i18n.t("ui.app.admin.notif.test_failed"),
                        { variant: testRes.ok ? "success" : "error" },
                    );
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
        showToast(i18n.t("ui.app.admin.settings_saved"), {
            variant: "success",
        });
    }
}

async function loadAllAdapters(gatewayList) {
    const results = await Promise.all(
        gatewayList
            .filter((gw) => shouldQueryGatewayAdapters(gw))
            .map(async (gw) => {
                const adapters = await loadGatewayAdapters(gw.id);
                return adapters.map((a) => ({ ...a, _gatewayId: gw.id }));
            }),
    );
    return results.flat();
}

async function guardSubPageSwitch() {
    if (!changesBar?.isAnyDirty()) return true;
    const result = await openPopup({
        title: i18n.t("ui.reuse.unsaved_changes"),
        body: `<p>${i18n.t("ui.reuse.leave_page_warning")}</p>`,
        variant: "warning",
        actions: [
            {
                id: "discard",
                label: i18n.t("ui.reuse.discard_and_leave"),
                variant: "confirm",
            },
            {
                id: "stay",
                label: i18n.t("ui.reuse.stay"),
                variant: "cancel",
            },
        ],
    });
    if (result === "discard") {
        securitySection?.discard();
        changesBar.markDirty("security", false);
        return true;
    }
    return false;
}

export async function mount(rootEl, { signal } = {}) {
    root = rootEl;
    i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.administration");

    modules = [];
    integrityRows = [];
    gateways = [];
    allAdapters = [];

    [modules, integrityRows] = await Promise.all([
        loadModules(),
        loadIntegrity(),
    ]);
    gateways = await loadGateways();
    allAdapters = await loadAllAdapters(gateways);

    securitySection = initSecuritySection(root, {
        i18n,
        onDirtyChange: (dirty) => changesBar?.markDirty("security", dirty),
    });

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
                                modules,
                                gateways,
                                allAdapters,
                            ),
                    },
                ],
                onRender: () => {
                    bindModuleToggles();
                    bindModuleConfigureButtons();
                    bindGatewayToggles();
                    bindAdapterToggles();
                    bindAdapterRows();
                    bindSummarySliderClicks();
                    bindDependencyLinks();
                    restoreExpandedState();
                    syncGatewayAndAdapterToggles();
                    bindExpandedStateListeners();
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
              <button id="rerun-integrity" class="btn-confirm btn-animated" type="button">${i18n.t("ui.reuse.refresh")}</button>
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

    elements = [
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
        onBeforeSubPageSwitch: guardSubPageSwitch,
        pageContext: {
            title: i18n.t("ui.reuse.administration"),
            subtitle: i18n.t("ui.app.admin.page_subtitle"),
        },
        toolbar: [
            {
                id: "admin-nav",
                label: i18n.t("ui.reuse.administration"),
                render: () => `
        <h2>${i18n.t("ui.reuse.administration")}</h2>
        <ul>
          ${navItems.join("\n")}
        </ul>
      `,
            },
        ],
        floatingMenu: [
            {
                id: "admin-changes-bar",
                label: i18n.t("ui.reuse.unsaved_changes"),
                render: () => `
        <span>${i18n.t("ui.reuse.unsaved_changes")}</span>
        <button class="btn-cancel btn-animated" type="button" data-action="discard">${i18n.t("ui.reuse.discard")}</button>
        <button class="btn-confirm btn-animated" type="button" data-action="save">${i18n.t("ui.reuse.save")}</button>
      `,
            },
        ],
    });
    await composer.init();

    const floatingSlot = composer.getFloatingSlot("admin-changes-bar");

    changesBar = createUnsavedChangesBar(floatingSlot, {
        onSave: async () => {
            try {
                await securitySection.save();
                changesBar.markDirty("security", false);
                gateways = await loadGateways();
                allAdapters = await loadAllAdapters(gateways);
                composer.refresh(elements);
                showToast(i18n.t("ui.app.admin.security.saved"), {
                    variant: "success",
                });
            } catch {
                showToast(i18n.t("ui.app.admin.security.save_failed"), {
                    variant: "error",
                });
            }
        },
        onDiscard: () => {
            securitySection?.discard();
        },
    });

    window.addEventListener(
        "beforeunload",
        (e) => {
            if (changesBar?.isAnyDirty()) {
                e.preventDefault();
            }
        },
        { signal },
    );
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
