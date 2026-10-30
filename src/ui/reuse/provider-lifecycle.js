/**
 * Owns browser provider registration and cleanup across discovery catalogs.
 *
 * Public exports:
 * - createProviderLifecycle(options) — reconciles provider imports, mounts and disposal.
 *
 * Critical catalogs may opt into overlapping host downloads. Other catalogs
 * retain demand-driven downloads; imports and mounts always retain catalog order.
 *
 * @example
 * const lifecycle = createProviderLifecycle({ uiCtx });
 * await lifecycle.reconcile(providers, 'capabilities', { preload: true });
 * await lifecycle.reconcile([], 'capabilities');
 *
 * @param {object} options UI context and optional module importer.
 * @returns {{ reconcile: (providers: object[], catalog?: string, options?: {preload?: boolean}) => Promise<void> }}
 */
function preloadHostProviders(urls) {
    if (typeof document === "undefined") return () => {};
    const links = urls
        .filter((url) => url.startsWith("/assets/") && !/[?#]/.test(url))
        .map((url) => {
            const link = document.createElement("link");
            link.dataset.resourceErrorHandled = "true";
            link.rel = "modulepreload";
            link.href = url;
            document.head.appendChild(link);
            return link;
        });
    return () => links.forEach((link) => link.remove());
}

export function createProviderLifecycle({
    uiCtx,
    importProvider = (url) => import(url),
}) {
    const active = new Map();
    const catalogs = new Map();
    const failures = new WeakMap();
    let pending = Promise.resolve();

    async function reconcile(providers, preload) {
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
        const releasePreloads = preloadHostProviders(
            preload
                ? [...desired.keys()].filter((url) => !active.has(url))
                : [],
        );
        try {
            for (const [url] of desired) {
                if (active.has(url)) continue;
                const details = {
                    providerScript: url.startsWith("/")
                        ? url.split(/[?#]/)[0]
                        : "external",
                    providerPhase: "import",
                };
                let provider;
                try {
                    provider = await importProvider(url);
                } catch (error) {
                    if (error && typeof error === "object")
                        failures.set(error, details);
                    throw error;
                }
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
                    details.providerPhase = "mount";
                    const dispose = await provider.mountProvider?.(scopedCtx);
                    if (typeof dispose === "function") removers.push(dispose);
                    active.set(url, release);
                } catch (error) {
                    if (error && typeof error === "object")
                        failures.set(error, details);
                    await release();
                    throw error;
                }
            }
        } finally {
            releasePreloads();
        }
    }

    return {
        reconcile(providers, catalog = "default", { preload = false } = {}) {
            const next = pending.then(() => {
                catalogs.set(catalog, providers);
                return reconcile([...catalogs.values()].flat(), preload);
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
                        ...failures.get(error),
                    },
                );
            });
            return next;
        },
    };
}
