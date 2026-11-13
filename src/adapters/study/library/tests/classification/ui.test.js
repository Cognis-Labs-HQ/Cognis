import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import { groupByToMap } from "../../../../../ui/reuse/group-by.js";
import { createClassificationResolver } from "../../ui/reuse/classification.js";

const { renderLayerFilters } = loadTestModule(
    new URL("../../ui/app/filters.js", import.meta.url),
    {
        "/static/reuse/collection-view.js": { filterItems: () => [] },
        "/static/gateways/study/reuse/favourites.js": {
            renderBrowseControls: () => "",
        },
        "/static/reuse/escape-html.js": { escapeHtml: String },
        "/static/reuse/group-by.js": { groupByToMap },
        "./presentation.js": {
            filterFields: (layer) => layer.fields,
            localizedLabel: (metadata) => metadata.labels.en,
            fieldValues: (entry, fields) =>
                fields.flatMap((field) =>
                    entry.fields[field.id]
                        ? [{ field, value: entry.fields[field.id] }]
                        : [],
                ),
        },
    },
);
const field = {
    id: "level",
    metadata: { labels: { en: "Level" } },
    detail: { renderer: "badge", required: false, autoSelectSingle: false },
    input: {
        options: ["N5", "N4", "N3"].map((value) => ({
            value,
            metadata: { labels: { en: value } },
        })),
    },
};
const i18n = { t: (key) => key };

test("Kanji exposes ordered level filters without selecting a sole level or exposing internal tags", () => {
    const layer = { id: "kanji", fields: [field] };
    const entries = [
        {
            fields: { level: "N4" },
            tags: ["length-form-long", "transform:adjective"],
        },
        { fields: {} },
    ];
    const html = renderLayerFilters(layer, entries, i18n, "ja");
    assert.match(html, /data-library-filter-value="N4" aria-pressed="false"/);
    assert.doesNotMatch(html, /length-form-long|transform:adjective/);
    entries.push({ fields: { level: "N5" } });
    const ordered = renderLayerFilters(layer, entries, i18n, "ja");
    assert.ok(ordered.indexOf('value="N5"') < ordered.indexOf('value="N4"'));
});

test("sentence filters receive one exact derived level, and never a union of constituent levels", () => {
    const layer = {
        id: "sentences",
        fields: [
            {
                ...field,
                derivation: {
                    kind: "rankedReferences",
                    relationships: ["words"],
                    values: ["N5", "N4", "N3"],
                    requireAll: true,
                },
            },
        ],
    };
    const schema = {
        id: "language",
        layers: [layer, { id: "words", fields: [field] }],
    };
    const entries = [
        {
            id: "easy",
            schemaId: schema.id,
            layer: "words",
            fields: { level: "N5" },
        },
        {
            id: "harder",
            schemaId: schema.id,
            layer: "words",
            fields: { level: "N4" },
        },
        {
            id: "sentence",
            schemaId: schema.id,
            layer: layer.id,
            references: [
                { entryId: "easy", relation: "words" },
                { entryId: "harder", relation: "words" },
            ],
            fields: {},
        },
    ];
    const resolver = createClassificationResolver([schema], entries);
    const projected = resolver.project(entries[2]);
    const html = renderLayerFilters(layer, [projected], i18n, "ja");
    assert.match(html, /data-library-filter-value="N4"/);
    assert.doesNotMatch(html, /data-library-filter-value="N5"/);
    assert.deepEqual(entries[2].fields, {});
});
