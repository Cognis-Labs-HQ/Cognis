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

test("users table treats founder admins as owner while keeping owner admin management enabled", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(source, /currentUser\?\.isAdmin && currentUser\?\.isFounder/);
    assert.match(
        source,
        /const viewerIsAdmin = currentRole === "admin" && !viewerIsOwner/,
    );
    assert.match(
        source,
        /userRole === "owner" \|\|\s*Boolean\(user\.isAdmin && user\.isFounder\)/,
    );
});
