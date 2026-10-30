import test from "node:test";
import assert from "node:assert/strict";
import { createFavouriteFixture } from "./reuse/favourites-fixture.js";

for (const replay of [false, true]) {
    test(`acknowledged favourites survive offline remounts after ${replay ? "replay" : "online saves"}`, async (context) => {
        let saved = [],
            reads = 0;
        const fixture = createFavouriteFixture(async (_path, options = {}) => {
            if (options.method === "PUT") {
                const input = JSON.parse(options.body);
                saved = input.favourite
                    ? [{ kind: input.kind, id: input.id }]
                    : [];
            } else reads++;
            return Response.json({ data: saved });
        });
        context.after(() => fixture.controller.abort());
        const client = fixture.ctx.capabilities.get("study:favourites");
        await client.load();
        for (const favourite of [true, false]) {
            if (replay) fixture.disconnect();
            else fixture.reconnect();
            await client.toggle({ kind: "library", id: "card", favourite });
            if (replay) {
                fixture.reconnect();
                assert.equal((await fixture.outbox.flush()).sent, 1);
            }
            fixture.disconnect();
            const remount = await fixture.loadView().loadFavourites();
            assert.equal(remount.has("library", "card"), favourite);
            assert.equal(
                (await fixture.outbox.pending("study.favourites")).length,
                0,
            );
        }
        assert.equal(reads, 1);
    });
}

test("a stale favourites read cannot overwrite a later acknowledged save", async (context) => {
    let complete,
        reads = 0;
    const fixture = createFavouriteFixture(async (_path, options = {}) => {
        if (options.method === "PUT")
            return Response.json({ data: [{ kind: "deck", id: "deck" }] });
        if (++reads === 1) return Response.json({ data: [] });
        return new Promise((resolve) => {
            complete = resolve;
        });
    });
    context.after(() => fixture.controller.abort());
    const client = fixture.ctx.capabilities.get("study:favourites");
    await client.load();
    const stale = client.load();
    await new Promise(setImmediate);
    await client.toggle({ kind: "deck", id: "deck", favourite: true });
    complete(Response.json({ data: [] }));
    await stale;
    assert.equal(client.has("deck", "deck"), true);
    fixture.disconnect();
    await client.load();
    assert.equal(client.has("deck", "deck"), true);
});
