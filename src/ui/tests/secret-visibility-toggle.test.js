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
const STYLES = readFileSync(
    resolve(ROOT, "src/ui/styles/reuse/secret-visibility-toggle.css"),
    "utf8",
);

test("secret visibility utility renders reusable concealed toggle fields", () => {
    assert.match(SOURCE, /export function renderSecretVisibilityField/);
    assert.match(SOURCE, /type="password" readonly/);
    assert.match(SOURCE, /data-secret-visibility-toggle/);
    assert.match(SOURCE, /aria-pressed="false"/);
    assert.match(SOURCE, /class="secret-visibility-field"/);
    assert.match(SOURCE, /class="secret-visibility-input"/);
    assert.match(SOURCE, /class="secret-visibility-toggle"/);
    assert.doesNotMatch(SOURCE, /className\?: string/);
    assert.doesNotMatch(SOURCE, /inputClassName\?: string/);
    assert.doesNotMatch(SOURCE, /toggleClassName\?: string/);
});

test("secret visibility utility binds delegated toggle clicks", () => {
    assert.match(SOURCE, /export function bindSecretVisibilityToggles/);
    assert.match(SOURCE, /toggleSecretVisibility\(\{/);
    assert.match(SOURCE, /root\.addEventListener\("click", handleToggleClick/);
});

test("secret visibility utility keeps control styles with the reusable helper", () => {
    assert.match(SOURCE, /SECRET_VISIBILITY_STYLESHEET/);
    assert.match(SOURCE, /ensureSecretVisibilityStyles/);
    assert.match(STYLES, /\.secret-visibility-field/);
    assert.match(STYLES, /\.secret-visibility-input/);
    assert.match(STYLES, /\.secret-visibility-toggle/);
    assert.match(STYLES, /\.secret-visibility-toggle\.is-revealed/);
});
