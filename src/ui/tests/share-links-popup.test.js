import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("share links popup keeps form and list rendering separate", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/share-links-popup.js"),
        "utf8",
    );

    assert.match(source, /share-links-form-container/);
    assert.match(source, /share-links-list-container/);
    assert.match(
        source,
        /listContainer\.innerHTML = renderRows\(labels, state\.links\);/,
    );
    assert.match(source, /createButton\.disabled = state\.isCreating;/);
    assert.match(source, /window\.setInterval\(/);
    assert.doesNotMatch(source, /captureFocusableTarget/);
    assert.doesNotMatch(source, /restoreFocusableTarget/);
});

test("share links popup renders the copy control inline with the share label", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/share-links-popup.js"),
        "utf8",
    );
    const cssSource = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/share-links-popup.css"),
        "utf8",
    );

    assert.match(source, /class="share-links-row-header"/);
    assert.match(source, /class="share-links-row-copy"/);
    assert.doesNotMatch(source, /share-links-row-url/);
    assert.match(cssSource, /\.share-links-row-header \{/);
    assert.match(cssSource, /\.share-links-row-copy \{/);
    assert.match(cssSource, /text-overflow: ellipsis;/);
});
