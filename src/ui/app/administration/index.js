import { apiFetch } from "../../reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    extendI18n,
} from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { openPopup } from "../../reuse/popup.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { resolveModuleConfigScriptUrl } from "./module-config.js";
import {
    bindGithubModuleImportButton as bindAdministrationGithubModuleImportButton,
    bindModuleConfigureButtons as bindAdministrationModuleConfigureButtons,
    bindModuleToggles as bindAdministrationModuleToggles,
} from "./bind-module-controls.js";
import { initSecuritySection } from "./security.js";
import {
    bindExpandedStateListeners,
    bindDetailsToggleClicks,
    bindSummarySliderClicks,
    restoreExpandedState,
} from "./ui-state-bindings.js";
import { createUnsavedChangesBar } from "../../reuse/unsaved-changes.js";
import { updateNavbarAvatar } from "../../layouts/dashboard-layout.js";
import { showToast } from "../../reuse/toast.js";
import { createAdapterConfigPopup } from "./adapter-config-popup.js";
import {
    loadAdminSections,
    loadAllAdapters,
    loadGatewayAdapters,
    loadGatewaySection,
    loadGateways,
    loadIntegrity,
    loadHealth,
    loadModules,
    adapterRequiresSetup,
    toggleGateway,
    toggleModule,
    importGithubModule,
} from "./api-loaders.js";
import {
    renderComponentsContent,
    renderStatusContent,
    buildScrollTargetId,
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
let healthStatus = null;
let gateways = [];
let allAdapters = [];
let moduleById = new Map();
let gatewayById = new Map();
let adapterByCompositeKey = new Map();
let composer = null;
let changesBar = null;
let securitySection = null;
let elements = [];
function adapterCompositeKey(gatewayId, adapterId) {
    return `${gatewayId}:${adapterId}`;
}
function adapterHasConfig(adapter) {
    return Boolean(
        (typeof adapter?.controls?.config === "string" &&
            adapter.controls.config.length > 0) ||
        (Array.isArray(adapter?.schema) && adapter.schema.length > 0),
    );
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
    await Promise.all([reloadGateways(), reloadHealthStatus()]);
    await reloadAdapters();
}

const reloadHealthStatus = async () => (healthStatus = await loadHealth());

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

/** Synchronizes runtime toggle controls after page-composer refreshes. */
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

function getAdministrationState() {
    return { i18n, moduleById, gatewayById };
}

function getAdministrationControlBindings() {
    return {
        getState: getAdministrationState,
        apiFetch,
        openPopup,
        showToast,
        escapeHtml,
        toggleModule,
        toggleGateway,
        importGithubModule,
        reloadModules,
        reloadGateways,
        reloadHealthStatus,
        getComposer: () => composer,
        getElements: () => elements,
    };
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

async function toggleAdapter(
    gatewayId,
    adapterId,
    action,
    adapterOverride = null,
) {
    return apiFetch(
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
                if (
                    adapter?.controls?.config &&
                    (await adapterRequiresSetup(
                        resolveAdapterControlUrl(
                            gatewayId,
                            adapterId,
                            "config",
                            adapter,
                        ),
                    ))
                ) {
                    toggle.checked = previouslyChecked;
                    showToast(i18n.t("ui.app.admin.setup_required"), {
                        variant: "warning",
                    });
                    return;
                }
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
                await reloadHealthStatus();
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

            await reloadGatewaysAndAdapters();
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

        if (!adapterHasConfig(adapter)) return;

        async function handleOpen(e) {
            if (e.target.closest?.("[data-details-toggle]")) return;
            const switchLabel = row.querySelector(".switch--inline");
            if (
                switchLabel &&
                (e.target === switchLabel || switchLabel.contains(e.target))
            ) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            await openAdapterConfig(
                gatewayId,
                adapterId,
                adapter.name ?? adapterId,
                adapter,
            );
        }

        row.addEventListener("click", handleOpen);
        row.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") handleOpen(e);
        });
    });
}

function bindStatusRerun() {
    const rerunButton = root.querySelector("#rerun-status");
    if (!rerunButton) return;
    rerunButton.addEventListener("click", async () => {
        /** @type {HTMLButtonElement} */
        const btn = rerunButton;
        btn.disabled = true;
        btn.textContent = i18n.t("ui.app.admin.checking");
        const [nextHealthStatus, nextIntegrityRows] = await Promise.all([
            loadHealth(),
            loadIntegrity(),
        ]);
        healthStatus = nextHealthStatus;
        integrityRows = nextIntegrityRows;
        composer.refresh(elements);
    });
}

function bindDependencyLinks() {
    root.querySelectorAll("a[data-scroll-to]").forEach((link) => {
        if (!(link instanceof HTMLAnchorElement)) return;
        const targetId = link.dataset.scrollTo;
        if (!targetId) return;
        link.addEventListener("click", (e) => {
            e.preventDefault();
            if (link.closest(".adapter-inline-row")) {
                // Stop propagation so the adapter row's click handler (which opens its config panel) does not fire when clicking a synced-pill link.
                e.stopPropagation();
            }
            let targetElement = null;
            if (targetId.startsWith("gateway-")) {
                targetElement = root.querySelector(
                    `[data-gateway="${CSS.escape(targetId.replace(/^gateway-/, ""))}"]`,
                );
            } else if (targetId.startsWith("module-")) {
                targetElement = root.querySelector(
                    `[data-module="${CSS.escape(targetId.replace(/^module-/, ""))}"]`,
                );
            } else if (targetId.startsWith("adapter-")) {
                const adapterRows = root.querySelectorAll(
                    ".adapter-inline-row[data-gateway-id][data-adapter-id]",
                );
                for (const row of adapterRows) {
                    if (!(row instanceof HTMLElement)) continue;
                    const rowGatewayId = row.dataset.gatewayId;
                    const rowAdapterId = row.dataset.adapterId;
                    if (
                        rowGatewayId &&
                        rowAdapterId &&
                        buildScrollTargetId(rowGatewayId, rowAdapterId) ===
                            targetId
                    ) {
                        targetElement = row;
                        break;
                    }
                }
            }
            if (!(targetElement instanceof HTMLElement)) return;
            const gatewayContainer = targetElement.closest("[data-gateway]");
            if (gatewayContainer instanceof HTMLElement) {
                gatewayContainer.setAttribute("open", "");
            }
            requestAnimationFrame(() => {
                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "nearest",
                });
            });
        });
    });
}

