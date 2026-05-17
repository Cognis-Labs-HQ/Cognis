import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("users invite deep link consumes the action before opening the popup", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /export function consumeUsersPageAction\(expectedAction\)\s*\{[\s\S]*?searchParams\.delete\("action"\);[\s\S]*?history\.replaceState\(/,
    );
    assert.match(
        source,
        /const shouldOpenInviteFlow = consumeUsersPageAction\("invite"\);\s*if \(shouldOpenInviteFlow && registrationGatewayActive\) \{\s*await triggerInviteFlow\(\);\s*\}/,
    );
    assert.doesNotMatch(
        source,
        /const pageAction = new URL\(location\.href\)\.searchParams\.get\("action"\);\s*if \(pageAction === "invite" && registrationGatewayActive\)/,
    );
});
