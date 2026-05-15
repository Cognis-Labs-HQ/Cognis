import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("profile dropdown places Users under Administration", () => {
    const template = readFileSync(
        resolve(ROOT, "src/ui/public/templates/dashboard-layout.html"),
        "utf8",
    );
    const adminIndex = template.indexOf('href="/administration"');
    const usersIndex = template.indexOf('href="/users"');

    assert.notEqual(adminIndex, -1);
    assert.notEqual(usersIndex, -1);
    assert.ok(usersIndex > adminIndex);
});

test("admin-only menu items carry the hidden attribute in the template", () => {
    const template = readFileSync(
        resolve(ROOT, "src/ui/public/templates/dashboard-layout.html"),
        "utf8",
    );
    const adminLiPattern =
        /<li[^>]*class="admin-only"[^>]*hidden[^>]*>|<li[^>]*hidden[^>]*class="admin-only"[^>]*>/g;
    const matches = [...template.matchAll(adminLiPattern)];
    assert.ok(
        matches.length >= 2,
        "expected at least two hidden admin-only <li> items",
    );
});

test("layout CSS restores [hidden] visibility inside .dropdown", () => {
    const css = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/layout.css"),
        "utf8",
    );
    assert.ok(
        css.includes(".dropdown li[hidden]") && css.includes("display: none"),
        "layout.css must override .dropdown li display for [hidden] items",
    );
});

test("dashboard logout requests server revocation before clearing local token", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    const logoutFetchIndex = layoutSource.indexOf(
        'await fetch("/api/v1/auth/logout"',
    );
    const clearTokenIndex = layoutSource.indexOf(
        'localStorage.removeItem("cognis_access_token")',
    );
    assert.ok(
        logoutFetchIndex !== -1 && clearTokenIndex !== -1,
        "expected logout fetch and local token clear calls in dashboard-layout.js",
    );
    assert.ok(
        logoutFetchIndex < clearTokenIndex,
        "logout fetch should occur before local token removal so revocation can use current auth state",
    );
    assert.ok(
        layoutSource.includes("Authorization: `Bearer ${accessToken}`"),
        "logout request should send Bearer token when available",
    );
});