// prettier-ignore
async function openAdapterConfig(gatewayId, adapterId, name, adapterOverride = null) {
    const configUrl = resolveAdapterControlUrl(gatewayId, adapterId, "config", adapterOverride);
    const testUrl = resolveAdapterControlUrl(gatewayId, adapterId, "test", adapterOverride);
    const adapterI18n = await extendI18n(i18n, adapterOverride?.stringsBaseUrl);
    const adapterConfigPopup = createAdapterConfigPopup({
        i18n: adapterI18n,
        escapeHtml,
        apiFetch,
        openPopup,
        showToast,
    });
    await adapterConfigPopup.openAdapterConfig(name, {
        configUrl,
        testUrl,
        enableUrl: resolveAdapterControlUrl(gatewayId, adapterId, "enable", adapterOverride),
        disableUrl: resolveAdapterControlUrl(gatewayId, adapterId, "disable", adapterOverride),
        adapterEnabled: Boolean(adapterOverride?.active ?? adapterOverride?.enabled),
        adapterLocked: Boolean(adapterOverride?.locked),
        onSaved: async () => {
            await reloadAdapters();
            composer.refresh(elements);
        },
    });
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
    i18n = await extendI18n(i18n, "/static/gateways/tfa/languages");
    applyDocumentTitle(i18n, "ui.page.title.administration");

    setModules([]);
    integrityRows = [];
    healthStatus = null;
    setGateways([]);
    setAllAdapters([]);

    const [loadedModules, loadedHealthStatus, loadedIntegrityRows] =
        await Promise.all([loadModules(), loadHealth(), loadIntegrity()]);
    setModules(loadedModules);
    healthStatus = loadedHealthStatus;
    integrityRows = loadedIntegrityRows;
    await reloadGatewaysAndAdapters();

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
    const securityOwnedGatewaySections = gatewaySections.filter(
        (section) => section.parentSectionId === "security",
    );
    const topLevelGatewaySections = gatewaySections.filter(
        (section) => section.parentSectionId !== "security",
    );
    const securityOwnedElements = securityOwnedGatewaySections.flatMap(
        (section) => section.subComposerOptions?.elements ?? [],
    );

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
                                    healthStatus,
                                },
                            ),
                    },
                ],
                onRender: () => {
                    const moduleControlBindings =
                        getAdministrationControlBindings();
                    bindAdministrationGithubModuleImportButton(
                        root,
                        moduleControlBindings,
                    );
                    bindAdministrationModuleToggles(
                        root,
                        moduleControlBindings,
                    );
                    bindAdministrationModuleConfigureButtons(
                        root,
                        moduleControlBindings,
                    );
                    bindGatewayToggles();
                    bindAdapterToggles();
                    bindAdapterRows();
                    bindSummarySliderClicks(root);
                    bindDetailsToggleClicks(root);
                    bindDependencyLinks();
                    restoreExpandedState(root);
                    syncRuntimeToggleControls();
                    bindExpandedStateListeners(root);
                },
            },
        },
        {
            id: "status",
            label: i18n.t("ui.reuse.status"),
            subComposerOptions: {
                allowCustomization: false,
                preferenceKey: "administration-status-layout",
                heading: i18n.t("ui.reuse.status"),
                elements: [
                    {
                        id: "status-content",
                        label: i18n.t("ui.reuse.status"),
                        pinned: true,
                        render: () => `
            <div class="integrity-header">
              <button id="rerun-status" class="btn-confirm btn-animated" type="button">${i18n.t("ui.reuse.refresh")}</button>
            </div>
            ${renderStatusContent(healthStatus, integrityRows, i18n)}
          `,
                    },
                ],
                onRender: () => {
                    bindStatusRerun();
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
                    ...securityOwnedElements,
                ],
                onRender: () => {
                    securitySection.refresh();
                    securityOwnedGatewaySections.forEach((section) => {
                        section.subComposerOptions?.onRender?.(root);
                    });
                },
            },
        },
    ];

    elements = [
        ...baseElements,
        ...topLevelGatewaySections.map((sec) => ({
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
        `<li><button data-composer-scroll="status">${i18n.t("ui.reuse.status")}</button></li>`,
        `<li><button data-composer-scroll="security">${i18n.t("ui.app.admin.security.title")}</button></li>`,
        ...topLevelGatewaySections.map(
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
                await reloadGatewaysAndAdapters();
                syncRuntimeToggleControls();
                showToast(i18n.t("ui.app.admin.settings_saved"), {
                    variant: "success",
                });
            } catch {
                showToast(i18n.t("ui.reuse.save_failed"), {
                    variant: "error",
                });
            }
        },
        onDiscard: async () => {
            securitySection?.discard();
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

await mountWhenDirect(mount);
