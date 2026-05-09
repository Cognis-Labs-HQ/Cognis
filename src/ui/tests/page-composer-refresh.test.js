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

    assert.match(source, /resolveElementOnRender\(el\)\?\.\(\);/);
});

test("page composer closes toolbar drawer on menu click only in drawer mode", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.match(
        source,
        /if \(drawerModeActive && drawerOpen\) \{\s*setDrawerOpen\(false\);\s*\}/m,
    );
});

test("page composer inserts drawer toggle before content grid", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-composer.js"),
        "utf8",
    );

    assert.match(
        source,
        /mainWindow\?\.insertBefore\(drawerToggle, contentGrid\);/,
    );
});
