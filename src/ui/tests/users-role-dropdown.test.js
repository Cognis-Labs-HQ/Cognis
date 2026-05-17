import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ACCESS_ROLES } from "../reuse/access-role.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("users role dropdown includes every assignable access role", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.ok(ACCESS_ROLES.includes("moderator"));
    assert.match(
        source,
        /ACCESS_ROLES\.filter\(\s*\(role\) => role !== "owner"/,
    );
    assert.match(source, /getRoleLabel\(i18n, role\)/);
    assert.match(source, /roleOptionsHtml/);
});

test("users table uses effective roles for owner and admin management state", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /const currentRole = currentUser\?\.role \?\? getCurrentRole\(\)/,
    );
    assert.match(
        source,
        /const viewerCanManagePrivileged = currentRole === "owner"/,
    );
    assert.match(source, /const isOwner = userRole === "owner"/);
    assert.match(source, /hasMinAccessRole\(userRole, "admin"\)/);
    assert.doesNotMatch(source, /currentUser\?\.isAdmin/);
    assert.doesNotMatch(source, /user\.isFounder/);
    assert.doesNotMatch(source, /const viewerIsAdmin/);
});
