import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const indexSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/index.js"),
    "utf8",
);
const layerPageSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/layer/index.js"),
    "utf8",
);
const requestsPageSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/requests/index.js"),
    "utf8",
);
const studySubNavigationSource = readFileSync(
    resolve(ROOT, "src/gateways/study/ui/sub-navigation.js"),
    "utf8",
);
const studyStylesheet = readFileSync(
    resolve(ROOT, "src/gateways/study/ui/study.css"),
    "utf8",
);
const adminInteractionsSource = [
    "admin-interactions.js",
    "pronunciation-editor.js",
]
    .map((file) =>
        readFileSync(
            resolve(ROOT, `src/adapters/study/library/ui/app/${file}`),
            "utf8",
        ),
    )
    .join("\n");
const cardsSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/cards.js"),
    "utf8",
);
const source = readdirSync(resolve(ROOT, "src/adapters/study/library/ui/app"))
    .filter((file) => file.endsWith(".js"))
    .map((file) =>
        readFileSync(
            resolve(ROOT, `src/adapters/study/library/ui/app/${file}`),
            "utf8",
        ),
    )
    .join("\n");
const stylesheet = ["library.css", "library-admin.css", "library-selection.css"]
    .map((file) =>
        readFileSync(
            resolve(ROOT, `src/adapters/study/library/ui/${file}`),
            "utf8",
        ),
    )
    .join("\n");
