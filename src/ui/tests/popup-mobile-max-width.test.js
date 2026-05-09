import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("popup skips custom maxWidth on mobile viewports", () => {
    const source = readFileSync(resolve(ROOT, "src/ui/reuse/popup.js"), "utf8");

    assert.match(source, /maxWidth &&/);
    assert.match(source, /matchMedia\("\(max-width: 640px\)"\)\.matches/);
    assert.match(source, /style\.maxWidth = maxWidth;/);
});
