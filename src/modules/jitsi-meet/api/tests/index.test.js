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
        'import { hasMinRole, requireAuth } from "../../../gateways/shared.js";',
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

test("jitsi participant lookup lets admins include hidden profiles", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );

    assert.match(source, /includeHidden = hasMinRole\(claims\.role, "admin"\)/);
    assert.match(source, /searchProfiles\(query, 50, \{\s*includeHidden,/);
    assert.match(source, /avatarKey: profile\.avatarKey \?\? null/);
});

test("jitsi meeting creation resolves hidden participants only for admins", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /if \(!includeHidden && profile\.visibility === "hidden"\) continue/,
    );
    assert.match(
        source,
        /\{ includeHidden: hasMinRole\(claims\.role, "admin"\) \}/,
    );
});

test("jitsi meeting creation supports chat-room creation opt-out", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );

    assert.match(source, /skipChatRoomCreation/);
    assert.match(source, /body\?\.skipChatRoomCreation !== true/);
});

test("jitsi meetings API exposes current events query endpoint", () => {
    const apiSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );
    const routesSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/meetings-routes.js"),
        "utf8",
    );

    assert.match(apiSource, /calendar:listCalendars/);
    assert.match(apiSource, /calendar:listEvents/);
    assert.match(
        routesSource,
        /\/api\/v1\/modules\/jitsi-meet\/events\/current/,
    );
    assert.match(routesSource, /ownership must be one of all, own, or invited/);
});
