import { uiCtx } from "./ui-ctx.js";
import { isOffline, offlineEnabled } from "./offline-state.js";
import { loadWithSpaImportGuard } from "./page-entry.js";
import { preparePageStylesheets } from "./page-styles.js";

const flow = "offline:prepareRouteAssets";
if (!uiCtx.flowExists(flow)) {
    const prepared = new WeakSet();
    const preparing = new WeakSet();
    const descriptors = new Map();
    const signature = (route) =>
        JSON.stringify([
            route.ownerUuid,
            route.scriptUrl,
            route.stylesheets ?? [],
            route.capabilityScripts ?? [],
        ]);
    const ready = (route) =>
        Boolean(
            route &&
            (prepared.has(route) ||
                (route.scriptUrl &&
                    descriptors.get(route.id) === signature(route))),
        );
    const record = (route) => {
        if (!route) return;
        prepared.add(route);
        if (route.id && route.scriptUrl)
            descriptors.set(route.id, signature(route));
    };
    uiCtx.capabilities.contribute("offline:areRouteAssetsReady", ready);
    uiCtx.capabilities.contribute("offline:recordRouteAssets", record);
    uiCtx.registerFlow(flow, ["select", "load"]);
    uiCtx.extendFlow(
        flow,
        "select",
        { id: "ui:selectOfflineAssets" },
        ({ input, data }) => {
            data.routes = input.routes.filter(
                (route) => !ready(route) && !preparing.has(route),
            );
            for (const route of data.routes) preparing.add(route);
        },
    );
    uiCtx.extendFlow(
        flow,
        "load",
        { id: "ui:loadOfflineAssets" },
        async ({ data }) => {
            let index = 0;
            await Promise.all(
                Array.from(
                    { length: Math.min(2, data.routes.length) },
                    async () => {
                        while (index < data.routes.length) {
                            const route = data.routes[index++];
                            try {
                                if (isOffline() || !offlineEnabled()) continue;
                                const styles = await preparePageStylesheets(
                                    route.stylesheets ?? [],
                                );
                                try {
                                    if (isOffline() || !offlineEnabled())
                                        continue;
                                    await loadWithSpaImportGuard(() =>
                                        route.load(),
                                    );
                                    record(route);
                                } finally {
                                    styles?.cancel();
                                }
                            } catch (error) {
                                console.info(
                                    "[offline] route assets not prepared",
                                    {
                                        operation: "prepareRouteAssets",
                                        routeId: route.id,
                                        errorName: error?.name,
                                    },
                                );
                            } finally {
                                preparing.delete(route);
                            }
                        }
                    },
                ),
            );
            window.dispatchEvent(
                new CustomEvent("cognis:offline-routes-prepared"),
            );
        },
    );
}

/** Prepare public code and styles without mounting pages or fetching private page data. */
export function prepareOfflineRouteAssets(routes) {
    if (isOffline() || !offlineEnabled()) return;
    void uiCtx.runFlow(flow, { routes }).catch((error) =>
        console.error("[offline] asset preparation failed", {
            operation: "prepareRouteAssets",
            errorName: error?.name,
        }),
    );
}
