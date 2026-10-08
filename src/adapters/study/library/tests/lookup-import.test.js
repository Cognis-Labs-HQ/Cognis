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

test("dictionary results directly import definitions, source fields, readings, groups, and classifications", async () => {
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
            "relationship:spelling": { options: [option], append() {} },
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
        hasLookupValues: () => true,
        confirmLookupReplacement: async () => true,
        clearLookupValues: (form, draft) => {
            draft.fields = {};
            form.compositionOrder = [];
            form.referenceGroups = {};
        },
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
            inputCarouselIds: new Set(["spelling"]),
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
    assert.equal(form.elements.tags.value, "common\u001fjlpt-n5");
    assert.equal(form.elements.label.value, "教室");
    assert.equal(option.selected, true);
    assert.deepEqual(form.referenceGroups, suggestions[0].referenceGroups);
    assert.equal(button.disabled, false);
    assert.equal(toasts.at(-1)[0], "gateway.study.library_lookup_applied");
});

test("stroke-pattern lookup applies the pattern directly without dictionary preview or definition creation", async () => {
    let listener;
    let previews = 0;
    let redraws = 0;
    const field = { hasAttribute: () => true };
    const input = { value: "教" };
    const pattern = { viewBox: "0 0 109 109", strokes: [{ d: "M0 0 L1 1" }] };
    const draft = { fields: { pronunciation: ["きょう"] } };
    const context = {
        fetchLibraryLookupSuggestions: async () => [
            { fields: { stroke_pattern: pattern } },
        ],
        hasLookupValues: () => false,
        confirmLookupReplacement: async () => {
            previews += 1;
            return true;
        },
        createDefinition: async () => {
            throw new Error("unexpected definition creation");
        },
        renderStrokePatternPreviews: () => {
            redraws += 1;
        },
        showToast() {},
    };
    vm.runInNewContext(source, context);
    const form = {
        elements: { "field:stroke_pattern": field },
        querySelector: () => input,
        addEventListener: (_kind, handler) => {
            listener = handler;
        },
    };
    context.bindLookupProviders(form, draft, { t: (key) => key }, {});
    const button = {
        dataset: {
            libraryLookupProvider: "stroke-provider",
            libraryLookupKind: "strokePattern",
        },
    };
    await listener({ target: { closest: () => button } });
    assert.equal(previews, 0);
    assert.equal(button.hidden, true);
    assert.equal(redraws, 1);
    assert.equal(field.libraryFieldValue, pattern);
    assert.equal(draft.fields.stroke_pattern, pattern);
    assert.deepEqual(draft.fields.pronunciation, ["きょう"]);
    assert.equal(button.disabled, false);
});

test("canceling replacement avoids the request and preserves existing values", async () => {
    let listener;
    let requests = 0;
    const input = { value: "教" };
    const draft = { fields: { pronunciation: ["original"] } };
    const context = {
        hasLookupValues: () => true,
        confirmLookupReplacement: async () => false,
        fetchLibraryLookupSuggestions: async () => {
            requests += 1;
        },
        showToast() {},
    };
    vm.runInNewContext(source, context);
    const form = {
        querySelector: () => input,
        addEventListener: (_type, handler) => {
            listener = handler;
        },
    };
    context.bindLookupProviders(form, draft, {}, {});
    const button = { dataset: {} };
    await listener({ target: { closest: () => button } });
    assert.equal(requests, 0);
    assert.deepEqual(draft.fields.pronunciation, ["original"]);
    assert.equal(button.disabled, false);
});

test("failed and empty stroke lookups leave the lookup button available", async () => {
    for (const result of [[], [{ fields: {} }], new Error("upstream")]) {
        let listener;
        const draft = { fields: {} };
        const context = {
            hasLookupValues: () => false,
            fetchLibraryLookupSuggestions: async () => {
                if (result instanceof Error) throw result;
                return result;
            },
            showToast() {},
        };
        vm.runInNewContext(source, context);
        const form = {
            querySelector: () => ({ value: "教" }),
            addEventListener: (_type, handler) => {
                listener = handler;
            },
        };
        context.bindLookupProviders(form, draft, { t: (key) => key }, {});
        const button = {
            dataset: { libraryLookupKind: "strokePattern" },
            hidden: false,
        };
        await listener({ target: { closest: () => button } });
        assert.equal(button.hidden, false);
        assert.equal(button.disabled, false);
        assert.deepEqual(draft.fields, {});
    }
});

test("lookup populates the visible composition input when no authored spelling components exist", async () => {
    let listener;
    const input = {
        value: "教室",
        hasAttribute: () => false,
        dispatchEvent() {},
    };
    const form = {
        querySelector: () => input,
        referenceGroups: {},
        elements: {
            label: { value: "教室" },
            class: { value: "" },
            tags: { value: "", dispatchEvent() {} },
        },
        addEventListener: (_type, handler) => {
            listener = handler;
        },
        dispatchEvent() {},
    };
    const context = {
        Event,
        structuredClone,
        hasLookupValues: () => false,
        fetchLibraryLookupSuggestions: async () => [
            { label: "教室", fields: {} },
        ],
        clearLookupValues: (form, draft) => {
            form.compositionOrder = [];
            draft.fields = {};
        },
        renderStrokePatternPreviews() {},
        showToast() {},
    };
    vm.runInNewContext(source, context);
    context.bindLookupProviders(
        form,
        { fields: {} },
        { t: (key) => key },
        { schema: { layers: [] }, layer: { relationships: [] }, entries: [] },
    );
    await listener({ target: { closest: () => ({ dataset: {} }) } });
    assert.equal(input.value, "教室");
    assert.equal(form.elements.label.value, "教室");
});
