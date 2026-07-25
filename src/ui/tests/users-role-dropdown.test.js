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

test("users role dropdown renders owner as a disabled display select", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(source, /const roleOptions = isOwner\s*\? \["owner"\]/);
    assert.match(
        source,
        /const roleCellHtml = `<select class="users-role-select theme-select"/,
    );
    assert.doesNotMatch(
        source,
        /\? escapeHtml\(i18n\.t\("ui\.reuse\.role_owner"\)\)/,
    );
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

test("users action menu only includes tfa reset when target has configured tfa", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(source, /user\?\.hasTfaConfigured === true/);
    assert.match(source, /id: "tfa-reset"/);
});

test("users hamburger menu includes resend only when unverified emails exist", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /const hasUnverifiedEmails = emails\.some\(\(e\) => !e\.verified\)/,
    );
    assert.match(source, /\.\.\.\(hasUnverifiedEmails/);
});

test("users delete action is rendered as inline trash button in actions column", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(source, /class="users-delete-btn btn-animated"/);
    assert.match(source, /await runUserMenuAction\("delete", username\)/);
    assert.match(
        source,
        /<button class="users-delete-btn btn-animated"[\s\S]*<button class="users-menu-btn btn-animated"/,
    );
});

test("users tfa reset action has standalone branch", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(source, /if \(action === "tfa-reset"\)/);
    assert.match(
        source,
        /\/api\/v1\/tfa\/admin\/users\/\$\{encodeURIComponent\(username\)\}\/reset/,
    );
});

test("users row click guard ignores role dropdown interaction", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(source, /target\.closest\("button,input,select"\)/);
});

test("users invite flow is gated by registration and smtp adapter availability", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /inviteButtonHtml =[\s\S]*registrationGatewayActive\s*&&\s*smtpAdapterActive/,
    );
    assert.match(
        source,
        /pageAction === "invite"[\s\S]*registrationGatewayActive\s*&&\s*smtpAdapterActive/,
    );
});

test("users resend verification action is hidden when smtp adapter is disabled", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(source, /if \(!smtpAdapterActive\) return;/);
    assert.match(source, /const emails = smtpAdapterActive\s*\?[\s\S]*: \[\];/);
});

test("users storage quotas render inline with unit selectors", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /<th>\$\{escapeHtml\(i18n\.t\("ui\.app\.users\.storage_quotas"\)\)\}<\/th>/,
    );
    assert.match(source, /class="users-quota-input"/);
    assert.match(source, /class="users-quota-unit-select theme-select"/);
    assert.match(source, /const QUOTA_UNITS = \[/);
    assert.doesNotMatch(source, /id: "storage-quotas"/);
});
