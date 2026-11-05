import test from "node:test";
import assert from "node:assert/strict";
import { uiCtx } from "../../../reuse/ui-ctx.js";
import {
    registerPageReadinessBlocker,
    installPageReadiness,
} from "../../../reuse/page-readiness.js";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

const tick = () => new Promise(setImmediate);

test("release notes participate in page readiness until dismissed and are checked once per account", async (context) => {
    uiCtx.capabilities.get("ui:pageReadiness")?.dispose();
    let account = "changelog-readiness-first";
    const storage = { getItem: () => account };
    const window = new EventTarget();
    window.location = { pathname: "/dashboard" };
    const readiness = installPageReadiness(uiCtx, { window });
    context.after(() => readiness.dispose());
    const dismissed = Promise.withResolvers();
    let checks = 0;
    const { registerReleaseChangelogReadiness } = loadTestModule(
        new URL(
            "../../../layouts/release-changelog/readiness.js",
            import.meta.url,
        ),
        {
            "../../reuse/page-readiness.js": { registerPageReadinessBlocker },
            "./popup.js": {
                maybeShowReleaseChangelogPopup: async () => {
                    checks++;
                    await dismissed.promise;
                },
            },
        },
        { localStorage: storage, AbortSignal },
    );
    const dispose = registerReleaseChangelogReadiness(uiCtx, { i18n: {} });
    context.after(dispose);
    const mounted = () =>
        uiCtx.runFlow("page:mounted", { pathname: window.location.pathname });
    await mounted();
    assert.equal(checks, 1);
    assert.equal(readiness.isReady(), false);
    dismissed.resolve();
    await tick();
    assert.equal(readiness.isReady(), true);
    window.dispatchEvent(new Event("cognis:route-will-change"));
    await mounted();
    await tick();
    assert.equal(readiness.isReady(), true);
    assert.equal(checks, 1);
    account = "changelog-readiness-second";
    window.dispatchEvent(new Event("cognis:route-will-change"));
    await mounted();
    await tick();
    assert.equal(checks, 2);
});
