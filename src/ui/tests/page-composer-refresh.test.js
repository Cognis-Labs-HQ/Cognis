import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createFakeDocument } from "./reuse/fake-dom.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("page composer refresh preserves existing elements when called without args", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.match(
        source,
        /function refresh\(newElements\)[\s\S]*?if \(Array\.isArray\(newElements\)\)\s*\{\s*elements = newElements;\s*\}[\s\S]*?render\(\);/m,
    );
});

test("page composer refresh restores window scroll position after re-render", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

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
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.match(source, /element\?\.onRender\?\.\(\);/);
});

test("page composer includes mobile toolbar drawer behavior", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

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

test("page composer resolves edit toggle from the active page root", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.match(source, /function getComposerEditToggleButton\(\)/);
    assert.match(source, /root\.querySelector\("#composer-edit-toggle"\)/);
    assert.match(source, /document\.getElementById\("composer-edit-toggle"\)/);
    assert.match(source, /const editBtn = getComposerEditToggleButton\(\)/);
    assert.doesNotMatch(source, /function ensureComposerEditToggleButton\(\)/);
});

test("page composer expands compact single-pane rows to full width", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.match(source, /COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS\s*=/);
    assert.match(source, /maxCols <= COMPACT_SINGLE_ROW_FULL_WIDTH_MAX_COLS/);
    assert.match(source, /boundedWidth < bounds\.max/);
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
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

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
        /panel\.style\.top = `\$\{Math\.max\(safeTop, panelPosition\.top\)\}px`;/,
    );
    assert.match(
        source,
        /panel\.style\.top = `\$\{Math\.max\(safeTop, state\.panelPosition\.top\)\}px`;/,
    );
});

test("page composer persists separate layout profiles per grid size", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

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
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.doesNotMatch(
        source,
        /layout = persistLayoutPreferences \? await loadLayout\(\) : null;/,
    );
    assert.match(source, /render\(\);\s*\n\s*if \(persistLayoutPreferences\)/m);
    assert.match(source, /loadLayout\(\)\s*\.then\(/m);
});

test("page composer preserves form input values across grid re-renders", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.match(
        source,
        /function captureFormState\(container, options = \{\}\)/,
    );
    assert.match(source, /function restoreFormState\(container, snapshot\)/);
    assert.match(
        source,
        /const gridFormSnapshot = mergeFormStateSnapshots\(\s*loadPersistedFormState\(preferenceKey\),\s*captureFormState\(contentGrid\),\s*\)/m,
    );
    assert.match(source, /restoreFormState\(contentGrid, gridFormSnapshot\)/);
    assert.match(
        source,
        /bindFormDraftPersistence\(contentGrid, preferenceKey\)/,
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

test("missing element helpers render warning placeholders with accessibility labels", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    function extractByBoundaries(startSignature, nextSignature) {
        const startIndex = source.indexOf(startSignature);
        assert.notEqual(startIndex, -1, `${startSignature} should exist`);
        const nextIndex = nextSignature
            ? source.indexOf(nextSignature, startIndex)
            : -1;
        if (!nextSignature || nextIndex === -1) {
            return source.slice(startIndex);
        }
        return source.slice(startIndex, nextIndex);
    }

    const context = {
        UNIT: 90,
        document: createFakeDocument(),
        i18n: {
            t(key) {
                return key;
            },
        },
    };
    vm.createContext(context);
    vm.runInContext(
        `${extractByBoundaries("function createMissingElementMarker()", "function createMissingElementViewCard(")}
${extractByBoundaries("function createMissingElementViewCard(", "function createElementViewCard(")}
${extractByBoundaries("function createElementViewCard(", "function createMissingElementEditCell(")}
${extractByBoundaries("function createMissingElementEditCell(", "function createCell(")}
this.missingExports = {
    createMissingElementMarker,
    createMissingElementViewCard,
    createElementViewCard,
    createMissingElementEditCell,
};`,
        context,
    );

    const marker = context.missingExports.createMissingElementMarker();
    assert.equal(marker.className, "composer-missing-element-marker");
    assert.equal(marker.textContent, "❗");
    assert.equal(marker.getAttribute("role"), "img");
    assert.equal(
        marker.getAttribute("aria-label"),
        "ui.reuse.missing_dashboard_element",
    );

    const missingCard = context.missingExports.createElementViewCard(null, {
        id: "missing-module",
    });
    assert.equal(
        missingCard.className,
        "widget-card widget-card--missing-element",
    );
    assert.equal(missingCard.dataset.composerElement, "missing-module");
    assert.equal(missingCard.children[0].textContent, "❗");

    const missingCell = context.missingExports.createMissingElementEditCell({
        id: "missing-module",
        col: 1,
        row: 2,
        w: 3,
        h: 4,
    });
    assert.equal(missingCell.className, "composer-cell composer-cell--missing");
    assert.equal(missingCell.style.left, "90px");
    assert.equal(missingCell.style.top, "180px");
    assert.equal(missingCell.style.width, "270px");
    assert.equal(missingCell.style.height, "360px");
    assert.equal(
        missingCell.children[0].className,
        "widget-card composer-cell-content widget-card--missing-element",
    );

    const liveCard = context.missingExports.createElementViewCard(
        {
            id: "provided-module",
            render() {
                return "<p>provided</p>";
            },
        },
        { id: "provided-module" },
        "div",
    );
    assert.equal(liveCard.className, "widget-card");
    assert.equal(liveCard.dataset.composerElement, "provided-module");
    assert.equal(liveCard.innerHTML, "<p>provided</p>");
});

test("page composer persists drafts and renders large-form draft reset control", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.match(source, /FORM_DRAFT_STORAGE_PREFIX = "cognis_form_draft"/);
    assert.match(source, /function loadPersistedFormState\(scopeKey\)/);
    assert.match(
        source,
        /function savePersistedFormState\(scopeKey, snapshot\)/,
    );
    assert.match(
        source,
        /function clearPersistedFormState\(scopeKey, elementId = null\)/,
    );
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
