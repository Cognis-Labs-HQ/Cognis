import assert from "node:assert/strict";
import test from "node:test";
import { uiCtx } from "../ui-ctx.js";
import {
    ensureUiProvidersLoaded,
    invalidateUiProviders,
    ensureNavbarPluginsLoaded,
    invalidateNavbarPlugins,
} from "../ui-provider-loader.js";

test("a lifecycle catalog refresh disposes and reactivates cached provider scripts", async (context) => {
    const originalFetch = globalThis.fetch;
    const originalStorage = globalThis.localStorage;
    context.after(() => {
        globalThis.fetch = originalFetch;
        globalThis.localStorage = originalStorage;
    });
    let enabled = true;
    const source = `export function mountProvider(ctx) { ctx.capabilities.contribute('test:catalogAction', () => 'ready'); }`;
    const scriptUrl = `data:text/javascript,${encodeURIComponent(source)}`;
    globalThis.localStorage = { getItem: () => "test-token" };
    globalThis.fetch = async (url) => {
        assert.ok(
            [
                "/api/v1/ui/capability-providers",
                "/api/v1/ui/navbar-plugins",
            ].includes(String(url)),
        );
        if (String(url).endsWith("navbar-plugins"))
            return Response.json({ data: [] });
        return Response.json({ data: enabled ? [{ scriptUrl }] : [] });
    };
    invalidateUiProviders();
    await ensureUiProvidersLoaded();
    assert.equal(uiCtx.capabilities.get("test:catalogAction")(), "ready");
    enabled = false;
    invalidateUiProviders();
    invalidateNavbarPlugins();
    await ensureNavbarPluginsLoaded();
    assert.equal(uiCtx.capabilities.get("test:catalogAction"), undefined);
    enabled = true;
    await ensureUiProvidersLoaded({ force: true });
    assert.equal(uiCtx.capabilities.get("test:catalogAction")(), "ready");
    enabled = false;
    await ensureUiProvidersLoaded({ force: true });
});
