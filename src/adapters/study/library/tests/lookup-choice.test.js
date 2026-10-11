import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { groupLookupSuggestions } from "../ui/app/create-entry/lookup-matches.js";

const source = readFileSync(
    new URL("../ui/app/create-entry/lookup-choice.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");
const suggestions = [
    {
        label: "年",
        fields: { pronunciation: ["とし"] },
        definitions: [{ translations: { en: "year" } }],
    },
    {
        label: "年",
        fields: { pronunciation: ["ねん"] },
        definitions: [{ translations: { en: "counter for years" } }],
    },
    { label: "年間", fields: { pronunciation: ["ねんかん"] } },
];
const i18n = { t: (key) => key };
function chooser(openPopup) {
    const context = {
        groupLookupSuggestions,
        structuredClone,
        escapeHtml: String,
        renderCardContents: (entry) => `<strong>${entry.label}</strong>`,
        openPopup,
    };
    vm.runInNewContext(source, context);
    return () =>
        context.chooseLookupSuggestion(
            suggestions,
            { layers: [] },
            {},
            [],
            i18n,
            "年",
        );
}

test("same-composition matches combine alternate readings and meanings without a chooser", async () => {
    const context = {
        groupLookupSuggestions,
        structuredClone,
        openPopup: () => {
            throw new Error("unexpected popup");
        },
    };
    vm.runInNewContext(source, context);
    const result = await context.chooseLookupSuggestion(
        suggestions.slice(0, 2),
        {},
        {},
        [],
        i18n,
        "年",
    );
    assert.deepEqual(result.fields.pronunciation, ["とし", "ねん"]);
    assert.equal(result.definitions.length, 2);
});

test("clicking an expanded match immediately returns its values and enables spelling replacement", async () => {
    let closed = false;
    const choose = chooser(async (options) => {
        assert.equal(
            options.title,
            "gateway.study.library_lookup_multiple_title",
        );
        assert.equal(
            (options.body.match(/data-library-lookup-choice=/g) ?? []).length,
            2,
        );
        let listener;
        options.onOpen(
            {
                addEventListener: (_event, handler) => {
                    listener = handler;
                },
            },
            async () => {
                closed = true;
            },
        );
        listener({
            target: {
                closest: () => ({ dataset: { libraryLookupChoice: "1" } }),
            },
        });
        return null;
    });
    const result = await choose();
    assert.equal(closed, true);
    assert.equal(result.label, "年間");
    assert.equal(result.replaceInput, true);
});

for (const action of ["continue", null]) {
    test(`${action ?? "closing"} imports the exact composition's alternate readings only`, async () => {
        const choose = chooser(async (options) => {
            assert.equal(options.actions.length, 1);
            assert.equal(options.actions[0].id, "continue");
            assert.equal(options.actions[0].disabled, false);
            return action;
        });
        const result = await choose();
        assert.equal(result.label, "年");
        assert.deepEqual(result.fields.pronunciation, ["とし", "ねん"]);
        assert.equal(result.definitions.length, 2);
    });
}
