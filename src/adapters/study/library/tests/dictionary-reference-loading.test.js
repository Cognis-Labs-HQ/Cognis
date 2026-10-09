import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function source(file) {
    return readFileSync(new URL(file, import.meta.url), "utf8")
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/\bexport /g, "");
}

test("dictionary previews fetch selected references and pronunciation characters", async () => {
    const calls = [];
    const context = vm.createContext({
        fetchLibraryLocations: async () => ({
            readable: [{ scope: "global", scopeId: "global" }],
        }),
        fetchLibraryEntries: async (filters) => {
            calls.push(filters);
            return [{ id: filters.layer }];
        },
    });
    vm.runInContext(source("../ui/app/search/references.js"), context);
    const schema = {
        id: "test",
        layers: [
            {
                id: "words",
                relationships: [
                    { id: "spelling", targetLayer: "symbols" },
                    {
                        id: "reading",
                        targetLayer: "characters",
                        presentationRole: "pronunciation",
                    },
                ],
            },
            { id: "symbols" },
            { id: "characters", semanticRole: "atomicWritingUnit" },
        ],
    };
    const entries = await context.loadDictionaryReferences(
        [
            {
                schemaId: "test",
                layer: "words",
                fields: { pronunciation: ["ab"] },
                references: [{ relation: "spelling", entryId: "symbol" }],
            },
        ],
        [schema],
    );
    assert.equal(entries.length, 2);
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
        {
            scope: "global",
            scopeId: "global",
            schemaId: "test",
            layer: "symbols",
            entryIds: ["symbol"],
        },
        {
            scope: "global",
            scopeId: "global",
            schemaId: "test",
            layer: "symbols",
            sourceRecordIds: ["symbol"],
        },
        {
            scope: "global",
            scopeId: "global",
            schemaId: "test",
            layer: "characters",
        },
    ]);
});

test("visible detail fields honor hidden metadata and detail presentation", () => {
    const context = vm.createContext({});
    vm.runInContext(source("../ui/app/presentation.js"), context);
    const fields = context.visibleDetailFields({
        fields: [
            { id: "meaning" },
            { id: "source", hidden: true },
            { id: "internal", detail: { hidden: true } },
        ],
    });
    assert.deepEqual(
        Array.from(fields, (value) => value.id),
        ["meaning"],
    );
});
