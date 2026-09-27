import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
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
