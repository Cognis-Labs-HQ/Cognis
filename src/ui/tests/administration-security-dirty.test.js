import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../..");
const SOURCE = readFileSync(
    resolve(ROOT, "src/ui/app/administration/security.js"),
    "utf8",
);

test("administration security registers both session timeout controls with dirty tracking", () => {
    assert.match(
        SOURCE,
        /loginTimeoutInput\?\.addEventListener\("input", markDirtyState\)/,
    );
    assert.match(
        SOURCE,
        /loginTimeoutUnit\?\.addEventListener\("change", \(\) => \{\s*updateLoginSessionTimeoutControls\(\);\s*markDirtyState\(\);/,
    );
    assert.match(
        SOURCE,
        /getLoginSessionTimeoutMinutesValue\(\) !==\s*originalLoginSessionTimeoutMinutes/,
    );
});
