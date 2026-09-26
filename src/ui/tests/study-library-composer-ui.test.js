import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");
const adminInteractionsSource = read(
    "src/adapters/study/library/ui/app/admin-interactions.js",
);
const createEntrySource = read(
    "src/adapters/study/library/ui/app/create-entry.js",
);
const clientSource = read("src/gateways/study/ui/library-client.js");
const adapterSource = read("src/adapters/study/library/index.ts");
const carouselStylesheet = read("src/ui/styles/reuse/horizontal-carousel.css");

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
        [adapterSource, /registerLookupProvider/],
    ])
        assert.match(content, pattern);
});
