export function createAdministrationReloaders({
    loadModules,
    loadGateways,
    loadAdapters,
    loadHealth,
    setModules,
    setGateways,
    setAdapters,
    setHealth,
    getGateways,
}) {
    async function reload(load, apply, options, ...args) {
        const value = await load(...args, options);
        if (options?.isCurrent?.() === false)
            throw new Error("administration_owner_changed");
        options?.signal?.throwIfAborted();
        apply(value);
    }
    const reloadModules = (options) => reload(loadModules, setModules, options);
    const reloadGateways = (options) =>
        reload(loadGateways, setGateways, options);
    const reloadAdapters = (options) =>
        reload(loadAdapters, setAdapters, options, getGateways());
    const reloadHealthStatus = (options) =>
        reload(loadHealth, setHealth, options);
    const reloadGatewaysAndAdapters = async (options) => {
        await Promise.all([
            reloadGateways(options),
            reloadHealthStatus(options),
        ]);
        await reloadAdapters(options);
    };
    return {
        reloadModules,
        reloadGateways,
        reloadAdapters,
        reloadHealthStatus,
        reloadGatewaysAndAdapters,
    };
}
