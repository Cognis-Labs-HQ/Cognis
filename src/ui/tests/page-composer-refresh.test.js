import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("page composer refresh preserves existing elements when called without args", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.match(
        source,
        /function refresh\(newElements\)[\s\S]*?if \(Array\.isArray\(newElements\)\)\s*\{\s*elements = newElements;\s*\}[\s\S]*?render\(\);/m,
    );
});

test("page composer invokes element-level onRender callbacks", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.match(source, /el\?\.onRender\?\.\(\);/);
});

test("page composer includes mobile toolbar drawer behavior", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.match(source, /MOBILE_TOOLBAR_BREAKPOINT = 900/);
    assert.match(source, /window\.matchMedia\(/);
    assert.match(source, /\(max-width: \$\{MOBILE_TOOLBAR_BREAKPOINT\}px\)/);
    assert.match(source, /toolbar--mobile-open/);
    assert.match(source, /toolbar-mobile-backdrop--open/);
    assert.match(source, /mobileToggleBtn\.textContent = "☰"/);
});
