import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
    new URL("../ui/app/create-entry/composition.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");

test("vocabulary composition supplies the full lookup label without generating pronunciation", () => {
    const listeners = new Map();
    const input = {
        value: "",
        dataset: {},
        setCustomValidity() {},
        addEventListener() {},
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
    vm.runInNewContext(source, context);
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
});
