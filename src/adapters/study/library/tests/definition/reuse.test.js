import { loadLibraryUiModule } from "../reuse/ui-module.ts";
import { DEFINITION_LANGUAGES } from "../../ui/app/definition-languages.js";
import assert from "node:assert/strict";
import test from "node:test";
import { findMatchingEntry } from "../../ui/app/create-entry/entry-match.js";

const schema = {
    id: "ja",
    version: 88,
    layers: [
        {
            id: "definitions",
            definitionLocalization: { translationsField: "translations" },
        },
    ],
};

test("dictionary definitions reuse case-equivalent cards and immediately cache new definitions", async () => {
    let posts = 0;
    const entries = [
        {
            id: "existing",
            schemaId: "ja",
            layer: "definitions",
            label: "Classroom",
            scope: "global",
        },
    ];
    const context = {
        findMatchingEntry,
        DEFINITION_LANGUAGES,
        createLibraryEntry: async (_location, input) => {
            posts += 1;
            return { ...input, id: "new", scope: "global" };
        },
    };
    Object.assign(
        context,
        loadLibraryUiModule("app/create-entry/definition-editor.js", context),
    );
    const create = (text) =>
        context.createDefinition({
            schema,
            layerId: "definitions",
            entries,
            translations: { en: text },
            location: { scope: "global" },
        });
    assert.equal((await create(" classroom ")).entry.id, "existing");
    assert.equal(posts, 0);
    assert.equal((await create("Room")).created, true);
    assert.equal((await create("room")).entry.id, "new");
    assert.equal(posts, 1);
});

test("definition reuse follows the destination scope", () => {
    const entries = [
        {
            id: "private",
            schemaId: "ja",
            layer: "definitions",
            label: "Room",
            scope: "user",
            scopeId: "author",
        },
        {
            id: "class",
            schemaId: "ja",
            layer: "definitions",
            label: "Room",
            scope: "class",
            scopeId: "class-a",
        },
    ];
    const input = { schemaId: "ja", layer: "definitions", label: "room" };
    assert.equal(
        findMatchingEntry(entries, input, { scope: "global" }),
        undefined,
    );
    assert.equal(
        findMatchingEntry(entries, input, {
            scope: "class",
            scopeId: "class-b",
        }),
        undefined,
    );
    assert.equal(
        findMatchingEntry(entries, input, {
            scope: "class",
            scopeId: "class-a",
        }).id,
        "class",
    );
});
