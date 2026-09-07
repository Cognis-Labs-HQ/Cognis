import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const source = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/index.js"),
    "utf8",
);
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

test("Study Library presents browsable layers as filterable card tabs", () => {
    assert.match(source, /role="tablist"/);
    assert.match(source, /role="tabpanel"/);
    assert.match(source, /class="library-entry-card btn-neutral"/);
    assert.match(source, /class="library-filter-pill btn-neutral"/);
    assert.match(source, /aria-pressed="false"/);
    assert.match(source, /function applyLibraryFilters/);
    assert.match(source, /\.library-entry-card\[data-library-filter-values\]/);
    assert.match(source, /data-library-filter-exclusive/);
    assert.match(source, /classList\.toggle\("active", willActivate\)/);
    assert.match(stylesheet, /\.library-entry-grid/);
    assert.match(stylesheet, /\.library-filters/);
    assert.match(stylesheet, /\.library-filter-pill\.active/);
    assert.match(stylesheet, /\.library-entry-card\[hidden\]/);
    assert.match(stylesheet, /\.study-subnav-language-options/);
    assert.match(adapterSource, /\/static\/gateways\/study\/study\.css/);
});

test("Study Library integrates definitions and particles into item details", () => {
    assert.match(source, /function isMeaningLayer/);
    assert.match(source, /layer\.semanticRole !== "particle"/);
    assert.match(source, /class="library-detail-summary"/);
    assert.match(source, /class="library-component-box btn-neutral"/);
    assert.match(source, /layer\?\.semanticRole === "particle"/);
    assert.match(source, /const components = componentReferences/);
    assert.match(source, /function componentReferences/);
    assert.match(source, /relationship\.resolverRole/);
    assert.match(source, /class="library-definition-link btn-neutral"/);
    assert.match(stylesheet, /\.library-definition-link/);
});

test("Study Library renders metadata and scope indicators", () => {
    assert.match(source, /detail\?\.renderer === "badge"/);
    assert.match(source, /class="library-metadata-pill"/);
    assert.match(source, /class="library-scope"/);
    assert.match(stylesheet, /\.library-metadata-pill/);
});

test("Study Library positions pronunciations by semantic role", () => {
    assert.match(source, /function isWritingUnitLayer/);
    assert.match(source, /function pronunciationValues/);
    assert.match(source, /function detailTitle/);
    assert.match(source, /class="library-entry-heading"/);
    assert.match(source, /library-card-pronunciation-below/);
    assert.match(source, /const relatedWords = isWritingUnitLayer/);
    assert.match(source, /semanticRole ===\s*"lexicalUnit"/);
    assert.match(stylesheet, /\.library-entry-heading/);
    assert.match(stylesheet, /\.library-card-pronunciation/);
});

test("Study Library unfolds structured character variants", () => {
    assert.match(source, /function variantPlacement/);
    assert.match(source, /relationship\?\.variantDirection/);
    assert.match(source, /library-entry-variant-\$\{direction\}/);
    assert.match(stylesheet, /\.library-entry-variant-left/);
    assert.match(stylesheet, /\.library-entry-variant-right/);
    assert.match(stylesheet, /\.library-entry-variant-up/);
    assert.match(stylesheet, /\.library-entry-variant-down/);
    assert.match(source, /renderCardContents\(variant, layer, i18n\)/);
    assert.match(stylesheet, /opacity: 0\.9/);
    assert.match(stylesheet, /box-shadow:/);
});

test("Study Library renders writing-unit pronunciation and audio", () => {
    assert.match(source, /function renderPronunciation/);
    assert.match(source, /function renderAudio/);
    assert.match(source, /<audio class="library-audio" controls/);
    assert.match(source, /fetchLibraryAudioUrl/);
    assert.match(source, /audio\.src = objectUrl/);
    assert.match(source, /audio\.replaceWith\(message\)/);
    assert.match(source, /gateway\.study\.library_audio_load_error/);
    assert.match(source, /URL\.revokeObjectURL/);
    assert.match(clientSource, /apiFetch\([\s\S]*\/audio\//);
    assert.match(
        clientSource,
        /URL\.createObjectURL\(await response\.blob\(\)\)/,
    );
    assert.match(stylesheet, /\.library-audio/);
    assert.match(stylesheet, /color-scheme: light dark/);
    assert.match(stylesheet, /body\[data-theme="light"\] \.library-audio/);
    assert.match(stylesheet, /body\[data-theme="dark"\] \.library-audio/);
    assert.match(stylesheet, /background: var\(--surface-2\)/);
    assert.match(stylesheet, /\.library-audio-error/);
    assert.match(stylesheet, /font-size: 0\.75rem/);
    assert.match(stylesheet, /filter: grayscale\(1\)/);
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
    assert.match(source, /setSelectionMode\(root, true, i18n\)/);
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
    assert.match(source, /label: `← \$\{i18n\.t/);
    assert.match(source, /i18n\.t\("gateway\.study\.library_next"\)\} →`/);
    assert.match(stylesheet, /flex: 1 1 calc\(50% - 0\.5rem\)/);
});
