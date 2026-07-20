import test from "node:test";
import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function readPageComposerBundle() {
    const composerDir = resolve(ROOT, "src/ui/reuse/page-composer");
    return readdirSync(composerDir)
        .filter((entry) => entry.endsWith(".js"))
        .sort()
        .map((entry) => readFileSync(join(composerDir, entry), "utf8"))
        .join("\n");
}

test("page composer refresh preserves existing elements when called without args", () => {
    const source = readPageComposerBundle();

    assert.match(
        source,
        /function refresh\(newElements\)[\s\S]*?if \(Array\.isArray\(newElements\)\)\s*\{\s*elements = newElements;\s*\}[\s\S]*?render\(\);/m,
    );
});

test("page composer refresh restores window scroll position after re-render", () => {
    const source = readPageComposerBundle();

    assert.match(source, /function restoreWindowScrollPosition\(left, top\)/);
    assert.match(source, /window\.requestAnimationFrame\(\(\) => \{/);
    assert.match(
        source,
        /window\.scrollTo\(\{\s*left,\s*top,\s*behavior: "auto",\s*\}\);/m,
    );
    assert.match(source, /const previousScrollLeft = window\.scrollX;/);
    assert.match(source, /const previousScrollTop = window\.scrollY;/);
    assert.match(
        source,
        /render\(\);\s*restoreWindowScrollPosition\(previousScrollLeft, previousScrollTop\);/m,
    );
});

test("page composer invokes element-level onRender callbacks", () => {
    const source = readPageComposerBundle();

    assert.match(source, /element\?\.onRender\?\.\(\);/);
});

test("page composer preserves media element DOM across re-renders", () => {
    const source = readPageComposerBundle();
    const composerStyles = readFileSync(
        resolve(ROOT, "src/ui/styles/page-builder/composer.css"),
        "utf8",
    );

    assert.match(source, /MEDIA_PRESERVE_SELECTOR/);
    assert.match(source, /function parkPreservedElementNodes\(\)/);
    assert.match(source, /function renderElementContent\(host, element\)/);
    assert.match(source, /querySelectorAll\("\[data-composer-element\]"\)/);
    assert.match(source, /host\.replaceChildren\(preserved\)/);
    assert.match(source, /img,video,audio,canvas/);
    assert.match(source, /MEDIA_PRESERVE_OPT_OUT_SELECTOR/);
    assert.match(composerStyles, /\.composer-preserved-element-parking/);
    assert.match(composerStyles, /\.composer-preserved-element-content/);
});

test("page composer includes mobile toolbar drawer behavior", () => {
    const source = readPageComposerBundle();

    assert.match(source, /MOBILE_TOOLBAR_BREAKPOINT = 900/);
    assert.match(source, /window\.matchMedia\(/);
    assert.match(source, /\(max-width: \$\{MOBILE_TOOLBAR_BREAKPOINT\}px\)/);
    assert.match(source, /toolbar--mobile-open/);
    assert.match(source, /toolbar-mobile-backdrop--open/);
    assert.match(source, /target\.closest\("a\[href\]"\)/);
    assert.match(
        source,
        /target\.closest\("button:not\(\.toolbar-mobile-toggle\)"\)/,
    );
    assert.match(
        source,
        /mobileToggleBtn\.classList\.toggle\(\s*"toolbar-mobile-toggle--drawer-open",\s*open,\s*\)/m,
    );
    assert.match(source, /mobileToggleBtn\.innerHTML = open/);
    assert.match(
        source,
        /if \(didSwitch\) \{\s*closeMobileDrawerIfNeeded\(\);\s*\}/m,
    );
});

test("page composer can delegate document scrolling to the page", () => {
    const source = readPageComposerBundle();
    const layoutStyles = readFileSync(
        resolve(ROOT, "src/ui/styles/page-builder/layout.css"),
        "utf8",
    );
    const licensePage = readFileSync(
        resolve(ROOT, "src/ui/app/license/index.js"),
        "utf8",
    );

    assert.match(source, /contentScrolling = true/);
    assert.match(source, /if \(!contentScrolling\) \{/);
    assert.match(source, /"app-page--document-scroll"/);
    assert.match(
        layoutStyles,
        /\.app-page--document-scroll \.composer-view-grid/,
    );
    assert.match(
        layoutStyles,
        /\.app-page--document-scroll \.content-grid \.widget-card,/,
    );
    assert.match(layoutStyles, /\.app-page--document-scroll \.content-panel/);
    assert.match(licensePage, /toolbarScrollable: true/);
    assert.match(licensePage, /contentScrolling: false/);
});

test("page composer resolves edit toggle from the active page root", () => {
    const source = readPageComposerBundle();

    assert.match(source, /function getComposerEditToggleButton\(\)/);
    assert.match(source, /root\.querySelector\("#composer-edit-toggle"\)/);
    assert.match(source, /document\.getElementById\("composer-edit-toggle"\)/);
    assert.match(source, /const editBtn = getComposerEditToggleButton\(\)/);
    assert.doesNotMatch(source, /function ensureComposerEditToggleButton\(\)/);
});

test("page composer expands compact single-pane rows to full width", () => {
    const source = readPageComposerBundle();

    assert.match(source, /MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT\s*=/);
    assert.match(source, /COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS\s*=/);
    assert.match(source, /function shouldUseMobileWidthReclaim\(\)/);
    assert.match(source, /window\.matchMedia\(/);
    assert.match(
        source,
        /\(max-width: \$\{MOBILE_LAYOUT_WIDTH_RECLAIM_BREAKPOINT\}px\)/,
    );
    assert.match(source, /allowSingleRowFullWidthReclaim =/);
    assert.match(source, /shouldUseMobileWidthReclaim\(\) &&/);
    assert.match(source, /maxCols <= COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS/);
    assert.match(source, /boundedWidth < bounds\.max/);
    assert.match(source, /function canExpandPlacementWithoutConflicts\(/);
    assert.match(source, /const occupiedOutsideRow = buildOccupiedSet\(/);
    assert.match(
        source,
        /checkPlacement\(\s*occupiedOutsideRow,\s*normalizedPlacement\.col,\s*normalizedPlacement\.row,/m,
    );
    assert.match(source, /canExpandPlacementWithoutConflicts\(/);
    assert.match(source, /const occupiedCells = new Set\(occupiedOutsideRow\)/);
    assert.match(
        source,
        /registerOccupiedPlacement\(occupiedCells, nextPlacement\)/,
    );
    assert.match(source, /normalizedPlacement = shouldExpandToFullWidth/);
    assert.match(source, /col: 0,/);
    assert.match(source, /w: bounds\.max,/);
    assert.match(source, /w: boundedWidth,/);
    assert.match(
        source,
        /normalizedPlacement\.col !== placement\.col[\s\S]*normalizedPlacement\.w !== placement\.w/,
    );
});

test("page composer elements panels stay below header and use viewport top", () => {
    const source = readPageComposerBundle();

    assert.match(source, /function getComposerPanelSafeTop\(\)/);
    assert.match(
        source,
        /function getComposerPanelHorizontalBounds\(panelWidth\)/,
    );
    assert.match(
        source,
        /function clampComposerPanelLeft\(nextLeft, panelWidth\)/,
    );
    assert.match(source, /Math\.max\(navRowBottom, topbarBottom\)/);
    assert.match(source, /Math\.ceil\(/);
    assert.match(source, /\+ 12\),/);
    assert.match(source, /const panelTop = gridRect\.top;/);
    assert.match(
        source,
        /clampComposerPanelLeft\(gridRect\.right \+ 12, 240\)/,
    );
    assert.match(
        source,
        /panel\.style\.top = `\$\{Math\.max\(safeTop, state\.panelPosition\.top\)\}px`;/,
    );
});

test("page composer persists separate layout profiles per grid size", () => {
    const source = readPageComposerBundle();

    assert.match(source, /function getLayoutProfileKey\(gridColumnCount\)/);
    assert.match(source, /layoutsByGrid/);
    assert.match(
        source,
        /normalized\.layoutsByGrid\[profileKey\] = nextLayout/,
    );
    assert.match(source, /function applyLayoutForCurrentGridColumns\(\)/);
    assert.match(source, /const newCols = getPreferredGridColumnCount\(\)/);
    assert.match(source, /applyLayoutForCurrentGridColumns\(\);/);
});

test("page composer does not block initial render on async layout loading", () => {
    const source = readPageComposerBundle();

    assert.doesNotMatch(
        source,
        /layout = persistLayoutPreferences \? await loadLayout\(\) : null;/,
    );
    assert.match(source, /render\(\);\s*\n\s*if \(persistLayoutPreferences\)/m);
    assert.match(source, /loadLayout\(\)\s*\.then\(/m);
});

test("page composer preserves form input values across grid re-renders", () => {
    const source = readPageComposerBundle();

    assert.match(
        source,
        /function captureFormState\(container, options = \{\}\)/,
    );
    assert.match(source, /function restoreFormState\(container, snapshot\)/);
    assert.match(
        source,
        /const gridFormSnapshot = mergeFormStateSnapshots\(\s*loadPersistedFormState\(state\.preferenceKey\),\s*captureFormState\(state\.contentGrid\),\s*\)/m,
    );
    assert.match(
        source,
        /restoreFormState\(state\.contentGrid, gridFormSnapshot\)/,
    );
    assert.match(
        source,
        /bindFormDraftPersistence\(state\.contentGrid, state\.preferenceKey\)/,
    );
    assert.match(
        source,
        /const subGridFormSnapshot = mergeFormStateSnapshots\(\s*loadPersistedFormState\(state\.preferenceKey\),\s*captureFormState\(state\.container\),\s*\)/m,
    );
    assert.match(
        source,
        /restoreFormState\(state\.container, subGridFormSnapshot\)/,
    );
    assert.match(
        source,
        /bindFormDraftPersistence\(state\.container, state\.preferenceKey\)/,
    );
});

test("page composer persists drafts and renders large-form draft reset control", () => {
    const source = readPageComposerBundle();

    assert.match(source, /FORM_DRAFT_STORAGE_PREFIX = "cognis_form_draft"/);
    assert.match(source, /function isIncludedInFormMemory\(field\)/);
    assert.match(
        source,
        /field\.closest\('\[data-composer-include-form-memory="true"\]'\)/,
    );
    assert.match(source, /function loadPersistedFormState\(scopeKey\)/);
    assert.match(
        source,
        /function savePersistedFormState\(scopeKey, snapshot\)/,
    );
    assert.match(
        source,
        /function clearPersistedFormState\(scopeKey, elementId = null\)/,
    );
    assert.match(source, /if \(!isIncludedInFormMemory\(field\)\) return;/);
    assert.match(
        source,
        /if \(!account \|\| !scopeKey\) \{\s*return null;\s*\}/m,
    );
    assert.match(source, /LARGE_FORM_RESET_FIELD_THRESHOLD = 6/);
    assert.match(source, /button\.className = "composer-form-draft-reset-btn"/);
    assert.match(
        source,
        /button\.setAttribute\("aria-label", i18n\.t\("ui\.reuse\.reset_draft"\)\)/,
    );
    assert.match(source, /i18n\.t\("ui\.reuse\.reset_draft"\)/);
});

test("page composer captures all form values in transient snapshots but persists only opted-in fields", () => {
    const source = readPageComposerBundle();

    assert.match(
        source,
        /if \(persistableOnly && !isIncludedInFormMemory\(field\)\)/,
    );
});

test("page composer preserves missing placements and shows warning placeholders", () => {
    const source = readPageComposerBundle();

    assert.match(source, /function renderMissingElementContent\(elementId\)/);
    assert.match(source, /createGridOverlayHandlers\(\{[\s\S]*?escapeHtml,/);
    assert.match(source, /class="composer-missing-element-icon"/);
    assert.match(
        source,
        /section\.appendChild\(createMissingCell\(placement\)\)/,
    );
    assert.match(
        source,
        /state\.layout\.placements = state\.layout\.placements\.filter\(\s*\(p\) =>[\s\S]*?typeof p\.id === "string"[\s\S]*?Number\.isFinite\(p\.col\)[\s\S]*?Number\.isFinite\(p\.row\)[\s\S]*?Number\.isFinite\(p\.w\)[\s\S]*?Number\.isFinite\(p\.h\)[\s\S]*?p\.w > 0[\s\S]*?p\.h > 0,/m,
    );
    assert.match(
        source,
        /state\.layout\.hidden = state\.layout\.hidden\.filter\(\s*\(id\) => id && typeof id === "string",\s*\)/m,
    );
});
