import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
    new URL("../ui/app/create-entry/lookup-choice.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");
const suggestions = [
    { label: "教室", fields: { pronunciation: ["きょうしつ"] } },
    { label: "教える", fields: { pronunciation: ["おしえる"] } },
];
const i18n = { t: (key) => key };

test("a single dictionary match fills directly without a chooser", async () => {
    const context = {
        openPopup: () => {
            throw new Error("unexpected popup");
        },
    };
    vm.runInNewContext(source, context);
    assert.equal(
        await context.chooseLookupSuggestion(
            [suggestions[0]],
            {},
            {},
            [],
            i18n,
        ),
        suggestions[0],
    );
});

test("multiple matches show previews and require selection plus confirmation", async () => {
    let popup;
    const buttons = suggestions.map((_suggestion, index) => ({
        dataset: { libraryLookupChoice: String(index) },
        classList: { toggle() {} },
        setAttribute(name, value) {
            this[name] = value;
        },
    }));
    const confirm = { disabled: true };
    const context = {
        escapeHtml: String,
        renderCardContents: (entry) => `<strong>${entry.label}</strong>`,
        openPopup: async (options) => {
            popup = options;
            assert.equal(options.onAction("confirm"), false);
            assert.equal(options.actions[0].disabled, true);
            let listener;
            options.onOpen({
                addEventListener: (_kind, handler) => {
                    listener = handler;
                },
                querySelector: () => confirm,
                querySelectorAll: () => buttons,
            });
            listener({ target: { closest: () => buttons[1] } });
            assert.equal(confirm.disabled, false);
            assert.equal(buttons[1]["aria-pressed"], "true");
            assert.equal(buttons[0]["aria-pressed"], "false");
            assert.equal(options.onAction("confirm"), true);
            return "confirm";
        },
    };
    vm.runInNewContext(source, context);
    assert.equal(
        await context.chooseLookupSuggestion(
            suggestions,
            { layers: [] },
            {},
            [],
            i18n,
        ),
        suggestions[1],
    );
    assert.equal(popup.title, "gateway.study.library_lookup_multiple_title");
    assert.match(popup.body, /library-lookup-choices/);
    assert.match(popup.body, /教室/);
    assert.match(popup.body, /教える/);
});

test("canceling a multiple-match chooser returns no card to import", async () => {
    const context = {
        escapeHtml: String,
        renderCardContents: (entry) => entry.label,
        openPopup: async () => "cancel",
    };
    vm.runInNewContext(source, context);
    assert.equal(
        await context.chooseLookupSuggestion(
            suggestions,
            { layers: [] },
            {},
            [],
            i18n,
        ),
        null,
    );
});
