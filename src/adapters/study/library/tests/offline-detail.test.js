import test from "node:test";
import assert from "node:assert/strict";
import { cachedEntryDetail } from "../ui/reuse/entry-graph.js";

test("cached previews retain ordered pronunciation links and group references without fetching absent content", () => {
    const character = {
        id: "character",
        references: [{ entryId: "meaning" }, { entryId: "unavailable" }],
    };
    const meaning = { id: "meaning" };
    const word = {
        id: "word",
        referenceGroups: { spelling: [[{ entryId: "character" }]] },
    };
    const detail = cachedEntryDetail("character", [
        character,
        meaning,
        word,
        word,
    ]);
    assert.equal(detail.entry, character);
    assert.deepEqual(detail.references, [meaning]);
    assert.deepEqual(detail.usedBy, [word]);
    assert.throws(
        () => cachedEntryDetail("unvisited", [character]),
        /offline_read_unavailable/,
    );
});

test("the preview data boundary selects cached rows offline and retains server reads online", async () => {
    const { loadTestModule } =
        await import("../../../../tooling/reuse/test-module.ts");
    const graph = await import("../ui/reuse/entry-graph.js");
    let offline = true;
    let reads = 0;
    const { loadEntryDetail } = loadTestModule(
        new URL("../ui/app/entry-data.js", import.meta.url),
        {
            "/static/reuse/offline-state.js": { isOffline: () => offline },
            "/static/gateways/study/library-client.js": {
                fetchLibraryEntry: async () => {
                    reads++;
                    return { entry: { id: "server" } };
                },
            },
            "../reuse/entry-graph.js": graph,
        },
    );
    assert.equal(
        (await loadEntryDetail("character", [{ id: "character" }])).entry.id,
        "character",
    );
    assert.equal(reads, 0);
    await assert.rejects(
        loadEntryDetail("missing", []),
        /offline_read_unavailable/,
    );
    offline = false;
    assert.equal((await loadEntryDetail("character", [])).entry.id, "server");
    assert.equal(reads, 1);
});
