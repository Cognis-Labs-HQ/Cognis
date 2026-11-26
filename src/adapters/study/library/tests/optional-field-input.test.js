import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";

const { inputForField } = loadTestModule(
    new URL("../ui/app/field-input.js", import.meta.url),
    {
        "./definition-languages.js": { DEFINITION_LANGUAGES: ["en"] },
        "/static/reuse/escape-html.js": { escapeHtml },
        "./presentation.js": {
            localizedLabel: (metadata) => metadata.labels.en,
        },
    },
);
const field = {
    id: "difficulty_level",
    type: "string",
    metadata: { labels: { en: "Difficulty" } },
    input: {
        control: "singleSelect",
        options: ["basic", "advanced"].map((value) => ({
            value,
            metadata: { labels: { en: value } },
        })),
    },
};
const i18n = {
    t: (key) => {
        assert.equal(key, "ui.reuse.unspecified");
        return "Not specified";
    },
};

test("optional selects preserve an unknown classification instead of silently choosing the first level", () => {
    for (const value of [undefined, null, ""]) {
        const html = inputForField(field, value, "en", i18n);
        assert.match(html, /<option value="" selected>Not specified<\/option>/);
        assert.doesNotMatch(html, /value="basic" selected/);
    }
    const selected = inputForField(field, "advanced", "en", i18n);
    assert.match(selected, /<option value="">Not specified<\/option>/);
    assert.match(selected, /value="advanced" selected/);
});

test("required and multiselect controls retain their existing selection semantics", () => {
    const required = inputForField(
        { ...field, required: true },
        "advanced",
        "en",
        i18n,
    );
    assert.doesNotMatch(required, /<option value=""/);
    assert.match(required, /value="advanced" selected/);
    const multiple = inputForField(
        { ...field, input: { ...field.input, control: "multiSelect" } },
        ["basic"],
        "en",
        i18n,
    );
    assert.doesNotMatch(multiple, /<option value=""/);
    assert.match(multiple, /value="basic" selected/);
});
