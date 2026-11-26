import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../../..");
const SOURCE = readFileSync(
    resolve(ROOT, "src/ui/app/administration/security.js"),
    "utf8",
);

test("administration hides the numeric timeout when Never is selected", () => {
    assert.match(SOURCE, /input\.hidden = never/);
    assert.match(SOURCE, /unit\.value === "never"\s*\? 0/);
});
