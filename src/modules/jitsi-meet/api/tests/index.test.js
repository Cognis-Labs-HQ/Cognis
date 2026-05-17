import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("jitsi API registers configured CSP origins through auth capability", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );

    const sharedGatewayImport = source
        .split("\n")
        .find((line) => line.includes("../../../gateways/shared.js"));

    assert.match(source, /auth:registerPageScriptOrigins/);
    assert.match(
        source,
        /registerConfiguredJitsiOrigin\(registerScriptOrigins, saved\)/,
    );
    assert.equal(
        sharedGatewayImport,
        'import { requireAuth } from "../../../gateways/shared.js";',
    );
});

test("jitsi API logs stored CSP origin registration failures", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );

    assert.match(source, /Failed to register stored Jitsi CSP origin/);
    assert.match(source, /operation: "register_stored_jitsi_origin"/);
});
