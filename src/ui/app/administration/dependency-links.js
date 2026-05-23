function buildAdapterMap(adapters) {
    return new Map(
        adapters.map((adapterRecord) => [
            `${adapterRecord._gatewayId}:${adapterRecord.senderId ?? adapterRecord.id}`,
            adapterRecord,
        ]),
    );
}

function renderDependencyLink(
    dependencyId,
    gatewayById,
    adapterByCompositeKey,
    i18n,
    escapeHtml,
) {
    const hasAdapterReference = dependencyId.includes(":");
    if (!hasAdapterReference) {
        const gatewayDependency = gatewayById.get(dependencyId);
        const dependencyLabel = gatewayDependency
            ? escapeHtml(gatewayDependency.name)
            : escapeHtml(dependencyId);
        return `<a class="dependency-link" href="#" data-scroll-to="gateway-${escapeHtml(dependencyId)}">${dependencyLabel}</a>`;
    }

    const [gatewayId, adapterId] = dependencyId.split(":");
    const adapterDependency = adapterByCompositeKey.get(`${gatewayId}:${adapterId}`);
    const fallbackAdapterLabel = `${gatewayId}:${adapterId}`;
    const dependencyLabel = adapterDependency
        ? escapeHtml(adapterDependency.name ?? adapterDependency.id ?? fallbackAdapterLabel)
        : escapeHtml(fallbackAdapterLabel);
    const targetId = `adapter-${gatewayId}:${adapterId}`;
    return `<a class="dependency-link" href="#" data-scroll-to="${escapeHtml(targetId)}">${dependencyLabel}</a>`;
}

export function renderDependencyLinks(ids, gateways, adapters, i18n, escapeHtml) {
    if (!Array.isArray(ids) || ids.length === 0) {
        return i18n.t("ui.app.admin.gateway.no_dependencies");
    }
    const gatewayById = new Map(
        gateways.map((gatewayRecord) => [gatewayRecord.id, gatewayRecord]),
    );
    const adapterByCompositeKey = buildAdapterMap(adapters);
    return ids
        .map((dependencyId) =>
            renderDependencyLink(
                dependencyId,
                gatewayById,
                adapterByCompositeKey,
                i18n,
                escapeHtml,
            ),
        )
        .join(", ");
}
