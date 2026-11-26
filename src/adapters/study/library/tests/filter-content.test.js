import { loadLibraryUiModule } from "./reuse/ui-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { groupByToMap } from "../../../../ui/reuse/group-by.js";

import { filterItems } from "../../../../ui/reuse/collection-view.js";

test("metadata filters preserve sole-value selection and required defaults", () => {
    const context = {
        escapeHtml: String,
        groupByToMap,
        filterItems,
        renderBrowseControls: () => "",
        filterFields: (layer) => layer.fields,
        localizedLabel: () => "Level",
        fieldValues: (entry, fields) =>
            fields
                .filter((field) => entry.fields?.[field.id])
                .map((field) => ({ field, value: entry.fields[field.id] })),
    };
    Object.assign(context, loadLibraryUiModule("app/filters.js", context));
    const field = { id: "level", detail: { required: false } };
    const html = context.renderLayerFilters(
        { fields: [field] },
        [{ fields: { level: "N5" } }, { label: "ノート", fields: {} }],
        { t: (key) => key },
        "ja",
    );
    assert.match(html, /data-library-filter-value="N5" aria-pressed="true"/);
    const multiple = context.renderLayerFilters(
        { fields: [field] },
        [
            { fields: { level: "N5" } },
            { fields: { level: "N4" } },
            { fields: {} },
        ],
        { t: (key) => key },
        "ja",
    );
    assert.doesNotMatch(multiple, /aria-pressed="true"/);
    field.detail = { required: true, exclusive: true, defaultTag: "N5" };
    const required = context.renderLayerFilters(
        { fields: [field] },
        [{ fields: { level: "N5" } }],
        { t: (key) => key },
        "ja",
    );
    assert.match(
        required,
        /data-library-filter-value="N5" aria-pressed="true"/,
    );
});

test("unclassified vocabulary stays visible until a metadata filter is explicitly selected", () => {
    const context = { groupByToMap, filterItems };
    Object.assign(context, loadLibraryUiModule("app/filters.js", context));
    const cards = [
        {
            textContent: "学校",
            dataset: { libraryFilterValues: '{"level":["N5"]}' },
        },
        {
            textContent: "ノート",
            dataset: { libraryFilterValues: '{"level":[]}' },
        },
    ].map((card) => ({
        ...card,
        closest() {
            return this;
        },
    }));
    let selected = [];
    const panel = {
        querySelectorAll: (selector) =>
            selector.includes(".active") ? selected : cards,
        querySelector: () => ({ hidden: true }),
    };
    context.refreshLibraryFilterResults(panel);
    assert.deepEqual(
        cards.map(({ hidden }) => hidden),
        [false, false],
    );
    selected = [
        { dataset: { libraryFilter: "level", libraryFilterValue: "N5" } },
    ];
    context.refreshLibraryFilterResults(panel);
    assert.deepEqual(
        cards.map(({ hidden }) => hidden),
        [false, true],
    );
    selected = [];
    context.refreshLibraryFilterResults(panel);
    assert.deepEqual(
        cards.map(({ hidden }) => hidden),
        [false, false],
    );
});
test("curated tag filters reflect visible selected-layer content", () => {
    const context = {
        escapeHtml: String,
        groupByToMap,
        filterItems,
        renderBrowseControls: () => "<select data-study-sort></select>",
        filterFields: () => [],
        localizedLabel: () => "",
        fieldValues: () => [],
    };
    Object.assign(context, loadLibraryUiModule("app/filters.js", context));
    const layer = {
        detail: {
            tags: ["verb", "copula", "adjective"].map((value) => ({
                value,
                metadata: { labels: { en: value } },
                filterable: true,
            })),
        },
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
    Object.assign(context, loadLibraryUiModule("app/filters.js", context));
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
