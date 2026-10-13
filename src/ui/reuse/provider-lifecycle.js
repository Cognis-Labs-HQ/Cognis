export function createProviderLifecycle({
    uiCtx,
    importProvider = (url) => import(url),
}) {
    const active = new Map();
    const catalogs = new Map();
    let pending = Promise.resolve();

    async function reconcile(providers) {
        const desired = new Map(
            providers
                .filter((provider) => provider?.scriptUrl)
                .map((provider) => [provider.scriptUrl, provider]),
        );
        for (const [url, release] of active) {
            if (desired.has(url)) continue;
            await release();
            active.delete(url);
        }
        for (const [url] of desired) {
            if (active.has(url)) continue;
            const provider = await importProvider(url);
            const removers = [];
            const controller = new AbortController();
            const release = async () => {
                controller.abort();
                for (const remove of removers.toReversed()) await remove();
            };
            const scopedCtx = {
                ...uiCtx,
                signal: controller.signal,
                capabilities: {
                    get: uiCtx.capabilities.get,
                    contribute(id, value) {
                        if (!uiCtx.capabilities.contribute(id, value))
                            throw new Error(
                                `UI provider capability conflict: ${id}`,
                            );
                        removers.push(() =>
                            uiCtx.capabilities.remove(id, value),
                        );
                        return true;
                    },
                },
                registerFlow(id, stages) {
                    removers.push(uiCtx.registerFlow(id, stages));
                },
                extendFlow(flowId, stageId, hook, handler) {
                    const registered = uiCtx.extendFlow(
                        flowId,
                        stageId,
                        hook,
                        handler,
                    );
                    if (registered)
                        removers.push(() =>
                            uiCtx.removeFlowHook(flowId, stageId, hook.id),
                        );
                    return registered;
                },
            };
            try {
                const dispose = await provider.mountProvider?.(scopedCtx);
                if (typeof dispose === "function") removers.push(dispose);
                active.set(url, release);
            } catch (error) {
                await release();
                throw error;
            }
        }
    }

    return {
        reconcile(providers, catalog = "default") {
            const next = pending.then(() => {
                catalogs.set(catalog, providers);
                return reconcile([...catalogs.values()].flat());
            });
            pending = next.catch((error) => {
                uiCtx.capabilities.get("ui:log")?.(
                    "error",
                    "UI provider lifecycle failed.",
                    {
                        component: "ui",
                        operation: "reconcile_providers",
                        errorName:
                            error instanceof Error
                                ? error.name
                                : "UnknownError",
                    },
                );
            });
            return next;
        },
    };
}
