import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(relativePath) {
    return readFileSync(resolve(ROOT, relativePath), "utf8");
}

test("form builder reuse utility exports createFormBuilder", () => {
    const source = read("src/ui/reuse/form-builder.js");
    assert.match(source, /export function createFormBuilder\(/);
    assert.match(source, /data-form-builder-floating=/);
    assert.match(source, /form-builder-criterion-item--met/);
});

test("register page uses form builder instead of hardcoded maxlength for username", () => {
    const source = read("src/ui/app/register/index.js");
    assert.match(
        source,
        /import \{ createFormBuilder \} from "\.\.\/\.\.\/reuse\/form-builder\.js";/,
    );
    assert.doesNotMatch(source, /maxlength="25"/);
    assert.match(
        source,
        /id: "username-max-length",[\s\S]*type: "maxLength",[\s\S]*value: 25,/m,
    );
});

test("register password criteria use floating alert in form builder config", () => {
    const source = read("src/ui/app/register/index.js");
    assert.match(source, /criteriaDisplay: "floating-alert"/);
    assert.match(
        source,
        /floatingTitleKey: "ui\.app\.register\.password_requirements"/,
    );
});

test("register submit blocks when form builder marks fields invalid", () => {
    const source = read("src/ui/app/register/index.js");
    assert.match(source, /formController\.validateAll\(true\)/);
    assert.match(source, /ui\.app\.register\.error\.validation_failed/);
});
