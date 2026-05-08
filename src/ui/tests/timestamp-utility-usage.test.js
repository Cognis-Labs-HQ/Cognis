import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("users popup formats member and login timestamps via timestamp utility", () => {
    const source = readFileSync(
        "/home/runner/work/Cognis/Cognis/src/ui/app/users/index.js",
        "utf8",
    );

    assert.match(
        source,
        /import\s*\{\s*formatDate,\s*formatDateTime\s*\}\s*from\s*"..\/..\/reuse\/timestamp\.js"/,
    );
    assert.match(source, /formatMemberSince\(info\?\.createdAt \?\? null\)/);
    assert.match(source, /formatLastLogin\(info\?\.lastLogin \?\? null\)/);
});

test("administration registration table formats invite expiry timestamps via timestamp utility", () => {
    const source = readFileSync(
        "/home/runner/work/Cognis/Cognis/src/gateways/registration/ui/admin-section.js",
        "utf8",
    );

    assert.match(
        source,
        /import\s*\{\s*formatDateTime\s*\}\s*from\s*"..\/..\/..\/ui\/reuse\/timestamp\.js"/,
    );
    assert.match(source, /formatDateTime\(token\.expiresAt\)/);
    assert.doesNotMatch(source, /toLocaleString\(/);
});
