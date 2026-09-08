import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const source = ["index.js", "detail.js", "presentation.js"]
    .map((file) =>
        readFileSync(
            resolve(ROOT, `src/adapters/study/library/ui/app/${file}`),
            "utf8",
        ),
    )
    .join("\n");
const stylesheet = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/library.css"),
    "utf8",
);
const clientSource = readFileSync(
    resolve(ROOT, "src/gateways/study/ui/library-client.js"),
    "utf8",
);
const adapterSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/index.ts"),
    "utf8",
);
const variantArrowLight = readFileSync(
    resolve(
        ROOT,
        "src/adapters/study/library/ui/assets/variant-arrow-light.svg",
    ),
    "utf8",
);
const variantArrowDark = readFileSync(
    resolve(
        ROOT,
        "src/adapters/study/library/ui/assets/variant-arrow-dark.svg",
    ),
    "utf8",
);

test("Study Library presents browsable layers as filterable card tabs", () => {
    assert.match(source, /role="tablist"/);
    assert.match(source, /role="tabpanel"/);
    assert.match(source, /class="library-entry-card btn-neutral"/);
    assert.match(source, /class="library-filter-pill btn-neutral/);
    assert.match(source, /aria-pressed="\$\{selected\}"/);
    assert.match(source, /function applyLibraryFilters/);
    assert.match(source, /\.library-entry-card\[data-library-filter-values\]/);
    assert.match(source, /data-library-filter-exclusive/);
    assert.match(source, /data-library-filter-required/);
    assert.match(source, /filter\.detail\?\.defaultTag/);
    assert.match(source, /required \|\| tags\.length === 1/);
    assert.match(source, /function refreshLibraryFilterResults/);
    assert.match(source, /group\?\.dataset\.libraryFilterRequired === "true"/);
    assert.match(source, /classList\.toggle\("active", willActivate\)/);
    assert.match(stylesheet, /\.library-entry-grid/);
    assert.match(source, /layer\.minimal/);
    assert.match(source, /library-entry-grid--minimal/);
    assert.match(source, /library-entry-minimal-content/);
    assert.match(
        source,
        /library-entry-minimal-content[\s\S]*<\/span>\$\{pronunciation \? `<span class="library-card-pronunciation library-card-pronunciation-below"/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-minimal-content\s*\{[\s\S]*font-size:\s*clamp\([\s\S]*2\.8rem[\s\S]*18rem[\s\S]*4rem/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid--minimal \.library-entry-card[\s\S]*calc\(20rem \/ var\(--library-grid-row-size, 5\)\)[\s\S]*text-align:\s*center/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid--minimal\[style\][\s\S]*calc\(var\(--library-grid-row-size\) \* 10rem\)[\s\S]*margin-inline:\s*auto/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid--minimal \.library-entry-card-shell[\s\S]*width:\s*fit-content[\s\S]*justify-self:\s*center/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid--minimal \.library-entry-card-blank[\s\S]*visibility:\s*hidden[\s\S]*align-self:\s*stretch[\s\S]*justify-self:\s*stretch/,
    );
    assert.match(source, /data-library-grid-blank[\s\S]*&nbsp;/);
    assert.match(
        stylesheet,
        /\.library-entry-grid:has\(\.library-entry-variants-open\)::before[\s\S]*z-index:\s*4[\s\S]*backdrop-filter:\s*blur\(0\.18rem\)[\s\S]*pointer-events:\s*none/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-card-shell:is\(:hover, :focus-within\)[\s\S]*z-index:\s*5/,
    );
    assert.match(stylesheet, /\.library-filters/);
    assert.match(stylesheet, /\.library-filter-pill\.active/);
    assert.match(stylesheet, /\.library-entry-card\[hidden\]/);
    assert.match(
        source,
        /composeDetail\([\s\S]*languageCode,[\s\S]*variantPlacement,[\s\S]*\)/,
    );
    assert.doesNotMatch(source, /document\s*\.elementsFromPoint\(/);
    assert.doesNotMatch(source, /library-entry-card--variant-masked/);
    assert.match(
        stylesheet,
        /\.library-entry-variant\.library-entry-variant:is\(:hover, :focus-visible\)[\s\S]*background:\s*var\(--surface\);[\s\S]*transform:\s*none/,
    );
    assert.match(
        stylesheet,
        /\.library-selection-action \+ \.library-selection-action[\s\S]*margin-inline-start:\s*0\.5rem/,
    );
    assert.match(
        stylesheet,
        /\.library-detail-section h3[\s\S]*font-size:\s*1\.5em/,
    );
    assert.match(source, /allowCustomization: false/);
    assert.match(source, /width: "fill"/);
    assert.doesNotMatch(source, /width: "fitContent"/);
    assert.doesNotMatch(stylesheet, /\.widget-card/);
    assert.match(stylesheet, /max-width: 100%/);
    assert.doesNotMatch(stylesheet, /\.study-subnav/);
    assert.match(adapterSource, /\/static\/gateways\/study\/study\.css/);
});

test("Study Library integrates definitions and particles into item details", () => {
    assert.match(source, /function isMeaningLayer/);
    assert.match(source, /layer\.semanticRole !== "particle"/);
    assert.match(source, /class="library-detail-summary"/);
    assert.match(
        source,
        /renderEntryLink\(entry, "library-component-box btn-neutral"\)/,
    );
    assert.match(source, /layer\?\.semanticRole === "particle"/);
    assert.match(source, /const compositions = compositionReferenceGroups/);
    assert.match(source, /function compositionReferenceGroups/);
    assert.match(source, /const groupsByRole = new Map/);
    assert.match(source, /groupsByRole\.get\(presentationRole\)/);
    assert.match(
        source,
        /sort\(\(left, right\) => left\.position - right\.position\)/,
    );
    assert.match(source, /function renderCompositionGroups/);
    assert.match(source, /relationship\.resolverRole/);
    assert.match(source, /library-composition-operator/);
    assert.match(source, /const variantChildren = usedBy\.filter/);
    assert.doesNotMatch(
        source,
        /i18n\.t\("gateway\.study\.library_variants"\)/,
    );
    assert.match(source, /titleDefinition/);
    assert.match(source, /titleLeading: renderScope/);
    assert.doesNotMatch(source, /library-definition-link/);
    assert.doesNotMatch(stylesheet, /\.library-definition-text/);
    assert.match(stylesheet, /\.library-composition-label/);
    assert.doesNotMatch(stylesheet, /\.popup-title/);
    assert.doesNotMatch(source, /if \(!layer\.displayDefinition\)/);
    assert.match(source, /data-library-preview/);
    assert.match(source, /function relationshipPresentationRole/);
    assert.match(
        source,
        /targetLayer\?\.id === sourceLayer\?\.id && relationship\.variant/,
    );
    assert.match(source, /function headingCompositionReference/);
    assert.match(source, /const titleReference = headingCompositionReference/);
    assert.match(source, /id: "open-title-reference"/);
    assert.match(source, /titleAction:/);
    assert.doesNotMatch(source, /querySelector\("\.popup-title"\)/);
    assert.match(source, /data-library-presentation-role/);
    assert.match(
        source,
        /if \(isMeaningLayer\(layerForEntry\(schemas, initialEntry\)\)\)/,
    );
    assert.match(source, /Object\.keys\(value\)\.length === 0/);
    assert.doesNotMatch(
        source,
        /i18n\.t\("gateway\.study\.library_alternate_definitions"\)/,
    );
});

test("Study Library renders metadata and scope indicators", () => {
    assert.match(source, /detail\?\.renderer === "badge"/);
    assert.match(source, /class="library-metadata-pill"/);
    assert.match(source, /class="library-scope"/);
    assert.match(stylesheet, /\.library-metadata-pill/);
    assert.match(stylesheet, /\.popup-heading > \.library-scope/);
});

test("Study Library positions pronunciations by semantic role", () => {
    assert.match(source, /function isWritingUnitLayer/);
    assert.match(source, /function pronunciationValues/);
    assert.match(source, /function detailTitlePronunciation/);
    assert.match(source, /detailTitlePronunciation\(/);
    assert.match(source, /composed\.titleDefinition/);
    assert.match(source, /class="library-entry-heading"/);
    assert.match(source, /library-card-pronunciation-below/);
    assert.match(source, /const relatedWords = isWritingUnitLayer/);
    assert.match(source, /semanticRole ===\s*"lexicalUnit"/);
    assert.match(stylesheet, /\.library-entry-heading/);
    assert.match(stylesheet, /\.library-card-pronunciation/);
});

test("Study Library unfolds structured character variants", () => {
    assert.match(source, /function variantPlacement/);
    assert.match(source, /relationship\?\.variant === true/);
    assert.match(source, /library-entry-variant-\$\{direction\}/);
    assert.match(stylesheet, /\.library-entry-variant-left/);
    assert.match(stylesheet, /\.library-entry-variant-right/);
    assert.match(stylesheet, /\.library-entry-variant-up/);
    assert.match(source, /function assignVariantPlacements/);
    assert.match(source, /request\.direction === "left"/);
    assert.match(source, /request\.direction === "right"/);
    assert.match(source, /return "up"/);
    assert.match(source, /\["left", "up", "right"\]/);
    assert.match(
        source,
        /renderCardContents\(variant, layer, entries, schema, i18n\)/,
    );
    assert.match(stylesheet, /box-shadow:/);
    assert.match(source, /gateway\.study\.library_variant_hint/);
    assert.match(source, /library-entry-variants-open/);
    assert.match(source, /"contextmenu"/);
    assert.match(source, /"focusout"/);
    assert.match(source, /setSelectionMode\(root, true, i18n\)/);
    assert.match(
        source,
        /shell\.classList\.add\("library-entry-variants-open"\)/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-card-shell\.library-entry-variants-open/,
    );
    assert.match(stylesheet, /\.library-entry-variant-hint/);
    assert.match(stylesheet, /--library-card-gap: 0\.75rem/);
    assert.match(stylesheet, /\.library-entry-variant-shell::before/);
    assert.match(
        stylesheet,
        /\.library-entry-variant-shell\s*\{[\s\S]*display:\s*none/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-card-shell\.library-entry-variants-open[\s\S]*\.library-entry-variant-shell\.library-entry-variant-revealed\s*\{[\s\S]*display:\s*block/,
    );
    assert.doesNotMatch(
        stylesheet,
        /\.library-entry-variant-shell\s*\{[\s\S]*?visibility:\s*hidden/,
    );
    assert.doesNotMatch(
        stylesheet,
        /\.library-entry-variant-shell\s*\{[\s\S]*?opacity:\s*0/,
    );
    assert.match(stylesheet, /variant-arrow-light\.svg/);
    assert.match(stylesheet, /variant-arrow-dark\.svg/);
    assert.match(stylesheet, /\.library-entry-variant \{/);
    assert.match(stylesheet, /var\(--color-success-outline-text/);
    assert.match(
        stylesheet,
        /\.library-entry-variant\.library-entry-variant:is\(:hover, :focus-visible\)/,
    );
    assert.match(variantArrowLight, /fill="#059669"/);
    assert.match(variantArrowDark, /fill="#34d399"/);
    assert.match(
        stylesheet,
        /\.library-entry-card-shell:is\(:hover, :focus-within\)/,
    );
    assert.match(stylesheet, /z-index: 5/);
});

test("Study Library honors module-defined grid layouts", () => {
    assert.match(source, /function renderLayerCards/);
    assert.match(source, /entry\.sourceRecordId/);
    assert.match(source, /library-entry-card-blank/);
    assert.match(source, /--library-grid-row-size/);
    assert.match(stylesheet, /\.library-entry-grid\[style\]/);
    assert.match(stylesheet, /var\(--library-grid-row-size\)/);
});

test("Study Library renders writing-unit pronunciation and audio", () => {
    assert.match(source, /function renderPronunciation/);
    assert.match(source, /function renderAudio/);
    assert.match(source, /data-library-audio-player/);
    assert.match(source, /data-library-audio-toggle/);
    assert.match(source, /data-library-audio-progress/);
    assert.match(source, /function connectLibraryAudioControls/);
    assert.match(source, /fetchLibraryAudioUrl/);
    assert.match(source, /audio\.src = objectUrl/);
    assert.match(source, /replaceWith\(message\)/);
    assert.match(source, /gateway\.study\.library_audio_load_error/);
    assert.match(source, /URL\.revokeObjectURL/);
    assert.match(clientSource, /apiFetch\([\s\S]*\/audio\//);
    assert.match(
        clientSource,
        /URL\.createObjectURL\(await response\.blob\(\)\)/,
    );
    assert.match(stylesheet, /\.library-audio/);
    assert.match(stylesheet, /\.library-audio-progress/);
    assert.match(stylesheet, /appearance: none/);
    assert.match(stylesheet, /body\[data-theme="light"\] \.library-audio/);
    assert.match(stylesheet, /body\[data-theme="dark"\] \.library-audio/);
    assert.match(stylesheet, /background: var\(--surface-2\)/);
    assert.match(stylesheet, /\.library-audio-error/);
    assert.match(stylesheet, /font-size: 0\.75em/);
    assert.match(stylesheet, /forced-color-adjust: none/);
    assert.match(stylesheet, /::-webkit-slider-thumb/);
    assert.match(stylesheet, /::-moz-range-thumb/);
});

test("Study Library owners can select and delete multiple entries", () => {
    assert.match(source, /function canDeleteEntry/);
    assert.match(source, /data-library-select-entry/);
    assert.match(source, /data-library-delete-selection/);
    assert.match(source, /data-library-blacklist-content/);
    assert.match(source, /deleteLibraryEntries/);
    assert.match(clientSource, /export async function deleteLibraryEntries/);
    assert.match(clientSource, /method: "DELETE"/);
    assert.match(stylesheet, /\.library-entry-selection/);
    assert.match(source, /LONG_PRESS_DURATION_MS/);
    assert.match(source, /selectedEntryIds\(root\)\.length === 0/);
    assert.match(
        stylesheet,
        /\.library-selection-mode \.library-entry-selection/,
    );
    assert.match(
        stylesheet,
        /body\[data-theme="dark"\] \.library-entry-selection/,
    );
    assert.match(source, /floatingMenu: entries\.some\(canDeleteEntry\)/);
    assert.match(source, /data-library-select-all/);
    assert.match(source, /data-library-selection-close/);
    assert.match(source, /function setSelectionMode/);
    assert.match(source, /function selectAllVisibleEntries/);
    assert.match(stylesheet, /place-content: center/);
});

test("Study Library deep links activate and highlight their entry", () => {
    assert.match(source, /highlightSearchTarget/);
    assert.match(source, /function activateLibraryLayer/);
    assert.match(source, /function focusLibraryEntry/);
    assert.match(source, /data-search-id="library-entry-/);
    assert.match(source, /focusLibraryEntry\(root, relatedEntry, schemas\)/);
    assert.match(source, /library-entry-variant-revealed/);
    assert.match(stylesheet, /\.library-entry-variant-revealed/);
});

test("Study Library popup uses equal directional navigation controls", () => {
    assert.match(source, /arrow-back-light\.svg/);
    assert.match(source, /arrow-back-dark\.svg/);
    assert.match(source, /position: "before"/);
    assert.match(source, /position: "after"/);
    assert.match(source, /flip: true/);
    assert.doesNotMatch(source, /label: `←/);
    assert.match(stylesheet, /flex: 1 1 calc\(50% - 0\.5rem\)/);
});
