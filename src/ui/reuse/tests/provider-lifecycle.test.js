import assert from "node:assert/strict";
import test from "node:test";
import { uiCtx } from "../ui-ctx.js";
import { createProviderLifecycle } from "../provider-lifecycle.js";

test("provider failures log the safe script identity and failing phase", async () => {
    const logs = [];
    const log = (_level, _message, metadata) => logs.push(metadata);
    uiCtx.capabilities.contribute("ui:log", log);
    try {
        const lifecycle = createProviderLifecycle({
            uiCtx,
            importProvider: async () => {
                throw new TypeError("unavailable");
            },
        });
        await assert.rejects(
            lifecycle.reconcile([
                { scriptUrl: "/static/provider.js?revision=private" },
            ]),
            /unavailable/,
        );
        assert.equal(logs[0].providerScript, "/static/provider.js");
        assert.equal(logs[0].providerPhase, "import");
        assert.equal(logs[0].errorName, "TypeError");
    } finally {
        uiCtx.capabilities.remove("ui:log", log);
    }
});

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

test("a failed optional component loses all scoped contributions while other providers mount and revision changes recover it", async () => {
    const component = {
        type: "module",
        id: "optional",
        version: "1",
        required: false,
        critical: false,
    };
    const notices = [];
    let fail = true,
        mounts = 0;
    const controllerSignals = [];
    const lifecycle = createProviderLifecycle({
        uiCtx,
        onFailure: async (failure) => notices.push(failure),
        importProvider: async (url) => ({
            mountProvider(ctx) {
                if (url.startsWith("/healthy")) {
                    ctx.capabilities.contribute(
                        "test:healthyRecovery",
                        () => true,
                    );
                    return;
                }
                mounts++;
                controllerSignals.push(ctx.signal);
                if (url === "/first.js") {
                    ctx.registerFlow("test:isolatedAction", ["execute"]);
                    ctx.extendFlow(
                        "test:isolatedAction",
                        "execute",
                        { id: "test:effect" },
                        (stage) => {
                            stage.data.ready = true;
                        },
                    );
                    ctx.capabilities.contribute(
                        "test:isolatedContribution",
                        true,
                    );
                } else if (fail) {
                    ctx.capabilities.contribute(
                        "test:partialContribution",
                        true,
                    );
                    throw new TypeError("invalid_tutorial_definition");
                } else
                    ctx.capabilities.contribute(
                        "test:repairedContribution",
                        () => true,
                    );
            },
        }),
    });
    const providers = [
        { scriptUrl: "/first.js", component },
        { scriptUrl: "/bad.js", component },
        { scriptUrl: "/healthy.js" },
    ];
    await lifecycle.reconcile(providers);
    assert.equal(uiCtx.capabilities.get("test:healthyRecovery")(), true);
    assert.equal(
        uiCtx.capabilities.get("test:isolatedContribution"),
        undefined,
    );
    assert.equal(uiCtx.capabilities.get("test:partialContribution"), undefined);
    assert.equal(uiCtx.flowExists("test:isolatedAction"), false);
    assert.ok(controllerSignals.every((signal) => signal.aborted));
    assert.equal(notices.length, 1);
    await lifecycle.reconcile(providers);
    assert.equal(mounts, 2);
    assert.equal(notices.length, 1);
    await lifecycle.reconcile(providers, "default", { retryFailed: true });
    assert.equal(notices.length, 2);
    fail = false;
    const next = providers.map((entry) =>
        entry.component
            ? { ...entry, component: { ...component, version: "2" } }
            : entry,
    );
    await lifecycle.reconcile(next);
    assert.equal(uiCtx.capabilities.get("test:repairedContribution")(), true);
    await lifecycle.reconcile([]);
    assert.equal(uiCtx.capabilities.get("test:healthyRecovery"), undefined);
});

test("required and offline-policy providers fail closed and roll back earlier registrations from the same owner", async () => {
    for (const protection of [
        { required: true },
        { critical: true },
        { offlineAccessGuard: "policy" },
    ]) {
        const component = {
            type: "gateway",
            id: "protected",
            version: "1",
            required: false,
            critical: false,
            ...protection,
        };
        const lifecycle = createProviderLifecycle({
            uiCtx,
            importProvider: async (url) => ({
                mountProvider(ctx) {
                    if (url === "/protected-first.js")
                        ctx.capabilities.contribute(
                            "test:protectedPartial",
                            true,
                        );
                    else throw new Error("policy_failed");
                },
            }),
        });
        await assert.rejects(
            lifecycle.reconcile([
                { scriptUrl: "/protected-first.js", component },
                { scriptUrl: "/protected-bad.js", component, ...protection },
            ]),
            /policy_failed/,
        );
        assert.equal(
            uiCtx.capabilities.get("test:protectedPartial"),
            undefined,
        );
        await lifecycle.reconcile([]);
    }
});
