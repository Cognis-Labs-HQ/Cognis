import test from "node:test";
import assert from "node:assert/strict";
import { loadDocsIndex, loadDocsBundleMarkdown } from "../docs-client.js";

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

test("bundle reads pin one version, include all views, and preserve cancellation", async () => {
    const requested = [];
    const controller = new AbortController();
    const text = await loadDocsBundleMarkdown(
        { slug: "gateways/example", version: "2.0.0" },
        {
            languages: ["de", "en"],
            signal: controller.signal,
            fetchDocs: async (path, options) => {
                assert.equal(options.signal, controller.signal);
                requested.push(path);
                return {
                    ok: true,
                    json: async () => ({
                        data: {
                            markdown: path.includes("/technical?")
                                ? "Technical term"
                                : path.includes("/usage?")
                                  ? "Usage term"
                                  : "Info term",
                        },
                    }),
                };
            },
        },
    );
    assert.deepEqual(text.split("\n\n"), [
        "Info term",
        "Usage term",
        "Technical term",
    ]);
    assert.equal(requested.length, 3);
    assert.ok(
        requested.every(
            (path) =>
                path.startsWith("/api/v1/docs/2.0.0/gateways/example") &&
                path.endsWith("langs=de%2Cen"),
        ),
    );
    controller.abort();
    await assert.rejects(
        loadDocsBundleMarkdown(
            { slug: "gateways/example", version: "2.0.0" },
            {
                signal: controller.signal,
                fetchDocs: () => {
                    throw new Error(
                        "Aborted reads must not reach the transport",
                    );
                },
            },
        ),
        { name: "AbortError" },
    );
});
