import { loadLibraryUiModule } from "../reuse/ui-module.ts";
import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import { pronunciationComponents } from "../../ui/app/pronunciation-components.js";
import { setGeneratedPronunciation } from "../../ui/app/create-entry/pronunciation-draft.js";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
    compositionTokenEntryId,
    compositionTokenLabel,
} from "../../ui/app/composition-tokens.js";

function editor(value = "ab", hiddenSecond = false, options = {}) {
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
    const suggestions = { innerHTML: "" };
    const composition = {
        dataset: {
            libraryCompositionField: "pronunciation",
            multiValue: "true",
        },
        closest: () => ({ querySelector: () => saved }),
        querySelector: (selector) =>
            selector === "[data-library-save-composed-value]"
                ? save
                : selector === "[data-composition-suggestions]"
                  ? suggestions
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
        compositionOrder: [],
        elements: {
            label: { value: "" },
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
        {
            id: "b",
            label: hiddenSecond ? "っ" : "b",
            layer: "characters",
            hidden: hiddenSecond,
        },
    ];
    const layer = {
        semanticRole: "compoundWritingUnit",
        relationships: [
            { id: "vocabulary", targetLayer: "vocabulary", ordered: true },
            {
                id: "readings",
                targetLayer: "characters",
                grouped: true,
                ordered: true,
                presentationRole: "pronunciation",
            },
        ],
    };
    const presentation = {};
    Object.assign(
        presentation,
        loadLibraryUiModule("app/presentation.js", presentation),
    );
    let carousel;
    const context = {
        isWritingUnitLayer: presentation.isWritingUnitLayer,
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
    context.mount = loadTestModule(
        new URL("../../ui/app/pronunciation-editor.js", import.meta.url),
        {
            "./presentation.js": context,
            "./pronunciation-components.js": context,
            "/static/reuse/horizontal-carousel.js": context,
            "/static/reuse/escape-html.js": context,
            "/static/reuse/popup.js": context,
            "/static/reuse/toast.js": context,
            "/static/reuse/composition-input.js": context,
            "./composition-tokens.js": context,
            "./composer-contract.js": context,
        },
        context,
    ).mountEditableRelationshipCarousels;
    const controller = context.mount(
        form,
        { addEventListener() {} },
        entries,
        { layers: [{ id: "characters", semanticRole: "atomicWritingUnit" }] },
        layer,
        {
            pronunciationCarouselLayers: new Set(["characters"]),
            i18n: { t: (key) => key },
            ...options,
        },
    );
    return {
        form,
        listeners,
        suggest(value) {
            const input = {
                value,
                setCustomValidity() {},
                closest: (selector) =>
                    selector === "[data-library-carousel-text]"
                        ? input
                        : composition,
            };
            listeners.get("input")({ target: input });
            return suggestions.innerHTML;
        },
        reorder: (detail) => context.reorder(detail),
        field,
        saved,
        clearedCarousels,
        controller,
        select: (values) => carousel.onChange({ id: "readings", values }),
        repeat: (value, id = "readings") =>
            carousel.onActivate({
                id,
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
    context.apply = loadLibraryUiModule(
        "app/create-entry/lookups.js",
        context,
    ).applyLookupFields;
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

test("pronunciation suggestions include hidden small writing units", () => {
    const session = editor("", true);
    assert.match(
        session.suggest("っ"),
        /data-library-carousel-suggestion="b"[^>]*>っ<\/button>/,
    );
});

test("repeated sentence selections await transformation choice before appending", async () => {
    let finish;
    let activation;
    const session = editor("ab", false, {
        inputCarouselIds: new Set(["vocabulary"]),
        onActivate: (value) => {
            activation = value;
            return new Promise((resolve) => {
                finish = resolve;
            });
        },
    });
    session.form.compositionOrder.push("verb-root");
    const pending = session.repeat("verb-root", "vocabulary");
    assert.equal(activation.selected, false);
    assert.deepEqual(session.form.compositionOrder, ["verb-root"]);
    finish({ value: "transformed-verb", label: "polite verb" });
    assert.equal(await pending, false);
    assert.deepEqual(session.form.compositionOrder, [
        "verb-root",
        "transformed-verb",
    ]);
});

test("cancelling a repeated sentence transformation preserves composition", async () => {
    const session = editor("ab", false, {
        inputCarouselIds: new Set(["vocabulary"]),
        onActivate: async () => false,
    });
    session.form.compositionOrder.push("verb-root");
    assert.equal(await session.repeat("verb-root", "vocabulary"), false);
    assert.deepEqual(session.form.compositionOrder, ["verb-root"]);
});
