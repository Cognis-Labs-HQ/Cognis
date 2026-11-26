import assert from "node:assert/strict";
import test from "node:test";
import {
    prepareLibraryImport,
    importLibraryBatch,
} from "../../service/import.js";
import { validateCardLimits } from "../../service/card-limits.js";
import { mockLanguageSchema } from "../fixtures/mock-language.js";
import { createLibraryFlow } from "../reuse/flows.js";
import type { LibraryEntryInput, LibrarySchema } from "../../types.js";

const schema = structuredClone(mockLanguageSchema);
const word = (
    key: string,
    references: LibraryEntryInput["references"] = [],
) => ({
    key,
    schemaId: schema.id,
    layer: "words",
    label: key,
    fields: { pronunciation: [key] },
    references,
});
const document = (entries: unknown[]) => ({
    format: "cognis-library",
    version: 1,
    entries,
});

test("batch keys resolve in flat and grouped references before dependency-first writes", () => {
    const first = word("parent", [
        { entryId: "child", relation: "components", position: 0 },
    ]);
    first.referenceGroups = {
        readings: [[{ entryId: "reading", relation: "readings", position: 0 }]],
    };
    const plan = prepareLibraryImport(
        document([first, word("child"), word("reading")]),
        () => schema,
    );
    assert.equal(plan.ordered.at(-1)?.key, "parent");
    assert.equal(
        plan.ordered.at(-1)?.input.references?.[0].entryId,
        plan.ids.get("child"),
    );
    assert.equal(
        plan.ordered.at(-1)?.input.referenceGroups?.readings[0][0].entryId,
        plan.ids.get("reading"),
    );
    assert.match(plan.ids.get("parent")!, /^[a-f\d-]{36}$/u);
});

test("batch validation rejects duplicate keys, cycles, and provider-only layers", () => {
    assert.throws(
        () =>
            prepareLibraryImport(
                document([word("same"), word("same")]),
                () => schema,
            ),
        /invalid_import_key/,
    );
    assert.throws(
        () =>
            prepareLibraryImport(
                document([
                    word("one", [{ entryId: "two", relation: "components" }]),
                    word("two", [{ entryId: "one", relation: "components" }]),
                ]),
                () => schema,
            ),
        /import_dependency_cycle/,
    );
    assert.throws(
        () =>
            prepareLibraryImport(
                document([{ ...word("character"), layer: "characters" }]),
                () => schema,
            ),
        /immutable_layer/,
    );
});

test("batch validates required stroke data using the installed layer schema", () => {
    const drawing = structuredClone(schema);
    drawing.layers
        .find((layer) => layer.id === "symbols")!
        .fields!.push({
            id: "stroke_pattern",
            type: "strokePattern",
            required: true,
            metadata: { labels: { en: "Stroke Pattern" } },
        });
    assert.throws(
        () =>
            prepareLibraryImport(
                document([{ ...word("symbol"), layer: "symbols" }]),
                () => drawing,
            ),
        /field_required:stroke_pattern/,
    );
});

test("registered import flow rolls back every earlier write when a dependency is invalid", async () => {
    const persisted: string[] = [];
    const actor = { accountId: "learner", role: "user" } as const;
    await assert.rejects(
        () =>
            importLibraryBatch(
                actor,
                { scope: "user", scopeId: actor.accountId },
                document([word("valid"), word("invalid")]),
                {
                    flow: createLibraryFlow(),
                    schema: () => schema,
                    authorize: async () => ({
                        scope: "user",
                        scopeId: actor.accountId,
                    }),
                    transaction: async (operation) => {
                        const before = [...persisted];
                        try {
                            return await operation();
                        } catch (error) {
                            persisted.splice(0, persisted.length, ...before);
                            throw error;
                        }
                    },
                    create: async (input, id) => {
                        if (input.label === "invalid")
                            throw new Error("reference_not_found");
                        persisted.push(id);
                        return { ...input, id } as never;
                    },
                },
            ),
        /reference_not_found/,
    );
    assert.deepEqual(persisted, []);
});

test("user card limits reject an eleventh meaning and excess readings", () => {
    const meanings: LibrarySchema = {
        id: "limits",
        namespace: "x",
        version: 1,
        language: "x-test",
        metadata: { labels: { en: "Limits" } },
        layers: [
            {
                id: "word",
                metadata: { labels: { en: "Word" } },
                relationships: [
                    {
                        id: "meanings",
                        targetLayer: "definition",
                        metadata: { labels: { en: "Meanings" } },
                        onDelete: "detach",
                    },
                ],
            },
            {
                id: "definition",
                semanticRole: "definition",
                metadata: { labels: { en: "Definition" } },
            },
        ],
    };
    assert.throws(
        () =>
            validateCardLimits(meanings, {
                schemaId: "limits",
                layer: "word",
                label: "word",
                references: Array.from({ length: 11 }, (_, index) => ({
                    entryId: String(index),
                    relation: "meanings",
                })),
            }),
        /definition_limit/,
    );
    assert.throws(
        () =>
            validateCardLimits(meanings, {
                schemaId: "limits",
                layer: "word",
                label: "word",
                fields: { pronunciation: Array(17).fill("reading") },
            }),
        /pronunciation_limit/,
    );
});
