import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { findMatchingEntry } from "../ui/app/create-entry/entry-match.js";
import { resolveLookupReferences } from "../ui/app/create-entry/lookup-references.js";
const source = readFileSync(
    new URL("../ui/app/create-entry/lookup-prerequisites.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");
const schema = {
    id: "ja",
    version: 1,
    layers: [
        {
            id: "words",
            relationships: [{ id: "spelling", targetLayer: "kanji" }],
        },
        {
            id: "kanji",
            semanticRole: "compoundWritingUnit",
            relationships: [{ id: "definitions", targetLayer: "definitions" }],
        },
        {
            id: "definitions",
            semanticRole: "definition",
            definitionLocalization: { translationsField: "translations" },
        },
        { id: "kana", semanticRole: "atomicWritingUnit" },
    ],
};
const input = {
    label: "室室",
    prerequisites: [{ key: "room", layer: "kanji", label: "室" }],
    references: [
        { entryId: "room", relation: "spelling", position: 0 },
        { entryId: "room", relation: "spelling", position: 1 },
    ],
    linkedEntries: [
        {
            key: "reading",
            entry: {
                schemaId: "ja",
                layer: "words",
                hidden: true,
                label: "しつ",
                references: [{ entryId: "room", relation: "spelling" }],
            },
        },
    ],
};
function session(overrides = {}) {
    let lookups = 0,
        creates = 0,
        saved;
    const entries = [];
    const context = {
        findMatchingEntry,
        resolveLookupReferences,
        DEFINITION_LANGUAGES: ["en"],
        separateLookupDefinitions: (value) => value ?? [],
        fetchLibraryLookupSuggestions: async () => {
            lookups += 1;
            return [
                {
                    label: "室",
                    fields: { pronunciation: ["しつ"] },
                    definitions: [{ translations: { en: "room" } }],
                },
            ];
        },
        createLibraryEntry: async (location, candidate) => {
            creates += 1;
            saved = candidate;
            return { ...candidate, id: "kanji-room", ...location };
        },
        ...overrides,
    };
    vm.runInNewContext(source, context);
    const options = {
        providerId: "jisho",
        schema,
        layer: schema.layers[0],
        entries,
        location: { scope: "global", scopeId: "global" },
    };
    return {
        run: (value) => context.resolveLookupPrerequisites(value, options),
        entries,
        stats: () => ({ lookups, creates, saved }),
    };
}
test("missing Kanji are committed once and canonical IDs replace every spelling link", async () => {
    const h = session();
    const result = await h.run(input);
    assert.deepEqual(
        Array.from(result.references, (ref) => ref.entryId),
        ["kanji-room", "kanji-room"],
    );
    assert.equal(
        result.linkedEntries[0].entry.references[0].entryId,
        "kanji-room",
    );
    assert.equal(
        h.stats().saved.linkedEntries[0].entry.fields.translations.en,
        "room",
    );
    assert.equal(h.entries[0].scope, "global");
    await h.run(input);
    assert.equal(h.stats().lookups, 1);
    assert.equal(h.stats().creates, 1);
});
test("read-only atomic characters cannot be created as dictionary prerequisites", async () => {
    const h = session();
    await assert.rejects(
        h.run({
            prerequisites: [{ key: "atomic", layer: "kana", label: "あ" }],
        }),
        /invalid_lookup_prerequisite/,
    );
    assert.equal(h.stats().creates, 0);
    assert.equal(h.stats().lookups, 0);
});
test("a concurrent global conflict reuses its canonical ID but cannot reuse a private dependency", async () => {
    for (const scope of ["global", "user"]) {
        const h = session({
            createLibraryEntry: async () => {
                const error = new Error("content_conflict");
                error.details = { conflictEntryId: "existing" };
                throw error;
            },
            fetchLibraryEntry: async () => ({
                entry: {
                    id: "existing",
                    schemaId: "ja",
                    layer: "kanji",
                    label: "室",
                    scope,
                    scopeId: scope === "global" ? "global" : "other",
                },
            }),
        });
        if (scope === "user")
            await assert.rejects(
                h.run(input),
                /lookup_prerequisite_scope_conflict/,
            );
        else
            assert.equal(
                (await h.run(input)).references[0].entryId,
                "existing",
            );
    }
});

test("imported spelling references expire when the vocabulary input changes", () => {
    const context = {};
    vm.runInNewContext(source, context);
    const imported = [{ entryId: "room", relation: "spelling", position: 0 }];
    const existing = [{ entryId: "meaning", relation: "definitions" }];
    const form = {
        elements: { label: { value: "室" } },
        libraryLookupLabel: "室",
        libraryLookupReferences: imported,
    };
    const references = context.lookupCompositionReferences(form, existing);
    assert.deepEqual(
        Array.from(references, ({ entryId }) => entryId),
        ["meaning", "room"],
    );
    form.elements.label.value = "教室";
    assert.equal(context.lookupCompositionReferences(form, existing), existing);
});

test("required Kanji stroke fields are completed through the registered auxiliary provider", async () => {
    const configured = structuredClone(schema);
    configured.layers[1].fields = [{ id: "stroke_pattern", required: true }];
    const pattern = { strokes: [{ path: "M1 1L2 2" }] };
    let saved,
        assetQueries = 0;
    const context = {
        findMatchingEntry,
        resolveLookupReferences,
        DEFINITION_LANGUAGES: ["en"],
        separateLookupDefinitions: (value) => value ?? [],
        fetchLibraryLookupProviders: async () => [
            {
                id: "kanjivg",
                fields: ["stroke_pattern"],
                capabilities: ["strokePattern"],
            },
        ],
        fetchLibraryLookupSuggestions: async (provider) =>
            provider === "kanjivg"
                ? ((assetQueries += 1),
                  [{ fields: { stroke_pattern: pattern } }])
                : [{ label: "室", fields: { pronunciation: ["しつ"] } }],
        createLibraryEntry: async (location, candidate) => {
            saved = candidate;
            return { ...candidate, ...location, id: "room" };
        },
    };
    vm.runInNewContext(source, context);
    await context.resolveLookupPrerequisites(input, {
        providerId: "jisho",
        schema: configured,
        layer: configured.layers[0],
        entries: [],
        location: { scope: "global", scopeId: "global" },
    });
    assert.equal(saved.fields.stroke_pattern, pattern);
    assert.equal(assetQueries, 1);
});
