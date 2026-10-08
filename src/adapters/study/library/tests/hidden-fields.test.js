import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";

test("hidden dictionary fields are absent from form markup and survive submission", () => {
    const field = {
        id: "dictionary_data",
        hidden: true,
        type: "string",
        input: { control: "freeText" },
    };
    const context = {};
    vm.runInNewContext(
        readFileSync(
            new URL("../ui/app/field-input.js", import.meta.url),
            "utf8",
        )
            .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
            .replace(/\bexport /g, ""),
        context,
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
    const editor = readFileSync(
        new URL("../ui/app/admin-interactions/editor-body.js", import.meta.url),
        "utf8",
    );
    vm.runInNewContext(
        editor
            .slice(
                editor.indexOf("export function readFields"),
                editor.indexOf("export function readReferences"),
            )
            .replace("export ", ""),
        context,
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
