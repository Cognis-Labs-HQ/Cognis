import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { literalCompositionToken } from "../../ui/app/composition-tokens.js";

function extras() {
    const context = {
        escapeHtml: String,
        localizedLabel: (metadata) => metadata?.labels?.en ?? "",
        literalCompositionToken,
        cardPreview: () => "primary reading\nprimary meaning",
        document: { documentElement: { lang: "en" } },
        CustomEvent,
    };
    Object.assign(
        context,
        loadTestModule(
            new URL(
                "../../../../../ui/reuse/horizontal-carousel.js",
                import.meta.url,
            ),
            { "./escape-html.js": context, "./popup.js": context },
            context,
        ),
    );
    Object.assign(
        context,
        loadTestModule(
            new URL("../../ui/app/composer-extras.js", import.meta.url),
            {
                "/static/reuse/horizontal-carousel.js": context,
                "./reuse/card-preview.js": context,
                "/static/reuse/escape-html.js": context,
                "./presentation.js": context,
                "./composition-tokens.js": context,
            },
            context,
        ),
    );
    return context;
}

test("sentence structure uses the shared relationship carousel and its primary preview", () => {
    const context = extras();
    const html = context.renderComposerExtras(
        {
            tag_carousels: [
                {
                    relationship: "words",
                    tag: "sentence-structure",
                    excludeFromBrowse: false,
                    metadata: { labels: { en: "Sentence Structure" } },
                },
            ],
        },
        { relationships: [{ id: "words", targetLayer: "words" }] },
        [
            {
                id: "desu",
                label: "です",
                layer: "words",
                schemaId: "ja",
                tags: ["sentence-structure"],
            },
        ],
        { id: "ja", language: "ja" },
    );
    assert.match(html, /data-horizontal-carousel="words"/);
    assert.match(html, /data-carousel-value="desu"/);
    assert.match(html, /primary reading/);
    assert.match(html, /primary meaning/);
});

test("literal controls preserve repeated punctuation placements", () => {
    const context = extras();
    let click,
        changes = 0;
    const form = {
        compositionOrder: [],
        querySelectorAll: () => [],
        addEventListener: (_event, listener) => {
            click = listener;
        },
        dispatchEvent: () => {
            changes++;
        },
    };
    context.bindComposerExtras(form);
    const event = {
        target: { closest: () => ({ dataset: { libraryLiteral: "！" } }) },
    };
    click(event);
    click(event);
    assert.deepEqual(form.compositionOrder, [
        literalCompositionToken("！"),
        literalCompositionToken("！"),
    ]);
    assert.equal(changes, 2);
});
