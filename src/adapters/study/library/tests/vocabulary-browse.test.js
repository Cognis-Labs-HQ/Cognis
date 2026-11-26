import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { createClassificationResolver } from "../ui/reuse/classification.js";
import { assignVariantPlacements } from "../ui/app/variant-placement.js";

test("providers control carousel vocabulary visibility without excluding ordinary words", () => {
    const { renderBrowser } = loadTestModule(
        new URL("../ui/app/layer-cards.js", import.meta.url),
        {
            "/static/reuse/escape-html.js": { escapeHtml: String },
            "./presentation.js": {
                isMeaningLayer: () => false,
                localizedLabel: () => "Vocabulary",
                layerForEntry: (schemas, entry) =>
                    schemas[0].layers.find(({ id }) => id === entry.layer),
            },
            "./filters.js": { renderLayerFilters: () => "" },
            "./cards.js": {
                isDirectlyVisible: (entry) => !entry.hidden,
                renderEntryCard: (entry) =>
                    `<button data-entry="${entry.id}">${entry.label}</button>`,
            },
            "./variant-placement.js": { assignVariantPlacements },
            "../reuse/classification.js": { createClassificationResolver },
            "../reuse/transformations.js": { transformationPathways: () => [] },
            "./transformation-popup.js": { renderTransformationTree: () => "" },
        },
    );
    const words = {
        id: "words",
        views: [
            { id: "verbs", includeTags: ["verb"], layout: "transformTree" },
        ],
    };
    const schema = {
        id: "language",
        layers: [
            words,
            {
                id: "sentences",
                cardConstructor: {
                    tag_carousels: [
                        { tag: "sentence-structure", excludeFromBrowse: false },
                        { tag: "composer-only", excludeFromBrowse: true },
                    ],
                },
            },
        ],
    };
    const entries = [
        { id: "notebook", label: "ノート", tags: ["noun"] },
        { id: "connector", label: "それでも", tags: ["sentence-structure"] },
        { id: "verb", label: "学ぶ", tags: ["verb"] },
        {
            id: "exclusive",
            label: "Hidden from browsing",
            tags: ["composer-only"],
        },
        { id: "reading", label: "Reading helper", hidden: true },
    ].map((entry) => ({ ...entry, schemaId: schema.id, layer: "words" }));
    const i18n = { t: (key) => key };
    const all = renderBrowser([schema], entries, i18n, {
        schemaId: schema.id,
        layerId: "words",
    });
    for (const entry of entries.slice(0, 3))
        assert.ok(all.includes(`data-entry="${entry.id}"`));
    assert.ok(!all.includes('data-entry="exclusive"'));
    assert.ok(!all.includes('data-entry="reading"'));
    const view = renderBrowser([schema], entries, i18n, {
        schemaId: schema.id,
        layerId: "words",
        viewId: "verbs",
    });
    assert.equal((view.match(/data-entry=/g) ?? []).length, 1);
    assert.ok(view.includes('data-entry="verb"'));
});
