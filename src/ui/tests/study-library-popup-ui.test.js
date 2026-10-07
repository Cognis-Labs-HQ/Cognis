import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const source = readdirSync(resolve(ROOT, "src/adapters/study/library/ui/app"), {
    recursive: true,
})
    .filter((file) => file.endsWith(".js"))
    .map((file) =>
        readFileSync(
            resolve(ROOT, `src/adapters/study/library/ui/app/${file}`),
            "utf8",
        ),
    )
    .join("\n");
const stylesheet = [
    "library.css",
    "library-admin.css",
    "library-selection.css",
    "library-detail.css",
]
    .map((file) =>
        readFileSync(
            resolve(ROOT, `src/adapters/study/library/ui/${file}`),
            "utf8",
        ),
    )
    .join("\n");
const popupTitleSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/popup-title.js"),
    "utf8",
);

test("Study Library renders metadata and scope indicators", () => {
    assert.match(source, /detail\?\.renderer === "badge"/);
    assert.match(source, /class="library-metadata-pill"/);
    assert.match(source, /class="library-scope"/);
    assert.match(
        source,
        /localizedLabel\(layer\?\.metadata, entry\.language\)/,
    );
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

test("Study Library bounds status and gives readings and definitions room", () => {
    assert.match(source, /stackTitleDetailOnOverflow: true/);
    assert.match(
        stylesheet,
        /popup-heading--stacked-detail[\s\S]*data-popup-title-placement="reading"[\s\S]*grid-row:\s*2/,
    );
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

test("Study Library centers popup readings and definitions without a dash", () => {
    assert.match(
        stylesheet,
        /\[data-popup-title-placement="reading"\][\s\S]*grid-row:\s*1;/,
    );
    assert.match(
        stylesheet,
        /\[data-popup-title-placement="definition"\][\s\S]*grid-column:\s*2\s*\/\s*4;[\s\S]*grid-row:\s*2;[\s\S]*justify-self:\s*start;/,
    );
    assert.match(
        stylesheet,
        /\[data-popup-title-placement="reading"\],[\s\S]*\[data-popup-title-placement="definition"\][\s\S]*align-self:\s*center;/,
    );
    assert.doesNotMatch(source, /label:\s*" — "/);
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
    assert.match(source, /withParentTitleAttribution\(/);
    assert.match(source, /let titleDetailItems = popupTitleDetailItems\(/);
    assert.match(
        source,
        /label: parentEntry\.label,[\s\S]*actionId: `open-title-reference:\$\{parentEntry\.id\}`/,
    );
    assert.match(
        popupTitleSource,
        /function withParentAttribution[\s\S]*const parentItems = \[[\s\S]*placement: "reading"[\s\S]*const definitionIndex[\s\S]*items\.slice/,
    );
    assert.match(source, /titleDetailItems,/);
});

test("Study Library refreshes card previews after direct popup edits", () => {
    assert.match(source, /options\.onEntryUpdated\?\.\(updated\)/);
    assert.match(source, /onEntryUpdated: renderEntries/);
    assert.match(source, /mergeEntryCollectionUpdate\(entries, update\)/);
    assert.match(
        source,
        /root\.querySelector\("\.library-browser"\)\.innerHTML/,
    );
});

test("Study Library links pronunciations through ordered relationship aliases", () => {
    assert.match(source, /input\?\.linkRelationships/);
    assert.match(source, /linkRelationships\.has\(relation\)/);
    assert.match(source, /left\.position - right\.position/);
    assert.match(source, /resolveReferenceAliasComposition/);
    assert.match(popupTitleSource, /derivedPronunciationEntries/);
    assert.match(
        popupTitleSource,
        /configuredLinked\.length[\s\S]*derivedPronunciationEntries/,
    );
});

test("Study Library numbers composed carousel selections holistically", () => {
    assert.match(source, /selectionOrder: \(\{ id, value, localIndex \}\)/);
    assert.match(source, /form\.compositionOrder\.indexOf\(value\)/);
    assert.match(source, /restoreCompositionTokens\(/);
    assert.match(source, /readReferences\([\s\S]*form\.compositionOrder/);
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
