import { loadLibraryUiModule } from "../reuse/ui-module.ts";
import { LIBRARY_COMPOSER_LIMITS } from "../../ui/app/composer-limits.js";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { separateLookupDefinitions } from "../../ui/app/create-entry/lookup-definitions.js";
import { resolveLookupReferences } from "../../ui/app/create-entry/lookup-references.js";

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
    const listeners = new Map();
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
        value: "",
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
        addEventListener: (type, handler) => {
            listeners.set(type, handler);
            if (type === "click") listener = handler;
        },
        querySelector: (selector) =>
            selector.startsWith("[data-library-lookup-provider=")
                ? button
                : input,
        querySelectorAll: () => [button],
        dispatchEvent() {},
    };
    const context = {
        CSS: { escape: (value) => value },
        resolveLookupPrerequisites: async (suggestion) => suggestion,
        resolveLookupReferences,
        LIBRARY_COMPOSER_LIMITS,
        separateLookupDefinitions,
        chooseLookupSuggestion: async (suggestions) => suggestions[0],
        Event,
        RadioNodeList: class {},
        structuredClone,
        fetchLibraryLookupSuggestions: async (_provider, input) => {
            assert.equal(input.label, suggestions[0].label);
            return suggestions;
        },
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
    Object.assign(
        context,
        loadLibraryUiModule("app/create-entry/lookups.js", context),
    );
    const schema = {
        id: "test",
        version: 1,
        layers: [
            { id: "definitions", semanticRole: "definition" },
            { id: "kana", semanticRole: "atomicWritingUnit" },
            { id: "kanji", semanticRole: "compoundWritingUnit" },
        ],
    };
    const entries = [
        { id: "kanji", schemaId: "test", layer: "kanji", schemaVersion: 1 },
        { id: "kana", schemaId: "test", layer: "kana", schemaVersion: 1 },
    ];
    const nestedDefinitionIds = [];
    const draft = { fields: {} };
    context.bindLookupProviders(
        form,
        draft,
        { t: (key) => key },
        {
            schema,
            layer: {
                semanticRole: "lexicalUnit",
                relationships: [
                    { id: "definitions", targetLayer: "definitions" },
                    { id: "spelling", targetLayer: "kanji" },
                    { id: "kana-components", targetLayer: "kana" },
                    { id: "reading-kana", targetLayer: "kana" },
                ],
            },
            entries,
            nestedDefinitionIds,
            inputCarouselIds: new Set(["spelling", "kana-components"]),
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
    assert.equal(button.hidden, true);
    assert.equal(toasts.at(-1)[0], "gateway.study.library_lookup_applied");

    // Search results without spelling links commit their character composition
    // during import, without pressing any suggestion controls.
    const characters = ["テ", "ス", "ト"].map((label, index) => ({
        id: `character-${index}`,
        schemaId: schema.id,
        layer: "kana",
        label,
    }));
    entries.push(...characters);
    const options = characters.map(({ id }) => ({
        value: id,
        selected: false,
    }));
    form.elements["relationship:kana-components"] = { options, append() {} };
    form.elements.label.value = "テスト";
    input.hasAttribute = () => false;
    await listeners.get("library-import-dictionary")({
        type: "library-import-dictionary",
        detail: {
            providerId: "provider",
            suggestion: {
                label: "テスト",
                fields: { pronunciation: ["てすと"] },
            },
        },
        target: { closest: () => button },
    });
    assert.deepEqual(
        Array.from(form.compositionOrder),
        characters.map(({ id }) => id),
    );
    assert.ok(options.every(({ selected }) => selected));
    assert.equal(input.value, "");
    assert.equal(pronunciation.value, "てすと");
    assert.equal(form.elements.label.value, "テスト");
    assert.equal(button.hidden, true);
    assert.equal(button.dataset.libraryLookupApplied, "テスト");
    assert.equal(toasts.at(-1)[0], "gateway.study.library_lookup_applied");
    const kana = ["こ", "っ", "ち"].map((label, index) => ({
        id: `small-kana-${index}`,
        schemaId: schema.id,
        layer: "kana",
        label,
        hidden: label === "っ",
    }));
    entries.push(...kana);
    const kanaOptions = kana.map(({ id }) => ({ value: id, selected: false }));
    form.elements["relationship:kana-components"] = {
        options: kanaOptions,
        append() {},
    };
    for (const label of ["こっち", "っち", "こっこ"]) {
        for (const option of kanaOptions) option.selected = false;
        form.elements.label.value = label;
        input.value = label;
        await listeners.get("library-import-dictionary")({
            type: "library-import-dictionary",
            detail: {
                providerId: "provider",
                suggestion: { label, fields: { pronunciation: [label] } },
            },
            target: { closest: () => button },
        });
        assert.deepEqual(
            Array.from(form.compositionOrder),
            [...label].map(
                (character) => kana.find(({ label }) => label === character).id,
            ),
        );
        assert.equal(input.value, "");
        assert.equal(form.elements.label.value, label);
        assert.equal(pronunciation.value, label);
        assert.equal(button.hidden, true);
    }
    // Looking up raw vocabulary in the composer commits it just like importing a search result.
    suggestions[0] = { label: "こっち", fields: { pronunciation: ["こっち"] } };
    form.compositionOrder = [];
    input.value = "こっち";
    form.elements.label.value = "こっち";
    await listener({ target: { closest: () => button } });
    assert.deepEqual(
        Array.from(form.compositionOrder),
        kana.map(({ id }) => id),
    );
    assert.equal(input.value, "");
    assert.equal(button.hidden, true);
    form.elements.label.value = "変更";
    listeners.get("input")();
    assert.equal(button.hidden, false);
    assert.equal(button.dataset.libraryLookupApplied, undefined);
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
        resolveLookupPrerequisites: async (suggestion) => suggestion,
        resolveLookupReferences,
        LIBRARY_COMPOSER_LIMITS,
        separateLookupDefinitions,
        chooseLookupSuggestion: async (suggestions) => suggestions[0],
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
    Object.assign(
        context,
        loadLibraryUiModule("app/create-entry/lookups.js", context),
    );
    const form = {
        elements: { "field:stroke_pattern": field },
        querySelector: () => input,
        addEventListener: (type, handler) => {
            if (type === "click") listener = handler;
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
        resolveLookupPrerequisites: async (suggestion) => suggestion,
        resolveLookupReferences,
        LIBRARY_COMPOSER_LIMITS,
        separateLookupDefinitions,
        chooseLookupSuggestion: async (suggestions) => suggestions[0],
        hasLookupValues: () => true,
        confirmLookupReplacement: async () => false,
        fetchLibraryLookupSuggestions: async () => {
            requests += 1;
        },
        showToast() {},
    };
    Object.assign(
        context,
        loadLibraryUiModule("app/create-entry/lookups.js", context),
    );
    const form = {
        elements: {},
        querySelector: () => input,
        addEventListener: (type, handler) => {
            if (type === "click") listener = handler;
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
            resolveLookupPrerequisites: async (suggestion) => suggestion,
            resolveLookupReferences,
            LIBRARY_COMPOSER_LIMITS,
            separateLookupDefinitions,
            chooseLookupSuggestion: async (suggestions) => suggestions[0],
            hasLookupValues: () => false,
            fetchLibraryLookupSuggestions: async () => {
                if (result instanceof Error) throw result;
                return result;
            },
            showToast() {},
        };
        Object.assign(
            context,
            loadLibraryUiModule("app/create-entry/lookups.js", context),
        );
        const form = {
            elements: {},
            querySelector: () => ({ value: "教" }),
            addEventListener: (type, handler) => {
                if (type === "click") listener = handler;
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
        elements: {},
        querySelector: () => input,
        referenceGroups: {},
        elements: {
            label: { value: "教室" },
            class: { value: "" },
            tags: { value: "", dispatchEvent() {} },
        },
        addEventListener: (type, handler) => {
            if (type === "click") listener = handler;
        },
        dispatchEvent() {},
    };
    const context = {
        resolveLookupPrerequisites: async (suggestion) => suggestion,
        resolveLookupReferences,
        LIBRARY_COMPOSER_LIMITS,
        separateLookupDefinitions,
        chooseLookupSuggestion: async (suggestions) => suggestions[0],
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
    Object.assign(
        context,
        loadLibraryUiModule("app/create-entry/lookups.js", context),
    );
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

test("vocabulary lookup preserves text, token order, and selected spelling while importing supporting data", async () => {
    const input = {
        get value() {
            return "";
        },
        set value(_value) {
            throw new Error("lookup changed input");
        },
        dispatchEvent() {
            throw new Error("lookup redrew input suggestions");
        },
        setCustomValidity() {
            throw new Error("lookup changed input validity");
        },
    };
    const selected = [
        { value: "kanji-教", selected: true },
        { value: "kanji-室", selected: true },
    ];
    const spelling = {
        name: "relationship:spelling",
        options: selected,
        append() {
            throw new Error("lookup reordered spelling");
        },
    };
    const pronunciation = {
        name: "field:pronunciation",
        value: "old",
        hasAttribute: () => false,
        dispatchEvent() {},
    };
    const tokenOrder = ["kanji-教", "kanji-室"];
    let listener;
    const form = {
        compositionOrder: tokenOrder,
        referenceGroups: {},
        elements: {
            label: { value: "教室" },
            class: { value: "" },
            tags: { value: "", dispatchEvent() {} },
            "field:pronunciation": pronunciation,
            "relationship:spelling": spelling,
        },
        querySelector: (selector) =>
            selector === "[data-library-composer-text]" ? input : null,
        querySelectorAll: (selector) =>
            selector.startsWith('[name^="field:"')
                ? [pronunciation, spelling]
                : [],
        dispatchEvent() {},
        addEventListener: (type, handler) => {
            if (type === "click") listener = handler;
        },
    };
    const schema = {
        id: "ja",
        version: 88,
        layers: [
            { id: "kanji", semanticRole: "compoundWritingUnit" },
            { id: "definitions", semanticRole: "definition" },
        ],
    };
    const layer = {
        semanticRole: "lexicalUnit",
        relationships: [
            { id: "spelling", targetLayer: "kanji" },
            { id: "definitions", targetLayer: "definitions" },
        ],
    };
    let linked = 0;
    const draft = { fields: {} };
    const context = {
        Event,
        CustomEvent,
        escapeHtml: String,
        openPopup: async () => "replace",
        RadioNodeList: class {},
        structuredClone,
        resolveLookupPrerequisites: async (suggestion) => suggestion,
        resolveLookupReferences,
        LIBRARY_COMPOSER_LIMITS,
        separateLookupDefinitions,
        chooseLookupSuggestion: async (suggestions) => suggestions[0],
        hasLookupValues: () => true,
        confirmLookupReplacement: async () => true,
        fetchLibraryLookupSuggestions: async () => [
            {
                label: "different provider spelling",
                class: "lexical:noun",
                fields: { pronunciation: ["きょうしつ"] },
                tags: ["jlpt-n5"],
                references: [
                    { relation: "spelling", entryId: "provider-kanji" },
                ],
                definitions: [{ translations: { en: "classroom" } }],
            },
        ],
        createDefinition: async () => ({
            entry: { id: "definition" },
            created: false,
        }),
        linkDefinition: () => {
            linked += 1;
        },
        renderStrokePatternPreviews() {},
        showToast() {},
    };
    vm.createContext(context);
    Object.assign(
        context,
        loadLibraryUiModule("app/create-entry/lookup-replacement.js", context),
    );
    Object.assign(
        context,
        loadLibraryUiModule("app/create-entry/lookups.js", context),
    );
    const entries = [
        {
            id: "kanji-教",
            sourceRecordId: "provider-kanji",
            schemaId: "ja",
            layer: "kanji",
        },
    ];
    context.bindLookupProviders(
        form,
        draft,
        { t: (key) => key },
        {
            schema,
            layer,
            entries,
            nestedDefinitionIds: [],
            inputCarouselIds: new Set(["spelling"]),
        },
    );
    await listener({ target: { closest: () => ({ dataset: {} }) } });
    assert.equal(form.compositionOrder, tokenOrder);
    assert.deepEqual(
        selected.map(({ selected }) => selected),
        [true, true],
    );
    assert.equal(form.elements.label.value, "教室");
    assert.equal(draft.label, "教室");
    assert.equal(pronunciation.value, "きょうしつ");
    assert.equal(form.elements.class.value, "lexical:noun");
    assert.equal(form.elements.tags.value, "jlpt-n5");
    assert.equal(linked, 1);
});

test("lookup resolves hidden reading segments without adding duplicate direct Kana groups", async () => {
    const { resolveLookupReferences } =
        await import("../../ui/app/create-entry/lookup-references.js");
    const schema = {
        id: "test",
        version: 1,
        layers: [
            {
                id: "kanji",
                relationships: [
                    {
                        id: "readings",
                        targetLayer: "words",
                        grouped: true,
                        presentationRole: "pronunciation",
                    },
                ],
            },
            {
                id: "words",
                relationships: [
                    {
                        id: "segments",
                        targetLayer: "words",
                        grouped: true,
                        presentationRole: "pronunciation",
                    },
                    {
                        id: "kana",
                        targetLayer: "characters",
                        grouped: true,
                        presentationRole: "pronunciation",
                    },
                    {
                        id: "spelling",
                        targetLayer: "kanji",
                        presentationRole: "composition",
                    },
                ],
            },
            { id: "characters", semanticRole: "atomicWritingUnit" },
        ],
    };
    const reference = {
        entryId: "temporary-reading",
        relation: "readings",
        position: 0,
    };
    const suggestion = {
        fields: { pronunciation: ["きょう"] },
        referenceGroups: { readings: [[reference]] },
        linkedEntries: [
            {
                key: reference.entryId,
                entry: {
                    schemaId: "test",
                    layer: "words",
                    label: "きょう",
                    hidden: true,
                    fields: { pronunciation: ["きょう"] },
                    references: [{ entryId: "$root", relation: "spelling" }],
                    referenceGroups: {
                        segments: [
                            [
                                {
                                    entryId: "native-reading",
                                    relation: "segments",
                                    position: 0,
                                },
                            ],
                        ],
                    },
                },
            },
        ],
    };
    const resolved = resolveLookupReferences(
        suggestion,
        [
            {
                id: "uuid-reading",
                sourceRecordId: "native-reading",
                schemaId: "test",
                layer: "words",
                label: "きょう",
            },
            {
                id: "uuid-kana",
                schemaId: "test",
                layer: "characters",
                label: "きょう",
            },
        ],
        schema,
        schema.layers[0],
    );
    assert.equal(resolved.unresolved, false);
    assert.deepEqual(
        resolved.suggestion.referenceGroups.readings[0][0],
        reference,
    );
    const child = resolved.suggestion.linkedEntries[0].entry;
    assert.deepEqual(child.referenceGroups, {
        segments: [
            [{ entryId: "uuid-reading", relation: "segments", position: 0 }],
        ],
    });
    assert.equal(child.references[0].entryId, "$root");
});
