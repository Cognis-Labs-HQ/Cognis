import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const IMPLEMENTATION_URL = new URL(
    "../ui/share-links-popup/implementation.js",
    import.meta.url,
);
const STYLESHEET_URL = new URL(
    "../ui/share-links-popup/index.css",
    import.meta.url,
);

test("share popup keeps the active adapter page and history rendering separate", () => {
    const source = readFileSync(IMPLEMENTATION_URL, "utf8");

    assert.match(source, /share-method-page/);
    assert.match(source, /share-links-list-container/);
    assert.match(source, /listContainer\.innerHTML = renderRows\(/);
    assert.match(source, /state\.visibleLinks/);
    assert.match(source, /methodModule\.renderPage/);
    assert.match(source, /window\.setInterval\(/);
    assert.doesNotMatch(source, /captureFocusableTarget/);
    assert.doesNotMatch(source, /restoreFocusableTarget/);
});

test("share links popup renders existing links as an icon-only copy button", () => {
    const source = readFileSync(IMPLEMENTATION_URL, "utf8");
    const cssSource = readFileSync(STYLESHEET_URL, "utf8");

    assert.match(source, /class="share-links-row-header"/);
    assert.match(source, /class="share-links-row-copy"/);
    assert.match(
        source,
        /<button\s+type="button"[\s\S]*class="share-links-row-copy"[\s\S]*data-share-copy="\$\{escapeHtml\(shareUrl\)\}"/,
    );
    assert.doesNotMatch(source, /share-links-row-url/);
    assert.match(cssSource, /\.share-links-row-header \{/);
    assert.match(cssSource, /\.share-links-row-copy \{/);
    assert.match(cssSource, /\.share-links-row-copy \{[\s\S]*flex: none;/);
});

test("share deletion requires explicit confirmation", () => {
    const source = readFileSync(IMPLEMENTATION_URL, "utf8");

    assert.match(source, /const confirmation = await openPopup/);
    assert.match(source, /if \(confirmation !== "confirm"\) return/);
    assert.match(
        source,
        /if \(confirmation !== "confirm"\) return;[\s\S]*deleteLink\(\{ shareId \}\)/,
    );
});
