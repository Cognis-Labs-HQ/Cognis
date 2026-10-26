import { createFavouriteFixture } from "./reuse/favourites-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";

const attempt = {
    id: "788b4cf9-30e4-424b-87ad-e69f6e319cf7",
    occurredAt: "2026-10-24T00:00:00Z",
};

test("drawing records queue the original attempt and replay through the owned client", async () => {
    const requests = [];
    const fixture = createOfflineClientFixture(async (path, options) => {
        requests.push({ path, body: JSON.parse(options.body) });
        return {
            ok: true,
            json: async () => ({
                data: { completed: true, hiddenStrokeCount: 1 },
            }),
        };
    });
    const client = loadTestModule(
        new URL("../ui/drawing-client.js", import.meta.url),
        fixture.imports,
        fixture.globals,
    );
    client.registerDrawingDelivery(fixture.ctx);
    fixture.disconnect();
    const completion = {
        attempt,
        result: "correct",
        assisted: false,
        strokeCount: 3,
        mistakes: 0,
    };
    assert.equal(
        (await client.recordDrawingCompletion("character", completion)).queued,
        true,
    );
    assert.equal(requests.length, 0);
    fixture.reconnect();
    assert.equal((await fixture.outbox.flush()).sent, 1);
    assert.deepEqual(requests[0].body, completion);
    assert.equal((await fixture.outbox.flush()).sent, 0);
    fixture.controller.abort();
});

test("favourite changes remain visible across offline remounts and replay in order", async () => {
    const requests = [];
    const fixture = createFavouriteFixture(async (path, options = {}) => {
        if (options.method === "PUT") requests.push(JSON.parse(options.body));
        return { ok: true, json: async () => ({ data: [] }) };
    });
    const toasts = fixture.notices;
    const client = fixture.loadView();
    const favourites = await client.loadFavourites();
    let handler;
    const root = {
        querySelectorAll: () => [],
        addEventListener: (_event, callback) => {
            handler = callback;
        },
    };
    favourites.bind(root, { i18n: { t: (key) => key } });
    fixture.disconnect();
    const button = {
        dataset: { studyFavouriteKind: "deck", studyFavourite: "deck" },
        disabled: false,
    };
    await handler({ target: { closest: () => button }, stopPropagation() {} });
    assert.equal(
        (await fixture.loadView().loadFavourites()).has("deck", "deck"),
        true,
    );
    assert.equal(requests.length, 0);
    assert.equal(toasts[0], "ui.reuse.offline_changes_queued");
    fixture.reconnect();
    assert.equal((await fixture.outbox.flush()).sent, 1);
    assert.deepEqual(requests[0], {
        kind: "deck",
        id: "deck",
        favourite: true,
    });
    fixture.controller.abort();
});

test("an offline first visit can favourite cached content without a favourites snapshot", async (context) => {
    const fixture = createFavouriteFixture(() =>
        assert.fail("no offline HTTP request"),
    );
    context.after(() => fixture.controller.abort());
    fixture.disconnect();
    const first = await fixture.loadView().loadFavourites();
    assert.equal(first.has("library", "card"), false);
    await fixture.ctx.capabilities
        .get("study:favourites")
        .toggle({ kind: "library", id: "card", favourite: true });
    const second = await fixture.loadView().loadFavourites();
    assert.equal(second.has("library", "card"), true);
    fixture.changeAccount("another-account");
    assert.equal(second.has("library", "card"), false);
    const next = await fixture.loadView().loadFavourites();
    assert.equal(next.has("library", "card"), false);
    assert.equal(fixture.notices.length, 0);
});
