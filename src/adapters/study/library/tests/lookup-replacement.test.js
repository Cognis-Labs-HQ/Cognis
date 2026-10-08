import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
const source = readFileSync(
    new URL("../ui/app/create-entry/lookup-replacement.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");

test("replacement warning requires a value beyond the lookup query", async () => {
    let controls = [];
    const context = {};
    vm.runInNewContext(source, context);
    const form = { querySelectorAll: () => controls };
    assert.equal(context.hasLookupValues(form), false);
    controls = [{ value: "きょう" }];
    assert.equal(context.hasLookupValues(form), true);
    controls = [{ options: [{ selected: false, value: "definition" }] }];
    assert.equal(context.hasLookupValues(form), false);
    controls[0].options[0].selected = true;
    assert.equal(context.hasLookupValues(form), true);
    controls = [{ libraryFieldValue: { strokes: [{}] } }];
    assert.equal(context.hasLookupValues(form, true), true);
});

test("replacement clears fields, relationships, groups, and definition displays", () => {
    const controls = [
        { value: "old" },
        { options: [{ selected: true, value: "old-definition" }] },
        {
            value: "",
            libraryFieldValue: { strokes: [{}] },
            hasAttribute: () => true,
        },
    ];
    controls[0].hasAttribute = () => false;
    let removed = 0;
    const events = [];
    const form = {
        querySelectorAll: () => controls,
        querySelector: () => ({
            querySelectorAll: () => [
                {
                    remove: () => {
                        removed += 1;
                    },
                },
            ],
        }),
        dispatchEvent: (event) => events.push(event.type),
        referenceGroups: { old: [[]] },
        compositionOrder: ["old"],
        libraryGeneratedPronunciation: ["old"],
    };
    const draft = { fields: { pronunciation: ["old"] } };
    const context = { Event, CustomEvent };
    vm.runInNewContext(source, context);
    context.clearLookupValues(form, draft);
    assert.equal(controls[0].value, "");
    assert.equal(controls[1].options[0].selected, false);
    assert.equal(controls[2].libraryFieldValue, null);
    assert.equal(Object.keys(draft.fields).length, 0);
    assert.equal(Object.keys(form.referenceGroups).length, 0);
    assert.equal(form.compositionOrder.length, 0);
    assert.equal(removed, 1);
    assert.deepEqual(events, ["library-lookup-replace"]);
});

test("warning uses the reusable popup and requires explicit replacement", async () => {
    for (const action of ["replace", "cancel", null]) {
        const context = {
            escapeHtml: (text) => text,
            openPopup: async (options) => {
                assert.match(options.body, /replace_warning/);
                return action;
            },
        };
        vm.runInNewContext(source, context);
        assert.equal(
            await context.confirmLookupReplacement({ t: (key) => key }),
            action === "replace",
        );
    }
});
