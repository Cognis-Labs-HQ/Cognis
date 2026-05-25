import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("login TFA setup flow redirects directly to the security settings hash", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/tfa/ui/login-flow.js"),
        "utf8",
    );

    assert.match(source, /window\.location\.href = "\/settings#security"/);
});

test("settings page disables dashboard chrome while auth setup is pending", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/settings/index.js"),
        "utf8",
    );

    assert.match(source, /\/api\/v1\/auth\/setup-status/);
    assert.match(source, /window\.location\.replace\("\/settings#security"\)/);
    assert.match(source, /frameless: authSetupRequired/);
    assert.match(source, /showTopbar: !authSetupRequired/);
    assert.match(source, /showNavbar: !authSetupRequired/);
    assert.match(source, /showFooter: !authSetupRequired/);
});
