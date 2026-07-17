import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../../");
const SOURCE = readFileSync(
    resolve(ROOT, "src/ui/reuse/secret-visibility-toggle.js"),
    "utf8",
);

test("secret visibility utility renders reusable concealed toggle fields", () => {
    assert.match(SOURCE, /export function renderSecretVisibilityField/);
    assert.match(SOURCE, /type="password" readonly/);
    assert.match(SOURCE, /data-secret-visibility-toggle/);
    assert.match(SOURCE, /aria-pressed="false"/);
});

test("secret visibility utility binds delegated toggle clicks", () => {
    assert.match(SOURCE, /export function bindSecretVisibilityToggles/);
    assert.match(SOURCE, /toggleSecretVisibility\(\{/);
    assert.match(SOURCE, /root\.addEventListener\("click", handleToggleClick/);
});
