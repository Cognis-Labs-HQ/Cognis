import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("settings security section renders TFA available/active tables", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/auth/ui/security-prefs.js"),
        "utf8",
    );
    assert.match(source, /settings-tfa-available/);
    assert.match(source, /settings-tfa-active/);
});
