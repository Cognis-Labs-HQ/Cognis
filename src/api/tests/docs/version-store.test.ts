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

test("document version store compares two immutable version hashes", async () => {
    const database = new InMemoryTestExecutor();
    const store = createDocumentVersionStoreCapability().createStore({
        namespace: "legal-diff",
        database,
        documents: { terms: "/terms", privacy: "/privacy" },
    });
    await store.ensureSchema();
    const previous = await store.publish({
        slug: "terms",
        content: "Heading\nRemoved\nAnchor\nOld wording\nEnd",
        actorId: "admin",
    });
    const next = await store.publish({
        slug: "terms",
        content: "Heading\nAnchor\nNew wording\nEnd\nAdded",
        actorId: "admin",
    });

    assert.equal((await store.getVersion(previous.version))?.id, previous.id);
    const comparison = await store.diff(previous.version, next.version);
    assert.equal(comparison.slug, "terms");
    assert.deepEqual(
        comparison.lines.map((line) => line.type),
        ["unchanged", "removed", "unchanged", "changed", "unchanged", "added"],
    );
    assert.deepEqual(comparison.lines[3], {
        type: "changed",
        oldContent: "Old wording",
        newContent: "New wording",
        oldLine: 4,
        newLine: 3,
    });
});

test("document version store rejects missing and unrelated version hashes", async () => {
    const database = new InMemoryTestExecutor();
    const store = createDocumentVersionStoreCapability().createStore({
        namespace: "legal-diff-validation",
        database,
        documents: { terms: "/terms", privacy: "/privacy" },
    });
    await store.ensureSchema();
    const terms = await store.publish({
        slug: "terms",
        content: "Terms",
        actorId: "admin",
    });
    const privacy = await store.publish({
        slug: "privacy",
        content: "Privacy",
        actorId: "admin",
    });

    await assert.rejects(
        store.diff(terms.version, "missing-version"),
        /document_version_not_found/,
    );
    await assert.rejects(
        store.diff(terms.version, privacy.version),
        /document_versions_do_not_match/,
    );
});
