import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
    new URL("../ui/app/create-entry/lookups.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");

test("accepted dictionary results import definitions, source fields, readings, groups, and classifications", async () => {
    const suggestions = [
        {
            label: "教室",
            class: "lexical:noun",
            tags: ["common", "jlpt-n5"],
            fields: {
                pronunciation: ["きょうしつ"],
                dictionary_data:
                    '{"slug":"教室","senses":[{"info":["source note"]}]}',
            },
            definitions: [
                {
                    translations: {
                        en: "classroom",
                        de: "Klassenzimmer",
                        id: "ruang kelas",
                        ja: "教室",
                    },
                },
            ],
            references: [
                { entryId: "kanji", relation: "spelling", position: 0 },
            ],
            referenceGroups: {
                "reading-kana": [
                    [
                        {
                            entryId: "kana",
                            relation: "reading-kana",
                            position: 0,
                        },
                    ],
                ],
            },
        },
    ];
    const imports = [];
    const toasts = [];
    let listener;
    let redraws = 0;
    const pronunciation = {
        value: "",
        hasAttribute: () => false,
        dispatchEvent: () => {
            redraws += 1;
        },
    };
    const option = { value: "kanji", selected: false };
    const input = {
        value: "教室",
        dataset: {},
        hasAttribute: () => true,
        setCustomValidity() {},
        dispatchEvent() {},
    };
    const form = {
        libraryGeneratedPronunciation: ["stale"],
        referenceGroups: {},
        elements: {
            label: { value: "教室" },
            class: { value: "" },
            tags: { value: "original", dispatchEvent() {} },
            "field:pronunciation": pronunciation,
            "relationship:spelling": { options: [option] },
        },
        addEventListener: (_type, handler) => {
            listener = handler;
        },
        querySelector: () => input,
        dispatchEvent() {},
    };
    const context = {
        Event,
        RadioNodeList: class {},
        structuredClone,
        fetchLibraryLookupSuggestions: async () => suggestions,
        chooseLookupSuggestion: async (results) => results[0],
        createDefinition: async (request) => {
            imports.push(request);
            return { created: true, entry: { id: "new-definition" } };
        },
        linkDefinition: (_form, _schema, _layer, entries, definition) =>
            entries.push(definition),
        renderStrokePatternPreviews() {},
        showToast: (...args) => toasts.push(args),
    };
    vm.runInNewContext(source, context);
    const schema = {
        layers: [{ id: "definitions", semanticRole: "definition" }],
    };
    const entries = [];
    const nestedDefinitionIds = [];
    const draft = { fields: {} };
    context.bindLookupProviders(
        form,
        draft,
        { t: (key) => key },
        {
            schema,
            layer: {
                relationships: [
                    { id: "definitions", targetLayer: "definitions" },
                ],
            },
            entries,
            nestedDefinitionIds,
        },
    );
    const button = {
        dataset: { libraryLookupProvider: "provider" },
        disabled: false,
    };
    await listener({ target: { closest: () => button } });
    assert.equal(imports.length, 1);
    assert.deepEqual(
        imports[0].translations,
        suggestions[0].definitions[0].translations,
    );
    assert.deepEqual(nestedDefinitionIds, ["new-definition"]);
    assert.deepEqual(draft.fields, suggestions[0].fields);
    assert.equal(pronunciation.value, "きょうしつ");
    assert.equal(redraws, 1);
    assert.equal(form.elements.class.value, "lexical:noun");
    assert.equal(form.elements.tags.value, "original\u001fcommon\u001fjlpt-n5");
    assert.equal(form.elements.label.value, "教室");
    assert.equal(option.selected, true);
    assert.deepEqual(form.referenceGroups, suggestions[0].referenceGroups);
    assert.equal(button.disabled, false);
    assert.equal(toasts.at(-1)[0], "gateway.study.library_lookup_applied");
});
