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

test("separate loader module instances share provider ownership", async (context) => {
    const originalFetch = globalThis.fetch;
    const originalStorage = globalThis.localStorage;
    context.after(() => {
        globalThis.fetch = originalFetch;
        globalThis.localStorage = originalStorage;
    });
    const source = `export function mountProvider(ctx) { ctx.registerFlow('test:duplicateLoader', ['execute']); ctx.capabilities.contribute('test:duplicateLoaderAction', () => true); }`;
    const scriptUrl = `data:text/javascript,${encodeURIComponent(source)}`;
    let enabled = true;
    globalThis.localStorage = { getItem: () => "test-token" };
    globalThis.fetch = async () =>
        Response.json({ data: enabled ? [{ scriptUrl }] : [] });
    const otherLoader =
        await import("../ui-provider-loader.js?separate-bundle");
    await Promise.all([
        ensureUiProvidersLoaded({ force: true }),
        otherLoader.ensureUiProvidersLoaded({ force: true }),
    ]);
    assert.equal(uiCtx.flowExists("test:duplicateLoader"), true);
    enabled = false;
    await otherLoader.ensureUiProvidersLoaded({ force: true });
    assert.equal(uiCtx.flowExists("test:duplicateLoader"), false);
    assert.equal(
        uiCtx.capabilities.get("test:duplicateLoaderAction"),
        undefined,
    );
});

test("only the mount-critical capability catalog opts into host preloading", async (context) => {
    const lifecycle = uiCtx.capabilities.get("ui:providerLifecycle");
    const originalReconcile = lifecycle.reconcile;
    const originalFetch = globalThis.fetch;
    const originalStorage = globalThis.localStorage;
    const catalogs = [];
    context.after(() => {
        lifecycle.reconcile = originalReconcile;
        globalThis.fetch = originalFetch;
        globalThis.localStorage = originalStorage;
        invalidateUiProviders();
        invalidateNavbarPlugins();
    });
    lifecycle.reconcile = (providers, catalog, options) => {
        catalogs.push([catalog, options.preload]);
        return originalReconcile(providers, catalog, options);
    };
    globalThis.localStorage = { getItem: () => "test-token" };
    globalThis.fetch = async () => Response.json({ data: [] });
    invalidateUiProviders();
    invalidateNavbarPlugins();
    await ensureNavbarPluginsLoaded();
    assert.deepEqual(catalogs, [
        ["/api/v1/ui/capability-providers", true],
        ["/api/v1/ui/navbar-plugins", false],
    ]);
});
