import test from "node:test";
import assert from "node:assert/strict";
import { importTestModule } from "../../tooling/reuse/test-module.ts";

test("offline error pages fit narrow grids and retain route cancellation", async () => {
    let composed;
    let initialized = false;
    const page = await importTestModule(
        new URL("../app/error/index.js", import.meta.url),
        {
            "../../reuse/offline-state.js": { isOffline: () => true },
            "../../reuse/i18n.js": {
                applyDocumentTitle() {},
                createI18n: async () => ({ t: (key) => key }),
            },
            "../../reuse/page-composer/index.js": {
                createPageComposer: (_root, options) => {
                    composed = options;
                    return {
                        init: async () => {
                            initialized = true;
                        },
                    };
                },
            },
            "../../reuse/page-entry.js": { mountWhenDirect: async () => {} },
            "../../reuse/auth-session.js": {
                checkIsAuthenticated: () => {
                    throw Error("offline auth must not run");
                },
            },
            "../../reuse/escape-html.js": { escapeHtml: (value) => value },
            "../../reuse/theme-toggle.js": {
                applyTheme() {},
                getStoredTheme: () => "dark",
            },
        },
        {
            window: { location: { search: "" }, addEventListener() {} },
            URLSearchParams,
        },
    );
    const controller = new AbortController();
    await page.mount({}, { signal: controller.signal });
    assert.equal(initialized, true);
    assert.equal(composed.signal, controller.signal);
    const element = composed.elements[0];
    // Fill-width placement must fit even a one-column viewport.
    assert.equal(Math.max(element.gridSize.min[0], 1), 1);
    assert.match(element.render(), /href="\/license"/);
});
