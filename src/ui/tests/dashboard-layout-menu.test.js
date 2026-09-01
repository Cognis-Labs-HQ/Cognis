import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reconcileUserMenuEntries } from "../layouts/user-menu.js";

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

test("profile menu toggle is active while its dropdown is open", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );

    assert.match(layoutSource, /toggle\?\.classList\.add\("active"\)/);
    assert.match(layoutSource, /toggle\?\.classList\.remove\("active"\)/);
});

test("profile menu keeps the current page link active", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    const layoutCss = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/layout.css"),
        "utf8",
    );

    assert.match(layoutSource, /\.user-dropdown-content a/);
    assert.match(layoutCss, /\.dropdown-item\.active/);
    assert.match(layoutSource, /activeDropdownLink/);
    assert.match(
        layoutSource,
        /right\.getAttribute\("href"\)\?\.length[\s\S]*left\.getAttribute\("href"\)\?\.length/,
    );
    assert.match(
        layoutCss,
        /\.dropdown-item\.active\s*{[^}]*border-bottom: 2px solid var\(--accent-2\)/,
    );
    assert.doesNotMatch(
        layoutCss,
        /\.dropdown-item:focus-visible,\s*\.dropdown-item\.active/,
    );
});

test("dashboard keeps global search styles across SPA navigations", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );

    assert.match(layoutSource, /import \{ ensurePersistentStylesheet \}/);
    assert.match(layoutSource, /ensurePersistentStylesheet\(SEARCH_BAR_CSS\)/);
});

test("global search toggle uses theme-specific SVG assets", () => {
    const popupSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/search-util/popup.js"),
        "utf8",
    );
    const searchCss = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/search-bar.css"),
        "utf8",
    );

    assert.match(popupSource, /search-bar-toggle-icon/);
    assert.match(searchCss, /search-light\.svg/);
    assert.match(searchCss, /search-dark\.svg/);
    assert.match(searchCss, /width: 1\.65rem/);
    assert.match(searchCss, /height: 1\.65rem/);
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

test("built-in dashboard pages expose UUID-owned component page metadata", () => {
    const routerSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    for (const routeId of [
        "core.dashboard",
        "core.settings",
        "core.users",
        "core.invite",
        "core.modules",
        "core.administration",
        "core.docs",
        "core.changelogs",
        "core.license",
        "core.error",
        "gateway.study",
        "gateway.study.child",
    ]) {
        assert.match(
            routerSource,
            new RegExp(`id: "${routeId.replaceAll(".", "\\.")}"`),
        );
    }
    assert.match(routerSource, /ownerUuid: CORE_COMPONENT_UUID/);
    assert.match(routerSource, /componentPage: componentPage/);
    assert.match(routerSource, /installComponentPageBroker\(\{/);
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

test("dashboard navigation alphabetizes and redraws entries as plugins add them", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(
        layoutSource,
        /function sortNavigationEntries\(topnav\)[\s\S]*new Intl\.Collator[\s\S]*topnav\.append\(\.\.\.sortedEntries\)/,
    );
    assert.match(
        layoutSource,
        /Array\.from\(topnav\.children\)[\s\S]*entry\.matches\("a"\)/,
    );
    assert.doesNotMatch(layoutSource, /entry\.matches\("a\[href\]"\)/);
    assert.match(
        layoutSource,
        /function redrawNavigation\(\)[\s\S]*sortNavigationEntries\(topnav\)[\s\S]*drawerNav\.innerHTML = topnav\.innerHTML/,
    );
    assert.match(
        layoutSource,
        /new MutationObserver\(redrawNavigation\)[\s\S]*observe\(topnav, \{ childList: true \}\)/,
    );
    assert.match(
        layoutSource,
        /function navigationEntryRank\(entry\)[\s\S]*href"\) === "\/dashboard" \? 0 : 1/,
    );
    assert.match(
        layoutSource,
        /navigationEntryRank\(left\) - navigationEntryRank\(right\)[\s\S]*rankDifference \|\|[\s\S]*collator\.compare/,
    );
});

test("core reconciles duplicate provider entries in the user menu", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    const integritySource = readFileSync(
        resolve(ROOT, "src/ui/layouts/user-menu.js"),
        "utf8",
    );
    const dropdown = { children: [] };
    const entry = (href) => {
        const item = {
            querySelector: () => ({ getAttribute: () => href }),
            remove: () => {
                dropdown.children = dropdown.children.filter(
                    (candidate) => candidate !== item,
                );
            },
        };
        return item;
    };
    dropdown.children = [
        entry("/shares"),
        entry("/settings"),
        entry("/shares"),
        entry("/shares"),
    ];
    assert.equal(reconcileUserMenuEntries(dropdown), 2);
    assert.equal(dropdown.children.length, 2);
    assert.match(
        integritySource,
        /function bindUserMenuIntegrity\(dropdown\)[\s\S]*new MutationObserver[\s\S]*observer\.observe\(dropdown, \{ childList: true \}\)/,
    );
    assert.match(layoutSource, /import \{ bindUserMenuIntegrity \}/);
    assert.match(
        layoutSource,
        /if \(dropdown\) bindUserMenuIntegrity\(dropdown\)/,
    );
});
