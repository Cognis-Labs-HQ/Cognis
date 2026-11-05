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
    onFailure,
}) {
    const active = new Map();
    const catalogs = new Map();
    const failures = new WeakMap();
    let pending = Promise.resolve();
    const ownership = new Map();
    const quarantined = new Map();
    const ownerKey = (entry) =>
        entry?.component
            ? JSON.stringify([
                  entry.component.type,
                  entry.component.gatewayId,
                  entry.component.id,
                  entry.component.version,
              ])
            : null;

    async function reconcile(providers, preload, retryFailed) {
        const desired = new Map(
            providers
                .filter((provider) => provider?.scriptUrl)
                .map((provider) => [provider.scriptUrl, provider]),
        );
        const signatures = new Map();
        for (const [url, entry] of desired) {
            const key = ownerKey(entry);
            if (key) signatures.set(key, (signatures.get(key) ?? "") + url);
        }
        for (const [key, signature] of quarantined)
            if (retryFailed || signatures.get(key) !== signature)
                quarantined.delete(key);
        const isolate = async (error, details, entry) => {
            const key = ownerKey(entry);
            if (!key) throw error;
            for (const [url, release] of active) {
                if (ownership.get(url) !== key) continue;
                try {
                    await release();
                } catch (failure) {
                    uiCtx.capabilities.get("ui:log")?.(
                        "error",
                        "Component cleanup failed.",
                        {
                            component: "ui",
                            operation: "disposeProvider",
                            errorName: failure?.name,
                        },
                    );
                }
                active.delete(url);
                ownership.delete(url);
            }
            if (entry.component.required) throw error;
            quarantined.set(key, signatures.get(key));
            uiCtx.capabilities.get("ui:log")?.(
                "error",
                "Component provider isolated.",
                {
                    component: "ui",
                    operation: "isolateProvider",
                    componentId: entry.component.id,
                    ...details,
                },
            );
            if (onFailure) {
                try {
                    await onFailure({
                        ...details,
                        scriptUrl: entry.scriptUrl,
                        component: entry.component,
                    });
                } catch (failure) {
                    uiCtx.capabilities.get("ui:log")?.(
                        "error",
                        "Component failure reporting failed.",
                        {
                            component: "ui",
                            operation: "reportProviderFailure",
                            errorName: failure?.name,
                        },
                    );
                }
            }
        };
        for (const [url, release] of active) {
            if (desired.has(url)) continue;
            await release();
            active.delete(url);
            ownership.delete(url);
        }
        const releasePreloads = preloadHostProviders(
            preload
                ? [...desired.keys()].filter((url) => !active.has(url))
                : [],
        );
        try {
            for (const [url, entry] of desired) {
                if (active.has(url) || quarantined.has(ownerKey(entry)))
                    continue;
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
                    await isolate(error, details, entry);
                    continue;
                }
                const removers = [];
                const controller = new AbortController();
                const release = async () => {
                    controller.abort();
                    const released = await Promise.allSettled(
                        removers
                            .toReversed()
                            .map((remove) => Promise.resolve().then(remove)),
                    );
                    const rejected = released.filter(
                        (result) => result.status === "rejected",
                    );
                    if (rejected.length)
                        throw new AggregateError(
                            rejected.map((result) => result.reason),
                            "provider_cleanup_failed",
                        );
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
                    ownership.set(url, ownerKey(entry));
                } catch (error) {
                    if (error && typeof error === "object")
                        failures.set(error, details);
                    try {
                        await release();
                    } catch (failure) {
                        uiCtx.capabilities.get("ui:log")?.(
                            "error",
                            "Failed provider cleanup failed.",
                            {
                                component: "ui",
                                operation: "rollbackProvider",
                                errorName: failure?.name,
                            },
                        );
                    }
                    await isolate(error, details, entry);
                }
            }
        } finally {
            releasePreloads();
        }
    }

    return {
        reconcile(
            providers,
            catalog = "default",
            { preload = false, retryFailed = false } = {},
        ) {
            const next = pending.then(() => {
                catalogs.set(catalog, providers);
                return reconcile(
                    [...catalogs.values()].flat(),
                    preload,
                    retryFailed,
                );
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
