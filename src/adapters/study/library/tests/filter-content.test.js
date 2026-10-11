import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { groupByToMap } from "../../../../ui/reuse/group-by.js";
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
    assert.equal(
        context.renderLayerFilters(layer, [], { t: (key) => key }, "ja"),
        "",
    );
});
