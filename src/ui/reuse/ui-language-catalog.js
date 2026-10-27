import { uiCtx } from "./ui-ctx.js";
import { apiFetch } from "./api-client.js";
import { createOfflineReadCache } from "./offline-read-cache.js";
import { bindOfflineSnapshotRefresh } from "./offline-snapshot.js";

/** Prepare the host language catalog without visiting Settings or opening its picker. @returns {void} */
export function mountProvider(ctx) {
    const read = createOfflineReadCache({ signal: ctx.signal });
    const actions = ctx.capabilities.get("ui:scopedActions");
    if (!actions) throw new Error("scoped_actions_unavailable");
    const catalog = actions(ctx, "ui:languageCatalog", {
        load: () =>
            read("languages", async () => {
                const response = await apiFetch("/api/v1/system/languages", {
                    signal: ctx.signal,
                });
                if (!response.ok)
                    throw Object.assign(
                        new Error("language_catalog_unavailable"),
                        { status: response.status },
                    );
                return (await response.json()).data;
            }),
    });
    ctx.capabilities.contribute("ui:languageCatalog", catalog);
    bindOfflineSnapshotRefresh(ctx, {
        id: "ui:prepareLanguageCatalog",
        refresh: catalog.load,
    });
}

/** Resolve the current lifecycle-owned catalog through its public capability. @returns {Promise<object[]>} Languages. */
export function loadUiLanguageCatalog() {
    const client = uiCtx.capabilities.get("ui:languageCatalog");
    if (!client) throw new Error("language_catalog_unavailable");
    return client.load();
}
