import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDocSlug } from "../reuse/docs-link-normalizer.js";

const docs = [
    { slug: "index", sourcePath: "docs/index" },
    { slug: "overview", sourcePath: "docs/overview" },
    { slug: "gateways/db", sourcePath: "gateways/db/docs/index" },
    {
        slug: "adapters/db/sqlite",
        sourcePath: "adapters/db/sqlite/docs/index",
    },
];

test("docs links normalize repository-relative markdown paths to docs slugs", () => {
    assert.equal(
        normalizeDocSlug("../gateways/db/docs/index.en.md", docs[0], docs),
        "gateways/db",
    );
});

test("docs links drop existing language query parameters", () => {
    assert.equal(
        normalizeDocSlug(
            "../gateways/db/docs/index.en.md?langs=en",
            docs[0],
            docs,
        ),
        "gateways/db",
    );
});

test("docs links resolve relative paths from nested docs", () => {
    assert.equal(
        normalizeDocSlug(
            "../../../../gateways/db/docs/index.en.md",
            docs[3],
            docs,
        ),
        "gateways/db",
    );
});

test("docs links keep API docs paths as slugs", () => {
    assert.equal(
        normalizeDocSlug("/api/v1/docs/gateways/db?langs=en", docs[0], docs),
        "gateways/db",
    );
});
