export function isAdapterActive(adapter) {
    return Boolean(adapter?.active ?? adapter?.enabled);
}

export function isGatewayEnabled(gateway) {
    return (gateway?.status ?? "active") !== "disabled";
}

export function shouldQueryGatewayAdapters(gateway) {
    return gateway?.hasAdapters === true && isGatewayEnabled(gateway);
}

export function getGatewayAdapters(allAdapters, gatewayId) {
    return allAdapters.filter((adapter) => adapter._gatewayId === gatewayId);
}

export function getGatewayEnableableAdapters(allAdapters, gatewayId) {
    return getGatewayAdapters(allAdapters, gatewayId).filter(
        (adapter) => !isAdapterActive(adapter),
    );
}

export function getAdapterDisableContext(allAdapters, gatewayId, adapterId) {
    const gatewayAdapters = getGatewayAdapters(allAdapters, gatewayId);
    const targetAdapter =
        gatewayAdapters.find(
            (adapter) => (adapter.senderId ?? adapter.id) === adapterId,
        ) ?? null;
    const otherActiveAdapters = gatewayAdapters.filter((adapter) => {
        const currentAdapterId = adapter.senderId ?? adapter.id;
        return isAdapterActive(adapter) && currentAdapterId !== adapterId;
    });

    return {
        targetAdapter,
        otherActiveAdapters,
        isLastEnabled: otherActiveAdapters.length === 0,
    };
}
