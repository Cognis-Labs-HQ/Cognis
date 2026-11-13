import assert from "node:assert/strict";
import test from "node:test";
import { createEntry, createSchema } from "./reuse/fixtures.js";
import {
    createAudioProvider,
    createDatabase,
    createFiles,
} from "./reuse/capabilities.js";
import { MemoryDatabase } from "./reuse/database.js";

test("Library fixture factories supply complete independent metadata and retain authored overrides", () => {
    const entry = createEntry({
        id: "dog",
        scope: "user",
        scopeId: "alice",
        protected: true,
    });
    assert.equal(entry.id, "dog");
    assert.equal(entry.protected, true);
    assert.equal(entry.schemaVersion, 1);
    assert.ok(entry.createdAt);
    const schema = createSchema({
        layers: [
            {
                id: "words",
                fields: [{ id: "audio", type: "audio" }],
                relationships: [
                    { id: "reading", targetLayer: "words", onDelete: "detach" },
                ],
            },
        ],
    });
    assert.deepEqual(schema.layers[0].fields?.[0].metadata.labels, {
        en: "audio",
    });
    assert.equal(schema.layers[0].relationships?.[0].onDelete, "detach");
    schema.metadata.labels = { en: "Changed" };
    assert.equal(createSchema().metadata.labels.en, "Test");
});

test("capability fakes reject unexpected operations and retain generic transaction results", async () => {
    const database = createDatabase();
    assert.equal(
        await database.transaction(async (executor) => executor === database),
        true,
    );
    await assert.rejects(
        database.executeCommand({ option: "SELECT", table: "missing" }),
        /unexpected_database_command/,
    );
    const files = createFiles();
    await assert.rejects(
        files.get({ actorId: "alice" }, "missing"),
        /unexpected_file_read/,
    );
    await assert.rejects(
        files.delete({ actorId: "alice" }, "missing"),
        /unexpected_file_delete/,
    );
    await assert.rejects(
        files.list({ actorId: "alice" }),
        /unexpected_file_list/,
    );
    await assert.rejects(
        files.store({ actorId: "alice" }, new Uint8Array()),
        /unexpected_file_write/,
    );
    const audio = createAudioProvider({
        supports: () => true,
        cacheKey: () => "audio",
        fetchAudio: async () => ({
            mediaType: "audio/wav",
            data: new Uint8Array(),
        }),
    });
    assert.throws(
        () =>
            audio.registerLanguage(
                "en",
                () => ({}),
                () => undefined,
            ),
        /unexpected_language_registration/,
    );
});

test("memory database persists structured commands, rolls back failures and rejects unsupported operations", async () => {
    const database = new MemoryDatabase();
    await database.ensureTable({
        name: "entries",
        columns: [
            { name: "id", type: "text", primaryKey: true },
            { name: "label", type: "text" },
        ],
    });
    await database.executeCommand({
        option: "INSERT",
        table: "entries",
        values: { id: "dog", label: "Dog" },
    });
    await assert.rejects(
        database.transaction(async (executor) => {
            await executor.executeCommand({
                option: "UPDATE",
                table: "entries",
                set: { label: "Changed" },
                where: [{ column: "id", value: "dog" }],
            });
            throw new Error("rollback");
        }),
        /rollback/,
    );
    assert.deepEqual(
        (await database.executeCommand({ option: "SELECT", table: "entries" }))
            .rows,
        [{ id: "dog", label: "Dog" }],
    );
    await database.executeCommand({
        option: "INSERT",
        table: "entries",
        values: { id: "dog", label: "Updated" },
        conflict: { action: "update" },
    });
    assert.deepEqual(
        (
            await database.executeCommand({
                option: "SELECT",
                table: "entries",
                columns: ["label"],
            })
        ).rows,
        [{ label: "Updated" }],
    );
    await assert.rejects(
        database.executeCommand({
            option: "SELECT",
            table: "entries",
            where: [{ column: "label", operator: "LIKE", value: "%" }],
        }),
        /unsupported_fixture_operator/,
    );
    assert.equal(
        (await database.executeCommand({ option: "DELETE", table: "entries" }))
            .rowCount,
        1,
    );
});
