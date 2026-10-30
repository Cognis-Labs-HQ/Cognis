import { loadLibraryUiModule } from "../reuse/ui-module.ts";
import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

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
    Object.assign(
        context,
        loadTestModule(
            new URL("../../ui/app/search/references.js", import.meta.url),
            {
                "/static/gateways/study/library-client.js": context,
            },
            context,
        ),
    );
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
    Object.assign(context, loadLibraryUiModule("app/presentation.js", context));
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
