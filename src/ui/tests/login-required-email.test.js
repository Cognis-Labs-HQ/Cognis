import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("login required-email enforcement uses notify gateway helper", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/login/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /import\(\s*"\/static\/gateways\/notify\/login-required-email-flow\.js"\s*\)/,
    );
    assert.match(source, /requiredEmailClient\?\.enforceRequiredEmailSetup/);
    assert.doesNotMatch(source, /\/api\/v1\/users\/\$\{encodeURIComponent/);
});

test("notify required-email helper checks verified primary email", () => {
    const source = readFileSync(
        resolve(
            ROOT,
            "src/gateways/notify/ui/login-required-email-flow.js",
        ),
        "utf8",
    );
    assert.match(source, /entry\.primary === true && entry\.verified === true/);
});
