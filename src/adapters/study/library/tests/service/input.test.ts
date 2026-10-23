import assert from "node:assert/strict";
import test from "node:test";
import { validateEntryFields } from "../../service/input.js";
import type { LibrarySchema } from "../../types.js";

const schema: LibrarySchema = {
    id: "test",
    version: 1,
    namespace: "test",
    language: "en",
    metadata: { labels: { en: "Test" } },
    layers: [
        {
            id: "words",
            metadata: { labels: { en: "Words" } },
            fields: [
                {
                    id: "text",
                    type: "string",
                    metadata: { labels: { en: "Text" } },
                },
            ],
        },
    ],
};

test("card field budgets count Unicode bytes and the normalized searchable value", () => {
    validateEntryFields(schema, "words", { text: "猫".repeat(10000) });
    for (const text of [
        "a".repeat(50000),
        "猫".repeat(17000),
        "İ".repeat(17000),
    ]) {
        assert.ok(text.length < 100000);
        assert.throws(
            () => validateEntryFields(schema, "words", { text }),
            /fields_too_large/,
        );
    }
});
