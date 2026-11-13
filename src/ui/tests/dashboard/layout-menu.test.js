import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    bindAccountMenu,
    reconcileUserMenuEntries,
} from "../../layouts/user-menu.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

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

function accountMenuFixture() {
    const document = new EventTarget();
    document.defaultView = new EventTarget();
    document.defaultView.innerHeight = 800;
    document.defaultView.visualViewport = new EventTarget();
    document.defaultView.visualViewport.height = 800;
    document.defaultView.visualViewport.offsetTop = 0;
    const element = () => {
        const node = new EventTarget(),
            classes = new Set(),
            attributes = new Map();
        node.ownerDocument = document;
        node.classList = {
            add: (value) => classes.add(value),
            remove: (value) => classes.delete(value),
            contains: (value) => classes.has(value),
        };
        node.setAttribute = (key, value) => attributes.set(key, value);
        node.getAttribute = (key) => attributes.get(key);
        node.getBoundingClientRect = () => ({ bottom: 200 });
        const styles = new Map();
        node.style = {
            setProperty: (key, value) => styles.set(key, value),
            getPropertyValue: (key) => styles.get(key),
        };
        return node;
    };
    const toggle = element(),
        dropdown = element(),
        menu = element();
    menu.contains = (node) => node === toggle || node === dropdown;
    dropdown.classList.add("hidden");
    const controller = new AbortController();
    bindAccountMenu({ toggle, dropdown, menu, signal: controller.signal });
    return { document, toggle, dropdown, menu, controller };
}

test("profile menu toggle and expanded state follow its real open and close handlers", () => {
    const state = accountMenuFixture();
    state.toggle.dispatchEvent(new Event("mouseenter"));
    assert.equal(state.toggle.classList.contains("active"), true);
    assert.equal(state.menu.classList.contains("open"), true);
    assert.equal(state.toggle.getAttribute("aria-expanded"), "true");
    assert.equal(state.dropdown.classList.contains("hidden"), false);
    state.document.dispatchEvent(new Event("click"));
    assert.equal(state.toggle.classList.contains("active"), false);
    assert.equal(state.menu.classList.contains("open"), false);
    assert.equal(state.toggle.getAttribute("aria-expanded"), "false");
    state.controller.abort();
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
        /\.app-shell \.dropdown-item\.active\s*{[^}]*border-bottom: 2px solid var\(--accent-2\)/,
    );
    assert.doesNotMatch(
        layoutCss,
        /\.dropdown-item:focus-visible,\s*\.dropdown-item\.active/,
    );
    assert.ok(
        layoutCss.indexOf(".app-shell .dropdown-item.active") <
            layoutCss.indexOf(".app-shell .dropdown-item {"),
        "the more-specific active selector must override the later control reset",
    );
});

test("dashboard keeps shared control styles across SPA navigations", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );

    assert.match(layoutSource, /import \{ ensurePersistentStylesheet \}/);
    assert.match(
        layoutSource,
        /ensurePersistentStylesheet\(BUTTON_STYLESHEET\)/,
    );
    assert.match(layoutSource, /ensurePersistentStylesheet\(SEARCH_BAR_CSS\)/);
});

test("sub-navigation collapse uses header-height hysteresis", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );

    assert.match(layoutSource, /currentlyPrioritized/);
    assert.match(layoutSource, /primaryNavigationHeight \+ 12/);
    assert.match(
        layoutSource,
        /currentlyPrioritized[\s\S]*window\.scrollY > 12/,
    );
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
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(template, /data-footer-links="left"/);
    assert.match(template, /data-footer-links="right"/);
    const licenseLinkIndex = layoutSource.indexOf('href: "/license"');
    const changelogsLinkIndex = layoutSource.indexOf('href: "/changelogs"');
    assert.ok(
        licenseLinkIndex !== -1 && changelogsLinkIndex !== -1,
        "dashboard footer should include license and changelogs links",
    );
    assert.ok(
        changelogsLinkIndex > licenseLinkIndex,
        "changelogs link should render next to license in footer order",
    );
});

