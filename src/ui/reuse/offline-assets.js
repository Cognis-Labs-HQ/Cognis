import {
    isOffline,
    offlineEnabled,
    offlineWorkerRequest,
} from "./offline-state.js";
import { offlinePolicy } from "./offline-policy.js";

/**
 * Prepare public, lazy UI resources without blocking provider or page mounting.
 * @param {object} ctx Browser flow and capability context.
 * @returns {void}
 */
export function registerOfflineAssets(ctx) {
    if (ctx.capabilities.get("offline:assets")) return;
    const owners = new WeakMap();
    const flow = "offline:prepareAssets";
    ctx.registerFlow(flow, ["validate", "load"]);
    ctx.extendFlow(
        flow,
        "validate",
        { id: "ui:validateOfflineAssets" },
        ({ input, data }) => {
            input.signal.throwIfAborted();
            data.assets = [...new Set(input.assets)];
            if (
                data.assets.some(
                    (asset) =>
                        typeof asset !== "string" ||
                        !/^\/(?:static|assets)\/[a-zA-Z0-9_./-]+$/.test(
                            asset,
                        ) ||
                        asset.includes(".."),
                )
            )
                throw new TypeError("invalid_offline_asset");
        },
    );
    ctx.extendFlow(
        flow,
        "load",
        { id: "ui:prepareOfflineAssets" },
        async ({ input, data }) => {
            if (isOffline() || !offlineEnabled() || !offlinePolicy.allows())
                return;
            await offlineWorkerRequest("COGNIS_OFFLINE_ACCESS", {
                allowed: true,
            });
            input.signal.throwIfAborted();
            const worker = globalThis.navigator?.serviceWorker?.controller;
            let owner = owners.get(input.signal);
            if (!owner || owner.worker !== worker) {
                owner = { worker, cached: new Map() };
                owners.set(input.signal, owner);
            }
            const cached = owner.cached;
            let index = 0;
            await Promise.all(
                Array.from(
                    { length: Math.min(4, data.assets.length) },
                    async () => {
                        while (index < data.assets.length) {
                            input.signal.throwIfAborted();
                            if (
                                isOffline() ||
                                !offlineEnabled() ||
                                !offlinePolicy.allows()
                            )
                                return;
                            const asset = data.assets[index++];
                            if (!cached.has(asset)) {
                                const pending = (async () => {
                                    const response = await fetch(asset, {
                                        credentials: "omit",
                                        signal: input.signal,
                                    });
                                    if (
                                        !response.ok ||
                                        /private|no-store/i.test(
                                            response.headers.get(
                                                "cache-control",
                                            ) ?? "",
                                        )
                                    )
                                        throw new Error(
                                            "offline_asset_unavailable",
                                        );
                                    await response.arrayBuffer();
                                })();
                                cached.set(asset, pending);
                                pending.catch(() => {
                                    if (cached.get(asset) === pending)
                                        cached.delete(asset);
                                });
                            }
                            await cached.get(asset);
                        }
                    },
                ),
            );
        },
    );
    const prepare = (assets, { signal }) =>
        ctx.runFlow(flow, { assets, signal });
    ctx.capabilities.contribute("offline:assets", {
        prepare,
        register(assets, { signal }) {
            signal.throwIfAborted();
            const warm = () =>
                prepare(assets, { signal }).catch((error) => {
                    if (!signal.aborted && !isOffline())
                        console.info("[offline] optional assets not prepared", {
                            operation: "prepareAssets",
                            errorName: error?.name,
                        });
                });
            for (const type of [
                "cognis:connectivity-changed",
                "cognis:offline-preference-changed",
                "cognis:offline-policy-changed",
            ])
                globalThis.window?.addEventListener(type, warm, { signal });
            globalThis.navigator?.serviceWorker?.addEventListener?.(
                "controllerchange",
                warm,
                { signal },
            );
            void warm();
            return warm;
        },
    });
}
