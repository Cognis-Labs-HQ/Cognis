import { loadLibraryUiModule } from "./reuse/ui-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

test("composer opt-ins follow family tags and preserve other classifications", () => {
    const control = {
        dataset: {
            matchGroups: '[["noun","countable"],["noun","collective-dog"]]',
            transformTag: "plural",
        },
        addEventListener: (_type, handler) => {
            control.change = handler;
        },
    };
    const label = { querySelector: () => control };
    const field = {
        value: "noun\u001fcountable",
        addEventListener: (_type, handler) => {
            field.change = handler;
        },
    };
    const form = {
        elements: { tags: field },
        querySelectorAll: () => [label],
        setLibraryTags: (tags) => {
            field.value = tags.join("\u001f");
            field.change();
        },
    };
    const context = vm.createContext({});
    Object.assign(
        context,
        loadLibraryUiModule("app/transformation-opt-ins.js", context),
    );
    context.bindTransformationOptIns(form, 10);
    assert.equal(label.hidden, false);
    assert.equal(control.checked, false);
    control.checked = true;
    control.change({ target: control });
    assert.equal(field.value, "noun\u001fcountable\u001fplural");
    control.checked = false;
    control.change({ target: control });
    assert.equal(field.value, "noun\u001fcountable");
    form.setLibraryTags(["noun"]);
    assert.equal(label.hidden, true);
    assert.equal(control.disabled, true);
    form.setLibraryTags(["noun", "collective-dog"]);
    assert.equal(label.hidden, false);
});

test("one opt-in control represents every matching noun family for a shared transformation tag", () => {
    const context = {
        Map,
        escapeHtml: String,
        localizedLabel: (metadata) => metadata.labels.en,
    };
    Object.assign(
        context,
        loadLibraryUiModule("app/transformation-opt-ins.js", context),
    );
    const html = context.renderTransformationOptIns({
        language: "ja",
        transformSets: ["dog", "cat", "teacher"].map((family) => ({
            flag: "plural",
            matchTags: ["noun", family],
            metadata: { labels: { en: "Collective Plural" } },
        })),
    });
    assert.equal((html.match(/type="checkbox"/g) ?? []).length, 1);
    assert.match(html, /Collective Plural/);
    for (const family of ["dog", "cat", "teacher"])
        assert.match(html, new RegExp(family));
});
