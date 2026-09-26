import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");
const adminInteractionsSource = [
    "admin-interactions.js",
    "pronunciation-editor.js",
]
    .map((file) => read(`src/adapters/study/library/ui/app/${file}`))
    .join("\n");
const createEntrySource = read(
    "src/adapters/study/library/ui/app/create-entry.js",
);
const clientSource = read("src/gateways/study/ui/library-client.js");
const adapterSource = read("src/adapters/study/library/index.ts");
const carouselStylesheet = read("src/ui/styles/reuse/horizontal-carousel.css");
const drawingSource = read("src/adapters/study/library/ui/app/drawing.js");

test("Study Library keeps editor tabs active and nested card types precise", () => {
    for (const [content, pattern] of [
        [adminInteractionsSource, /bindLibraryEditorControls/],
        [adminInteractionsSource, /name="tags"/],
        [createEntrySource, /supportsTextComposition/],
        [createEntrySource, /relationship\.targetLayer/],
        [carouselStylesheet, /scrollbar-width:\s*none/],
    ])
        assert.match(content, pattern);
});

test("Study Library composer exposes provider-owned raw-input lookup", () => {
    for (const [content, pattern] of [
        [clientSource, /fetchLibraryLookupProviders/],
        [clientSource, /fetchLibraryLookupSuggestions/],
        [createEntrySource, /data-library-lookup-provider/],
        [createEntrySource, /bindLookupProviders/],
        [createEntrySource, /data-library-free-text/],
        [createEntrySource, /lookups\.hidden = !text/],
        [createEntrySource, /suggestion\.references/],
        [createEntrySource, /event\.key === "Enter"/],
        [createEntrySource, /draft\.fields\[fieldId\] = value/],
        [createEntrySource, /inlinePronunciationCarousel:\s*true/],
        [createEntrySource, /"particle"/],
        [createEntrySource, /constructorRelationshipIds\.add/],
        [createEntrySource, /constructorFieldIds\.add\("pronunciation"\)/],
        [createEntrySource, /constructor\.input_carousels/],
        [createEntrySource, /constructor\.pronunciation_carousels/],
        [adminInteractionsSource, /data-library-pronunciation-text/],
        [adminInteractionsSource, /data-library-pronunciation-blocks/],
        [adminInteractionsSource, /configuredIds\.has\(id\)/],
        [adminInteractionsSource, /target\.label/],
        [drawingSource, /orderedLexicalSequence/],
        [adapterSource, /registerLookupProvider/],
    ])
        assert.match(content, pattern);
    assert.doesNotMatch(createEntrySource, /fallbackInputCarouselIds/);
    assert.doesNotMatch(adminInteractionsSource, /linkRelationships/);
});
