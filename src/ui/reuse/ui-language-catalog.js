import { captureAccountGuard } from "./offline-identity.js";
import { enabledUiLanguages, selectUiLanguage } from "./ui-language-state.js";
import { prepareUiLanguages } from "./i18n.js";
import { uiCtx } from "./ui-ctx.js";
import { apiFetch } from "./api-client.js";
import { createOfflineReadCache } from "./offline-read-cache.js";
import { bindOfflineSnapshotRefresh } from "./offline-snapshot.js";

/** Prepare the host language catalog without visiting Settings or opening its picker. @returns {void} */
export function mountProvider(ctx) {
    const read = createOfflineReadCache({ signal: ctx.signal });
    const actions = ctx.capabilities.get("ui:scopedActions");
    if (!actions) throw new Error("scoped_actions_unavailable");
    const prepare = async () => {
        await prepareUiLanguages(enabledUiLanguages());
    };
    const catalog = actions(ctx, "ui:languageCatalog", {
        prepare,
        select: async ({ locale, bypassGuard = false }) => {
            const assertAccount = captureAccountGuard();
            if (!enabledUiLanguages().includes(locale))
                throw new Error("ui_language_not_enabled");
            const redraw = ctx.capabilities.get("ui:redraw");
            if (!redraw) throw new Error("ui_redraw_unavailable");
            return redraw({
                bypassGuard,
                prepare: async () => {
                    ctx.signal.throwIfAborted();
                    await prepare();
                    ctx.signal.throwIfAborted();
                    assertAccount();
                    return selectUiLanguage(locale);
                },
            });
        },
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
        refresh: async () => {
            await catalog.load();
            await catalog.prepare();
        },
        events: ["cognis:ui-language-settings-changed"],
    });
}

/** Resolve the current lifecycle-owned catalog through its public capability. @returns {Promise<object[]>} Languages. */
export function loadUiLanguageCatalog() {
    const client = uiCtx.capabilities.get("ui:languageCatalog");
    if (!client) throw new Error("language_catalog_unavailable");
    return client.load();
}

export function changeUiLanguage(locale, options = {}) {
    const client = uiCtx.capabilities.get("ui:languageCatalog");
    if (!client) throw new Error("language_catalog_unavailable");
    return client.select({ locale, ...options });
}
