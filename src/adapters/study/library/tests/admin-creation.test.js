import { findMatchingEntry } from "../ui/app/create-entry/entry-match.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
    new URL("../ui/app/create-entry/index.js", import.meta.url),
    "utf8",
);

test("global writers see no publish checkboxes and create globally without checking any option", () => {
    const start = source.indexOf("    const publishControls =");
    const end = source.indexOf("    const { html, builder }", start);
    const scopeStart = source.indexOf("        let publishEveryone =");
    const scopeEnd = source.indexOf("        const references =", scopeStart);
    const context = {
        canPublishEveryone: true,
        access: { readable: [{ scope: "global" }] },
        writableClasses: [{ scopeId: "class-a" }],
        compositionInput: "",
        constructor: {},
        editingLayer: {},
        entries: [],
        schema: {},
        i18n: { t: (key) => key },
        renderInfoTooltip: () => "",
        renderComposerExtras: () => "",
        escapeHtml: (value) => value,
        form: { elements: {} },
    };
    vm.runInNewContext(
        source.slice(start, end) +
            "\nglobalThis.html = publishControls;\n" +
            source.slice(scopeStart, scopeEnd) +
            "\nglobalThis.destination = {scope, scopeId};",
        context,
    );
    assert.doesNotMatch(
        context.html,
        /name="publishEveryone"|name="publishClass"/,
    );
    assert.equal(context.destination.scope, "global");
    assert.equal(context.destination.scopeId, "global");
});

test("inline definitions for global cards do not reuse private cards or save to personal scope", async () => {
    const definitionSource = readFileSync(
        new URL("../ui/app/create-entry/definition-editor.js", import.meta.url),
        "utf8",
    )
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/\bexport /g, "");
    let saved;
    const context = {
        findMatchingEntry,
        DEFINITION_LANGUAGES: ["de", "en", "id", "ja"],
        createLibraryEntry: async (location, input) => {
            saved = { location, input };
            return { id: "global-definition", ...input };
        },
    };
    vm.runInNewContext(definitionSource, context);
    const result = await context.createDefinition({
        schema: {
            id: "test",
            version: 1,
            layers: [
                {
                    id: "definitions",
                    definitionLocalization: {
                        translationsField: "translations",
                    },
                },
            ],
        },
        layerId: "definitions",
        location: { scope: "global", scopeId: "global" },
        translations: { en: "classroom" },
        entries: [
            {
                id: "private-definition",
                schemaId: "test",
                layer: "definitions",
                label: "classroom",
                scope: "user",
            },
        ],
    });
    assert.equal(result.created, true);
    assert.equal(saved.location.scope, "global");
    assert.equal(result.entry.id, "global-definition");
});
