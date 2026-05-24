import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const LANGUAGE_FILES = [
    "src/ui/languages/en/strings.xml",
    "src/ui/languages/de/strings.xml",
    "src/ui/languages/id/strings.xml",
    "src/ui/languages/ja/strings.xml",
];

test("users locale bundles include tfa reset action strings", () => {
    for (const languageFile of LANGUAGE_FILES) {
        const source = readFileSync(resolve(ROOT, languageFile), "utf8");
        assert.match(source, /name="ui\.app\.users\.reset_tfa"/);
        assert.match(source, /name="ui\.app\.users\.tfa_reset_done"/);
    }
});
