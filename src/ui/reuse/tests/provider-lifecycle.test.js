import assert from "node:assert/strict";
import test from "node:test";
import { uiCtx } from "../ui-ctx.js";
import { createProviderLifecycle } from "../provider-lifecycle.js";

test("provider disable and re-enable remove capabilities, flows and listeners", async () => {
    let mounts = 0;
    let releases = 0;
    const signals = [];
    const lifecycle = createProviderLifecycle({
        uiCtx,
        async importProvider() {
            return {
                mountProvider(ctx) {
                    mounts += 1;
                    signals.push(ctx.signal);
                    ctx.registerFlow("test:providerLifecycle", ["execute"]);
                    ctx.extendFlow(
                        "test:providerLifecycle",
                        "execute",
                        { id: "test:execute" },
                        (stage) => {
                            stage.data.executed = true;
                        },
                    );
                    ctx.capabilities.contribute("test:providerAction", () =>
                        ctx.runFlow("test:providerLifecycle", {}),
                    );
                    return () => {
                        releases += 1;
                    };
                },
            };
        },
    });
    const catalog = [{ scriptUrl: "/provider.js" }];
    await lifecycle.reconcile(catalog);
    await lifecycle.reconcile(catalog);
    assert.equal(mounts, 1);
    assert.equal(
        (await uiCtx.capabilities.get("test:providerAction")()).data.executed,
        true,
    );
    await lifecycle.reconcile([]);
    assert.equal(signals[0].aborted, true);
    assert.equal(releases, 1);
    await lifecycle.reconcile(catalog);
    assert.equal(mounts, 2);
    assert.equal(signals[1].aborted, false);
    assert.equal(
        (await uiCtx.capabilities.get("test:providerAction")()).data.executed,
        true,
    );
    await lifecycle.reconcile([]);
});

test("failed provider mounting rolls back its scoped contributions", async () => {
    const lifecycle = createProviderLifecycle({
        uiCtx,
        async importProvider() {
            return {
                mountProvider(ctx) {
                    ctx.capabilities.contribute(
                        "test:failedProvider",
                        () => true,
                    );
                    throw new Error("mount_failed");
                },
            };
        },
    });
    await assert.rejects(
        lifecycle.reconcile([{ scriptUrl: "/failed.js" }]),
        /mount_failed/,
    );
    uiCtx.capabilities.contribute("test:failedProvider", "replacement");
    assert.equal(uiCtx.capabilities.get("test:failedProvider"), "replacement");
    uiCtx.capabilities.remove("test:failedProvider", "replacement");
});

test("a provider listed in two catalogs mounts once and remains while either owns it", async () => {
    let mounts = 0;
    let releases = 0;
    const lifecycle = createProviderLifecycle({
        uiCtx,
        async importProvider() {
            return {
                mountProvider() {
                    mounts += 1;
                    return () => {
                        releases += 1;
                    };
                },
            };
        },
    });
    const catalog = [{ scriptUrl: "/both.js" }];
    await lifecycle.reconcile(catalog, "capabilities");
    await lifecycle.reconcile(catalog, "navbar");
    assert.equal(mounts, 1);
    await lifecycle.reconcile([], "capabilities");
    assert.equal(releases, 0);
    await lifecycle.reconcile([], "navbar");
    assert.equal(releases, 1);
});

test("a stale flow disposer preserves a newer registration", () => {
    const release = uiCtx.registerFlow("test:ownedFlow", ["execute"]);
    release();
    const nextRelease = uiCtx.registerFlow("test:ownedFlow", ["execute"]);
    release();
    assert.equal(uiCtx.flowExists("test:ownedFlow"), true);
    nextRelease();
});

