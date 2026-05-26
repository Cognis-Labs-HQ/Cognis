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

test("dashboard footer renders license and changelogs links", () => {
    const template = readFileSync(
        resolve(ROOT, "src/ui/public/templates/dashboard-layout.html"),
        "utf8",
    );
    const licenseLinkIndex = template.indexOf('href="/license"');
    const changelogsLinkIndex = template.indexOf('href="/changelogs"');
    assert.ok(
        licenseLinkIndex !== -1 && changelogsLinkIndex !== -1,
        "dashboard footer should include license and changelogs links",
    );
    assert.ok(
        changelogsLinkIndex > licenseLinkIndex,
        "changelogs link should render next to license in footer order",
    );
});

test("dashboard logout requests server revocation before clearing local token", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    // This test intentionally locks exact source snippets so logout ordering and
    // Bearer forwarding remain explicit in dashboard-layout.js.
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

test("dashboard layout refreshes the greeting from the profile display name", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.ok(
        layoutSource.includes('apiFetch("/api/v1/profile")'),
        "dashboard layout should fetch the authenticated profile to refresh the greeting display name",
    );
    assert.ok(
        layoutSource.includes(
            'localStorage.setItem("cognis_display_name", normalizedName)',
        ),
        "dashboard layout should store the profile display name for the user greeting",
    );
    assert.ok(
        layoutSource.includes("updateDisplayedName(normalizedName)"),
        "dashboard layout should update the visible greeting immediately after storing the profile display name",
    );
});

test("dashboard layout checks release changelog popup in shell sessions", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.ok(
        layoutSource.includes("maybeShowReleaseChangelogPopup"),
        "dashboard layout should import release changelog popup logic",
    );
    assert.ok(
        layoutSource.includes("ensureReleaseChangelogPopupChecked(i18n)"),
        "dashboard layout should trigger the release changelog check after rendering shell navigation",
    );
});

test("dashboard layout keeps active avatar blob URL during SPA refresh", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.ok(
        layoutSource.includes("prevBlobSrc && prevBlobSrc !== avatarBlobUrl"),
        "dashboard layout should not revoke a blob URL when it is still the active avatar source",
    );
});

test("dashboard layout re-shows theme toggle on shell reuse when enabled", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.ok(
        /const existingThemeToggle\s*=\s*existingShell\.querySelector\("#theme-toggle"\);/m.test(
            layoutSource,
        ),
        "dashboard layout should resolve the existing theme toggle when reusing the shell",
    );
    assert.ok(
        layoutSource.includes('existingThemeToggle?.removeAttribute("hidden")'),
        "dashboard layout should unhide the existing theme toggle when the page enables it",
    );
});
