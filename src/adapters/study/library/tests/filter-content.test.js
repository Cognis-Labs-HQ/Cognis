import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { groupByToMap } from "../../../../ui/reuse/group-by.js";

import { filterItems } from "../../../../ui/reuse/collection-view.js";

const source = readFileSync(
    new URL("../ui/app/filters.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");
test("word-type filters reflect visible selected-layer content rather than every configured view", () => {
    const context = {
        escapeHtml: String,
        groupByToMap,
        filterItems,
        renderBrowseControls: () => "<select data-study-sort></select>",
        filterFields: () => [],
        localizedLabel: () => "",
        fieldValues: () => [],
    };
    vm.runInNewContext(source, context);
    const layer = {
        views: [
            {
                layout: "transformTree",
                includeTags: ["verb", "copula", "adjective"],
            },
        ],
    };
    const html = context.renderLayerFilters(
        layer,
        [{ tags: ["verb"] }, { tags: ["adjective"], hidden: true }],
        { t: (key) => key },
        "ja",
    );
    assert.match(html, /data-library-filter-value="verb"/);
    assert.match(html, /aria-pressed="false"/);
    assert.equal((html.match(/data-library-filter-value=/g) ?? []).length, 1);
    const empty = context.renderLayerFilters(
        layer,
        [],
        { t: (key) => key },
        "ja",
    );
    assert.doesNotMatch(empty, /data-library-filter-value=/);
    assert.match(empty, /data-study-sort/);
});

test("current-page quick search immediately combines text with the existing card filters", () => {
    const context = {
        groupByToMap,
        filterItems,
        createSearchMatchResolver: (query) => (value) =>
            value.toLowerCase().includes(query.toLowerCase()),
    };
    vm.runInNewContext(source, context);
    const cards = ["Dog", "Cat"].map((textContent) => ({
        textContent,
        dataset: { libraryFilterValues: "{}" },
        closest() {
            return this;
        },
        hidden: false,
    }));
    const input = { value: "do" };
    const empty = { hidden: true };
    const panel = {
        querySelectorAll: (selector) =>
            selector.includes(".active") ? [] : cards,
        querySelector: (selector) =>
            selector === "[data-study-query]" ? input : empty,
    };
    context.refreshLibraryFilterResults(panel);
    assert.deepEqual(
        cards.map(({ hidden }) => hidden),
        [false, true],
    );
    input.value = "missing";
    context.refreshLibraryFilterResults(panel);
    assert.equal(empty.hidden, false);
    input.value = "";
    context.refreshLibraryFilterResults(panel);
    assert.deepEqual(
        cards.map(({ hidden }) => hidden),
        [false, false],
    );
});
