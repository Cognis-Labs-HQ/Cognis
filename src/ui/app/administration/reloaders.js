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
    const reloadModules = async () => setModules(await loadModules());
    const reloadGateways = async () => setGateways(await loadGateways());
    const reloadAdapters = async () =>
        setAdapters(await loadAdapters(getGateways()));
    const reloadHealthStatus = async () => setHealth(await loadHealth());
    const reloadGatewaysAndAdapters = async () => {
        await Promise.all([reloadGateways(), reloadHealthStatus()]);
        await reloadAdapters();
    };
    return {
        reloadModules,
        reloadGateways,
        reloadAdapters,
        reloadHealthStatus,
        reloadGatewaysAndAdapters,
    };
}
