import { pronunciationComponents } from "../ui/app/pronunciation-components.js";
import { setGeneratedPronunciation } from "../ui/app/create-entry/pronunciation-draft.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import {
    compositionTokenEntryId,
    compositionTokenLabel,
} from "../ui/app/composition-tokens.js";

function editor(value = "ab") {
    const source = readFileSync(
        new URL("../ui/app/pronunciation-editor.js", import.meta.url),
        "utf8",
    )
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/\bexport /g, "");
    const listeners = new Map();
    const clearedCarousels = [];
    const carousels = [
        { dataset: { horizontalCarousel: "spelling" } },
        { dataset: { horizontalCarousel: "readings" } },
    ];
    const saved = { matches: () => true, hidden: true, innerHTML: "" };
    const field = {
        value,
        dispatchEvent: () => listeners.get("input")?.({ target: field }),
    };
    const composition = {
        dataset: {
            libraryCompositionField: "pronunciation",
            multiValue: "true",
        },
        closest: () => ({ querySelector: () => saved }),
        querySelector: (selector) =>
            selector === "[data-library-save-composed-value]"
                ? save
                : { value: "" },
    };
    const save = {
        closest: (selector) =>
            selector === "[data-library-save-composed-value]"
                ? save
                : selector === "[data-library-composition-field]"
                  ? composition
                  : null,
        click: () =>
            listeners.get("click")?.({ target: save, preventDefault() {} }),
    };
    const select = { options: [], selectedOptions: [] };
    const form = {
        append() {},
        referenceGroups: {},
        elements: {
            "field:pronunciation": field,
            "relationship:readings": select,
        },
        querySelector: (selector) =>
            selector === '[data-library-composition-field="pronunciation"]'
                ? composition
                : null,
        querySelectorAll: (selector) =>
            selector === "[data-horizontal-carousel]"
                ? carousels
                : selector.endsWith(" input")
                  ? []
                  : selector.includes("data-library-composition-field")
                    ? [composition]
                    : [],
        addEventListener: (kind, handler) => listeners.set(kind, handler),
        dispatchEvent: (event) => listeners.get(event.type)?.(event),
    };
    const entries = [
        { id: "a", label: "a", layer: "characters" },
        { id: "b", label: "b", layer: "characters" },
    ];
    const layer = {
        semanticRole: "compoundWritingUnit",
        relationships: [
            {
                id: "readings",
                targetLayer: "characters",
                grouped: true,
                ordered: true,
                presentationRole: "pronunciation",
            },
        ],
    };
    let carousel;
    const context = {
        pronunciationComponents,
        document: { createElement: () => ({ dataset: {} }) },
        AbortController,
        Event,
        CustomEvent,
        compositionTokenEntryId,
        compositionTokenLabel,
        CSS: { escape: (value) => value },
        clearHorizontalCarouselSelection(carousel) {
            clearedCarousels.push(carousel.dataset.horizontalCarousel);
        },
        mountHorizontalCarousels(_root, options) {
            carousel = options;
        },
        bindCompositionReordering: (_root, options) => {
            context.reorder = options.onMove;
        },
        renderCompositionItems: () => "",
        escapeHtml: (value) => String(value),
        showToast() {},
        openPopup: async () => "cancel",
    };
    vm.runInNewContext(
        source + "\nglobalThis.mount = mountEditableRelationshipCarousels;",
        context,
    );
    const controller = context.mount(
        form,
        { addEventListener() {} },
        entries,
        { layers: [{ id: "characters", semanticRole: "atomicWritingUnit" }] },
        layer,
        {
            pronunciationCarouselLayers: new Set(["characters"]),
            i18n: { t: (key) => key },
        },
    );
    return {
        form,
        listeners,
        reorder: (detail) => context.reorder(detail),
        field,
        saved,
        clearedCarousels,
        controller,
        select: (values) => carousel.onChange({ id: "readings", values }),
        repeat: (value) =>
            carousel.onActivate({
                id: "readings",
                selected: true,
                item: { dataset: { carouselValue: value } },
            }),
    };
}

