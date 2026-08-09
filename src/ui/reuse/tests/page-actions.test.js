import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("page actions expose CTX-backed add, update, remove, and SPA cleanup", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/page-actions.js"),
        "utf8",
    );
    assert.match(
        source,
        /capabilities\.contribute\("page:actions", pageActions\)/,
    );
    assert.match(source, /add\(action\)/);
    assert.match(source, /update\(id, changes = \{\}\)/);
    assert.match(source, /remove\(id\)/);
    assert.match(
        source,
        /signal\?\.addEventListener\([\s\S]*actions\.clear\(\)/,
    );
});
