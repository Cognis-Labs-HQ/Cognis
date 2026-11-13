import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

test("Broadcast publishes through ctx and releases only its own banner on disposal", async () => {
    const notices = [];
    let removed = 0;
    let requests = 0;
    const ctx = {
        signal: new AbortController().signal,
        capabilities: {
            get: (name) => {
                assert.equal(name, "ui:broadcast");
                return {
                    publish: (id, descriptor, options) => {
                        notices.push({ id, descriptor, options });
                        return {
                            element: { querySelector: () => null },
                            remove: () => {
                                removed++;
                            },
                        };
                    },
                };
            },
        },
    };
    const plugin = loadTestModule(
        new URL("../ui/broadcast-navbar-plugin.js", import.meta.url),
        {
            "/static/reuse/ui-ctx.js": { uiCtx: ctx },
            "/static/reuse/offline-state.js": { isOffline: () => false },
            "/static/reuse/i18n.js": {
                createI18n: async () => ({ t: (key) => key }),
            },
            "/static/reuse/api-client.js": {
                apiFetch: async () => {
                    requests++;
                    return Response.json({
                        data: [
                            {
                                id: "news",
                                title: "News",
                                message: "Message",
                                displayMode: "bar",
                            },
                        ],
                    });
                },
            },
            "/static/reuse/escape-html.js": { escapeHtml: String },
            "/static/reuse/popup.js": {
                openPopup: () => assert.fail("not a popup broadcast"),
            },
            "/static/reuse/markdown-renderer.js": {
                renderMarkdown: (text) => `<p>${text}</p>`,
            },
            "/static/reuse/app-router.js": {
                navigateTo: () => assert.fail("not navigation"),
            },
            "/static/reuse/toast.js": {
                showToast: () => assert.fail("not an error"),
            },
            "/static/reuse/page-styles.js": {
                ensurePersistentStylesheet: async () => {},
            },
            "/static/reuse/trusted-domains.js": {
                isTrustedHttpUrl: () => true,
                loadTrustedDomains: async () => [],
            },
        },
        {
            document: {
                getElementById: () => null,
                visibilityState: "visible",
            },
            localStorage: { getItem: () => "session" },
            setTimeout: () => 1,
            clearTimeout: () => {},
        },
    );
    const remove = await plugin.mountProvider(ctx);
    assert.equal(requests, 1);
    assert.equal(notices[0].id, "notify.broadcast");
    assert.equal(notices[0].descriptor.bodyHtml, "<p>Message</p>");
    assert.equal(notices[0].options.signal, ctx.signal);
    remove();
    assert.equal(removed, 1);
});
