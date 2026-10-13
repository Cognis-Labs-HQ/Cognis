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
