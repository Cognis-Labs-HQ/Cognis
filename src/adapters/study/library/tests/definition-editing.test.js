import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(
    new URL("../ui/app/create-entry/definition-editor.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");

test("committed definitions edit through the existing editor with refreshed permissions", async () => {
    let listener;
    let options;
    const updated = { id: "definition", label: "updated" };
    let renders = 0;
    const context = {
        Event,
        fetchLibraryEntry: async () => ({
            entry: { id: "definition", canEdit: true },
        }),
        entryEditMode: () => "direct",
        openLibraryEntryEditor: async (input) => {
            options = input;
            input.onSaved(updated);
        },
        showToast() {},
    };
    vm.runInNewContext(source, context);
    context.linkDefinition = () => {
        renders += 1;
    };
    const entries = [{ id: "definition", label: "old" }];
    const form = {
        addEventListener: (_kind, callback) => {
            listener = callback;
        },
        dispatchEvent() {},
    };
    context.bindCommittedDefinitionEditing(form, {
        schema: { id: "ja" },
        layer: {},
        entries,
        i18n: {},
    });
    const button = { dataset: { libraryEditDefinition: "definition" } };
    await listener({ target: { closest: () => button } });
    assert.equal(options.requestUpdate, false);
    assert.equal(entries[0].label, "updated");
    assert.equal(renders, 1);
    assert.equal(button.disabled, false);
});

test("definitions without edit permission are not written", async () => {
    let listener;
    let opened = false;
    const context = {
        fetchLibraryEntry: async () => ({ entry: { canEdit: false } }),
        entryEditMode: () => null,
        openLibraryEntryEditor: async () => {
            opened = true;
        },
        showToast() {},
    };
    vm.runInNewContext(source, context);
    context.bindCommittedDefinitionEditing(
        {
            addEventListener: (_kind, callback) => {
                listener = callback;
            },
        },
        { entries: [], i18n: { t: (key) => key } },
    );
    await listener({
        target: {
            closest: () => ({ dataset: { libraryEditDefinition: "readonly" } }),
        },
    });
    assert.equal(opened, false);
});