test("background catalogs download on demand while retaining mount order", async (context) => {
    const originalDocument = globalThis.document;
    globalThis.document = {
        createElement() {
            assert.fail(
                "background catalogs must not fan out preload requests",
            );
        },
    };
    context.after(() => {
        globalThis.document = originalDocument;
    });
    const calls = [];
    const lifecycle = createProviderLifecycle({
        uiCtx,
        async importProvider(url) {
            calls.push(["import", url]);
            return { mountProvider: () => calls.push(["mount", url]) };
        },
    });
    await lifecycle.reconcile(
        [{ scriptUrl: "/assets/first.js" }, { scriptUrl: "/assets/second.js" }],
        "navbar",
    );
    assert.deepEqual(calls, [
        ["import", "/assets/first.js"],
        ["mount", "/assets/first.js"],
        ["import", "/assets/second.js"],
        ["mount", "/assets/second.js"],
    ]);
    await lifecycle.reconcile([], "navbar");
});

test("host provider fetches are preloaded while imports and mounts retain catalog order", async (context) => {
    const originalDocument = globalThis.document;
    const links = [];
    const removed = [];
    globalThis.document = {
        createElement(tag) {
            assert.equal(tag, "link");
            return {
                dataset: {},
                remove() {
                    removed.push(this.href);
                },
            };
        },
        head: {
            appendChild(link) {
                links.push(link);
            },
        },
    };
    context.after(() => {
        globalThis.document = originalDocument;
    });
    const imported = [];
    const mounted = [];
    let completeFirstImport;
    const firstImport = new Promise((resolve) => {
        completeFirstImport = resolve;
    });
    const lifecycle = createProviderLifecycle({
        uiCtx,
        async importProvider(url) {
            imported.push(url);
            if (url === "/assets/first-A1.js") await firstImport;
            return {
                mountProvider() {
                    mounted.push(url);
                },
            };
        },
    });
    const providers = [
        { scriptUrl: "/assets/first-A1.js" },
        { scriptUrl: "/assets/second-B2.js" },
        { scriptUrl: "/static/modules/external/provider.js?revision=2" },
        { scriptUrl: "/assets/revision-provider.js?revision=2" },
        { scriptUrl: "/static/gateways/example/provider.js" },
    ];
    const pending = lifecycle.reconcile(providers, "capabilities", {
        preload: true,
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(
        links.map((link) => [link.rel, link.href]),
        [
            ["modulepreload", "/assets/first-A1.js"],
            ["modulepreload", "/assets/second-B2.js"],
        ],
    );
    assert.deepEqual(imported, ["/assets/first-A1.js"]);
    assert.deepEqual(mounted, []);
    completeFirstImport();
    await pending;
    assert.deepEqual(
        mounted,
        providers.map((provider) => provider.scriptUrl),
    );
    assert.deepEqual(imported, mounted);
    assert.deepEqual(removed, ["/assets/first-A1.js", "/assets/second-B2.js"]);
    await lifecycle.reconcile(providers, "capabilities", { preload: true });
    assert.equal(
        links.length,
        2,
        "active providers do not schedule more preloads",
    );
    await lifecycle.reconcile([]);
});

test("failed host imports clean preload links and remain retryable", async (context) => {
    const originalDocument = globalThis.document;
    let links = 0;
    let removals = 0;
    globalThis.document = {
        createElement() {
            return {
                dataset: {},
                remove() {
                    removals += 1;
                },
            };
        },
        head: {
            appendChild() {
                links += 1;
            },
        },
    };
    context.after(() => {
        globalThis.document = originalDocument;
    });
    let failing = true;
    const lifecycle = createProviderLifecycle({
        uiCtx,
        async importProvider() {
            if (failing) throw new Error("fixture_import_failed");
            return { mountProvider() {} };
        },
    });
    const providers = [{ scriptUrl: "/assets/provider-A1.js" }];
    await assert.rejects(
        lifecycle.reconcile(providers, "capabilities", { preload: true }),
        /fixture_import_failed/,
    );
    assert.equal(removals, 1);
    failing = false;
    await lifecycle.reconcile(providers, "capabilities", { preload: true });
    assert.equal(links, 2);
    assert.equal(removals, 2);
    await lifecycle.reconcile([]);
});
