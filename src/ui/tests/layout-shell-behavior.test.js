import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("layout shell uses a column flex flow so footer can sit at viewport bottom", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/layout.css"),
        "utf8",
    );

    assert.match(
        source,
        /\.app-shell\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?\}/m,
    );
    assert.match(
        source,
        /\.workspace\s*\{[\s\S]*?flex:\s*1 0 auto;[\s\S]*?\}/m,
    );
});

test("toolbar drawer toggle and layers keep menu hitboxes above backdrop", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/page-builder.css"),
        "utf8",
    );

    assert.match(
        source,
        /\.toolbar-drawer-toggle\s*\{[\s\S]*?position:\s*relative;[\s\S]*?\}/m,
    );
    assert.match(
        source,
        /\.toolbar-drawer-backdrop\s*\{[\s\S]*?z-index:\s*690;[\s\S]*?\}/m,
    );
    assert.match(
        source,
        /\.toolbar--drawer\s*\{[\s\S]*?z-index:\s*700;[\s\S]*?\}/m,
    );
});

test("content sections constrain large children to avoid escaping borders", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/page-sections.css"),
        "utf8",
    );

    assert.match(source, /\.content-section > \*[\s\S]*?max-width:\s*100%;/m);
    assert.match(
        source,
        /\.content-section :where\(table, pre\)\s*\{[\s\S]*?overflow:\s*auto;[\s\S]*?\}/m,
    );
});
