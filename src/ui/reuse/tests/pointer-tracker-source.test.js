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

    assert.match(pointerSource, /export function createPointerTracker/);
    assert.match(pointerSource, /from "\.\/escape-html\.js"/);
    assert.match(pointerSource, /from "\.\/avatar-utils\.js"/);
    assert.match(pointerSource, /contentGrid\.addEventListener\("pointermove"/);
    assert.match(pointerSource, /className = "pointer-style-toggle"/);
    assert.match(pointerSource, /noteActivity\?\.\(\)/);
    assert.match(pointerSource, /page-pointer--/);
    assert.match(pointerSource, /page-selection/);
    assert.match(presenceSource, /pointerTracking === true/);
    assert.match(
        presenceSource,
        /pointer: pointerTracker\?\.getPointerPayload/,
    );
    assert.match(presenceSource, /getSelectionPayload/);
    assert.match(presenceSource, /const REFRESH_INTERVAL_MS = 1500/);
    assert.match(presenceSource, /function isRecentlyActive\(\)/);
    assert.match(
        composerSource,
        /pageManifest\?: \{ features\?: \{ pointerTracking\?: boolean \} \}/,
    );
});
