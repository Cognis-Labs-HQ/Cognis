import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function readSource(relativePath) {
    return readFileSync(resolve(ROOT, relativePath), "utf8");
}

test("page composer pointer tracker is opt-in through presence tracking", () => {
    const pointerSource = readSource("src/ui/reuse/pointer-tracker.js");
    const presenceSource = readSource(
        "src/ui/reuse/page-composer/presence-tracker.js",
    );
    const composerSource = readSource("src/ui/reuse/page-composer/init.js");
    const layoutCssSource = ["layout.css", "presence.css"]
        .map((fileName) => readSource(`src/ui/styles/reuse/${fileName}`))
        .join("\n");

    assert.match(pointerSource, /export function createPointerTracker/);
    assert.match(pointerSource, /from "\.\/escape-html\.js"/);
    assert.match(pointerSource, /from "\.\/avatar-utils\.js"/);
    assert.match(pointerSource, /contentGrid\.addEventListener\("pointermove"/);
    assert.match(pointerSource, /overlayRoot = null/);
    assert.match(pointerSource, /getPointerOffset/);
    assert.match(pointerSource, /function currentPointerOffset\(\)/);
    assert.match(pointerSource, /offset\.x/);
    assert.match(pointerSource, /offset\.y/);
    assert.match(pointerSource, /renderRoot\.appendChild\(overlay\)/);
    assert.match(pointerSource, /className = "pointer-style-toggle"/);
    assert.match(pointerSource, /noteActivity\?\.\(\)/);
    assert.match(pointerSource, /page-pointer--/);
    assert.match(pointerSource, /page-selection/);
    assert.doesNotMatch(
        pointerSource,
        /POINTER_VISIBLE_MS|SELECTION_VISIBLE_MS/,
    );
    assert.match(pointerSource, /--selection-color:\$\{escapeHtml\(color\)\}/);
    assert.match(pointerSource, /--pointer-color:\$\{escapeHtml\(color\)\}/);
    assert.match(layoutCssSource, /page-pointer-laser-pulse/);
    assert.match(layoutCssSource, /page-pointer__laser-dot/);
    assert.match(layoutCssSource, /#page-presence-section \.page-presence/);
    assert.match(layoutCssSource, /gap: 0/);
    assert.match(layoutCssSource, /margin-left: -0\.65rem/);
    assert.match(presenceSource, /pointerTracking === true/);
    assert.match(
        presenceSource,
        /pointer: pointerTracker\?\.getPointerPayload/,
    );
    assert.match(presenceSource, /getSelectionPayload/);
    assert.match(presenceSource, /onPresenceUpdate/);
    assert.match(presenceSource, /getPointerOffset/);
    assert.match(presenceSource, /pointerOverlayRoot/);
    assert.match(presenceSource, /createAdaptivePoller/);
    assert.match(presenceSource, /mountedParent/);
    assert.match(presenceSource, /#page-presence-section/);
    assert.match(presenceSource, /const REFRESH_MIN_INTERVAL_MS = 250/);
    assert.match(presenceSource, /const REFRESH_MAX_INTERVAL_MS = 5000/);
    assert.match(presenceSource, /function isRecentlyActive\(\)/);
    assert.match(
        composerSource,
        /pageManifest\?: \{ features\?: \{ pointerTracking\?: boolean \} \}/,
    );
    assert.ok(
        composerSource.indexOf("render();") <
            composerSource.indexOf("activePresenceTracker.mount(mainWindow)"),
        "presence tracker must mount after composer content renders so the pointer overlay is not removed",
    );
});
