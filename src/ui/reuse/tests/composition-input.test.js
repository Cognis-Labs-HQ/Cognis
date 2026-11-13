import assert from "node:assert/strict";
import test from "node:test";
import {
    renderCompositionInput,
    renderCompositionItems,
} from "../composition-input.js";

test("composition inputs render the same contained remove control for every field", () => {
    const input = renderCompositionInput({
        id: "input",
        label: "Input",
        items: [{ value: "kanji-nose", label: "鼻" }],
        removeLabel: (label) => `Remove ${label}`,
    });
    const pronunciation = renderCompositionInput({
        id: "pronunciation",
        label: "Pronunciation",
        items: [{ value: "kana-da", label: "だ" }],
        removeLabel: (label) => `Remove ${label}`,
    });

    for (const html of [input, pronunciation]) {
        assert.match(html, /class="btn-neutral composition-input-item"/);
        assert.match(html, /class="btn-cancel"[^>]*data-composition-remove/);
        assert.match(html, /data-composition-suggestions/);
    }
});

test("composition item rendering supports adapter-owned ordering metadata", () => {
    const html = renderCompositionItems({
        items: [{ value: "word", label: "Word" }],
        itemAttributes: ({ value }) => ({
            "data-order-value": value,
            draggable: true,
        }),
    });
    assert.match(html, /data-order-value="word"/);
    assert.match(html, / draggable/);
});
