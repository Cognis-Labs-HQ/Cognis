import { loadLibraryUiModule } from "../reuse/ui-module.ts";
import assert from "node:assert/strict";
import test from "node:test";

test("committed definitions edit through the existing editor with refreshed permissions", async () => {
    let listener;
    let options;
    const updated = { id: "definition", label: "updated" };
    let renders = 0;
    const context = {
        Event,
        DEFINITION_LANGUAGES: [],
        CSS: { escape: String },
        escapeHtml: String,
        renderDefinitionActions: () => "",
        bindDefinitionRemoval() {},
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
    Object.assign(
        context,
        loadLibraryUiModule("app/create-entry/definition-editor.js", context),
    );
    const entries = [{ id: "definition", label: "old" }];
    context.linkDefinition = () => {
        renders += 1;
    };
    const option = { value: "definition", selected: true };
    const form = {
        elements: { "relationship:definitions": { options: [option] } },
        querySelector: () => ({
            querySelector: () => null,
            insertAdjacentHTML: () => {
                renders++;
            },
        }),
        addEventListener: (_kind, callback) => {
            listener = callback;
        },
        dispatchEvent() {},
    };
    context.bindCommittedDefinitionEditing(form, {
        schema: {
            id: "ja",
            layers: [{ id: "definitions", semanticRole: "definition" }],
        },
        layer: {
            relationships: [{ id: "definitions", targetLayer: "definitions" }],
        },
        entries,
        i18n: { t: (key) => key },
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
        bindDefinitionRemoval() {},
        fetchLibraryEntry: async () => ({ entry: { canEdit: false } }),
        entryEditMode: () => null,
        openLibraryEntryEditor: async () => {
            opened = true;
        },
        showToast() {},
    };
    Object.assign(
        context,
        loadLibraryUiModule("app/create-entry/definition-editor.js", context),
    );
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
