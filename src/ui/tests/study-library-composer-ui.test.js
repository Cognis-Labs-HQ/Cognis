import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");
const adminInteractionsSource = [
    "admin-interactions/index.js",
    "admin-interactions/editor-body.js",
    "pronunciation-editor.js",
]
    .map((file) => read(`src/adapters/study/library/ui/app/${file}`))
    .join("\n");
const createEntrySource = [
    "index.js",
    "composition.js",
    "definitions.js",
    "definition-editor.js",
    "lookups.js",
    "lookup-replacement.js",
    "pronunciation-draft.js",
]
    .map((file) =>
        read(`src/adapters/study/library/ui/app/create-entry/${file}`),
    )
    .join("\n");
const clientSource = read("src/gateways/study/ui/library-client.js");
const adapterSource = read("src/adapters/study/library/index.ts");
const carouselStylesheet = read("src/ui/styles/reuse/horizontal-carousel.css");
const carouselSource = read("src/ui/reuse/horizontal-carousel.js");
const compositionStylesheet = read("src/ui/styles/reuse/composition-input.css");
const adminStylesheet = read("src/adapters/study/library/ui/library-admin.css");
const libraryStylesheet = ["library.css", "library-detail.css"]
    .map((file) => read(`src/adapters/study/library/ui/${file}`))
    .join("\n");
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
const composerExtrasSource = read(
    "src/adapters/study/library/ui/app/composer-extras.js",
);
const transformationPopupSource = read(
    "src/adapters/study/library/ui/app/transformation-popup.js",
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
        [
            createEntrySource,
            /lookups\.hidden = !form\.elements\.label\.value\.trim\(\)/,
        ],
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

test("Study Library separates stroke lookup and renders a compact preview", () => {
    for (const [content, pattern] of [
        [createEntrySource, /strokeLookupProviders/],
        [createEntrySource, /capabilities\?\.includes\("strokePattern"\)/],
        [createEntrySource, /providerMatchesField/],
        [createEntrySource, /dictionary_lookup !== false/],
        [createEntrySource, /data-library-stroke-lookup/],
        [adminInteractionsSource, /renderStrokePatternPreviews/],
        [adminStylesheet, /\.library-stroke-pattern-preview/],
        [adminStylesheet, /width:\s*4rem/],
        [adminStylesheet, /height:\s*4rem/],
    ])
        assert.match(content, pattern);
});

test("Study Library keeps definition controls in the Definitions tab", () => {
    assert.match(
        adminInteractionsSource,
        /const definitionsPanel = `[\s\S]*alwaysShowDefinitionControl/,
    );
    assert.match(
        adminInteractionsSource,
        /allowDefinitionCreate: layer\?\.semanticRole !== "definition"/,
    );
    assert.match(adminInteractionsSource, /data-library-add-definition/);
    assert.match(createEntrySource, /error\.message !== "content_conflict"/);
    assert.match(
        createEntrySource,
        /return \{ entry: detail\.entry, created: false \}/,
    );
    assert.match(createEntrySource, /library_definition_reused/);
    assert.match(adminInteractionsSource, /openCreateEntryPopup/);
});

test("Study Library validation reveals invalid fields across editor tabs", () => {
    for (const pattern of [
        /revealFirstInvalid/,
        /formValidationPanel/,
        /bindTabbedFormValidation/,
        /library-editor-tab--required/,
        /validateRequiredRelationships/,
    ])
        assert.match(adminInteractionsSource, pattern);
    assert.match(adminStylesheet, /\.library-editor-tab--required/);
    assert.match(
        adminStylesheet,
        /library-editor-tab--required::after[\s\S]*color:\s*var\(--color-danger-outline-text\)/,
    );
    assert.match(adminStylesheet, /library-definition-add--required/);
    assert.match(
        adminStylesheet,
        /library-pronunciation-selector:has\(:invalid\)[\s\S]*color:\s*var\(--color-danger-outline-text\)/,
    );
    assert.doesNotMatch(
        adminStylesheet,
        /button\.library-editor-tab--required\s*\{[^}]+color:/,
    );
    assert.match(adminInteractionsSource, /\$\{tagsField\}<\/section>/);
});

test("Study Library selects newly created dependencies through the carousel", () => {
    assert.match(
        createEntrySource,
        /new Option\(\s*created\.label,\s*created\.id,\s*false,\s*false,\s*\)/,
    );
    assert.match(
        createEntrySource,
        /appendHorizontalCarouselItem\(carousel,[\s\S]*?\}\)\?\.click\(\)/,
    );
});

test("Study Library registers schema layer views as SPA routes", () => {
    assert.ok(
        adapterSource.includes(
            'pattern: "^/study/layers/[^/]+/[^/]+(?:/[^/]+)?$"',
        ),
    );
});

test("Study Library derives pronunciation using the provider field type", () => {
    assert.match(
        composerContractSource,
        /\["atomicWritingUnit", "particle"\]\.includes\(entryLayer\?\.semanticRole\)[\s\S]*return entry\.label/,
    );
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
    assert.match(
        composerContractSource,
        /pronunciationField\.multi_value === true[\s\S]*fields\.pronunciation\.some/,
    );
    assert.match(adminInteractionsSource, /name="class" type="hidden"/);
    assert.match(
        adminInteractionsSource,
        /semanticRole === "orderedLexicalSequence"[\s\S]*type="hidden"/,
    );
    assert.doesNotMatch(adminInteractionsSource, /<select name="class">/);
});

test("Study Library keeps selected-card fields beside configured carousels", () => {
    assert.match(
        adminInteractionsSource,
        /"data-library-selected-references": kind/,
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
    assert.match(adminInteractionsSource, /data-composition-remove/);
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
    assert.match(adminInteractionsSource, /const inlineInputCarousel/);
    assert.match(adminInteractionsSource, /canCreateLayerEntries/);
    assert.match(adminInteractionsSource, /createRelationshipDependency/);
});

test("Study Library edits saved pronunciations and rejects an empty stage", () => {
    assert.match(adminInteractionsSource, /library_pronunciation_stage_empty/);
    assert.match(adminInteractionsSource, /library_pronunciation_saved/);
    assert.match(
        adminInteractionsSource,
        /closest\("fieldset"\)[\s\S]*data-library-saved-values/,
    );
    assert.match(adminInteractionsSource, /clearHorizontalCarouselSelection/);
    assert.match(carouselSource, /output\.textContent = ""/);
    assert.match(
        adminInteractionsSource,
        /const counter = item\.querySelector\("\[data-carousel-order\]"\);[\s\S]*if \(counter\) counter\.textContent = ""/,
    );
    assert.match(adminInteractionsSource, /editingGroups/);
    assert.match(adminInteractionsSource, /data-library-edit-saved-value/);
    assert.match(adminStylesheet, /data-library-edit-saved-value/);
    assert.match(adminStylesheet, /position:\s*absolute/);
});

test("Study Library edit failures retain server error codes for useful toasts", () => {
    assert.match(clientSource, /payload\.error\?\.code \?\? "update_failed"/);
    assert.match(clientSource, /payload\.error\?\.code \?\? "request_failed"/);
    assert.match(adminInteractionsSource, /showLibraryMutationError/);
    assert.match(adminInteractionsSource, /library_relationship_error/);
    assert.match(adminInteractionsSource, /library_pronunciation_group_error/);
});

test("Study Library distinguishes persisted updates from refresh failures", () => {
    assert.match(adminInteractionsSource, /completeLibraryMutation/);
    assert.match(adminInteractionsSource, /synchronize-entry-update/);
    assert.match(adminInteractionsSource, /library_update_refresh_warning/);
    assert.match(
        adminInteractionsSource,
        /updated = await updateLibraryEntry[\s\S]*catch \(error\) \{[\s\S]*showLibraryMutationError[\s\S]*completeLibraryMutation/,
    );
    assert.match(adminInteractionsSource, /assignUpdated: !requestUpdate/);
});

test("Study Library preserves each multi-value pronunciation reference group", () => {
    assert.match(adminInteractionsSource, /form\.referenceGroups/);
    assert.match(adminInteractionsSource, /groups\.push\(/);
    assert.match(adminInteractionsSource, /readReferenceGroups/);
    assert.match(createEntrySource, /referenceGroups: readReferenceGroups/);
    assert.match(popupTitleSource, /linkedPronunciationGroups/);
    assert.match(popupTitleSource, /resolveGroupedPronunciation/);
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
        /event\.target\.matches\(\s*"\[data-composition-remove\]"/,
    );
    assert.match(
        compositionStylesheet,
        /composition-input-item > \.btn-cancel[\s\S]*flex:\s*0 0 1rem;[\s\S]*width:\s*1rem;[\s\S]*height:\s*1rem;/,
    );
    assert.match(
        createEntrySource,
        /validateRequiredRelationships[\s\S]*library_validation_error[\s\S]*revealFirstInvalidField/,
    );
});

test("Study Library arranges dense title details and limits composer collections", () => {
    assert.match(popupTitleSource, /const placement = "reading"/);
    assert.doesNotMatch(popupTitleSource, /label: " — "/);
    assert.match(popupTitleSource, /placement: "definition"/);
    assert.match(
        libraryStylesheet,
        /grid-template-columns:[\s\S]*minmax\(0, 40%\)[\s\S]*data-popup-title-placement="reading"[\s\S]*grid-column: 3[\s\S]*data-popup-title-placement="definition"[\s\S]*grid-column: 2 \/ 4/,
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

test("Study Library commits multi-value fields and resolves typed prefixes", () => {
    assert.match(
        adminInteractionsSource,
        /"data-multi-value": multiValue \? "true" : "false"/,
    );
    assert.match(adminInteractionsSource, /isDefinitionRelationship/);
    assert.match(createEntrySource, /resolveCompositionPrefix/);
    assert.match(createEntrySource, /const compositionCandidates = \(\) =>/);
    assert.match(
        createEntrySource,
        /entries\.push\(created\)[\s\S]*dispatchEvent\([\s\S]*new Event\("input"/,
    );
    assert.match(createEntrySource, /data-library-suggestion-sequence/);
    assert.match(createEntrySource, /prefixMatches\.matches\.length > 1/);
    assert.match(
        createEntrySource,
        /control\.dispatchEvent\(new Event\("input"/,
    );
    assert.match(
        adminInteractionsSource,
        /event\.target === form\.elements\["field:pronunciation"\]/,
    );
    assert.match(
        adminInteractionsSource,
        /libraryCompositionField !==[\s\S]*"pronunciation"[\s\S]*return/,
    );
    assert.match(createEntrySource, /return existing\.entry/);
});

test("Study Library exposes tagged sentence components and repeatable literals", () => {
    assert.match(composerExtrasSource, /constructor\.tag_carousels/);
    assert.match(composerExtrasSource, /entry\.tags \?\? \[\]/);
    assert.match(composerExtrasSource, /constructor\.literal_carousels/);
    assert.match(composerExtrasSource, /aria-readonly="true"/);
    assert.match(composerExtrasSource, /compositionOrder\.push/);
    assert.match(composerExtrasSource, /option\.selected = selected/);
    assert.match(composerExtrasSource, /compositionTokenEntryId/);
    assert.match(composerExtrasSource, /aria-pressed="false"/);
    assert.match(composerExtrasSource, /library-composition-change/);
    assert.match(createEntrySource, /bindComposerExtras\(form\)/);
    assert.match(adminInteractionsSource, /bindComposerExtras\(form,/);
    assert.match(adminStylesheet, /library-composer-extra-row--literal/);
    assert.match(
        adminStylesheet,
        /library-composer-extra-row > button\.is-selected/,
    );
    assert.match(
        adminInteractionsSource,
        /\$\{inputSelectionField\}\$\{extraHtml\}/,
    );
});

test("Study Library composes transformed carousel cards into sentences", () => {
    const activationSource = readFileSync(
        new URL(
            "../../adapters/study/library/ui/app/composition-activation.js",
            import.meta.url,
        ),
        "utf8",
    );
    assert.match(activationSource, /openTransformationPopup/);
    assert.match(activationSource, /transformationCompositionToken/);
    assert.match(createEntrySource, /transformationTokenDetails/);
    assert.match(createEntrySource, /transformationValue/);
    assert.match(createEntrySource, /carouselSuggestedTransformation/);
    assert.match(adminInteractionsSource, /compositionTokenEntryId/);
    assert.match(
        transformationPopupSource,
        /gateway\.study\.library_transform_title/,
    );
    assert.match(transformationPopupSource, /transformedDefinitions/);
    assert.match(
        transformationPopupSource,
        /library-transform-option-definitions/,
    );
    assert.match(libraryStylesheet, /grid-template-columns:\s*repeat\(2,/);
    assert.match(
        libraryStylesheet,
        /library-transform-option[\s\S]*min-height:\s*7rem[\s\S]*grid-template-rows:\s*auto auto 1fr/,
    );
});
