import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function source(path) {
    return readFileSync(new URL(path, import.meta.url), "utf8")
        .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
        .replace(/export \{[^}]+\} from "[^"]+";\n/g, "")
        .replace(/\bexport /g, "");
}

test("stroke preview hides the lookup after retrieval and restores it when cleared", () => {
    const context = { escapeHtml: String };
    vm.createContext(context);
    vm.runInContext(source("../ui/app/field-input.js"), context);
    const button = { hidden: false };
    const canvas = { getContext: () => null };
    const section = {
        dataset: { libraryStrokePattern: "strokes" },
        querySelector: () => canvas,
        querySelectorAll: () => [button],
    };
    const input = {
        libraryFieldValue: { strokes: [{ points: [{ x: 0, y: 0 }] }] },
    };
    const form = {
        elements: { "field:strokes": input },
        querySelectorAll: () => [section],
    };
    context.renderStrokePatternPreviews(form);
    assert.equal(button.hidden, true);
    assert.equal(canvas.hidden, false);
    input.libraryFieldValue = undefined;
    context.renderStrokePatternPreviews(form);
    assert.equal(button.hidden, false);
    assert.equal(canvas.hidden, true);
    const css = readFileSync(
        new URL("../ui/library-admin.css", import.meta.url),
        "utf8",
    );
    assert.match(
        css,
        /\.library-stroke-pattern \[data-library-lookup-provider\]\[hidden\]\s*\{\s*display: none;/,
    );
});

test("definition editors render translations in Content and ordinary cards retain the Definitions tab", () => {
    const context = {
        escapeHtml: String,
        pronunciationRelationshipsFor: () => [],
        renderComposerExtras: () => "",
        createFormBuilder: (_i18n, options) => ({
            render: () => options.trustedContentHtml,
        }),
        inputForField: () => "<fieldset>Translations</fieldset>",
    };
    vm.createContext(context);
    vm.runInContext(
        source("../ui/app/admin-interactions/editor-body.js"),
        context,
    );
    for (const semanticRole of ["definition", "lexicalEntry"]) {
        const schema = {
            id: "ja",
            language: "en",
            layers: [
                {
                    id: "test",
                    semanticRole,
                    fields: [{ id: "translations", type: "localizedText" }],
                },
            ],
        };
        const { html } = context.editorBody(
            { schemaId: "ja", layer: "test", label: "teach", fields: {} },
            [schema],
            [],
            { t: (key) => key },
        );
        assert.match(html, /data-form-panel="content"/);
        assert.match(html, /Translations/);
        assert.equal(
            html.includes('data-form-tab="definitions"'),
            semanticRole !== "definition",
        );
        assert.equal(
            html.includes('data-form-panel="definitions"'),
            semanticRole !== "definition",
        );
    }
});
