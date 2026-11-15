import { renderAdapterSelection } from "./adapter-selection.js";
import {
    getAdapterDisableContext,
    getGatewayEnableableAdapters,
} from "./toggle-flows.js";
import { adapterCompositeKey } from "./adapter-controls.js";

export function createComponentToggleBindings({
    root,
    getState,
    bindings,
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
    refresh,
    refreshNavbar,
}) {
    function bindGatewayToggles() {
        root.querySelectorAll(
            'input[type="checkbox"][data-gateway]:not([data-adapter])',
        ).forEach((toggle) => {
            bindings.bind(
                toggle,
                `gateway:${toggle.dataset.gateway}`,
                async (operation) => {
                    const { i18n, gatewayById, allAdapters } = getState();
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
                            const result = await operation.confirm({
                                title: i18n.t(
                                    "ui.app.admin.enable_confirm_gateway",
                                ),
                                body: `<p>${i18n.t("ui.app.admin.enable_deps_will_enable")}</p><ul>${depNames.map((name) => `<li><strong>${escapeHtml(name)}</strong></li>`).join("")}</ul>`,
                                label: i18n.t("ui.reuse.enable"),
                                destructive: false,
                                cancelId: "cancel",
                            });
                            if (result !== "confirm") {
                                toggle.checked = previousState;
                                return;
                            }
                            for (const depId of disabledDeps) {
                                await operation.mutate(
                                    toggleGateway,
                                    depId,
                                    "enable",
                                );
                            }
                            await operation.call(reloadGatewaysAndAdapters);
                        }
                        await operation.mutate(
                            toggleGateway,
                            gatewayId,
                            action,
                        );

                        await operation.call(reloadGatewaysAndAdapters);

                        const enableableAdapters = getGatewayEnableableAdapters(
                            getState().allAdapters,
                            gatewayId,
                        );

                        if (enableableAdapters.length > 0) {
                            let popupOverlay = null;
                            const enableAdaptersResult =
                                await operation.confirm({
                                    title: i18n.t(
                                        "ui.app.admin.enable_confirm_gateway",
                                    ),
                                    body: await operation.call(
                                        renderAdapterSelection,
                                        enableableAdapters,
                                        i18n,
                                    ),
                                    label: i18n.t("ui.reuse.enable"),
                                    destructive: false,
                                    cancelId: "skip",
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
                                    const selectedAdapter =
                                        enableableAdapters.find(
                                            (adapter) =>
                                                (adapter.senderId ??
                                                    adapter.id) ===
                                                selectedAdapterId,
                                        );
                                    await operation.mutate(
                                        toggleAdapter,
                                        gatewayId,
                                        selectedAdapterId,
                                        "enable",
                                        selectedAdapter ?? null,
                                    );
                                }
                            }
                        }
                    } else {
                        const liveAdapters =
                            gateway?.hasAdapters === true
                                ? await operation.call(
                                      loadGatewayAdapters,
                                      gatewayId,
                                  )
                                : [];
                        const gatewayDisableWarning =
                            liveAdapters.length > 0
                                ? `<p>${escapeHtml(i18n.t("ui.app.admin.disable_gateway_with_adapters_warning"))}</p>`
                                : "";
                        const result = await operation.confirm({
                            title: i18n.t(
                                "ui.app.admin.disable_confirm_gateway",
                            ),
                            body: `${gatewayDisableWarning}<strong>${escapeHtml(gateway?.name ?? gatewayId)}</strong>`,
                            variant: "danger",
                            label: i18n.t("ui.reuse.disable"),
                            destructive: true,
                            cancelId: "cancel",
                        });
                        if (result !== "confirm") {
                            toggle.checked = previousState;
                            return;
                        }

                        for (const adapter of liveAdapters) {
                            const currentAdapterId =
                                adapter.senderId ?? adapter.id;
                            if (
                                currentAdapterId &&
                                !adapter.locked &&
                                (adapter.active ?? adapter.enabled)
                            ) {
                                await operation.mutate(
                                    toggleAdapter,
                                    gatewayId,
                                    currentAdapterId,
                                    "disable",
                                    adapter,
                                );
                            }
                        }

                        await operation.mutate(
                            toggleGateway,
                            gatewayId,
                            action,
                        );
                    }

                    await operation.call(reloadGatewaysAndAdapters);
                    window.dispatchEvent(
                        new Event("cognis:navbar-plugins-refresh"),
                    );
                    window.dispatchEvent(new Event("cognis:navbar-refresh"));
                    operation.check();
                    refresh();
                    refreshNavbar();
                },
            );
        });
    }

    async function toggleAdapter(
        gatewayId,
        adapterId,
        action,
        adapterOverride = null,
        options = {},
    ) {
        return apiFetch(
            resolveAdapterControlUrl(
                gatewayId,
                adapterId,
                action,
                adapterOverride,
            ),
            { method: "POST", ...options },
        );
    }

    function bindAdapterToggles() {
        root.querySelectorAll(
            ".adapter-toggle[data-adapter][data-gateway]",
        ).forEach((toggle) => {
            if (!(toggle instanceof HTMLInputElement)) return;
            bindings.bind(
                toggle,
                `adapter:${toggle.dataset.gateway}:${toggle.dataset.adapter}`,
                async (operation) => {
                    const {
                        i18n,
                        gatewayById,
                        adapterByCompositeKey,
                        allAdapters,
                    } = getState();
                    const adapterId = toggle.dataset.adapter;
                    const gatewayId = toggle.dataset.gateway;
                    if (!adapterId || !gatewayId) return;
                    const previouslyChecked = !toggle.checked;
                    const action = toggle.checked ? "enable" : "disable";
                    const adapter = adapterByCompositeKey.get(
                        adapterCompositeKey(gatewayId, adapterId),
                    );

                    if (action === "enable") {
                        if (
                            adapter?.controls?.config &&
                            (await operation.call(
                                adapterRequiresSetup,
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
                            const result = await operation.confirm({
                                title: i18n.t(
                                    "ui.app.admin.enable_confirm_adapter",
                                ),
                                body: `<p>${i18n.t("ui.app.admin.enable_deps_will_enable")}</p><ul>${disabledDepNames.map((name) => `<li><strong>${escapeHtml(name)}</strong></li>`).join("")}</ul>`,
                                label: i18n.t("ui.reuse.enable"),
                                destructive: false,
                                cancelId: "cancel",
                            });
                            if (result !== "confirm") {
                                toggle.checked = previouslyChecked;
                                return;
                            }
                            for (const depGwId of disabledGatewayDeps) {
                                await operation.mutate(
                                    toggleGateway,
                                    depGwId,
                                    "enable",
                                );
                            }
                            for (const dep of disabledAdapterDeps) {
                                const dependentAdapter =
                                    adapterByCompositeKey.get(
                                        adapterCompositeKey(
                                            dep.gatewayId,
                                            dep.adapterId,
                                        ),
                                    );
                                await operation.mutate(
                                    toggleAdapter,
                                    dep.gatewayId,
                                    dep.adapterId,
                                    "enable",
                                    dependentAdapter ?? null,
                                );
                            }
                            await operation.call(reloadGatewaysAndAdapters);
                        }

                        await operation.mutate(
                            toggleAdapter,
                            gatewayId,
                            adapterId,
                            "enable",
                            adapter ?? null,
                        );
                        await operation.call(reloadHealthStatus);
                    }

                    if (action === "disable") {
                        const { isLastEnabled, targetAdapter } =
                            getAdapterDisableContext(
                                allAdapters,
                                gatewayId,
                                adapterId,
                            );
                        const adapterName =
                            targetAdapter?.name ??
                            targetAdapter?.senderId ??
                            targetAdapter?.id ??
                            adapterId;
                        const disableWarning = isLastEnabled
                            ? `<p>${escapeHtml(i18n.t("ui.app.admin.disable_last_adapter_warning"))}</p>`
                            : "";
                        const result = await operation.confirm({
                            title: i18n.t(
                                "ui.app.admin.disable_confirm_adapter",
                            ),
                            body: `${disableWarning}<strong>${escapeHtml(adapterName)}</strong>`,
                            variant: "danger",
                            label: i18n.t("ui.reuse.disable"),
                            destructive: true,
                            cancelId: "cancel",
                        });
                        if (result !== "confirm") {
                            toggle.checked = previouslyChecked;
                            return;
                        }

                        await operation.mutate(
                            toggleAdapter,
                            gatewayId,
                            adapterId,
                            "disable",
                            targetAdapter ?? adapter ?? null,
                        );

                        if (isLastEnabled) {
                            await operation.mutate(
                                toggleGateway,
                                gatewayId,
                                "disable",
                            );
                            await operation.call(reloadGateways);
                        }
                    }

                    await operation.call(reloadGatewaysAndAdapters);
                    window.dispatchEvent(
                        new Event("cognis:navbar-plugins-refresh"),
                    );
                    window.dispatchEvent(new Event("cognis:navbar-refresh"));
                    operation.check();
                    refresh();
                },
            );
        });
    }

    return {
        bind() {
            bindGatewayToggles();
            bindAdapterToggles();
        },
    };
}
