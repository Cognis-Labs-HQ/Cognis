import { createAdministrationLifetime } from "./lifetime.js";
import { createToggleBindings } from "./reuse/toggle-bindings.js";
import { createComponentToggleBindings } from "./toggle-controls.js";
import { createSubPageGuard } from "./subpage-guard.js";
import { createAdministrationSave } from "./save.js";
import { uiCtx } from "../../reuse/ui-ctx.js";
import { guides } from "./guides.js";
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
    getGatewayAdapters,
    isModuleEnabled,
    shouldQueryGatewayAdapters,
} from "./toggle-flows.js";
import {
    adapterCompositeKey,
    resolveAdapterControlUrl as resolveAdapterControlEndpoint,
} from "./adapter-controls.js";
import { createAdministrationControlBindings } from "./control-bindings.js";
import { createAdministrationReloaders } from "./reloaders.js";
import { syncRuntimeToggleControls as syncToggleControls } from "./runtime-toggles.js";
let pageLifetime;
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
let gatewaySections = [];
let elements = [];
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

const {
    reloadModules,
    reloadGateways,
    reloadAdapters,
    reloadHealthStatus,
    reloadGatewaysAndAdapters,
} = createAdministrationReloaders({
    loadModules,
    loadGateways,
    loadAdapters: loadAllAdapters,
    loadHealth,
    setModules,
    setGateways,
    setAdapters: setAllAdapters,
    setHealth: (health) => (healthStatus = health),
    getGateways: () => gateways,
});

const resolveAdapterControlUrl = (
    gatewayId,
    adapterId,
    controlName,
    adapterOverride = null,
) =>
    resolveAdapterControlEndpoint(
        adapterByCompositeKey,
        gatewayId,
        adapterId,
        controlName,
        adapterOverride,
    );

/** Synchronizes runtime toggle controls after page-composer refreshes. */
function syncRuntimeToggleControls() {
    syncToggleControls({
        root,
        moduleById,
        gatewayById,
        adapterByCompositeKey,
        adapterCompositeKey,
        isModuleEnabled,
    });
}

