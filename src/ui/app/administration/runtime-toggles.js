export function syncRuntimeToggleControls({
    root,
    moduleById,
    gatewayById,
    adapterByCompositeKey,
    adapterCompositeKey,
    isModuleEnabled,
}) {
    root.querySelectorAll('input[type="checkbox"][data-module]').forEach(
        (toggle) => {
            if (!(toggle instanceof HTMLInputElement)) return;
            const moduleRecord = moduleById.get(toggle.dataset.module);
            if (!moduleRecord) return;
            const enabled = isModuleEnabled(moduleRecord);
            toggle.checked = enabled;
            toggle.defaultChecked = enabled;
            toggle.disabled = moduleRecord.class === "core";
        },
    );
    root.querySelectorAll(
        'input[type="checkbox"][data-gateway]:not(.adapter-toggle)',
    ).forEach((toggle) => {
        if (!(toggle instanceof HTMLInputElement)) return;
        const gateway = gatewayById.get(toggle.dataset.gateway);
        if (!gateway) return;
        const enabled = (gateway.status ?? "active") !== "disabled";
        toggle.checked = enabled;
        toggle.defaultChecked = enabled;
        toggle.disabled = gateway.required === true;
    });
    root.querySelectorAll(
        ".adapter-toggle[data-adapter][data-gateway]",
    ).forEach((toggle) => {
        if (!(toggle instanceof HTMLInputElement)) return;
        const { adapter: adapterId, gateway: gatewayId } = toggle.dataset;
        if (!adapterId || !gatewayId) return;
        const adapter = adapterByCompositeKey.get(
            adapterCompositeKey(gatewayId, adapterId),
        );
        if (!adapter) return;
        const gateway = gatewayById.get(gatewayId);
        const enabled = Boolean(adapter.active ?? adapter.enabled);
        toggle.checked = enabled;
        toggle.defaultChecked = enabled;
        toggle.disabled =
            (gateway?.status ?? "active") === "disabled" ||
            Boolean(adapter.locked);
    });
}
