function buildAdapterMap(adapters) {
    return new Map(
        adapters.map((adapterRecord) => [
            `${adapterRecord._gatewayId}:${adapterRecord.senderId ?? adapterRecord.id}`,
            adapterRecord,
        ]),
    );
}

/**
 * Validates canonical adapter dependency format: `gatewayId:adapterId`.
 * The separator must exist exactly once and cannot be the first or last
 * character so both gateway and adapter identifiers are present.
 *
 * @param {string} dependencyId
 * @param {number} separatorIndex
 * @returns {boolean}
 */
function isValidAdapterReference(dependencyId, separatorIndex) {
    return (
        separatorIndex > 0 &&
        separatorIndex === dependencyId.lastIndexOf(":") &&
        separatorIndex < dependencyId.length - 1
    );
}

export function parseAdapterDependencyId(dependencyId) {
    const separatorIndex = dependencyId.indexOf(":");
    if (!isValidAdapterReference(dependencyId, separatorIndex)) {
        return null;
    }
    return {
        gatewayId: dependencyId.slice(0, separatorIndex),
        adapterId: dependencyId.slice(separatorIndex + 1),
    };
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

    const parsedDependency = parseAdapterDependencyId(dependencyId);
    if (!parsedDependency) {
        return escapeHtml(dependencyId);
    }
    const { gatewayId, adapterId } = parsedDependency;
    const adapterDependency = adapterByCompositeKey.get(
        `${gatewayId}:${adapterId}`,
    );
    const fallbackAdapterLabel = `${gatewayId}:${adapterId}`;
    const dependencyLabel = adapterDependency
        ? escapeHtml(
              adapterDependency.name ??
                  adapterDependency.id ??
                  fallbackAdapterLabel,
          )
        : escapeHtml(fallbackAdapterLabel);
    const targetId = `adapter-${gatewayId}:${adapterId}`;
    return `<a class="dependency-link" href="#" data-scroll-to="${escapeHtml(targetId)}">${dependencyLabel}</a>`;
}

export function renderDependencyLinks(
    ids,
    gateways,
    adapters,
    i18n,
    escapeHtml,
) {
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