function getAdministrationControlBindings() {
    return createAdministrationControlBindings({
        getI18n: () => i18n,
        getModuleById: () => moduleById,
        getGatewayById: () => gatewayById,
        getComposer: () => composer,
        getElements: () => elements,
        controls: {
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
        },
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

        async function handleOpen(event) {
            if (event.target.closest?.("[data-details-toggle]")) return;
            const switchLabel = row.querySelector(".switch--inline");
            if (
                switchLabel &&
                (event.target === switchLabel ||
                    switchLabel.contains(event.target))
            ) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const openedSettings = await openAdapterConfig(
                gatewayId,
                adapterId,
                adapter.name ?? adapterId,
                adapter,
            );
            if (!openedSettings) {
                row.open = !row.open;
            }
        }

        row.addEventListener("click", handleOpen);
        row.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") handleOpen(event);
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
        link.addEventListener("click", (event) => {
            event.preventDefault();
            if (link.closest(".adapter-inline-row")) {
                // Stop propagation so the adapter row's click handler (which opens its config panel) does not fire when clicking a synced-pill link.
                event.stopPropagation();
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
    const signal = uiCtx.capabilities.get("ui:moduleTutorialTargets")?.settingsSignal(adapterId);
    if (signal?.aborted) return false;
    const configUrl = resolveAdapterControlUrl(gatewayId, adapterId, "config", adapterOverride);
    const testUrl = resolveAdapterControlUrl(gatewayId, adapterId, "test", adapterOverride);
    const adapterI18n = await extendI18n(i18n, adapterOverride?.stringsBaseUrl);
    if (signal?.aborted) return false;
    const adapterConfigPopup = createAdapterConfigPopup({
        i18n: adapterI18n,
        escapeHtml,
        apiFetch,
        openPopup,
        showToast,
    });
    return adapterConfigPopup.openAdapterConfig(name, {
        signal,
        gatewayId,
        adapterId,
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

export async function mount(rootEl, { signal } = {}) {
    pageLifetime?.dispose();
    const lifetime = createAdministrationLifetime({
        root: rootEl,
        signal,
        ctx: uiCtx,
    });
    pageLifetime = lifetime;
    signal = lifetime.signal;
    root = rootEl;
    const baseI18n = await createI18n();
    if (!lifetime.isCurrent()) return;
    const pageI18n = await extendI18n(
        baseI18n,
        "/static/gateways/tfa/languages",
    );
    if (!lifetime.isCurrent()) return;
    i18n = pageI18n;
    applyDocumentTitle(i18n, "ui.page.title.administration");

    setModules([]);
    integrityRows = [];
    healthStatus = null;
    setGateways([]);
    setAllAdapters([]);

    const [loadedModules, loadedHealthStatus, loadedIntegrityRows] =
        await Promise.all([loadModules(), loadHealth(), loadIntegrity()]);
    if (!lifetime.isCurrent()) return;
    setModules(loadedModules);
    healthStatus = loadedHealthStatus;
    integrityRows = loadedIntegrityRows;
    try {
        await reloadGatewaysAndAdapters({
            signal,
            isCurrent: lifetime.isCurrent,
        });
    } catch (error) {
        if (!lifetime.isCurrent()) return;
        setGateways([]);
        setAllAdapters([]);
        const log = uiCtx.capabilities.get("ui:log");
        log?.("error", "administration_inventory_load_failed", {
            component: "administration",
            operation: "loadComponents",
            errorName: error?.name,
        });
        showToast(i18n.t("ui.reuse.load_failed"), { variant: "error" });
    }
    if (!lifetime.isCurrent()) return;

    securitySection = initSecuritySection(root, {
        i18n,
        signal,
        onDirtyChange: (dirty) => changesBar?.markDirty("security", dirty),
    });

    const sectionMeta = await loadAdminSections();
    if (!lifetime.isCurrent()) return;
    const loadedGatewaySections = (
        await Promise.all(
            sectionMeta.map((section) =>
                loadGatewaySection(section, {
                    i18n,
                    extendI18n,
                    escapeHtml,
                    openPopup,
                    showToast,
                    onDirtyChange: (sectionId, dirty) =>
                        changesBar?.markDirty(sectionId, dirty),
                }),
            ),
        )
    ).filter(Boolean);
    if (!lifetime.isCurrent()) return;
    gatewaySections = loadedGatewaySections;
    const securityOwnedGatewaySections = gatewaySections.filter(
        (section) => section.parentSectionId === "security",
    );
    const topLevelGatewaySections = gatewaySections.filter(
        (section) => section.parentSectionId !== "security",
    );
    const securityOwnedElements = securityOwnedGatewaySections.flatMap(
        (section) => section.subComposerOptions?.elements ?? [],
    );

    if (!lifetime.isCurrent()) return;
    const toggleBindings = createToggleBindings({
        root: rootEl,
        ctx: uiCtx,
        signal,
        openPopup,
        getI18n: () => i18n,
        showToast,
        isCurrent: lifetime.isCurrent,
        log: (...args) => uiCtx.capabilities.get("ui:log")?.(...args),
    });
    const componentToggles = createComponentToggleBindings({
        root: rootEl,
        getState: () => ({
            i18n,
            gatewayById,
            adapterByCompositeKey,
            allAdapters,
        }),
        bindings: toggleBindings,
        apiFetch,
        showToast,
        escapeHtml,
        toggleGateway,
        loadGatewayAdapters,
        adapterRequiresSetup,
        reloadGateways,
        reloadHealthStatus,
        reloadGatewaysAndAdapters,
        resolveAdapterControlUrl,
        refresh: () => composer.refresh(elements),
        refreshNavbar: () => {
            updateNavbarAvatar().catch((error) => {
                if (!lifetime.isCurrent()) return;
                const log = uiCtx.capabilities.get("ui:log");
                log?.("error", "administration_navbar_refresh_failed", {
                    component: "administration",
                    operation: "refreshNavbar",
                    errorName: error?.name,
                });
                showToast(i18n.t("ui.reuse.load_failed"), { variant: "error" });
            });
        },
    });
    const guardSubPageSwitch = createSubPageGuard({
        actions: toggleBindings.actions,
        getState: () => ({
            changesBar,
            securitySection,
            gatewaySections,
            i18n,
        }),
        lifetime,
        openPopup,
    });
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
                onUnmount: () => toggleBindings.clear(),
                onRender: () => {
                    if (!lifetime.isCurrent()) return;
                    toggleBindings.clear();
                    syncRuntimeToggleControls();
                    const moduleControlBindings = {
                        ...getAdministrationControlBindings(),
                        toggleBindings,
                    };
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
                    componentToggles.bind();
                    bindAdapterRows();
                    bindSummarySliderClicks(root);
                    bindDetailsToggleClicks(root);
                    bindDependencyLinks();
                    restoreExpandedState(root);
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
                    const refreshed = securitySection.refresh().catch(() => {
                        if (signal?.aborted) return;
                        const log = uiCtx.capabilities.get("ui:log");
                        log?.("error", "security_load_failed", {
                            component: "administration",
                            operation: "loadSecurity",
                        });
                        showToast(i18n.t("ui.reuse.load_failed"), {
                            variant: "error",
                        });
                    });
                    securityOwnedGatewaySections.forEach((section) => {
                        section.subComposerOptions?.onRender?.(root);
                    });
                    return refreshed;
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
        tutorials: guides,
        signal,
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
    if (!lifetime.isCurrent()) return;

    const floatingSlot = composer.getFloatingSlot("admin-changes-bar");

    changesBar = createUnsavedChangesBar(floatingSlot, {
        onSave: createAdministrationSave({
            securitySection,
            gatewaySections,
            markDirty: (id, dirty) => changesBar.markDirty(id, dirty),
            refresh: async () => {
                await reloadGatewaysAndAdapters();
                syncRuntimeToggleControls();
            },
            i18n,
            showToast,
            log: (...args) => uiCtx.capabilities.get("ui:log")?.(...args),
        }),
        onDiscard: async () => {
            securitySection?.discard();
            gatewaySections.forEach((section) => section.discard?.());
            composer.refresh(elements);
        },
    });

    window.addEventListener(
        "beforeunload",
        (event) => {
            if (changesBar?.isAnyDirty()) {
                event.preventDefault();
            }
        },
        { signal },
    );
}

await mountWhenDirect(mount);