test("Create commits staged character links without duplicating an auto-generated pronunciation", () => {
    const session = editor();
    session.select(["a", "b"]);
    session.controller.commitPendingValues();
    assert.equal(session.field.value, "ab");
    assert.deepEqual(JSON.parse(JSON.stringify(session.form.referenceGroups)), {
        readings: [
            [
                { entryId: "a", relation: "readings", position: 0 },
                { entryId: "b", relation: "readings", position: 1 },
            ],
        ],
    });
    session.select(["a", "b"]);
    session.controller.commitPendingValues();
    assert.equal(session.field.value, "ab");
    assert.equal(session.form.referenceGroups.readings.length, 1);
});

test("generated pronunciation values redraw after the main composition changes", () => {
    const session = editor();
    assert.ok(session.saved.innerHTML.includes("ab"));
    session.field.value = "ba";
    session.field.dispatchEvent(new Event("input"));
    assert.ok(session.saved.innerHTML.includes("ba"));
    assert.ok(!session.saved.innerHTML.includes(">ab<"));
    assert.equal(session.saved.hidden, false);
    session.field.value = "";
    session.field.dispatchEvent(new Event("input"));
    assert.equal(session.saved.hidden, true);
});

test("lookup pronunciations update the visible control using the list field delimiter", () => {
    const source = readFileSync(
        new URL("../ui/app/create-entry/lookups.js", import.meta.url),
        "utf8",
    );
    const start = source.indexOf("export function applyLookupFields(");
    const end = source.indexOf("export function bindRawInput(", start);
    let redraws = 0;
    const control = {
        value: "",
        hasAttribute: () => false,
        dispatchEvent: (event) => {
            assert.equal(event.type, "input");
            redraws += 1;
        },
    };
    const context = {
        Event,
        RadioNodeList: class {},
        renderStrokePatternPreviews() {},
    };
    vm.runInNewContext(
        source.slice(start, end).replace(/\bexport /g, "") +
            "\nglobalThis.apply = applyLookupFields;",
        context,
    );
    const draft = { fields: {} };
    context.apply(
        { elements: { "field:pronunciation": control } },
        { pronunciation: ["ab", "ba"] },
        draft,
    );
    assert.equal(control.value, "ab\nba");
    assert.equal(redraws, 1);
    assert.deepEqual(draft.fields.pronunciation, ["ab", "ba"]);
});

test("generated pronunciations appear immediately as committed values and preserve manual readings", () => {
    const session = editor("");
    setGeneratedPronunciation(session.form, ["ab", "ba", "ab"]);
    assert.equal(session.field.value, "ab\nba");
    assert.equal(session.saved.hidden, false);
    assert.match(session.saved.innerHTML, /data-library-edit-saved-value>ab/);
    assert.match(session.saved.innerHTML, /data-library-edit-saved-value>ba/);
    session.field.value += "\nmanual";
    setGeneratedPronunciation(session.form, "new");
    assert.equal(session.field.value, "manual\nnew");
    setGeneratedPronunciation(session.form, "");
    assert.equal(session.field.value, "manual");
    setGeneratedPronunciation(session.form, "manual");
    setGeneratedPronunciation(session.form, "next");
    assert.equal(session.field.value, "manual\nnext");
});

test("lookup replacement preserves spelling carousel selection and clears pending pronunciation", () => {
    const session = editor("");
    session.select(["a", "b"]);
    session.form.dispatchEvent(
        new CustomEvent("library-lookup-replace", {
            detail: { preservedRelationshipIds: ["spelling"] },
        }),
    );
    assert.deepEqual(session.clearedCarousels, ["readings"]);
    session.controller.commitPendingValues();
    assert.equal(session.field.value, "");
    assert.equal(session.form.referenceGroups.readings, undefined);
});

test("repeated pronunciation characters retain separate positions when committed", async () => {
    const session = editor("");
    session.select(["a", "b"]);
    await session.repeat("a");
    session.controller.commitPendingValues();
    assert.equal(session.field.value, "aba");
    assert.deepEqual(
        JSON.parse(JSON.stringify(session.form.referenceGroups.readings[0])),
        [
            { entryId: "a", relation: "readings", position: 0 },
            { entryId: "b", relation: "readings", position: 1 },
            { entryId: "a", relation: "readings", position: 2 },
        ],
    );
});

test("dragging one repeated stage placement preserves the other instances", () => {
    const session = editor();
    session.form.compositionOrder = ["a", "b", "a"];
    session.reorder({ kind: "input", from: 2, to: 0 });
    assert.deepEqual(session.form.compositionOrder, ["a", "a", "b"]);
});
