import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";

test("vocabulary composition supplies the full lookup label without generating pronunciation", () => {
    const listeners = new Map();
    const input = {
        value: "",
        dataset: {},
        setCustomValidity() {},
        addEventListener: (kind, handler) =>
            listeners.set(`input:${kind}`, handler),
    };
    const output = { addEventListener() {} };
    const blocks = { addEventListener() {} };
    const lookups = { hidden: true };
    const option = { value: "kanji", textContent: "教", selected: true };
    const pronunciation = { value: "manually committed reading" };
    const form = {
        compositionOrder: ["kanji"],
        elements: {
            label: { value: "" },
            "relationship:spelling": {
                options: [option],
                selectedOptions: [option],
                append() {},
            },
            "field:pronunciation": pronunciation,
        },
        addEventListener: (kind, handler) => listeners.set(kind, handler),
        querySelector: (selector) =>
            ({
                "[data-library-composer-text]": input,
                "[data-composition-suggestions]": output,
                "[data-library-composition-blocks]": blocks,
                ".library-composer-lookups": lookups,
            })[selector] ?? null,
    };
    let generated = 0;
    const context = {
        escapeHtml: String,
        transformationPathways: () => [],
        entryDefinition: () => "",
        compositionTokenEntryId: (value) => value,
        compositionTokenLabel: () => "教",
        resolveCompositionPrefix: () => ({ matches: [], remainder: "" }),
        setGeneratedPronunciation: () => {
            generated += 1;
        },
    };
    Object.assign(
        context,
        loadTestModule(
            new URL(
                "../../ui/app/create-entry/composition.js",
                import.meta.url,
            ),
            {
                "../presentation.js": context,
                "./pronunciation-draft.js": context,
                "/static/reuse/escape-html.js": context,
                "../composer-contract.js": context,
                "../composition-tokens.js": context,
                "../../reuse/transformations.js": context,
                "./definitions.js": context,
            },
            context,
        ),
    );
    const controller = context.bindTextComposition(
        form,
        [{ id: "kanji", label: "教", layer: "kanji" }],
        {
            semanticRole: "lexicalUnit",
            relationships: [{ id: "spelling", targetLayer: "kanji" }],
        },
        {},
        { t: (key) => key },
        new Set(["spelling"]),
    );
    listeners.get("library-composition-change")();
    assert.equal(form.elements.label.value, "教");
    assert.equal(lookups.hidden, false);
    assert.equal(pronunciation.value, "manually committed reading");
    assert.equal(generated, 0);
    form.compositionOrder = [];
    input.value = "教える";
    form.libraryLookupLabel = "教える";
    assert.equal(controller.validate(), true);
    input.value = "教わる";
    assert.equal(controller.validate(), false);
    input.value = "教教";
    context.resolveCompositionPrefix = (_text, candidates) => ({
        matches: [candidates[0], candidates[0]],
        remainder: "",
    });
    listeners.get("input:input")();
    assert.match(output.innerHTML, /data-library-suggestion-sequence=/);
    assert.doesNotMatch(output.innerHTML, /data-library-suggestion=/);
    assert.equal(pronunciation.value, "manually committed reading");
});
