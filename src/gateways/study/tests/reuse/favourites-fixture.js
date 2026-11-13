import assert from "node:assert/strict";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

export function createFavouriteFixture(send) {
    const host = createOfflineClientFixture(send);
    const notices = [];
    const offline = loadTestModule(
        new URL("../../ui/offline-content.js", import.meta.url),
        {
            ...host.imports,
            "/static/reuse/popup.js": {
                openPopup: () =>
                    assert.fail("no missing-content popup for favourites"),
            },
            "/static/reuse/escape-html.js": { escapeHtml: String },
        },
        host.globals,
    );
    const client = loadTestModule(
        new URL("../../ui/reuse/favourites-client.js", import.meta.url),
        {
            ...host.imports,
            "../offline-content.js": offline,
        },
        host.globals,
    );
    client.registerFavouriteClient(host.ctx);
    return {
        ...host,
        notices,
        loadView: () =>
            loadTestModule(
                new URL("../../ui/reuse/favourites.js", import.meta.url),
                {
                    "./favourites-client.js": client,
                    "/static/reuse/escape-html.js": { escapeHtml: String },
                    "/static/reuse/toast.js": {
                        showToast: (message) => notices.push(message),
                    },
                },
                host.globals,
            ),
    };
}
