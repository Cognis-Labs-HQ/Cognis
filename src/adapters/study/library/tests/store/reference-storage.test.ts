import assert from "node:assert/strict";
import test from "node:test";
import { structuredStore } from "../../../../../gateways/reuse/tests/structured-store.js";
import {
    ensureReferenceStorage,
    executeReferences,
} from "../../store/reference-storage.js";

test("existing flat primary keys preserve every repeated grouped placement through repartition and restart", async () => {
    const { db, rows } = structuredStore();
    await db.ensureTable({
        name: "study_library_references",
        columns: [],
        primaryKey: [
            "source_entry_id",
            "target_entry_id",
            "relation",
            "position",
        ],
    });
    const edge = {
        source_entry_id: "word",
        target_entry_id: "kana",
        relation: "reading",
        group_index: 0,
        position: 0,
        transformation_json: null,
    };
    await db.executeCommand({
        option: "INSERT",
        table: "study_library_references",
        values: edge,
    });
    await ensureReferenceStorage(db);
    await executeReferences(db, {
        option: "INSERT",
        values: { ...edge, group_index: 1 },
        conflict: { action: "ignore" },
    });
    await executeReferences(db, {
        option: "INSERT",
        values: { ...edge, group_index: -1 },
        conflict: { action: "ignore" },
    });
    await ensureReferenceStorage(db);
    const result = await executeReferences(db, {
        option: "SELECT",
        where: [{ column: "source_entry_id", value: "word" }],
    });
    assert.deepEqual(
        result.rows!.map((row) => row.group_index).sort(),
        [-1, 0, 1],
    );
    assert.equal(rows("study_library_references").length, 1);
    assert.equal(rows("study_library_reference_groups").length, 2);
    await executeReferences(db, {
        option: "DELETE",
        where: [{ column: "target_entry_id", value: "kana" }],
    });
    assert.equal(
        (await executeReferences(db, { option: "SELECT" })).rows!.length,
        0,
    );
});

test("a failed grouped-edge transfer retains the complete existing graph for retry", async () => {
    const fixture = structuredStore();
    await fixture.db.ensureTable({
        name: "study_library_references",
        columns: [],
        primaryKey: [
            "source_entry_id",
            "target_entry_id",
            "relation",
            "position",
        ],
    });
    await fixture.db.executeCommand({
        option: "INSERT",
        table: "study_library_references",
        values: {
            source_entry_id: "word",
            target_entry_id: "kana",
            relation: "reading",
            group_index: 0,
            position: 0,
        },
    });
    fixture.fail(
        (command) =>
            command.table === "study_library_reference_groups" &&
            command.option === "INSERT",
    );
    await assert.rejects(ensureReferenceStorage(fixture.db), /storage_failed/);
    assert.equal(fixture.rows("study_library_references").length, 1);
    fixture.fail(() => false);
    await ensureReferenceStorage(fixture.db);
    assert.equal(fixture.rows("study_library_reference_groups").length, 1);
});

test("creating and editing cards preserve the same grouped placements and selected transformations", async () => {
    const fixture = structuredStore();
    const { LibraryStore } = await import("../../store.js");
    const store = new LibraryStore(fixture.db);
    await store.ensureSchema();
    const input = {
        schemaId: "test",
        schemaVersion: 1,
        layer: "words",
        label: "word",
        references: [{ entryId: "a", relation: "spelling", position: 0 }],
        referenceGroups: {
            constructor: [
                [{ entryId: "a", relation: "constructor", position: 0 }],
            ],
            reading: [
                [{ entryId: "a", relation: "reading", position: 0 }],
                [
                    {
                        entryId: "a",
                        relation: "reading",
                        position: 0,
                        transformation: { setId: "verb", path: ["past"] },
                    },
                ],
            ],
        },
    };
    const created = await store.create(
        { scope: "user", scopeId: "alice" },
        input,
        "ja",
        "alice",
    );
    assert.deepEqual(created.references, input.references);
    assert.deepEqual(created.referenceGroups, input.referenceGroups);
    const edited = {
        ...input,
        label: "edited",
        referenceGroups: {
            constructor: input.referenceGroups.constructor,
            reading: [
                input.referenceGroups.reading[1],
                input.referenceGroups.reading[0],
            ],
        },
    };
    const updated = await store.update(created.id, edited);
    assert.deepEqual(updated.references, input.references);
    assert.deepEqual(updated.referenceGroups, edited.referenceGroups);
    assert.deepEqual(
        (await new LibraryStore(fixture.db).get(created.id))?.referenceGroups,
        edited.referenceGroups,
    );
});
