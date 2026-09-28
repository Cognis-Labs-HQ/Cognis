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
const adminStylesheet = read("src/adapters/study/library/ui/library-admin.css");
const libraryStylesheet = read("src/adapters/study/library/ui/library.css");
const drawingSource = read("src/adapters/study/library/ui/app/drawing.js");
const composerContractSource = read(
    "src/adapters/study/library/ui/app/composer-contract.js",
);
const popupTitleSource = read(
    "src/adapters/study/library/ui/app/popup-title.js",
);
const composerLimitsSource = read(
    "src/adapters/study/library/ui/app/composer-limits.js",
);

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
        [adminInteractionsSource, /configuredIds\.has\(targetLayer\)/],
        [adminInteractionsSource, /presentationRole === "pronunciation"/],
        [adminInteractionsSource, /target\.label/],
        [drawingSource, /orderedLexicalSequence/],
        [adapterSource, /registerLookupProvider/],
    ])
        assert.match(content, pattern);
    assert.doesNotMatch(createEntrySource, /fallbackInputCarouselIds/);
    assert.doesNotMatch(adminInteractionsSource, /linkRelationships/);
    assert.doesNotMatch(
        adminInteractionsSource,
        /data-library-pronunciation-commit/,
    );
});

test("Study Library derives pronunciation using the provider field type", () => {
    assert.match(
        composerContractSource,
        /schema\?\.layers\?\.find\([\s\S]*\(\{ id \}\) => id === layer\?\.id/,
    );
    assert.match(
        composerContractSource,
        /\(providerLayer \?\? layer\)\?\.fields/,
    );
    assert.match(
        composerContractSource,
        /pronunciationField\.type === "stringList"/,
    );
    assert.match(
        composerContractSource,
        /pronunciationField\.validation\?\.kind === "list"/,
    );
    assert.match(composerContractSource, /\? \[pronunciation\]/);
    assert.match(adminInteractionsSource, /name="class" type="hidden"/);
    assert.doesNotMatch(adminInteractionsSource, /<select name="class">/);
});

test("Study Library keeps selected-card fields beside configured carousels", () => {
    assert.match(
        adminInteractionsSource,
        /data-library-selected-references="\$\{kind\}"/,
    );
    assert.match(
        adminInteractionsSource,
        /pronunciationRelationshipIds\.size \? selectedReferenceField\("pronunciation"/,
    );
    assert.match(adminInteractionsSource, /selectedReferenceField\("input"/);
    assert.match(adminInteractionsSource, /renderSelectedReferences\(\)/);
    assert.match(adminInteractionsSource, /data-library-selected-reference/);
    assert.match(createEntrySource, /inputCarouselIds,/);
    assert.match(createEntrySource, /horizontal-carousel-preview/);
    assert.match(adminInteractionsSource, /persistentExtra: true/);
    assert.match(adminInteractionsSource, /field\.multi_value === true/);
    assert.match(adminInteractionsSource, /data-library-save-composed-value/);
    assert.match(adminInteractionsSource, /data-library-carousel-text/);
    assert.match(
        adminInteractionsSource,
        /data-library-remove-selected-reference/,
    );
    assert.match(adminInteractionsSource, /openPopup/);
    assert.match(adminInteractionsSource, /setCustomValidity/);
    assert.match(adminInteractionsSource, /isMultiValueKind\(kind\)/);
    assert.match(adminInteractionsSource, /stagedValues\.set/);
    assert.doesNotMatch(adminInteractionsSource, /editingSavedIndex/);
    assert.match(
        adminInteractionsSource,
        /generatedLabel: layer\?\.semanticRole !== "definition"/,
    );
    assert.match(adminInteractionsSource, /function syncGeneratedCardLabel\(/);
});

test("Study Library preserves each multi-value pronunciation reference group", () => {
    assert.match(adminInteractionsSource, /form\.referenceGroups/);
    assert.match(adminInteractionsSource, /groups\[groupIndex\]/);
    assert.match(adminInteractionsSource, /readReferenceGroups/);
    assert.match(createEntrySource, /referenceGroups: readReferenceGroups/);
    assert.match(popupTitleSource, /linkedPronunciationGroups/);
    assert.match(
        popupTitleSource,
        /linkedPronunciationGroups\[pronunciationIndex\]/,
    );
});

test("Study Library excludes hidden cards from every composer candidate list", () => {
    assert.match(
        adminInteractionsSource,
        /visibleTargets = availableTargets\.filter\([\s\S]*candidate\.hidden !== true/,
    );
    assert.match(createEntrySource, /entry\.hidden !== true/);
    assert.match(
        adminInteractionsSource,
        /hidden !== true && targetLayers\.has/,
    );
});

test("Study Library keeps staged-card deletion precise and validation recoverable", () => {
    assert.match(
        adminInteractionsSource,
        /event\.target\.matches\(\s*"\[data-library-remove-selected-reference\]"/,
    );
    assert.match(
        adminStylesheet,
        /library-composition-block > \.btn-cancel[\s\S]*flex:\s*0 0 1rem;[\s\S]*width:\s*1rem;[\s\S]*height:\s*1rem;/,
    );
    assert.match(createEntrySource, /missingRequiredRelationship/);
    assert.match(
        createEntrySource,
        /missingRequiredRelationship[\s\S]*library_validation_error[\s\S]*return false/,
    );
});

test("Study Library arranges dense title details and limits composer collections", () => {
    assert.match(popupTitleSource, /const placement = "reading"/);
    assert.match(popupTitleSource, /label: " — "/);
    assert.match(popupTitleSource, /placement: "definition"/);
    assert.match(
        libraryStylesheet,
        /grid-template-columns:[\s\S]*minmax\(0, 40%\)[\s\S]*data-popup-title-placement="reading"[\s\S]*grid-column: 3[\s\S]*data-popup-title-placement="definition"[\s\S]*grid-column: 4/,
    );
    assert.match(
        libraryStylesheet,
        /library-audio-sequence,[\s\S]*library-audio-speaker,[\s\S]*library-audio-unavailable[\s\S]*grid-column: 1;[\s\S]*grid-row: 2/,
    );
    assert.match(
        composerLimitsSource,
        /LIBRARY_COMPOSER_LIMITS = Object\.freeze\(\{[\s\S]*tags: 8,[\s\S]*definitions: 10,[\s\S]*pronunciations: 16/,
    );
    assert.match(adminInteractionsSource, /values\(\)\.length >= maxTags/);
    assert.match(
        adminInteractionsSource,
        /values\.length >= maxPronunciations/,
    );
    assert.match(
        createEntrySource,
        /selectedOptions[\s\S]*LIBRARY_COMPOSER_LIMITS\.definitions/,
    );
    assert.match(
        adminInteractionsSource,
        /showComposerLimitViolation\(form, composer\.layer, schema, i18n\)/,
    );
    assert.match(
        adminInteractionsSource,
        /maxTags: LIBRARY_COMPOSER_LIMITS\.tags/,
    );
    assert.match(
        adminInteractionsSource,
        /maxPronunciations:[\s\S]*LIBRARY_COMPOSER_LIMITS\.pronunciations/,
    );
});
