import test from "node:test";
import assert from "node:assert/strict";
import { loadDocsIndex } from "../docs-client.js";

test("docs index loader returns an empty list for unsuccessful responses", async () => {
    const docs = await loadDocsIndex({
        fetchDocs: async () => ({ ok: false }),
    });
    assert.deepEqual(docs, []);
});

test("docs index loader returns an empty list when the request fails", async () => {
    const docs = await loadDocsIndex({
        fetchDocs: async () => {
            throw new Error("network unavailable");
        },
    });
    assert.deepEqual(docs, []);
});

test("docs index loader rejects malformed index data", async () => {
    const docs = await loadDocsIndex({
        fetchDocs: async () => ({
            ok: true,
            async json() {
                return { error: { code: "docs_unavailable" } };
            },
        }),
    });
    assert.deepEqual(docs, []);
});

test("docs index loader rejects malformed JSON", async () => {
    const docs = await loadDocsIndex({
        fetchDocs: async () => ({
            ok: true,
            async json() {
                throw new SyntaxError("invalid JSON");
            },
        }),
    });
    assert.deepEqual(docs, []);
});

test("docs index loader keeps only object entries", async () => {
    const entry = { slug: "overview" };
    const docs = await loadDocsIndex({
        fetchDocs: async () => ({
            ok: true,
            async json() {
                return { data: [entry, null, "invalid", []] };
            },
        }),
    });
    assert.deepEqual(docs, [entry]);
});
