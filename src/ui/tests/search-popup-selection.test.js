import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("search popup checked indicator stays centered in selectable rows", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/search-bar.css"),
        "utf8",
    );
    assert.match(source, /transform: translate\(-50%, -58%\) rotate\(45deg\);/);
});

test("global search modules result points to Administration components", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(source, /id: "page-modules"/);
    assert.match(source, /url: "\/administration#components"/);
    assert.match(
        source,
        /ui\.reuse\.administration[\s\S]*ui\.app\.admin\.components[\s\S]*ui\.reuse\.modules/,
    );
    assert.doesNotMatch(source, /url: "\/modules"/);
});

test("global search exposes registered categories and match controls", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/search-bar.js"),
        "utf8",
    );
    assert.match(source, /export function registerSearchCategory/);
    assert.match(source, /registerSearchCategory\("visible-page"/);
    assert.match(source, /registerSearchCategory\("visible-content"/);
    assert.match(source, /data-message-id/);
    assert.match(source, /data-chat-id/);
    assert.match(source, /"Whole word"/);
    assert.match(source, /"Regex"/);
    assert.match(source, /"Case-sensitive"/);
    assert.match(source, /wholeWord=1/);
    assert.match(source, /regex=1/);
    assert.match(source, /caseSensitive=1/);
});
