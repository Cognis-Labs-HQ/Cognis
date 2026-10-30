import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("hamburger menu constrains mobile width to parent bounds", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/hamburger-menu.js"),
        "utf8",
    );

    assert.match(source, /matchMedia\("\(max-width: 640px\)"\)/);
    assert.match(
        source,
        /Math\.min\(\s*parentRect\.width,\s*window\.innerWidth - viewportPadding \* 2,/m,
    );
    assert.match(source, /menu\.style\.width = `\$\{maxMobileWidth\}px`;/);
    assert.match(source, /Math\.max\(parentLeft, rightEdge - maxMobileWidth\)/);
});
