import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";

test("reviews queue idempotent attempts while offline content edits remain unavailable", async () => {
    const requests = [];
    const fixture = createOfflineClientFixture(async (path, options) => {
        requests.push({ path, body: JSON.parse(options.body) });
        return {
            ok: true,
            json: async () => ({ data: { id: "deck", progress: {} } }),
        };
    });
    const client = loadTestModule(
        new URL("../ui/decks-client.js", import.meta.url),
        fixture.imports,
        fixture.globals,
    );
    client.mountProvider(fixture.ctx);
    fixture.disconnect();
    const attempt = {
        id: "788b4cf9-30e4-424b-87ad-e69f6e319cf7",
        occurredAt: "2026-10-24T00:00:00Z",
    };
    assert.equal(
        (await client.reviewStudyCard("deck", "card", "good", attempt)).queued,
        true,
    );
    await assert.rejects(
        client.saveStudyDeck({ name: "edit" }, "deck"),
        /offline_operation_unavailable/,
    );
    assert.equal(requests.length, 0);
    fixture.reconnect();
    assert.equal((await fixture.outbox.flush()).sent, 1);
    assert.deepEqual(requests[0].body, {
        cardId: "card",
        grade: "good",
        attempt,
    });
    assert.equal((await fixture.outbox.flush()).sent, 0);
    fixture.controller.abort();
});
