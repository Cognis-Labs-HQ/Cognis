import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import {
    ROOT,
    indexSource,
    layerPageSource,
    requestsPageSource,
    adminInteractionsSource,
    cardsSource,
    source,
    stylesheet,
    adapterSource,
    createEntrySource,
    carouselStylesheet,
    variantArrowLight,
    variantArrowDark,
} from "../reuse/ui-sources.js";

test("Study Library provides vocabulary transformations", () => {
    assert.match(source, /transformationPathways/);
    assert.match(source, /library-transform-tech-tree/);
    assert.match(source, /library-transform-root/);
    assert.match(source, /node\.depth > 0/);
    assert.match(source, /view\.includeTags\.some/);
    assert.match(stylesheet, /library-entry-grid--transform-tree/);
    assert.match(stylesheet, /library-transform-links path/);
    assert.match(source, /nodes\.length > 1/);
    assert.match(source, /data-library-transform-close/);
    assert.match(source, /showSummary:\s*false/);
    assert.match(source, /data-library-transform-variants/);
    assert.doesNotMatch(source, /data-library-transform-return/);
    assert.match(source, /withParentAttribution/);
    assert.match(source, /chosenTransformation !== undefined/);
    assert.match(source, /resolveDetailTransformation/);
    assert.match(source, /openTransformationTreePopup/);
    assert.match(source, /library-transform-options/);
    assert.match(source, /transformedDefinition/);
    assert.match(source, /id:\s*"__tags"/);
    assert.match(
        source,
        /classList\.contains\("library-transform-card--open"\)/,
    );
    assert.match(
        stylesheet,
        /grid-template-columns:\s*repeat\(auto-fill, minmax\(min\(100%, 14rem\), 1fr\)\)/,
    );
    assert.match(stylesheet, /library-transform-card--open/);
    assert.match(stylesheet, /library-transform-card-away/);
    assert.match(stylesheet, /library-transform-link-flow/);
    assert.match(stylesheet, /library-transform-info/);
    assert.match(stylesheet, /width:\s*max-content/);
    assert.match(stylesheet, /min-width:\s*14rem/);
    assert.match(
        stylesheet,
        /library-transform-tech-tree ol \+ ol[\s\S]*margin-top:\s*1\.5rem/,
    );
    assert.match(stylesheet, /max-height:\s*min\(31rem/);
    assert.match(stylesheet, /overflow:\s*auto/);
    assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
});
test("Study Library renders writing-unit pronunciation and audio", () => {
    assert.match(source, /function renderAudio/);
    assert.match(source, /dependenciesMissingAudio/);
    assert.match(source, /gateway\.study\.library_dependencies_missing_audio/);
    assert.match(source, /library-audio-unavailable-tooltip/);
    assert.match(source, /createAnchoredPopup/);
    assert.match(source, /tooltip\.show\(speaker, source\.innerHTML\)/);
    assert.match(source, /placeAudioSpeaker\(root, signal, popupApi\)/);
    assert.match(
        stylesheet,
        /\.library-audio-unavailable-tooltip\.is-portal[\s\S]*position:\s*fixed/,
    );
    assert.match(source, /data-library-audio-sequence/);
    assert.match(source, /data-library-audio-player/);
    assert.match(source, /data-library-audio-toggle/);
    assert.match(source, /data-library-audio-progress/);
    assert.match(source, /function connectLibraryAudioControls/);
    assert.match(source, /fetchLibraryAudioUrl/);
    assert.match(source, /audio\.src = objectUrl/);
    assert.match(source, /gateway\.study\.library_audio_load_error/);
    assert.match(source, /value\.startsWith\("file:"\)/);
    assert.match(source, /URL\.revokeObjectURL/);

    assert.match(stylesheet, /\.library-audio/);
    assert.match(stylesheet, /\.library-audio-progress/);
    assert.match(stylesheet, /appearance: none/);
    assert.match(stylesheet, /body\[data-theme="light"\] \.library-audio/);
    assert.match(stylesheet, /body\[data-theme="dark"\] \.library-audio/);
    assert.match(source, /speaker-light\.svg/);
    assert.match(source, /speaker-dark\.svg/);
    assert.match(
        stylesheet,
        /body\[data-theme="dark"\] \.library-speaker-icon-dark/,
    );
    assert.match(stylesheet, /background: var\(--surface-2\)/);
    assert.match(stylesheet, /\.library-audio-error/);
    assert.match(stylesheet, /font-size: 0\.75em/);
    assert.match(stylesheet, /forced-color-adjust: none/);
    assert.match(stylesheet, /::-webkit-slider-thumb/);
    assert.match(stylesheet, /::-moz-range-thumb/);
    assert.match(source, /loadDrawing/);
    assert.match(source, /static\/gateways\/study\/reuse\/drawing-pattern\.js/);
});
test("Study Library owners can select and delete multiple entries", () => {
    assert.match(source, /function canDeleteEntry/);
    assert.match(source, /data-library-select-entry/);
    assert.match(source, /data-library-delete-selection/);
    assert.match(source, /data-library-blacklist-content/);
    assert.match(source, /deleteLibraryEntries/);
    assert.match(source, /const deletion = await deleteLibraryEntries/);
    assert.match(source, /!deletion\.entryIds\.includes\(entry\.id\)/);

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
    assert.match(source, /data-library-relocate-actions/);
    assert.match(source, /const hasClasses/);
    assert.match(source, /relocationState\(selected, scope, requests\)/);
    assert.match(source, /data-library-withdraw-selection/);
    assert.match(source, /data-library-move-selection/);
    assert.match(source, /selected\.some\([\s\S]*canDeleteEntry\(entry\)/);
    assert.match(
        source,
        /entry\.protected !== true && entry\.canDelete === true/,
    );
    assert.match(stylesheet, /\.library-relocate-actions/);
    assert.match(source, /function setSelectionMode/);
    assert.match(source, /function selectAllVisibleEntries/);
    assert.match(source, /data-selection-action="select"/);
    assert.match(source, /function deselectAllEntries/);
    assert.match(source, /dataset\.selectionAction === "deselect"/);
    assert.match(source, /function chooseCreateLayer/);
    assert.match(source, /data-library-create-unmatched/);
    assert.match(stylesheet, /place-content: center/);
    assert.match(source, /planLibraryEntryDeletion\(entryIds\)/);
    assert.match(source, /const selectedIds = new Set\(entryIds\)/);
    assert.match(source, /plan\.entries\.filter/);
    assert.match(source, /const cascadeWarning = cascadeEntries\.length/);
    assert.match(source, /deletionErrorKey\(error\)/);
    assert.match(source, /entryIds: plannedIds, blacklistContentHashes/);
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