test("dashboard logout delegates to the shared ctx flow", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(layoutSource, /uiCtx\.runFlow\("logout"/);
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
        layoutSource.includes("registerReleaseChangelogReadiness"),
        "dashboard layout should import release changelog popup logic",
    );
    assert.ok(
        layoutSource.includes("registerReleaseChangelogReadiness(uiCtx,"),
        "dashboard layout should register the release changelog readiness blocker after rendering shell navigation",
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
        "core.modules",
        "core.administration",
        "core.docs",
        "core.changelogs",
        "core.license",
        "core.error",
    ]) {
        assert.match(
            routerSource,
            new RegExp(`id: "${routeId.replaceAll(".", "\\.")}"`),
        );
    }
    assert.match(routerSource, /ownerUuid: CORE_COMPONENT_UUID/);
    assert.match(routerSource, /componentPage: componentPage/);
    assert.match(routerSource, /installComponentPageBroker\(\{/);
    const studyBootstrapSource = readFileSync(
        resolve(ROOT, "src/gateways/study/bootstrap.ts"),
        "utf8",
    );
    assert.match(studyBootstrapSource, /id: "gateway\.study"/);
    assert.match(studyBootstrapSource, /id: "gateway\.study\.child"/);
});

test("profile dropdown persists after pointer departure and releases its listeners with its owner", () => {
    const state = accountMenuFixture();
    state.toggle.dispatchEvent(new Event("click"));
    state.toggle.dispatchEvent(new Event("mouseleave"));
    assert.equal(state.dropdown.classList.contains("hidden"), false);
    const inside = new Event("click");
    Object.defineProperty(inside, "target", { value: state.dropdown });
    state.document.dispatchEvent(inside);
    assert.equal(state.dropdown.classList.contains("hidden"), false);
    state.controller.abort();
    assert.equal(state.dropdown.classList.contains("hidden"), true);
    state.toggle.dispatchEvent(new Event("mouseenter"));
    state.toggle.dispatchEvent(new Event("click"));
    assert.equal(state.dropdown.classList.contains("hidden"), true);
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
        /bindCompactNavigation\(root, \{[\s\S]*prepareNavigation\(topnav\)[\s\S]*sortNavigationEntries\(topnav\)/,
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
    assert.match(
        layoutSource,
        /import \{ bindAccountMenu, bindUserMenuIntegrity \}/,
    );
    assert.match(
        layoutSource,
        /if \(dropdown\) bindUserMenuIntegrity\(dropdown\)/,
    );
});

test("a tutorial start closes the account dropdown before session setup", async () => {
    const { uiCtx } = await import("../../reuse/ui-ctx.js");
    const state = accountMenuFixture();
    try {
        state.toggle.dispatchEvent(new Event("mouseenter"));
        assert.equal(state.menu.classList.contains("open"), true);
        await assert.rejects(
            uiCtx.runFlow("ui:tutorial:start", { id: "unavailable:guide" }),
            /tutorial_unavailable/,
        );
        assert.equal(state.dropdown.classList.contains("hidden"), true);
        assert.equal(state.toggle.getAttribute("aria-expanded"), "false");
        assert.equal(state.menu.classList.contains("open"), false);
    } finally {
        state.controller.abort();
    }
});

test("profile menu stays within the available visual viewport in short landscape screens", () => {
    const state = accountMenuFixture();
    const viewport = state.document.defaultView.visualViewport;
    viewport.height = 320;
    state.toggle.dispatchEvent(new Event("mouseenter"));
    assert.equal(
        state.dropdown.style.getPropertyValue("--dropdown-available-height"),
        "116px",
    );
    viewport.height = 240;
    viewport.offsetTop = 20;
    viewport.dispatchEvent(new Event("resize"));
    assert.equal(
        state.dropdown.style.getPropertyValue("--dropdown-available-height"),
        "56px",
    );
    state.toggle.getBoundingClientRect = () => ({ bottom: 100 });
    viewport.dispatchEvent(new Event("scroll"));
    assert.equal(
        state.dropdown.style.getPropertyValue("--dropdown-available-height"),
        "156px",
    );
    state.controller.abort();
    viewport.height = 800;
    viewport.dispatchEvent(new Event("resize"));
    assert.equal(
        state.dropdown.style.getPropertyValue("--dropdown-available-height"),
        "156px",
    );
});
