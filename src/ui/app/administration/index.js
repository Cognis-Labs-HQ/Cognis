import { apiFetch } from "../../reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    extendI18n,
} from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/init.js";
import { openPopup } from "../../reuse/popup.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { resolveModuleConfigScriptUrl } from "./module-config.js";
import { initSecuritySection } from "./security.js";
import { createUnsavedChangesBar } from "../../reuse/unsaved-changes.js";
import { updateNavbarAvatar } from "../../layouts/dashboard-layout.js";
import { showToast } from "../../reuse/toast.js";
import {
    loadAdminSections,
    loadAllAdapters,
    loadGatewayAdapters,
    loadGatewaySection,
    loadGateways,
    loadIntegrity,
    loadModules,
    toggleGateway,
    toggleModule,
} from "./api-loaders.js";
import {
    renderComponentsContent,
    renderIntegrityContent,
} from "./render-components.js";
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
let moduleById = new Map();
let gatewayById = new Map();
let adapterByCompositeKey = new Map();
let composer = null;
let changesBar = null;
let securitySection = null;
let elements = [];
let jitsiSettings = null;

/**
 * Returns the canonical `${gatewayId}:${adapterId}` key used by adapter lookup
 * indexes across administration render, toggle, and follow-up action flows.
 * This format must remain stable because multiple maps and data attributes rely
 * on it matching exactly.
 *
 * @param {string} gatewayId
 * @param {string} adapterId
 * @returns {string}
 */
function adapterCompositeKey(gatewayId, adapterId) {
    return `${gatewayId}:${adapterId}`;
}

function setModules(nextModules) {
    modules = nextModules;
    moduleById = new Map(
        nextModules.map((moduleRecord) => [moduleRecord.id, moduleRecord]),
    );
}

function setGateways(nextGateways) {
    gateways = nextGateways;
    gatewayById = new Map(nextGateways.map((gateway) => [gateway.id, gateway]));
}

function setAllAdapters(nextAdapters) {
    allAdapters = nextAdapters;
    adapterByCompositeKey = new Map(
        nextAdapters.map((adapter) => [
            adapterCompositeKey(
                adapter._gatewayId,
                adapter.senderId ?? adapter.id,
            ),
            adapter,
        ]),
    );
}

async function reloadModules() {
    setModules(await loadModules());
}

async function reloadGateways() {
    setGateways(await loadGateways());
}

async function reloadAdapters() {
    setAllAdapters(await loadAllAdapters(gateways));
}

async function reloadGatewaysAndAdapters() {
    await reloadGateways();
    await reloadAdapters();
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
        adapterByCompositeKey.get(adapterCompositeKey(gatewayId, adapterId)) ??
        null
    );
}

async function loadJitsiSettings() {
    const res = await apiFetch("/api/v1/modules/jitsi-meet/settings");
    if (!res.ok) {
        return {
            domain: "meet.jit.si",
            tenant: "",
            authenticationRequired: false,
            authMode: "none",
        };
    }
    const payload = await res.json();
    return (
        payload.data ?? {
            domain: "meet.jit.si",
            tenant: "",
            authenticationRequired: false,
            authMode: "none",
        }
    );
}

function readJitsiSettingsFromForm() {
    const form = root?.querySelector("#jitsi-settings-form");
    if (!form) return jitsiSettings;
    return {
        domain: form.querySelector('[name="domain"]')?.value ?? "meet.jit.si",
        tenant: form.querySelector('[name="tenant"]')?.value ?? "",
        authenticationRequired:
            form.querySelector('[name="authenticationRequired"]')?.checked ??
            false,
        authMode: form.querySelector('[name="authMode"]')?.value ?? "none",
    };
}

