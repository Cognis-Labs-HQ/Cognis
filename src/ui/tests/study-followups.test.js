import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("legacy classes routes redirect to /classroom", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/study/classes/index.ts"),
        "utf8",
    );
    assert.match(source, /url\.pathname !== "\/classes"/);
    assert.match(source, /location: "\/classroom"/);
    assert.match(source, /url\.pathname !== "\/my-classes"/);
});

test("hiragana component stylesheet does not override shared study sub-navigation layout", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/modules/study/languages/ja/components/hiragana-alphabet/ui/hiragana.css",
        ),
        "utf8",
    );
    assert.doesNotMatch(source, /\.study-page-subnav\s*\{/);
    assert.doesNotMatch(source, /\.study-subnav-modules\s*\{/);
    assert.doesNotMatch(source, /\.study-subnav-language-options\s*\{/);
});

test("study hub detects native library child component by descriptor id", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/study.js"),
        "utf8",
    );
    assert.match(
        source,
        /hasLibraryModule[\s\S]*component\?\.id[\s\S]*===\s*"library"/,
    );
});
