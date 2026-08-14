import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const IMPLEMENTATION_URL = new URL(
    "../ui/share-links-popup/implementation.js",
    import.meta.url,
);
const POPUP_ENTRY_URL = new URL(
    "../ui/share-links-popup/index.js",
    import.meta.url,
);
const POPUP_BODY_URL = new URL(
    "../ui/share-links-popup/body.js",
    import.meta.url,
);
const STYLESHEET_URL = new URL(
    "../ui/share-links-popup/index.css",
    import.meta.url,
);
const ADAPTER_LANGUAGE_URLS = ["de", "en", "id", "ja"].map(
    (language) =>
        new URL(`../languages/${language}/strings.xml`, import.meta.url),
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

test("share popup loads callbacks from the gateway-owned static asset", () => {
    const source = readFileSync(POPUP_ENTRY_URL, "utf8");

    assert.match(
        source,
        /from "\/static\/gateways\/share\/ui\/reuse\/share-api\.js"/,
    );
});

test("link adapter supplies localized email popup labels", () => {
    const source = readFileSync(POPUP_ENTRY_URL, "utf8");

    assert.match(source, /function openLocalizedShareLinksPopup\(options\)/);
    assert.match(source, /adapter\.share\.link\.email\.send/);
    assert.match(source, /adapter\.share\.link\.email\.recipients/);
    for (const languageUrl of ADAPTER_LANGUAGE_URLS) {
        const strings = readFileSync(languageUrl, "utf8");
        assert.match(
            strings,
            /name="adapter\.share\.link\.email\.send">[^<]+</,
        );
        assert.match(
            strings,
            /name="adapter\.share\.link\.email\.recipients">[^<]+</,
        );
    }
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

test("share popup can open directly in database-backed edit mode", () => {
    const source = readFileSync(IMPLEMENTATION_URL, "utf8");
    const bodySource = readFileSync(POPUP_BODY_URL, "utf8");

    assert.match(source, /initialEditingShareId = ""/);
    assert.match(source, /function selectShareForEditing\(selectedShare\)/);
    assert.match(source, /state\.links\.find\([\s\S]*initialEditingShareId/);
    assert.match(source, /initialEditingShare = null/);
    assert.match(source, /editOnly = false/);
    assert.match(source, /state\.links = \[initialShare\]/);
    assert.match(bodySource, /share-links-popup--edit-only/);
    assert.match(source, /updateButton\?\.classList\.add\("btn-confirm"\)/);
    assert.match(
        bodySource,
        /editOnly[\s\S]*\? ""[\s\S]*: `<nav class="share-method-tabs"/,
    );
    assert.match(source, /if \(!editOnly\) \{[\s\S]*window\.setInterval\(/);
});

test("share popup supports restricting available adapter methods", () => {
    const source = readFileSync(IMPLEMENTATION_URL, "utf8");

    assert.match(source, /allowedMethodIds = null/);
    assert.match(source, /new Set\(allowedMethodIds\.map\(String\)\)/);
    assert.match(source, /allowedMethods\.has/);
});
