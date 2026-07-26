import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();

function readJitsiApiBundle() {
    const apiDir = resolve(ROOT, "src/modules/jitsi-meet/api");
    return readdirSync(apiDir)
        .filter((entry) => entry.endsWith(".js"))
        .sort()
        .map((entry) => readFileSync(join(apiDir, entry), "utf8"))
        .join("\n");
}

test("jitsi API registers configured CSP origins through auth capability", () => {
    const indexSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );
    const bundleSource = readJitsiApiBundle();

    const sharedGatewayImport = indexSource
        .split("\n")
        .find((line) => line.includes("../../../gateways/shared.js"));

    assert.match(indexSource, /auth:registerPageScriptOrigins/);
    assert.match(
        bundleSource,
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

test("jitsi participant lookup includes visible community profiles", () => {
    const source = readJitsiApiBundle();

    assert.match(source, /includeHidden = hasMinRole\(claims\.role, "admin"\)/);
    assert.match(source, /profileStore\.searchProfiles\(query, 50, \{/);
    assert.match(source, /candidateHandles: activeParticipantHandles/);
    assert.match(source, /activeParticipantHandles\.length > 0/);
    assert.match(source, /avatarKey: profile\.avatarKey \?\? null/);
});

test("jitsi meeting notifications target authenticated account ids", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/index.js"),
        "utf8",
    );

    assert.match(source, /recipientUsername: recipient\.accountId/);
    assert.match(source, /resolve_meeting_notification_recipient/);
});

test("jitsi meeting creation resolves hidden participants only for admins", () => {
    const apiSource = readJitsiApiBundle();
    const accessSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/api/reuse/meeting-access.js"),
        "utf8",
    );

    assert.match(
        accessSource,
        /if \(!includeHidden && profile\.visibility === "hidden"\) continue/,
    );
    assert.match(
        apiSource,
        /\{ includeHidden: hasMinRole\(claims\.role, "admin"\) \}/,
    );
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
