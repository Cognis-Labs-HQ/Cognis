export function adapterCompositeKey(gatewayId, adapterId) {
    return `${gatewayId}:${adapterId}`;
}

export function resolveAdapterControlUrl(
    adaptersByKey,
    gatewayId,
    adapterId,
    controlName,
    adapterOverride = null,
) {
    const adapter =
        adapterOverride ??
        adaptersByKey.get(adapterCompositeKey(gatewayId, adapterId)) ??
        null;
    const announcedUrl = adapter?.controls?.[controlName];
    if (typeof announcedUrl === "string" && announcedUrl.length > 0)
        return announcedUrl;
    const encodedGatewayId = encodeURIComponent(gatewayId);
    const encodedAdapterId = encodeURIComponent(adapterId);
    return `/api/v1/gateways/${encodedGatewayId}/adapters/${encodedAdapterId}/${controlName}`;
}
