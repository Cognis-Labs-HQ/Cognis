import assert from "node:assert/strict";
import test from "node:test";
import {
    captureRequestContext,
    createPushRequest,
    getPushRequest,
} from "../push-requests.js";
import { LibraryService } from "../service/index.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { LibraryEntry, LibraryPushRequest } from "../types.js";

const entry = (
    id: string,
    references: LibraryEntry["references"] = [],
): LibraryEntry => ({
    id,
    schemaId: "schema",
    schemaVersion: 1,
    language: "ja",
    layer: "words",
    label: id,
    fields: { pronunciation: [id] },
    scope: "global",
    scopeId: "global",
    createdBy: "alice",
    protected: false,
    createdAt: "2026-10-11T00:00:00Z",
    updatedAt: "2026-10-11T00:00:00Z",
    references,
});
test("request snapshots retain original downstream details without following cycles repeatedly", async () => {
    const source = entry("source", [
        { entryId: "reading", relation: "readings" },
        { entryId: "meaning", relation: "meaning" },
    ]);
    const reading = entry("reading", [
        { entryId: "kana", relation: "kana" },
        { entryId: "source", relation: "spelling" },
    ]);
    const records = new Map(
        [source, reading, entry("kana"), entry("meaning")].map((card) => [
            card.id,
            card,
        ]),
    );
    const context = await captureRequestContext(
        source,
        async (id) => records.get(id) ?? null,
    );
    assert.deepEqual(
        context.map(({ id }) => id),
        ["reading", "meaning", "kana"],
    );
    let row: Record<string, unknown> = {};
    const database = {
        executeCommand: async (command) => {
            if (
                command.option === "INSERT" &&
                command.table === "study_library_push_requests"
            )
                row = { ...command.values };
            return {
                rowCount: 1,
                rows: command.option === "SELECT" ? [row] : [],
            };
        },
    } as DbExecutor;
    const request = await createPushRequest(
        database,
        source.id,
        { scope: "user", scopeId: "alice" },
        "alice",
        "promotion",
        undefined,
        source,
        context,
    );
    records.get("meaning")!.label = "changed definition";
    const stored = await getPushRequest(database, request.id);
    assert.equal(
        stored!.sourceContext!.find(({ id }) => id === "meaning")!.label,
        "meaning",
    );
    assert.equal(stored!.sourceSnapshot!.scope, "global");
});

test("authorized request history retains original card context across relocation but reports deletion", async () => {
    const original = entry("source");
    let source: LibraryEntry | null = {
        ...original,
        scope: "user",
        scopeId: "alice",
        label: "edited after move",
    };
    const request: LibraryPushRequest = {
        id: "request",
        sourceEntryId: "source",
        destination: { scope: "global" },
        requestedBy: "alice",
        status: "approved",
        sourceSnapshot: original,
        sourceContext: [entry("meaning")],
    };
    const library = new LibraryService({
        get: async () => source,
        listPushRequests: async () => [request],
    } as never);
    const actor = { accountId: "admin", role: "admin" as const };
    const [first] = await library.listPushRequests(actor);
    assert.equal(first.source!.label, "source");
    assert.equal(first.sourceContext![0].label, "meaning");
    source = null;
    const [deleted] = await library.listPushRequests(actor);
    assert.equal(deleted.source, undefined);
    assert.equal(deleted.sourceContext, undefined);
});
