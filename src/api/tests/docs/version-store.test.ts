import assert from "node:assert/strict";
import test from "node:test";
import { createDocumentVersionStoreCapability } from "../../reuse/document-version-store.js";
import { InMemoryTestExecutor } from "../../../gateways/db/tests/in-memory-test-executor.js";

test("document version store appends immutable cryptographic versions", async () => {
    const database = new InMemoryTestExecutor();
    const store = createDocumentVersionStoreCapability().createStore({
        namespace: "legal",
        database,
        documents: { terms: "/terms" },
    });
    await store.ensureSchema();

    const first = await store.publish({
        slug: "terms",
        content: "first",
        actorId: "admin",
    });
    const second = await store.publish({
        slug: "terms",
        content: "second",
        actorId: "admin",
    });

    assert.match(first.version, /^[0-9a-f]{8}-[0-9a-f-]{27}$/);
    assert.notEqual(first.version, second.version);
    const rows = await database.executeCommand({
        option: "SELECT",
        table: "core_document_versions",
    });
    assert.equal(rows.rows?.length, 2);
    assert.equal((await store.getLatest("terms"))?.markdown, "second");

    await store.deleteAll();
    assert.equal(await store.getLatest("terms"), null);
});

test("document version store normalizes driver-native dates", async () => {
    const rows: Array<Record<string, unknown>> = [];
    const database = {
        async ensureTable() {},
        async executeCommand(command: Record<string, unknown>) {
            if (command.option === "INSERT") {
                rows.push(command.values as Record<string, unknown>);
                return {};
            }
            return {
                rows: rows.map((row) => ({
                    ...row,
                    published_at: new Date(String(row.published_at)),
                })),
            };
        },
    };
    const store = createDocumentVersionStoreCapability().createStore({
        namespace: "legal-date-driver",
        database,
        documents: { terms: "/terms" },
    });
    await store.publish({
        slug: "terms",
        content: "driver date",
        actorId: "admin",
    });

    assert.equal((await store.getLatest("terms"))?.markdown, "driver date");
});
