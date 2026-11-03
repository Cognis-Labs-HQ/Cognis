import assert from "node:assert/strict";
import test from "node:test";
import { importTestModule } from "../../../tooling/reuse/test-module.ts";

for (const blocked of ["i18n", "composer", "providers", "strings", "styles"]) {
    test(`a cancelled share page stops after pending ${blocked} work`, async () => {
        const entered = Promise.withResolvers();
        const release = Promise.withResolvers();
        const calls = [];
        const controller = new AbortController();
        const i18n = { t: (key) => key };
        let options;
        const step = async (name, result) => {
            calls.push(name);
            if (name === blocked) {
                entered.resolve();
                await release.promise;
            }
            return result;
        };
        const page = await importTestModule(
            new URL("../ui/app/index.js", import.meta.url),
            {
                "../session-flow-hooks.js": {},
                "/static/reuse/i18n.js": {
                    createI18n: () => step("i18n", i18n),
                    extendI18n: () => step("strings", i18n),
                    applyDocumentTitle: () => calls.push("title"),
                },
                "/static/reuse/page-composer/index.js": {
                    createPageComposer: (_root, input) => {
                        options = input;
                        return {
                            init: () => step("composer"),
                            refresh: () => calls.push("refresh"),
                        };
                    },
                },
                "/static/reuse/page-entry.js": {
                    mountWhenDirect: async () => false,
                },
                "/static/reuse/escape-html.js": { escapeHtml: String },
                "/static/reuse/ui-ctx.js": {
                    uiCtx: {
                        capabilities: {
                            get: (name) =>
                                name === "ui:ensureProvidersLoaded"
                                    ? () => step("providers")
                                    : undefined,
                        },
                        runFlow: () =>
                            assert.fail(
                                "The router already resolved this share.",
                            ),
                    },
                },
                "/static/reuse/page-styles.js": {
                    ensurePageStylesheet: () => step("styles"),
                },
                "/static/reuse/guest-blocked-popup.js": {
                    installGuestNavigationGuard: () => calls.push("guard"),
                },
                "/static/reuse/app-router.js": {
                    navigateTo: () =>
                        assert.fail("A cancelled share must not navigate."),
                },
                "./renderer-registry.js": {
                    getShareRenderer: () => {
                        calls.push("renderer");
                        return () => "<p>Shared content</p>";
                    },
                },
            },
            { console },
        );
        const pending = page.mount(
            { querySelector: () => null },
            {
                signal: controller.signal,
                shareContext: {
                    resourceType: "fixture",
                    payload: {},
                    page: {
                        stringsBaseUrl: "/fixture/languages",
                        stylesheetUrls: ["/fixture.css"],
                    },
                },
            },
        );
        await entered.promise;
        controller.abort();
        const stoppedAt = [...calls];
        release.resolve();
        await pending;
        assert.deepEqual(calls, stoppedAt);
        assert.equal(calls.includes("renderer"), false);
        if (options) assert.equal(options.signal, controller.signal);
    });
}
