import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { BROWSER_FLOW_CONTRACTS } from "../../../ui/reuse/flow-contracts.js";

const hookSource = readFileSync(
    resolve("src/gateways/auth/ui/session-flow-hooks.js"),
    "utf8",
);

test("browser ctx exports the staged logout flow", () => {
    assert.deepEqual(BROWSER_FLOW_CONTRACTS.logout, [
        "revokeSession",
        "clearSession",
        "redirectToLogin",
    ]);
});

test("auth gateway logout flow revokes, clears, and redirects", () => {
    const revokeIndex = hookSource.indexOf('"revokeSession"');
    const clearIndex = hookSource.indexOf('"clearSession"');
    const redirectIndex = hookSource.indexOf('"redirectToLogin"');

    assert.ok(revokeIndex >= 0);
    assert.ok(clearIndex > revokeIndex);
    assert.ok(redirectIndex > clearIndex);
    assert.match(hookSource, /apiFetch\("\/api\/v1\/auth\/logout"/);
    assert.match(hookSource, /capabilities\.get\("keyring:lock"\)/);
    assert.match(hookSource, /window\.location\.href = "\/login"/);
});
