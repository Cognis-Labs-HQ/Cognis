import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("page builder stylesheet defines the shared loading shade and wheel", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/page-builder.css"),
        "utf8",
    );

    assert.match(source, /body:not\(\[data-page-ready="true"\]\)::before/);
    assert.match(source, /body:not\(\[data-page-ready="true"\]\)::after/);
    assert.match(source, /@keyframes page-loading-wheel/);
    assert.match(source, /prefers-reduced-motion: reduce/);
});
