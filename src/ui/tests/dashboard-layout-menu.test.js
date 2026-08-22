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
    const lockKeyringIndex = layoutSource.indexOf(
        'await uiCtx.capabilities.get("keyring:lock")?.()',
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
        lockKeyringIndex > logoutFetchIndex &&
            lockKeyringIndex < clearTokenIndex,
        "logout should clear the account-scoped keyring session before removing the account identity",
    );
    assert.ok(
        layoutSource.includes("Authorization: `Bearer ${accessToken}`"),
        "logout request should send Bearer token when available",
    );
});

test("dashboard resolves guest sessions through the auth capability", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(layoutSource, /capabilities\.get\("session:isGuest"\)/);
    assert.match(
        layoutSource,
        /capabilities\.get\("session:isGuest"\)\?\.\(\) !== true/,
    );
    assert.doesNotMatch(
        layoutSource,
        /!uiCtx\.capabilities\.get\("session:isGuest"\)/,
    );
    assert.doesNotMatch(layoutSource, /account-context/);
});

test("dashboard layout refreshes the greeting from the profile display name", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.ok(
        layoutSource.includes('capabilities.get("session:isGuest")') &&
            layoutSource.includes("apiFetch(profileEndpoint)"),
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

test("dashboard layout suppresses release summaries for guest sessions", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(source, /capabilities\.get\("session:isGuest"\)/);
    const popupSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/release-changelog/popup.js"),
        "utf8",
    );
    assert.match(popupSource, /capabilities\.get\("session:isGuest"\)/);
    const authSessionSource = readFileSync(
        resolve(ROOT, "src/gateways/auth/ui/session-flow-hooks.js"),
        "utf8",
    );
    assert.match(authSessionSource, /contribute\("session:isGuest"/);
    assert.match(authSessionSource, /accountId\.startsWith\("share:"\)/);
});

test("dashboard layout preserves capability-owned cached avatar images", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.doesNotMatch(layoutSource, /URL\.revokeObjectURL/);
    assert.match(layoutSource, /ui:navbarAvatarProvider/);
    assert.match(
        layoutSource,
        /!avatarProvider && avatarBtn\.querySelector\("\.avatar-image"\)/,
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

test("primary navigation supports persisted drag ordering", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    const orderingSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/navigation-order.js"),
        "utf8",
    );
    assert.match(layoutSource, /bindNavigationOrdering/);
    assert.match(orderingSource, /navigationOrder/);
    assert.match(orderingSource, /addEventListener\("dragstart"/);
    assert.match(orderingSource, /addEventListener\("dragover"/);
    assert.match(orderingSource, /savePreferences/);
    assert.match(orderingSource, /MutationObserver/);
});

test("profile dropdown opens on hover or click and closes only on click away", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(layoutSource, /addEventListener\("mouseenter", openMenu\)/);
    assert.match(layoutSource, /addEventListener\("click", \(event\) => \{/);
    assert.doesNotMatch(
        layoutSource,
        /addEventListener\("mouseleave", closeMenu\)/,
    );
    assert.match(
        layoutSource,
        /if \(!profileMenu\?\.contains\(event.target\)\) closeMenu\(\)/,
    );
});

test("user menu entries gain an outline on hover", () => {
    const styles = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/layout.css"),
        "utf8",
    );
    assert.match(
        styles,
        /\.dropdown-item:hover,[\s\S]+outline: 1px solid var\(--accent\);/,
    );
});