async function saveJitsiSettingsFromForm() {
    const body = readJitsiSettingsFromForm();
    if (!body) return;
    const res = await apiFetch("/api/v1/modules/jitsi-meet/settings", {
        method: "POST",
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("jitsi_settings_save_failed");
}

function renderJitsiSettingsContent(settings) {
    return `
      <form id="jitsi-settings-form" class="security-settings-form">
        <label>
          <span>${i18n.t("ui.app.admin.jitsi.domain")}</span>
          <input name="domain" type="text" value="${escapeHtml(settings.domain ?? "meet.jit.si")}" placeholder="meet.jit.si" />
        </label>
        <label>
          <span>${i18n.t("ui.app.admin.jitsi.tenant")}</span>
          <input name="tenant" type="text" value="${escapeHtml(settings.tenant ?? "")}" />
        </label>
        <label class="security-field-row">
          <input name="authenticationRequired" type="checkbox" ${settings.authenticationRequired ? "checked" : ""} />
          <span>${i18n.t("ui.app.admin.jitsi.auth_required")}</span>
        </label>
        <label>
          <span>${i18n.t("ui.app.admin.jitsi.auth_mode")}</span>
          <select name="authMode">
            <option value="none" ${settings.authMode === "none" ? "selected" : ""}>${i18n.t("ui.app.admin.jitsi.auth_none")}</option>
            <option value="jwt" ${settings.authMode === "jwt" ? "selected" : ""}>${i18n.t("ui.app.admin.jitsi.auth_jwt")}</option>
          </select>
        </label>
      </form>
    `;
}

/**
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
 * Synchronizes module, gateway, and adapter toggle controls after UI refresh so checkbox state reflects the latest loaded runtime status. This
 * function queries the current DOM toggle nodes and should run after
 * page-composer rerender/refresh operations.
 */
function syncRuntimeToggleControls() {
    root.querySelectorAll('input[type="checkbox"][data-module]').forEach(
        (toggle) => {
            if (!(toggle instanceof HTMLInputElement)) return;
            const moduleId = toggle.dataset.module;
            if (!moduleId) return;
            const moduleRecord = moduleById.get(moduleId);
            if (!moduleRecord) return;
            const isEnabled = isModuleEnabled(moduleRecord);
            toggle.checked = isEnabled;
            toggle.defaultChecked = isEnabled;
            toggle.disabled = moduleRecord.class === "core";
        },
    );

    root.querySelectorAll(
        'input[type="checkbox"][data-gateway]:not(.adapter-toggle)',
    ).forEach((toggle) => {
        if (!(toggle instanceof HTMLInputElement)) return;
        const gatewayId = toggle.dataset.gateway;
        if (!gatewayId) return;
        const gateway = gatewayById.get(gatewayId);
        if (!gateway) return;
        const isEnabled = (gateway.status ?? "active") !== "disabled";
        toggle.checked = isEnabled;
        toggle.defaultChecked = isEnabled;
        toggle.disabled = gateway.required === true;
    });

    root.querySelectorAll(
        ".adapter-toggle[data-adapter][data-gateway]",
    ).forEach((toggle) => {
        if (!(toggle instanceof HTMLInputElement)) return;
        const adapterId = toggle.dataset.adapter;
        const gatewayId = toggle.dataset.gateway;
        if (!adapterId || !gatewayId) return;
        const adapter = adapterByCompositeKey.get(
            adapterCompositeKey(gatewayId, adapterId),
        );
        if (!adapter) return;
        const gateway = gatewayById.get(gatewayId);
        const isGatewayDisabled = (gateway?.status ?? "active") === "disabled";
        const isEnabled = !!(adapter.active ?? adapter.enabled);
        toggle.checked = isEnabled;
        toggle.defaultChecked = isEnabled;
        toggle.disabled = isGatewayDisabled || Boolean(adapter.locked);
    });
}

function bindModuleToggles() {
    root.querySelectorAll('input[type="checkbox"][data-module]').forEach(
        (toggle) => {
            toggle.addEventListener("change", async () => {
                const moduleId = toggle.dataset.module;
                const previousState = !toggle.checked;
                const action = toggle.checked ? "enable" : "disable";

                if (action === "enable") {
                    const mod = moduleById.get(moduleId);
                    const disabledDeps = (mod?.requires ?? []).filter(
                        (depId) => {
                            const dep = gatewayById.get(depId);
                            return dep && dep.status === "disabled";
                        },
                    );
                    if (disabledDeps.length > 0) {
                        const depNames = disabledDeps.map((depId) => {
                            const dep = gatewayById.get(depId);
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
                        await reloadGateways();
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
                await reloadModules();
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
                        await reloadModules();
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
            const gateway = gatewayById.get(gatewayId);

            if (action === "enable") {
                const disabledDeps = (gateway?.requires ?? []).filter(
                    (depId) => {
                        const dep = gatewayById.get(depId);
                        return dep && dep.status === "disabled";
                    },
                );
                if (disabledDeps.length > 0) {
                    const depNames = disabledDeps.map((depId) => {
                        const dep = gatewayById.get(depId);
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
                    await reloadGatewaysAndAdapters();
                }
                await toggleGateway(gatewayId, action);

                await reloadGatewaysAndAdapters();

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

            await reloadGatewaysAndAdapters();
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
                const adapter = adapterByCompositeKey.get(
                    adapterCompositeKey(gatewayId, adapterId),
                );
                const requires = adapter?.requires ?? [];
                const disabledDepNames = [];
                const disabledGatewayDeps = [];
                const disabledAdapterDeps = [];

                for (const req of requires) {
                    const parts = req.split(":");
                    if (parts.length === 2) {
                        const [depGwId, depAdapterId] = parts;
                        const depAdapter = adapterByCompositeKey.get(
                            adapterCompositeKey(depGwId, depAdapterId),
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
                        const depGw = gatewayById.get(req);
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
                        const dependentAdapter = adapterByCompositeKey.get(
                            adapterCompositeKey(dep.gatewayId, dep.adapterId),
                        );
                        await toggleAdapter(
                            dep.gatewayId,
                            dep.adapterId,
                            "enable",
                            dependentAdapter ?? null,
                        );
                    }
                    await reloadGatewaysAndAdapters();
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
                    await reloadGateways();
                }
            }

            await reloadAdapters();
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

        const adapter = adapterByCompositeKey.get(
            adapterCompositeKey(gatewayId, adapterId),
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
            await reloadAdapters();
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

    const selectFieldKeys = fieldKeys.filter(
        (name) => descriptors[name]?.schemaType === "select",
    );

    const textFieldKeys = fieldKeys.filter((name) => {
        if (name === "secure") return false;
        if (name === "authDisabled") return false;
        if (descriptors[name]?.schemaType === "select") return false;
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
        if (descriptors[name]?.schemaType === "select") return false;
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

    const selectFieldsHtml = selectFieldKeys
        .map((name) => {
            const descriptor = descriptors[name];
            const val = descriptor?.effectiveValue ?? "";
            const options = Array.isArray(descriptor?.schemaOptions)
                ? descriptor.schemaOptions
                : [];
            const label = descriptor?.schemaLabel ?? fieldNameToLabel(name);
            const optionsHtml = options
                .map(
                    (option) =>
                        `<option value="${escapeHtml(String(option))}"${val === String(option) ? " selected" : ""}>${escapeHtml(String(option))}</option>`,
                )
                .join("");
            return fieldLabel(
                name,
                label,
                `<select name="${escapeHtml(name)}" class="theme-select">${optionsHtml}</select>`,
            );
        })
        .join("");

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
        ${selectFieldsHtml}
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
    const schemaFields = Array.isArray(payload.schema) ? payload.schema : [];

    const fieldNames = new Set([
        ...Object.keys(dbData),
        ...Object.keys(envData),
        ...requiredFields,
        ...schemaFields.map((field) => field.key),
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
        const schemaEntry = schemaFields.find((entry) => entry.key === field);
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
            schemaType: schemaEntry?.type ?? null,
            schemaLabel: schemaEntry?.label ?? null,
            schemaOptions: schemaEntry?.options ?? null,
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
        await reloadAdapters();
        composer.refresh(elements);
        showToast(i18n.t("ui.app.admin.settings_saved"), {
            variant: "success",
        });
    }
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

    setModules([]);
    integrityRows = [];
    setGateways([]);
    setAllAdapters([]);
    jitsiSettings = null;

    const [loadedModules, loadedIntegrityRows] = await Promise.all([
        loadModules(),
        loadIntegrity(),
    ]);
    setModules(loadedModules);
    integrityRows = loadedIntegrityRows;
    await reloadGatewaysAndAdapters();
    jitsiSettings = await loadJitsiSettings();

    securitySection = initSecuritySection(root, {
        i18n,
        onDirtyChange: (dirty) => changesBar?.markDirty("security", dirty),
    });

    const sectionMeta = await loadAdminSections();
    const gatewaySections = (
        await Promise.all(
            sectionMeta.map((section) =>
                loadGatewaySection(section, {
                    i18n,
                    extendI18n,
                    escapeHtml,
                    openPopup,
                    showToast,
                }),
            ),
        )
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
                                {
                                    i18n,
                                    escapeHtml,
                                    resolveModuleConfigScriptUrl,
                                    isModuleEnabled,
                                },
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
                    syncRuntimeToggleControls();
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
            ${renderIntegrityContent(integrityRows, i18n)}
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
        {
            id: "jitsi-meet",
            label: i18n.t("ui.app.admin.jitsi.title"),
            subComposerOptions: {
                allowCustomization: false,
                preferenceKey: "administration-jitsi-meet-layout",
                heading: i18n.t("ui.app.admin.jitsi.title"),
                elements: [
                    {
                        id: "jitsi-meet-content",
                        label: i18n.t("ui.app.admin.jitsi.title"),
                        pinned: true,
                        render: () =>
                            renderJitsiSettingsContent(jitsiSettings ?? {}),
                    },
                ],
                onRender: () => {
                    root?.querySelector(
                        "#jitsi-settings-form",
                    )?.addEventListener("input", () => {
                        jitsiSettings = readJitsiSettingsFromForm();
                        changesBar?.markDirty("jitsi-meet", true);
                    });
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
        `<li><button data-composer-scroll="jitsi-meet">${i18n.t("ui.app.admin.jitsi.title")}</button></li>`,
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
                await saveJitsiSettingsFromForm();
                jitsiSettings = await loadJitsiSettings();
                changesBar.markDirty("security", false);
                await reloadGatewaysAndAdapters();
                changesBar.markDirty("jitsi-meet", false);
                composer.refresh(elements);
                showToast(i18n.t("ui.app.admin.settings_saved"), {
                    variant: "success",
                });
            } catch {
                showToast(i18n.t("ui.app.admin.jitsi.save_failed"), {
                    variant: "error",
                });
            }
        },
        onDiscard: async () => {
            securitySection?.discard();
            jitsiSettings = await loadJitsiSettings();
            changesBar.markDirty("jitsi-meet", false);
            composer.refresh(elements);
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
