import { loadLibraryUiModule } from "./reuse/ui-module.ts";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

test("hidden dictionary fields are absent from form markup and survive submission", () => {
    const field = {
        id: "dictionary_data",
        hidden: true,
        type: "string",
        input: { control: "freeText" },
    };
    const context = {};
    Object.assign(
        context,
        loadTestModule(
            new URL("../ui/app/field-input.js", import.meta.url),
            {
                "./definition-languages.js": context,
                "/static/reuse/escape-html.js": context,
                "./presentation.js": context,
            },
            context,
        ),
    );
    assert.equal(
        context.inputForField(
            field,
            '{"sourceUrl":"https://jisho.org"}',
            "en",
            {},
        ),
        "",
    );
    Object.assign(
        context,
        loadLibraryUiModule("app/admin-interactions/editor-body.js", context),
    );
    const entry = {
        fields: { dictionary_data: '{"sourceUrl":"https://jisho.org"}' },
    };
    const fields = context.readFields(
        { elements: {} },
        { fields: [field] },
        entry,
    );
    assert.equal(fields.dictionary_data, entry.fields.dictionary_data);
});
