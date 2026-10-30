import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { structuredStore } from "../../../../../gateways/reuse/tests/structured-store.js";
import { LibraryStore } from "../../store.js";
import { inspectContentPack } from "../../content-pack.js";
import { validateLibrarySchema } from "../../layers.js";

async function plan() {
    const value = await inspectContentPack(
        fileURLToPath(new URL("../fixtures/external-pack/", import.meta.url)),
    );
    value.schema = validateLibrarySchema({
        ...value.schema,
        metadata: {
            ...value.schema.metadata,
            description: "説明𠮷".repeat(40000),
        },
    });
    return value;
}

test("large valid schemas register idempotently and retain immutable version checks across restarts", async () => {
    const fixture = structuredStore();
    const store = new LibraryStore(fixture.db);
    await store.ensureSchema();
    const { schema } = await plan();
    assert.ok(Buffer.byteLength(JSON.stringify(schema)) > 65535);
    await store.saveSchema(schema);
    const recreated = new LibraryStore(fixture.db);
    await recreated.saveSchema(schema);
    await assert.rejects(
        recreated.saveSchema({
            ...schema,
            metadata: { labels: { en: "Changed" } },
        }),
        /schema_version_conflict/,
    );
});

test("pack schema replacement rolls back partial chunks and preserves sole-publisher update policy", async () => {
    const fixture = structuredStore();
    const store = new LibraryStore(fixture.db);
    await store.ensureSchema();
    const original = await plan();
    await store.ingestContentPack(original);
    const next = {
        ...original,
        manifest: { ...original.manifest, version: "9.0.0" },
        schema: {
            ...original.schema,
            metadata: {
                ...original.schema.metadata,
                description: "新説明𠮷".repeat(40000),
            },
        },
    };
    fixture.fail(
        (command) =>
            command.option === "INSERT" &&
            command.table === "study_library_schema_parts",
    );
    await assert.rejects(store.ingestContentPack(next), /storage_failed/);
    fixture.fail(() => false);
    await new LibraryStore(fixture.db).saveSchema(original.schema);
    await store.ingestContentPack(next);
    await new LibraryStore(fixture.db).saveSchema(next.schema);
    const smaller = {
        ...next,
        manifest: { ...next.manifest, version: "9.0.1" },
        schema: { ...next.schema, metadata: { labels: { en: "Short" } } },
    };
    await store.ingestContentPack(smaller);
    assert.equal(fixture.rows("study_library_schema_parts").length, 0);
    await new LibraryStore(fixture.db).saveSchema(smaller.schema);
});