const clientSource = readFileSync(
    resolve(ROOT, "src/gateways/study/ui/library-client.js"),
    "utf8",
);
const adapterSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/index.ts"),
    "utf8",
);
const createEntrySource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/create-entry.js"),
    "utf8",
);
const carouselStylesheet = readFileSync(
    resolve(ROOT, "src/ui/styles/reuse/horizontal-carousel.css"),
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

test("Study Library keeps its page modules focused", () => {
    for (const file of [
        "cards.js",
        "entry-popup.js",
        "index.js",
        "interactions.js",
        "layer-cards.js",
        "popup-title.js",
        "selection.js",
        "variants.js",
    ]) {
        const lineCount = readFileSync(
            resolve(ROOT, `src/adapters/study/library/ui/app/${file}`),
            "utf8",
        ).split("\n").length;
        assert.ok(lineCount <= 275, `${file} has ${lineCount} lines`);
    }
});

test("Study Library uses an administrator-only common data editor", () => {
    assert.match(indexSource, /renderAdminBrowser/);
    assert.match(indexSource, /if \(!isAdminScope\(\)\)/);
    assert.match(indexSource, /bindAdminLibraryInteractions/);
    assert.match(indexSource, /createSideMenu/);
    assert.match(indexSource, /adminLayerGroups/);
    assert.match(source, /library-admin-layer-count/);
    assert.match(source, /library-admin-entry-row/);
    assert.match(source, /library-admin-entry-detail/);
    assert.match(source, /data-library-entry/);
    assert.match(source, /data-library-admin-edit/);
    assert.match(source, /openPopup/);
    assert.match(source, /updateLibraryEntry/);
    assert.match(adminInteractionsSource, /layer\?\.fields/);
    assert.match(adminInteractionsSource, /layer\?\.relationships/);
    assert.match(adminInteractionsSource, /closeProtection: !readOnly/);
    assert.match(adminInteractionsSource, /library_admin_view_title/);
    assert.match(adminInteractionsSource, /control\.disabled = true/);
    assert.match(indexSource, /openDetails: false/);
    assert.doesNotMatch(adminInteractionsSource, /JSON\.parse/);
    assert.match(stylesheet, /library-admin-edit[\s\S]*edit-light\.svg/);
    assert.match(
        stylesheet,
        /\.library-admin-edit > span[\s\S]*background:[\s\S]*edit-light\.svg/,
    );
    assert.doesNotMatch(source, /const url = `\/study\/library/);
});

test("Study Library presents browsable layers as filterable card tabs", () => {
    assert.match(
        source,
        /fieldValues,[\s\S]*filterFields,[\s\S]*localizedLabel,[\s\S]*from "\.\/presentation\.js"/,
    );
    assert.match(source, /role="tablist"/);
    assert.match(source, /role="tabpanel"/);
    assert.match(source, /class="library-entry-card\$\{roleClass\}\$\{variant/);
    assert.match(source, /library-entry-variant/);
    assert.match(source, /class="library-filter-pill btn-neutral/);
    assert.match(source, /aria-pressed="\$\{selected\}"/);
    assert.match(source, /function applyLibraryFilters/);
    assert.match(source, /\.library-entry-card\[data-library-filter-values\]/);
    assert.match(source, /data-library-filter-exclusive/);
    assert.match(source, /data-library-filter-required/);
    assert.match(source, /filter\.detail\?\.defaultTag/);
    assert.match(source, /required \|\| tags\.length === 1/);
    assert.match(source, /function refreshLibraryFilterResults/);
    assert.match(source, /field\.detail\?\.filterable === true/);
    assert.match(source, /function deduplicateDisplayEntries/);
    assert.match(source, /new Set\([\s\S]*meaningRelations\.has/);
    assert.match(source, /meaningIds\.join\("\\u0000"\)/);
    assert.match(source, /const baseEntries = deduplicateDisplayEntries/);
    assert.match(source, /group\?\.dataset\.libraryFilterRequired === "true"/);
    assert.match(source, /classList\.toggle\("active", willActivate\)/);
    assert.match(stylesheet, /\.library-entry-grid/);
    assert.match(source, /layer\.minimal/);
    assert.match(source, /library-entry-grid--minimal/);
    for (const pageSource of [
        indexSource,
        layerPageSource,
        requestsPageSource,
    ]) {
        assert.match(pageSource, /contentScrolling: false/);
    }
    assert.match(source, /library-entry-minimal-content/);
    assert.match(source, /library-card-pronunciation/);
    assert.match(
        stylesheet,
        /\.library-entry-minimal-content\s*\{[\s\S]*font-size:\s*clamp\([\s\S]*1rem[\s\S]*7rem[\s\S]*1\.35rem/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid--minimal \.library-entry-card[\s\S]*width:\s*100%[\s\S]*height:\s*100%[\s\S]*border:\s*1px solid[\s\S]*background:\s*var\(--library-card-surface\)/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid--minimal\s*\{[\s\S]*width:\s*100%[\s\S]*border:\s*0[\s\S]*gap:\s*0\.65rem/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid--minimal \.library-entry-card-shell[\s\S]*width:\s*100%[\s\S]*min-height:\s*4\.75rem/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid--minimal \.library-entry-card-blank[\s\S]*place-items:\s*center[\s\S]*min-height:\s*4\.75rem[\s\S]*color:\s*var\(--text-muted\)/,
    );
    assert.match(source, /data-library-grid-blank[\s\S]*—/);
    assert.match(
        source,
        /if \(itemId === null \|\| typeof itemId === "object"\)[\s\S]*data-library-grid-blank/,
    );
    assert.match(
        source,
        /const entry = entriesByGridId\.get\(itemId\);[\s\S]*\? renderEntryCard\([\s\S]*: "";/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid:has\(\.library-entry-variants-open\)::before[\s\S]*z-index:\s*4[\s\S]*background:\s*color-mix[\s\S]*pointer-events:\s*none/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-card-shell:is\(:hover, :focus-within\)[\s\S]*z-index:\s*5/,
    );
    assert.match(stylesheet, /\.library-filters/);
    assert.match(stylesheet, /\.library-filter-pill\.active/);
    assert.match(stylesheet, /\.library-entry-card\[hidden\]/);
    assert.match(source, /composeDetail\([\s\S]*languageCode,[\s\S]*\)/);
    assert.doesNotMatch(source, /document\s*\.elementsFromPoint\(/);
    assert.doesNotMatch(source, /library-entry-card--variant-masked/);
    assert.match(
        stylesheet,
        /\.library-entry-card\.library-entry-card\.library-entry-variant:is\([\s\S]*:hover,[\s\S]*:focus-visible,[\s\S]*:active[\s\S]*\)[\s\S]*opacity:\s*1[\s\S]*background:\s*var\(--library-card-surface-raised\);[\s\S]*transform:\s*none/,
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
    assert.match(adapterSource, /\/static\/styles\/page-builder\.css/);
    assert.match(adapterSource, /\/static\/styles\/reuse\/page-sections\.css/);
});

test("Study layer cards optionally show provider-requested definitions", () => {
    const detail = readFileSync(
        resolve(ROOT, "src/adapters/study/library/ui/app/detail.js"),
        "utf8",
    );
    assert.match(cardsSource, /library-card-pronunciation/);
    assert.match(cardsSource, /pronunciationValues\(entry\)/);
    assert.match(cardsSource, /entry\.alwaysShowDefinition/);
    assert.match(cardsSource, /definitionText/);
    assert.match(cardsSource, /library-card-definition/);
    assert.match(detail, /options\.showReferenceTree/);
    assert.match(indexSource, /showReferenceTree: true/);
    assert.match(indexSource, /readOnly: true/);
});

test("Study Library integrates definitions and particles into item details", () => {
    assert.match(source, /field\.type === "localizedText"/);
    assert.match(source, /localizedTextValue\(fields\[field\.id\]\)/);
    assert.match(source, /function secondarySpellingGroups/);
    assert.match(source, /visibleTitleDefinition\([\s\S]*sourceDefinition/);
    assert.match(source, /function orderedDefinitionDisplay/);
    assert.match(source, /titleDefinition: definitions\[0\]/);
    assert.match(source, /additionalDefinitions: definitions\.slice\(1\)/);
    assert.match(source, /gateway\.study\.library_additional_definitions/);
    assert.match(
        source,
        /parentEntry && layer\?\.semanticRole !== "lexicalUnit"/,
    );
    assert.match(source, /group\.presentationRole === "alternateSpelling"/);
    assert.match(
        source,
        /const dependentSpellings = \(detail\.usedBy \?\? \[\]\)/,
    );
    assert.match(source, /reference\.entryId !== detail\.entry\.id/);
    assert.match(
        source,
        /semanticRole !== "lexicalUnit"[\s\S]*semanticRole !== "orderedLexicalSequence"/,
    );
    assert.match(source, /renderDetailFields\(genericFields\)/);
    assert.match(source, /orderedLexicalSequence/);
    assert.match(source, /const directExamples = usedBy\.filter/);
    assert.match(source, /!directExamples\.includes\(candidate\)/);
    assert.match(source, /library_usage_examples[\s\S]*directExamples/);
    assert.match(source, /function isMeaningLayer/);
    assert.match(source, /layer\.semanticRole !== "particle"/);
    assert.match(source, /class="library-detail-summary"/);
    assert.doesNotMatch(source, /library-component-box/);
    assert.doesNotMatch(source, /library-component-boxes/);
    assert.match(source, /layer\?\.semanticRole === "particle"/);
    assert.match(source, /function compositionReferenceGroups/);
    assert.match(source, /const groupsByRole = new Map/);
    assert.match(source, /groupsByRole\.get\(presentationRole\)/);
    assert.match(
        source,
        /sort\(\(left, right\) => left\.position - right\.position\)/,
    );
    assert.doesNotMatch(source, /function renderCompositionGroups/);
    assert.match(source, /relationship\.resolverRole/);
    assert.doesNotMatch(source, /library-composition-operator/);
    assert.doesNotMatch(
        source,
        /i18n\.t\("gateway\.study\.library_variants"\)/,
    );
    assert.match(source, /titleDefinition/);
    assert.match(source, /titleLeading: renderScope/);
    assert.doesNotMatch(source, /library-definition-link/);
    assert.doesNotMatch(stylesheet, /\.library-definition-text/);
    assert.doesNotMatch(stylesheet, /\.library-composition-label/);
    assert.doesNotMatch(stylesheet, /^\.popup-title\s*\{/m);
    assert.doesNotMatch(source, /if \(!layer\.displayDefinition\)/);
    assert.doesNotMatch(source, /data-library-preview/);
    assert.match(source, /function relationshipPresentationRole/);
    assert.match(
        source,
        /return relationship\.resolverRole \? "composition" : undefined/,
    );
    assert.match(
        source,
        /targetLayer\?\.id === sourceLayer\?\.id && relationship\.variant/,
    );
    assert.match(source, /function headingCompositionReferences/);
    assert.match(
        source,
        /const explicitTitleReferences = headingCompositionReferences/,
    );
    assert.match(source, /resolveLabelComposition\(/);
    assert.match(source, /distinctPronunciationLabels\(/);
    assert.match(
        source,
        /semanticRole === "lexicalUnit"[\s\S]*distinctPronunciationLabels/,
    );
    assert.match(
        source,
        /const pronunciationItems = distinctPronunciationLabels\([\s\S]*\{ label \}/,
    );
    assert.match(source, /const spellingItems = spellingGroups\.flatMap/);
    assert.match(source, /function excludeTitleReferenceDuplicates/);
    assert.match(
        source,
        /excludeTitleReferenceDuplicates\([\s\S]*secondarySpellingGroups/,
    );
    assert.match(
        source,
        /popupTitleDetailItems\([\s\S]*sourceDefinition,[\s\S]*titleReferences/,
    );
    assert.match(source, /const titleDetailItems = popupTitleDetailItems/);
    assert.match(source, /detail\.entry\.class === "composite"/);
    assert.match(source, /placement:[\s\S]*"definition"/);
    assert.match(stylesheet, /library-entry-popup--composite/);
    assert.match(
        stylesheet,
        /library-entry-popup--composite \.popup-heading[\s\S]*row-gap: 0\.15rem/,
    );
    assert.match(source, /function linkedItems\(entries\)/);
    assert.match(source, /titleItems: titleReferences\.map/);
    assert.match(source, /open-title-reference:\$\{entry\.id\}/);
    assert.doesNotMatch(source, /querySelector\("\.popup-title"\)/);
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

test("Study Library separates admin data browsing from learner layer pages", () => {
    assert.match(indexSource, /if \(!isAdminScope\(\)\)/);
    assert.match(layerPageSource, /renderBrowser\(/);
    assert.match(layerPageSource, /parts\[1\] !== "layers"/);
    assert.match(
        source,
        /requestedLayer \? "" : `<div class="library-layer-tabs"/,
    );
    assert.match(adapterSource, /pattern: "\^\/study\/library\$"/);
    assert.match(
        adapterSource,
        /pattern: "\^\/study\/layers\/\[\^\/\]\+\/\[\^\/\]\+\$"/,
    );
});

test("Study Library creation is driven by language card constructors", () => {
    assert.match(adapterSource, /study:library:provider/);
    assert.match(adapterSource, /registerConstructor/);
    assert.match(source, /layer\?\.cardConstructor/);
    assert.match(source, /constructor\.fields/);
    assert.match(source, /constructor\.relationships/);
    assert.match(source, /constructor\.defaults/);
    assert.match(source, /name="scope" type="hidden" value="user"/);
    assert.match(source, /data-library-publish-class-toggle/);
    assert.match(source, /publishEveryone/);
    assert.match(source, /library_publish_everyone_info/);
    assert.match(source, /includeHidden: false/);
    assert.doesNotMatch(indexSource, /data-library-create/);
    assert.match(layerPageSource, /page:actions/);
    assert.match(layerPageSource, /textContent = "\+"/);
    assert.match(
        stylesheet,
        /page-action-button\[data-page-action-id="study-library:create"\][\s\S]*font-size:\s*2rem/,
    );
    assert.match(layerPageSource, /fetchLibraryForms/);
    assert.match(
        layerPageSource,
        /\["atomicWritingUnit", "definition", "meaning"\]\.includes/,
    );
    assert.match(source, /contributedConstructor \?\?/);
    assert.match(source, /layer\?\.cardConstructor \?\?/);
    assert.match(source, /writableClasses\.length && !canPublishEveryone/);
    assert.match(source, /onOpen\(overlay\)/);
    assert.doesNotMatch(layerPageSource, /renderLibraryRequests/);
    assert.doesNotMatch(indexSource, /renderLibraryRequests/);
    assert.match(requestsPageSource, /renderLibraryRequests/);
    assert.match(requestsPageSource, /bindLibraryRequestReviews/);
    assert.match(adapterSource, /pattern: "\^\/study\/library\/requests\$"/);
    assert.match(adapterSource, /navigationLabels:\s*\{/);
    assert.match(studySubNavigationSource, /study-subnav-attention/);
    assert.match(
        studyStylesheet,
        /@keyframes study-subnav-attention-breathe[\s\S]*color-danger-outline-text/,
    );
});

test("Study Library creation offers ordered, recursive composition", () => {
    assert.match(source, /mountHorizontalCarousels/);
    assert.match(source, /relationshipCarousels: true/);
    assert.match(source, /data-library-composer-text/);
    assert.match(source, /await openCreateEntryPopup\(/);
    assert.match(source, /layerId: relationship\.targetLayer/);
    assert.match(source, /library_create_typed/);
    assert.match(source, /\.replace\("\{type\}", cardType\)/);
    assert.match(source, /library_composer_no_match/);
    assert.match(stylesheet, /library-composer-suggestions/);
    assert.match(source, /data-library-composition-blocks/);
    assert.match(source, /draggable="true"/);
    assert.match(source, /derivedPronunciation/);
    assert.match(source, /label\.trim\(\)\.normalize\("NFKC"\)/);
    assert.doesNotMatch(source, /function inferRelationships/);
    assert.match(source, /library-composition-input/);
    assert.match(
        stylesheet,
        /\.library-entry-card\s*\{[\s\S]*height:\s*7\.5rem/,
    );
    assert.match(source, /data-library-add-definition/);
    assert.match(adminInteractionsSource, /library-relationship-map/);
    assert.match(adminInteractionsSource, /targetLayer\?\.metadata/);
    assert.match(
        adminInteractionsSource,
        /candidate\.layer === relationship\.targetLayer/,
    );
    assert.match(adminInteractionsSource, /data-library-definition-empty/);
    assert.doesNotMatch(source, /library_composer_match.*<\/small>/);
});

test("Study Library separates admin and user-facing editing", () => {
    assert.match(source, /library-admin-entry-row/);
    assert.match(
        source,
        /if \(event\.target\.closest\("\.library-admin-entry-row"\)\) return/,
    );
    assert.match(source, /function entryEditMode/);
    assert.match(source, /entry\.canEdit !== true/);
    assert.match(source, /headerActions: \[/);
    assert.doesNotMatch(source, /data-library-entry-edit/);
    assert.doesNotMatch(stylesheet, /\.library-entry-preview-edit/);
    assert.match(source, /edit-light\.svg/);
    assert.match(source, /data-library-editor-tab="relationships"/);
    assert.match(source, /data-library-editor-panel="definitions"/);
    assert.match(source, /requestLibraryUpdate/);
    assert.match(source, /requestUpdate: editMode === "request"/);
});

test("Study Library presents localized definitions as readable translations", () => {
    assert.match(adminInteractionsSource, /library-definition-summary/);
    assert.match(adminInteractionsSource, /library-definition-translation/);
    assert.match(adminInteractionsSource, /definitionLocalization/);
    assert.match(stylesheet, /\.library-definition-translation/);
});

test("Study Library administration exposes contract-safe editing", () => {
    assert.match(adminInteractionsSource, /name:\s*"label"/);
    assert.match(adminInteractionsSource, /required:\s*true/);
    assert.match(adminInteractionsSource, /library_content_class/);
    assert.match(adminInteractionsSource, /const isDefinition/);
    assert.match(adminInteractionsSource, /field\.type === "strokePattern"/);
    assert.match(adminInteractionsSource, /relationship\.ordered/);
    assert.match(adminInteractionsSource, /showRelationshipTab: readOnly/);
    assert.match(adminInteractionsSource, /mountEditableRelationshipCarousels/);
    assert.match(adminInteractionsSource, /relationshipCarouselAdd: false/);
    assert.match(adminInteractionsSource, /inlinePronunciationCarousel: true/);
    assert.match(adminInteractionsSource, /const inlinePronunciationCarousel/);
    assert.match(adminInteractionsSource, /input\?\.linkRelationships/);
    assert.match(adminInteractionsSource, /pronunciationRelationships\.length/);
    assert.match(adminInteractionsSource, /ordersPronunciation: true/);
    assert.match(adminInteractionsSource, /pronunciationRelationshipsFor/);
    assert.match(adminInteractionsSource, /data-library-pronunciation-commit/);
    assert.match(adminInteractionsSource, /data-library-pronunciation-text/);
    assert.match(adminInteractionsSource, /data-library-pronunciation-blocks/);
    assert.match(adminInteractionsSource, /field\.dataset\.fieldId}\.audio/);
    assert.match(adminInteractionsSource, /const pronunciationIndex/);
    assert.match(
        adminInteractionsSource,
        /name="field:pronunciation" type="hidden"/,
    );
    assert.match(adminInteractionsSource, /library-pronunciation-selector/);
    assert.match(adminInteractionsSource, /data-library-audio-filename/);
    assert.match(stylesheet, /\.library-audio-filename/);
    assert.match(
        adminInteractionsSource,
        /name="hidden" type="hidden" value="true"/,
    );
    assert.match(adminInteractionsSource, /id: "save"/);
    assert.match(adminInteractionsSource, /closeProtection: !readOnly/);
    assert.match(source, /data-library-admin-edit/);
});

test("Study Library renders metadata and scope indicators", () => {
    assert.match(source, /detail\?\.renderer === "badge"/);
    assert.match(source, /class="library-metadata-pill"/);
    assert.match(source, /class="library-scope"/);
    assert.match(source, /contentClassLabel/);
    assert.match(source, /semanticRole === "orderedLexicalSequence"/);
    assert.match(source, /library-content-class-pill/);
    assert.match(source, /visibleRelatedWords/);
    assert.match(source, /function uniqueRelatedEntries/);
    assert.match(
        source,
        /const relatedDependants = uniqueRelatedEntries\(\[[\s\S]*\.\.\.visibleRelatedWords,[\s\S]*\.\.\.otherUsedBy/,
    );
    assert.doesNotMatch(source, /gateway\.study\.library_used_in_layer/);
    assert.match(stylesheet, /\.library-metadata-pill/);
    assert.match(
        stylesheet,
        /\.library-entry-card \.library-entry-indicators[\s\S]*position:\s*static/,
    );
    assert.match(stylesheet, /\.popup-heading > \.library-scope/);
});

test("Study Library positions pronunciations by semantic role", () => {
    assert.match(source, /function isWritingUnitLayer/);
    assert.match(source, /function pronunciationValues/);
    assert.doesNotMatch(source, /function detailTitlePronunciation/);
    assert.match(
        source,
        /const pronunciationItems = distinctPronunciationLabels/,
    );
    assert.match(source, /open-title-reference:\$\{entry\.id\}/);
    assert.match(source, /composed\.titleDefinition/);
    assert.doesNotMatch(source, /class="library-entry-heading"/);
    assert.doesNotMatch(source, /library-card-pronunciation-below/);
    assert.match(source, /const relatedWords = isWritingUnitLayer/);
    assert.match(source, /semanticRole ===\s*"lexicalUnit"/);
    assert.match(stylesheet, /\.library-entry-heading/);
    assert.match(stylesheet, /\.library-card-pronunciation/);
});

test("Study Library unfolds structured character variants", () => {
    assert.match(source, /function variantPlacement/);
    assert.match(source, /relationship\?\.child === true/);
    assert.match(source, /library-entry-variant-\$\{direction\}/);
    assert.match(stylesheet, /\.library-entry-variant-left/);
    assert.match(stylesheet, /\.library-entry-variant-right/);
    assert.match(stylesheet, /\.library-entry-variant-up/);
    assert.match(stylesheet, /\.library-entry-variant-up-left/);
    assert.match(stylesheet, /\.library-entry-variant-up-right/);
    assert.match(stylesheet, /\.library-entry-variant-down-right/);
    assert.match(stylesheet, /\.library-entry-variant-down/);
    assert.match(stylesheet, /\.library-entry-variant-down-left/);
    assert.match(source, /function assignVariantPlacements/);
    assert.match(source, /const VARIANT_DIRECTIONS = \[/);
    assert.match(source, /function variantDirectionFitsGrid/);
    assert.match(source, /typeof direction !== "string"/);
    assert.match(source, /"up",\s*"down",\s*"left",\s*"right",\s*"up-left"/);
    assert.match(source, /const branchDepthFor/);
    assert.match(source, /parentPlacement\?\.rootIndex/);
    assert.match(source, /parentPlacement\?\.offset/);
    assert.match(source, /function variantDirectionCapacity/);
    assert.match(source, /capacity - distance \+ 1 >= requiredCapacity/);
    assert.match(source, /directionCountsByParent/);
    assert.match(source, /let ancestorPlacement = parentPlacement/);
    assert.match(
        source,
        /while \(ancestorPlacement\)[\s\S]*occupiedOffsets\.add\(offsetKey\(ancestorPlacement\.offset\)\)/,
    );
    assert.match(source, /occupiedOffsets\.has\(offsetKey\(targetOffset\)\)/);
    assert.match(
        source,
        /\.\.\.\(parentPlacement \? \[parentPlacement\.direction\] : \[\]\)/,
    );
    assert.match(source, /function closeUnrelatedVariantViews/);
    assert.match(
        source,
        /!shell\.contains\(control\) \|\| control === parentControl/,
    );
    assert.match(
        source,
        /if \(closeUnrelatedVariantViews\(root, control\)\)[\s\S]*return/,
    );
    assert.match(source, /control === parentControl/);
    assert.doesNotMatch(source, /relationship\.variantDirection/);
    assert.match(source, /const depthFor/);
    assert.match(source, /placement\.depth <= 4/);
    assert.match(source, /function isDirectlyVisible/);
    assert.match(source, /current\.hidden === true/);
    assert.match(source, /isDirectlyVisible\(candidate, entries, placements\)/);
    assert.match(source, /depth \+ 1, true/);
    assert.match(source, /:scope > \.library-entry-variant-shell/);
    assert.match(stylesheet, /box-shadow:/);
    assert.match(source, /gateway\.study\.library_variant_hint/);
    assert.match(source, /library-entry-variants-open/);
    assert.match(
        stylesheet,
        /library-entry-variants-open[\s\S]*library-entry-card-status[\s\S]*library-scope[\s\S]*filter:\s*blur\(2\.5px\)/,
    );
    assert.match(
        stylesheet,
        /library-entry-variants-open[\s\S]*library-entry-card-shell:not\(\.library-entry-variants-open\)[\s\S]*:hover[\s\S]*z-index:\s*auto/,
    );
    assert.match(source, /"contextmenu"/);
    assert.match(source, /root\.addEventListener\([\s\S]*"contextmenu"/);
    assert.match(source, /\{ capture: true, signal \}/);
    assert.doesNotMatch(
        cardsSource,
        /if \(!canDeleteEntry\(entry\)\) return ""/,
    );
    assert.match(source, /"focusout"/);
    assert.match(source, /setSelectionMode\(root, true\)/);
    assert.match(
        source,
        /shell\.classList\.add\("library-entry-variants-open"\)/,
    );
    assert.match(
        source,
        /if \(openShell !== shell\)[\s\S]*openShell\.classList\.remove\([\s\S]*"library-entry-variants-open"/,
    );
    assert.match(source, /function activateVariantBranch/);
    assert.match(source, /function fitVariantBranchWithinGrid/);
    assert.match(source, /function cardBounds/);
    assert.match(
        source,
        /:scope > \.library-entry-card-shell > \.library-entry-card/,
    );
    assert.doesNotMatch(source, /function branchBounds/);
    assert.match(source, /function overflowScore/);
    assert.match(source, /function collisionScore/);
    assert.match(source, /function overlapArea/);
    assert.match(source, /const occupiedRects/);
    assert.match(source, /const horizontalSide = preferred\.includes/);
    assert.match(source, /overflow === 0 && collision === 0/);
    assert.match(source, /data-library-preferred-direction/);
    assert.match(source, /--library-variant-card-span/);
    assert.match(source, /distance: placement\.distance \?\? 1/);
    assert.match(source, /restorePreferredVariantDirections/);
    assert.match(source, /function clearVariantBranch/);
    assert.match(source, /"pointerover"/);
    assert.match(source, /library-entry-branch-active/);
    assert.match(source, /library-entry-branch-path/);
    assert.match(source, /library-entry-branch-tip/);
    assert.match(
        stylesheet,
        /\.library-entry-card-shell\.library-entry-variants-open/,
    );
    assert.match(stylesheet, /\.library-entry-variant-hint/);
    assert.match(
        stylesheet,
        /\.library-entry-grid:has\(\.library-entry-variants-open\)[\s\S]*\.library-entry-card-shell[\s\S]*\.library-entry-variant-hint[\s\S]*display:\s*none/,
    );
    assert.doesNotMatch(
        stylesheet,
        /\.library-entry-grid:has\(\.library-entry-variants-open\)\s*\{[\s\S]*overflow:\s*visible/,
    );
    assert.match(stylesheet, /--library-card-gap: 0\.75rem/);
    assert.match(stylesheet, /\.library-entry-variant-shell::before/);
    assert.match(
        stylesheet,
        /\.library-entry-variant-shell\s*\{[\s\S]*display:\s*none/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-card-shell\.library-entry-variants-open[\s\S]*> \.library-entry-variant-shell[\s\S]*display:\s*block/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-card-shell:not\(\[data-library-variant-depth="0"\]\):is\([\s\S]*:hover,[\s\S]*:focus-within[\s\S]*\)[\s\S]*> \.library-entry-variant-shell/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-card-shell\.library-entry-branch-active\[data-library-variant-depth="0"\][\s\S]*\.library-entry-variant-shell\s*\{[\s\S]*display:\s*none/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-variant-shell\.library-entry-branch-path[\s\S]*\.library-entry-card-shell\.library-entry-branch-tip[\s\S]*display:\s*block/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-variant-hint\s*\{[\s\S]*bottom:\s*0\.35rem/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-variant-hint\s*\{[\s\S]*font-size:\s*0\.8125rem/,
    );
    assert.doesNotMatch(
        stylesheet,
        /\.library-entry-variant-hint\s*\{[\s\S]*?animation:/,
    );
    assert.doesNotMatch(
        stylesheet,
        /\.library-entry-variant-shell\s*\{[^}]*visibility:\s*hidden/,
    );
    assert.doesNotMatch(
        stylesheet,
        /\.library-entry-variant-shell\s*\{[^}]*opacity:\s*0/,
    );
    assert.match(stylesheet, /backdrop-filter:\s*blur\(2\.5px\)/);
    assert.match(
        cardsSource,
        /data-library-entry-status="\$\{escapeHtml\(entry\.id\)\}"/,
    );
    assert.match(stylesheet, /variant-arrow-light\.svg/);
    assert.match(stylesheet, /variant-arrow-dark\.svg/);
    assert.match(stylesheet, /\.library-entry-card\.library-entry-variant \{/);
    assert.match(stylesheet, /var\(--color-success-outline-text/);
    assert.match(
        stylesheet,
        /\.library-entry-card\.library-entry-card\.library-entry-variant:is\(/,
    );
    assert.match(variantArrowLight, /fill="#059669"/);
    assert.match(variantArrowDark, /fill="#34d399"/);
    assert.match(
        stylesheet,
        /\.library-entry-card-shell:is\(:hover, :focus-within\)/,
    );
    assert.match(stylesheet, /z-index: 5/);
    assert.match(
        stylesheet,
        /\.library-entry-card-shell\.library-entry-variants-open[\s\S]*z-index:\s*7/,
    );
});

test("Study Library gives content safe edge spacing", () => {
    assert.match(
        stylesheet,
        /\.library-browser\s*\{[\s\S]*box-sizing:\s*border-box[\s\S]*padding:\s*var\(--library-card-gap\)/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid--minimal\s*\{[\s\S]*overflow:\s*clip/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid\s*\{[\s\S]*overflow:\s*clip/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid\s*\{[\s\S]*padding:\s*var\(--library-card-gap\)/,
    );
});

test("Study Library cards use opaque theme surfaces", () => {
    assert.match(stylesheet, /--library-card-surface:\s*color-mix/);
    assert.match(stylesheet, /--library-card-surface-raised:\s*color-mix/);
    assert.match(
        stylesheet,
        /body\[data-theme="light"\] \.library-browser[\s\S]*--library-card-surface:\s*rgb\(255, 255, 255\)/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-grid--minimal \.library-entry-card[\s\S]*background:\s*var\(--library-card-surface\)/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-card\.library-entry-variant\s*\{[\s\S]*background:\s*var\(--library-card-surface-raised\)/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-card\.library-entry-card\.library-entry-variant:is\([\s\S]*opacity:\s*1/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-card\.library-entry-card:is\(:hover, :focus-visible, :active\)[\s\S]*background:\s*var\(--library-card-surface\)/,
    );
    const minimalCardRule = stylesheet.match(
        /\.library-entry-grid--minimal \.library-entry-card\s*\{([^}]*)\}/,
    )?.[1];
    assert.ok(minimalCardRule);
    assert.doesNotMatch(minimalCardRule, /background:\s*transparent/);
});

test("Study Library keeps full definitions in details", () => {
    assert.match(cardsSource, /library-card-definition/);
    assert.match(source, /titleDefinition/);
    assert.match(source, /function relationTree/);
    assert.match(source, /library-relation-tree/);
    assert.match(source, /options\.showReferenceTree/);
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
    assert.match(source, /function renderAudio/);
    assert.match(source, /data-library-audio-player/);
    assert.match(source, /data-library-audio-toggle/);
    assert.match(source, /data-library-audio-progress/);
    assert.match(source, /function connectLibraryAudioControls/);
    assert.match(source, /fetchLibraryAudioUrl/);
    assert.match(source, /audio\.src = objectUrl/);
    assert.match(source, /replaceWith\(message\)/);
    assert.match(source, /gateway\.study\.library_audio_load_error/);
    assert.match(source, /value\.startsWith\("file:"\)/);
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
    assert.match(source, /class="library-speaker-icon"/);
    assert.match(source, /stroke="currentColor"/);
    assert.match(source, /M5 9h4l5-4v14l-5-4H5z/);
    assert.match(stylesheet, /background: var\(--surface-2\)/);
    assert.match(stylesheet, /\.library-audio-error/);
    assert.match(stylesheet, /font-size: 0\.75em/);
    assert.match(stylesheet, /forced-color-adjust: none/);
    assert.match(stylesheet, /::-webkit-slider-thumb/);
    assert.match(stylesheet, /::-moz-range-thumb/);
    assert.match(source, /loadDrawing/);
    assert.match(source, /groups: pieces\.map/);
    assert.match(source, /ownDrawingPattern/);
});

test("Study Library owners can select and delete multiple entries", () => {
    assert.match(source, /function canDeleteEntry/);
    assert.match(source, /data-library-select-entry/);
    assert.match(source, /data-library-delete-selection/);
    assert.match(source, /data-library-blacklist-content/);
    assert.match(source, /deleteLibraryEntries/);
    assert.match(source, /const deletion = await deleteLibraryEntries/);
    assert.match(source, /!deletion\.entryIds\.includes\(entry\.id\)/);
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
    assert.doesNotMatch(source, /if \(!entries\.some\(canDeleteEntry\)\)/);
    assert.match(source, /if \(entries\.length === 0\) return \[\]/);
    assert.match(source, /data-library-select-all/);
    assert.match(source, /gateway\.study\.library_deselect_all/);
    assert.match(source, /function allVisibleEntriesSelected/);
    assert.match(source, /setSelectionMode\(root, false\)/);
    assert.doesNotMatch(source, /data-library-selection-close/);
    assert.match(source, /data-library-publish-menu/);
    assert.match(source, /data-library-publish="class"/);
    assert.match(source, /data-library-publish="global"/);
    assert.match(source, /data-library-withdraw-selection/);
    assert.match(source, /data-library-send-back-selection/);
    assert.match(source, /entry\?\.scope === "user" && canDeleteEntry/);
    assert.match(source, /entry\.createdBy\?\.startsWith\("content-pack:"\)/);
    assert.match(stylesheet, /\.library-publish-options/);
    assert.match(source, /function setSelectionMode/);
    assert.match(source, /function selectAllVisibleEntries/);
    assert.match(source, /data-selection-action="select"/);
    assert.match(source, /function deselectAllEntries/);
    assert.match(source, /dataset\.selectionAction === "deselect"/);
    assert.match(source, /function chooseCreateLayer/);
    assert.match(source, /data-library-create-unmatched/);
    assert.match(stylesheet, /place-content: center/);
    assert.match(source, /const cascadeIds = new Set\(entryIds\)/);
    assert.match(source, /const selectedIds = new Set\(entryIds\)/);
    assert.match(source, /cascadeIds\.has\(entry\.id\) && !selectedIds\.has/);
    assert.match(source, /const cascadeWarning = cascadeEntries\.length/);
    assert.match(source, /entry\.references\?\.some/);
    assert.match(source, /onDelete === "cascade"/);
    assert.match(source, /\? \{ entryIds, blacklistContentHashes \}/);
    assert.match(source, /class="library-delete-cascade-list"/);
    assert.match(
        stylesheet,
        /\.library-delete-cascade-list[\s\S]*overflow-y:\s*auto/,
    );
    assert.match(source, /filterableCards\.length === 0 \|\| visibleCount > 0/);
    assert.match(source, /reference\.entryId === entry\.id/);
    assert.match(source, /function isSameLibraryRecord/);
    assert.match(source, /isSameLibraryRecord\(entry, parent\)/);
});

test("Study Library bounds status and gives readings and definitions room", () => {
    assert.match(
        stylesheet,
        /\.library-entry-card-status[\s\S]*left: 0\.35rem[\s\S]*max-width: calc\(100% - 2\.7rem\)/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-selection[\s\S]*right: 0\.35rem[\s\S]*translateY\(-50%\)/,
    );
    assert.match(
        stylesheet,
        /\.library-entry-selection[\s\S]*cursor:\s*pointer/,
    );
    assert.match(
        stylesheet,
        /\.library-card-primary[\s\S]*display: grid[\s\S]*justify-items: center[\s\S]*text-align: center/,
    );
    assert.match(
        stylesheet,
        /\.library-card-reading[\s\S]*justify-content: center/,
    );
    assert.match(
        stylesheet,
        /\.library-card-reading[\s\S]*flex-wrap: wrap[\s\S]*\.library-card-definition[\s\S]*white-space: normal/,
    );
});

test("Study Library popup sequencing excludes hidden and placed cards", () => {
    assert.match(source, /const active = layerEntries\.filter/);
    assert.match(source, /!placements\.has\(entry\.id\)/);
    assert.match(
        source,
        /isDirectlyVisible\(entry, layerEntries, placements\)/,
    );
});

test("Study Library relationship links consistently open entry details", () => {
    assert.doesNotMatch(source, /function focusLibraryEntry/);
    assert.match(source, /data-search-id="library-entry-/);
    assert.match(
        source,
        /relatedEntry &&[\s\S]*!isMeaningLayer[\s\S]*sourceDefinition: displayedDefinition/,
    );
    assert.match(source, /resolvePopupNavigation/);
});

test("Study Library keeps related links concise and suggests similar items", () => {
    const detail = readFileSync(
        resolve(ROOT, "src/adapters/study/library/ui/app/detail.js"),
        "utf8",
    );
    assert.doesNotMatch(detail, /pronunciationValues\(candidate\)/);
    assert.match(detail, /similarEntries\(entry, entries\)/);
    assert.match(detail, /gateway\.study\.library_similar_items/);
});

test("Study Library serializes popup opening and identifies child parents", () => {
    assert.match(source, /let activeEntryPopup = null/);
    assert.match(source, /if \(!entry \|\| activeEntryPopup\) return/);
    assert.match(source, /\.finally\(\(\) => \{[\s\S]*activeEntryPopup = null/);
    assert.match(
        source,
        /if \(suppressEntryClick\)[\s\S]*closeUnrelatedVariantViews/,
    );
    assert.match(source, /gateway\.study\.library_from_parent/);
    assert.match(source, /variantPlacement\(detail\.entry, schemas, entries\)/);
    assert.match(source, /const titleDetailItems = popupTitleDetailItems\(/);
    assert.match(
        source,
        /label: parentEntry\.label,[\s\S]*actionId: `open-title-reference:\$\{parentEntry\.id\}`/,
    );
    assert.match(source, /titleDetailItems,/);
});

test("Study Library links pronunciations through ordered relationship aliases", () => {
    assert.match(source, /input\?\.linkRelationships/);
    assert.match(source, /linkRelationships\.has\(relation\)/);
    assert.match(source, /left\.position - right\.position/);
    assert.match(source, /resolveReferenceAliasComposition/);
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
