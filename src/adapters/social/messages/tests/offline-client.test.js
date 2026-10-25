import test from "node:test";
import assert from "node:assert/strict";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

test("encrypted messages remain visibly queued and retain their identity after a lost response", async () => {
    const stored = new Map();
    let fail = true;
    const fixture = createOfflineClientFixture(async (_path, options = {}) => {
        if (!options.method) return Response.json({ data: [] });
        const input = JSON.parse(options.body);
        stored.set(input.operationId, input);
        if (fail) {
            fail = false;
            throw new TypeError("lost_response");
        }
        return Response.json({ data: input });
    });
    const client = loadTestModule(
        new URL("../ui/offline-client.js", import.meta.url),
        fixture.imports,
        fixture.globals,
    );
    client.mountProvider(fixture.ctx);
    const path = "/api/v1/social/messages/rooms/room/messages";
    await client.messagesFetch(path + "?limit=50");
    fixture.disconnect();
    const response = await (
        await client.messagesFetch(path, {
            method: "POST",
            body: JSON.stringify({
                ciphertext: "encrypted-payload",
                iv: "encrypted-iv",
            }),
        })
    ).json();
    const queued = await (
        await client.messagesFetch(path + "?limit=50")
    ).json();
    assert.equal(queued.data[0].id, response.data.id);
    assert.equal(queued.data[0].queued, true);
    const pending = await fixture.outbox.pending("social.messages");
    assert.equal(pending[0].payload.body.ciphertext, "encrypted-payload");
    fixture.reconnect();
    assert.equal((await fixture.outbox.flush()).sent, 0);
    assert.equal((await fixture.outbox.flush()).sent, 1);
    assert.equal(stored.size, 1);
    assert.equal([...stored.keys()][0], response.data.id);
    fixture.controller.abort();
});

test("offline reaction changes project their final state and replay without toggling twice", async () => {
    const states = [];
    const fixture = createOfflineClientFixture(async (_path, options = {}) => {
        if (!options.method)
            return Response.json({ data: [{ id: "message", reactions: [] }] });
        states.push(JSON.parse(options.body).active);
        return Response.json({ data: { active: states.at(-1) } });
    });
    const client = loadTestModule(
        new URL("../ui/offline-client.js", import.meta.url),
        fixture.imports,
        fixture.globals,
    );
    client.mountProvider(fixture.ctx);
    const path = "/api/v1/social/messages/rooms/room/messages";
    await client.messagesFetch(path + "?limit=50");
    fixture.disconnect();
    const update = (active) =>
        client.messagesFetch(path + "/message/reactions", {
            method: "POST",
            body: JSON.stringify({ emoji: "👍", active }),
        });
    await update(true);
    const reacted = await (
        await client.messagesFetch(path + "?limit=50")
    ).json();
    assert.equal(reacted.data[0].reactions[0].reactedByMe, true);
    await update(false);
    await update(false);
    assert.deepEqual(
        (await (await client.messagesFetch(path + "?limit=50")).json()).data[0]
            .reactions,
        [],
    );
    assert.equal((await fixture.outbox.pending("social.messages")).length, 2);
    fixture.reconnect();
    assert.equal((await fixture.outbox.flush()).sent, 2);
    assert.deepEqual(states, [true, false]);
    fixture.controller.abort();
});
