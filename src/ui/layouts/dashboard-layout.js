import { apiFetch } from "../reuse/api-client.js";
import { escapeHtml } from "../reuse/escape-html.js";
import { getInitialsText, pickInitialsColor } from "../reuse/avatar-utils.js";
import { loadTemplate } from "../reuse/template-loader.js";
import {
    bindThemeToggle as bindSharedThemeToggle,
    getStoredTheme,
} from "../reuse/theme-toggle.js";
import { applyStaticTranslations, createI18n } from "../reuse/i18n.js";
import {
    loadUiPreferences,
    applyUiPreferences,
    saveUiPreferences,
} from "../reuse/ui-preferences.js";
import { initRouter, navigateTo } from "../reuse/app-router.js";
import {
    capturePwaInstallPrompt,
    registerServiceWorker,
} from "../reuse/pwa.js";
import { ensureFullAccountSession } from "../reuse/auth-session.js";
import { createSearchBar } from "../reuse/search-bar.js";
import { bindProfilePreviews } from "../reuse/profile-preview.js";

capturePwaInstallPrompt();
const DASHBOARD_LAYOUT_TEMPLATE_PROMISE = loadTemplate("dashboard-layout");

function isAdminRole() {
    const role = localStorage.getItem("cognis_role");
    return role === "admin" || role === "owner";
}

function isTeacherRole() {
    const role = (localStorage.getItem("cognis_role") ?? "").trim();
    return role === "teacher";
}

function getDisplayName() {
    return (
        localStorage.getItem("cognis_display_name") ||
        localStorage.getItem("cognis_account") ||
        ""
    );
}

function applyActiveNavigation() {
    const currentPath = window.location.pathname;
    document.querySelectorAll(".topnav a").forEach((link) => {
        const isActive = isNavigationLinkActive(
            currentPath,
            link.getAttribute("href"),
        );
        link.classList.toggle("active", isActive);
        if (isActive) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    });
}

function isNavigationLinkActive(currentPath, href) {
    const normalizedHref = String(href ?? "").trim();
    if (!normalizedHref || normalizedHref === "#") return false;
    if (normalizedHref === "/") return currentPath === "/";
    return (
        currentPath === normalizedHref ||
        currentPath.startsWith(`${normalizedHref}/`)
    );
}

async function bindThemeToggle({ usePreferenceApi = true } = {}) {
    if (!usePreferenceApi) {
        bindSharedThemeToggle();
        return;
    }

    const prefs = await loadUiPreferences();
    applyUiPreferences(prefs);
    const storedMode = getStoredTheme();
    const initialMode = storedMode || prefs?.mode || "dark";
    if (prefs?.mode !== initialMode) {
        await saveUiPreferences({ mode: initialMode });
    }
    bindSharedThemeToggle({
        readInitialTheme: () => initialMode,
        onThemeChange: async (mode) => {
            await saveUiPreferences({ mode });
        },
    });
}

const PROFILE_MENU_CLOSE_DELAY_MS = 300;

function bindTopbarActions() {
    const toggle = document.querySelector("#profile-toggle");
    const dropdown = document.querySelector("#profile-dropdown");
    const logout = document.querySelector("#profile-logout");
    const nameEl = document.querySelector("#profile-name");

    if (nameEl) nameEl.textContent = getDisplayName();

    window.addEventListener("storage", (event) => {
        if (event.key === "cognis_display_name") {
            const nameElement = document.querySelector("#profile-name");
            if (nameElement) nameElement.textContent = getDisplayName();
        }
    });

    const profileMenu = document.querySelector(".profile-menu");
    const adminOnlyItems = document.querySelectorAll(".admin-only");

    adminOnlyItems.forEach((item) => {
        item.hidden = !isAdminRole();
    });

    const teacherOnlyItems = document.querySelectorAll(".teacher-only");
    const applyTeacherVisibility = () => {
        teacherOnlyItems.forEach((item) => {
            item.hidden = !isTeacherRole();
        });
    };
    applyTeacherVisibility();
    (async () => {
        try {
            const accountId = localStorage.getItem("cognis_account");
            const accessToken = localStorage.getItem("cognis_access_token");
            if (!accountId || !accessToken) return;
            const response = await fetch(
                `/api/v1/users/${encodeURIComponent(accountId)}/info`,
                {
                    headers: { authorization: `Bearer ${accessToken}` },
                },
            );
            if (!response.ok) return;
            const payload = await response.json().catch(() => null);
            const resolvedRole = String(payload?.data?.role ?? "").trim();
            if (!resolvedRole) return;
            localStorage.setItem("cognis_role", resolvedRole);
            applyTeacherVisibility();
        } catch {
            // Keep existing menu visibility when role refresh fails.
        }
    })();

    let closeTimeout = null;

    const openMenu = () => {
        if (closeTimeout) {
            clearTimeout(closeTimeout);
            closeTimeout = null;
        }
        dropdown?.classList.remove("hidden");
        profileMenu?.classList.add("open");
    };

    const closeMenu = () => {
        closeTimeout = setTimeout(() => {
            dropdown?.classList.add("hidden");
            profileMenu?.classList.remove("open");
            closeTimeout = null;
        }, PROFILE_MENU_CLOSE_DELAY_MS);
    };

    toggle?.addEventListener("mouseenter", openMenu);
    profileMenu?.addEventListener("mouseleave", closeMenu);

    document.addEventListener("click", (event) => {
        if (!profileMenu?.contains(event.target)) closeMenu();
    });

    document.addEventListener("focusin", (event) => {
        if (!profileMenu?.contains(event.target)) closeMenu();
    });

    logout?.addEventListener("click", async () => {
        const accessToken = localStorage.getItem("cognis_access_token");
        try {
            await fetch("/api/v1/auth/logout", {
                method: "POST",
                credentials: "same-origin",
                headers: accessToken
                    ? { Authorization: `Bearer ${accessToken}` }
                    : undefined,
            });
        } catch {
            // Best-effort server-side revocation; navigate to login regardless.
        }
        localStorage.removeItem("cognis_access_token");
        localStorage.removeItem("cognis_account");
        localStorage.removeItem("cognis_display_name");
        localStorage.removeItem("cognis_role");
        localStorage.removeItem("cognis_is_founder");
        localStorage.removeItem("cognis_user_validation_mode");
        document.cookie = "cognis_access_token=; Path=/; Max-Age=0";
        window.location.href = "/login";
    });
}

/**
 * Registered by gateway navbar plugins to supply avatar and profile-link
 * state. The function receives no arguments and returns a plain object with:
 *   - profileAvailable: boolean — whether to show the Profile nav link
 *   - avatarBlobUrl?: string   — a blob: URL for the avatar image, if one is
 *     available; the layout revokes the previous blob URL and renders this one
 *
 * Only one provider is active at a time; the most recently registered one
 * wins. Gateways register by calling `registerAvatarProvider` from their
 * navbar plugin module, which is loaded automatically by the dashboard layout.
 */
let _avatarProvider = null;

export function registerAvatarProvider(fn) {
    _avatarProvider = fn;
}

export async function updateNavbarAvatar() {
    const avatarBtn = document.querySelector(".avatar-button");
    const profileLink = document.querySelector("[data-profile-link]");
    if (!avatarBtn) return;
    const handle = localStorage.getItem("cognis_account") ?? "";

    const prevImg = avatarBtn.querySelector("img.avatar-image");
    const prevBlobSrc = prevImg?.src?.startsWith("blob:") ? prevImg.src : null;

    let profileAvailable = false;
    let avatarBlobUrl = null;

    if (_avatarProvider) {
        try {
            const result = await _avatarProvider();
            profileAvailable = result?.profileAvailable ?? false;
            avatarBlobUrl = result?.avatarBlobUrl ?? null;
        } catch {
            profileAvailable = false;
        }
    }

    if (profileLink) {
        profileLink.closest("li")?.toggleAttribute("hidden", !profileAvailable);
    }

    if (avatarBlobUrl) {
        const img = document.createElement("img");
        img.className = "avatar-image";
        img.alt = "";
        img.src = avatarBlobUrl;
        avatarBtn.replaceChildren(img);
        if (prevBlobSrc) URL.revokeObjectURL(prevBlobSrc);
        return;
    }

    if (prevBlobSrc) URL.revokeObjectURL(prevBlobSrc);
    const initialsEl = document.createElement("span");
    initialsEl.className = "avatar-initials";
    initialsEl.textContent = getInitialsText(handle);
    initialsEl.style.background = pickInitialsColor(handle);
    avatarBtn.replaceChildren(initialsEl);
}

let navbarPluginsLoaded = false;
let navbarPluginsLoadPromise = null;

async function loadNavbarPlugins() {
    if (navbarPluginsLoaded) return;
    if (navbarPluginsLoadPromise) return navbarPluginsLoadPromise;
    if (!localStorage.getItem("cognis_access_token")) return;
    navbarPluginsLoadPromise = (async () => {
        try {
            const res = await apiFetch("/api/v1/ui/navbar-plugins");
            if (!res.ok) return;
            const payload = await res.json();
            const plugins = Array.isArray(payload.data) ? payload.data : [];
            await Promise.all(
                plugins.map((plugin) =>
                    plugin?.scriptUrl
                        ? import(plugin.scriptUrl).catch(() => {})
                        : null,
                ),
            );
            navbarPluginsLoaded = true;
        } catch {
            // navbar plugin loading is best-effort; layout continues without them
        } finally {
            navbarPluginsLoadPromise = null;
        }
    })();
    return navbarPluginsLoadPromise;
}

window.addEventListener("cognis:navbar-plugins-refresh", () => {
    navbarPluginsLoaded = false;
    loadNavbarPlugins().catch(() => {});
});

function scheduleNavbarEnhancements() {
    const runEnhancements = () => {
        loadNavbarPlugins()
            .then(() => {
                updateNavbarAvatar().catch((error) => {
                    console.warn(
                        "[dashboard-layout]:navbar-avatar-refresh-failed",
                        error,
                    );
                });
                applyActiveNavigation();
                window.dispatchEvent(new Event("cognis:navbar-refresh"));
            })
            .catch((error) => {
                console.warn(
                    "[dashboard-layout]:navbar-plugin-refresh-failed",
                    error,
                );
            });
    };
    if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(runEnhancements);
        return;
    }
    setTimeout(runEnhancements, 0);
}

function applyCompactNav(root) {
    const navrow = root.querySelector(".global-navrow");
    const topnav = navrow?.querySelector(".topnav");
    const compactToggle = navrow?.querySelector("#nav-compact-toggle");
    const drawer = root.querySelector("#nav-drawer");
    const drawerClose = root.querySelector("#nav-drawer-close");
    const drawerNav = drawer?.querySelector(".nav-drawer-nav");
    const backdrop = root.querySelector("#nav-drawer-backdrop");
    if (!navrow || !topnav || !compactToggle || !drawer || !backdrop) return;

    if (navrow.dataset.compactNavBound === "true") return;
    navrow.dataset.compactNavBound = "true";

    let drawerOpen = false;

    function syncCompactState() {
        const overflows = topnav.scrollWidth > topnav.clientWidth + 2;
        navrow.classList.toggle("global-navrow--compact", overflows);
        compactToggle.hidden = !overflows;
        if (!overflows && drawerOpen) closeDrawer();
    }

    function openDrawer() {
        if (drawerOpen) return;
        drawerOpen = true;
        if (drawerNav) {
            drawerNav.innerHTML = topnav.innerHTML;
            drawerNav.querySelectorAll("a").forEach((link) => {
                const isActive = isNavigationLinkActive(
                    window.location.pathname,
                    link.getAttribute("href"),
                );
                link.classList.toggle("active", isActive);
                if (isActive) link.setAttribute("aria-current", "page");
                else link.removeAttribute("aria-current");
            });
        }
        drawer.classList.add("nav-drawer--open");
        drawer.setAttribute("aria-hidden", "false");
        compactToggle.setAttribute("aria-expanded", "true");
        backdrop.removeAttribute("hidden");
        (drawerNav?.querySelector("a") ?? drawerClose ?? compactToggle).focus();
    }

    function closeDrawer() {
        if (!drawerOpen) return;
        drawerOpen = false;
        drawer.classList.remove("nav-drawer--open");
        drawer.setAttribute("aria-hidden", "true");
        compactToggle.setAttribute("aria-expanded", "false");
        backdrop.setAttribute("hidden", "");
        compactToggle.focus();
    }

    compactToggle.addEventListener("click", () => {
        if (drawerOpen) closeDrawer();
        else openDrawer();
    });

    drawerClose?.addEventListener("click", closeDrawer);

    backdrop.addEventListener("click", closeDrawer);

    drawerNav?.addEventListener("click", (e) => {
        if (e.target.closest("a")) closeDrawer();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && drawerOpen) closeDrawer();
    });

    const resizeObserver = new ResizeObserver(syncCompactState);
    resizeObserver.observe(topnav);
    resizeObserver.observe(navrow);
    syncCompactState();
}

function syncHeaderScrollState(root) {
    const shell = root.querySelector(".app-shell");
    if (!shell) return;

    const hasSubNavigation = Boolean(shell.querySelector(".page-subnav"));
    const hasPrimaryNavigation = Boolean(shell.querySelector(".global-navrow"));
    const shouldPrioritizeSubnav =
        hasSubNavigation && hasPrimaryNavigation && window.scrollY > 12;

    shell.classList.toggle("app-shell--has-subnav", hasSubNavigation);
    shell.classList.toggle(
        "app-shell--subnav-priority",
        shouldPrioritizeSubnav,
    );
}

function bindHeaderScrollState(root) {
    if (root.dataset.headerScrollStateBound === "true") {
        syncHeaderScrollState(root);
        return;
    }

    root.dataset.headerScrollStateBound = "true";
    const syncState = () => syncHeaderScrollState(root);

    window.addEventListener("scroll", syncState, { passive: true });
    window.addEventListener("resize", syncState);
    syncState();
}

function shellMatchesConfig(root, showTopbar, showNavbar, showFooter) {
    const hasTopbar = Boolean(root.querySelector(".global-topbar"));
    const hasNavrow = Boolean(root.querySelector(".global-navrow"));
    const hasFooter = Boolean(root.querySelector(".global-footer"));
    return (
        hasTopbar === showTopbar &&
        hasNavrow === showNavbar &&
        hasFooter === showFooter
    );
}

export async function renderDashboardLayout(root, slots = {}) {
    const {
        showTopbar = true,
        showNavbar = true,
        showThemeToggle = true,
        showFooter = true,
        usePreferenceApi = showTopbar || showNavbar,
    } = slots;

    if ((showTopbar || showNavbar) && !(await ensureFullAccountSession())) {
        await new Promise(() => {});
    }

    const i18n = slots.i18n || (await createI18n());

    const existingShell = root.querySelector(".app-shell");
    const hasToolbar = Boolean(slots.toolbar);
    const hasSubNavigation = Boolean(slots.subNavigation);
    const hasFloatingToolbar = Boolean(slots.floatingToolbar);

    if (
        existingShell &&
        shellMatchesConfig(root, showTopbar, showNavbar, showFooter)
    ) {
        const pageCtxEl = existingShell.querySelector(".page-context");
        if (pageCtxEl) pageCtxEl.innerHTML = slots.pageContext || "";
        const existingSubNavEl = existingShell.querySelector(".page-subnav");
        if (hasSubNavigation) {
            if (existingSubNavEl) {
                existingSubNavEl.innerHTML = slots.subNavigation;
            } else {
                const navRow = existingShell.querySelector(".global-navrow");
                const newSubNavEl = document.createElement("section");
                newSubNavEl.className = "page-subnav";
                newSubNavEl.innerHTML = slots.subNavigation;
                navRow
                    ? navRow.after(newSubNavEl)
                    : existingShell
                          .querySelector(".site-header")
                          ?.append(newSubNavEl);
            }
        } else if (existingSubNavEl) {
            existingSubNavEl.remove();
        }

        const mainWindow = existingShell.querySelector(".main-window");
        if (mainWindow) {
            mainWindow.className = `main-window ${
                hasToolbar
                    ? "main-window--with-toolbar"
                    : "main-window--content-only"
            }`;
            mainWindow.innerHTML =
                (hasToolbar
                    ? `<aside class="toolbar">${slots.toolbar}</aside>`
                    : "") +
                `<section class="content-grid">${slots.content || ""}</section>` +
                (hasFloatingToolbar
                    ? `<div class="floating-toolbar" hidden>${slots.floatingToolbar}</div>`
                    : "");
        }

        if (!showThemeToggle) {
            existingShell.querySelector("#theme-toggle")?.remove();
        }
        applyStaticTranslations(
            i18n,
            existingShell.querySelector(".main-window") ?? existingShell,
        );
        applyActiveNavigation();
        if (showTopbar || showNavbar) {
            updateNavbarAvatar().catch((error) => {
                console.warn(
                    "[dashboard-layout]:initial-navbar-avatar-render-failed",
                    error,
                );
            });
            scheduleNavbarEnhancements();
            initSearchBar(i18n);
            bindProfilePreviews(i18n);
        }
        bindHeaderScrollState(root);
        return;
    }

    const template = await DASHBOARD_LAYOUT_TEMPLATE_PROMISE;
    root.innerHTML = template
        .replace("{{pageContext}}", slots.pageContext || "")
        .replace("{{topbar}}", slots.topbar)
        .replace(
            "{{subNavigation}}",
            hasSubNavigation
                ? `<section class="page-subnav">${slots.subNavigation}</section>`
                : "",
        )
        .replace(
            "{{workspaceClass}}",
            hasToolbar
                ? "main-window--with-toolbar"
                : "main-window--content-only",
        )
        .replace("{{content}}", slots.content)
        .replace(
            "{{toolbar}}",
            hasToolbar ? `<aside class="toolbar">${slots.toolbar}</aside>` : "",
        )
        .replace(
            "{{floatingToolbar}}",
            hasFloatingToolbar
                ? `<div class="floating-toolbar" hidden>${slots.floatingToolbar}</div>`
                : "",
        );

    if (!showTopbar) root.querySelector(".global-topbar")?.remove();
    if (!showNavbar) root.querySelector(".global-navrow")?.remove();
    if (!showThemeToggle) root.querySelector("#theme-toggle")?.remove();
    if (!showFooter) root.querySelector(".global-footer")?.remove();

    applyStaticTranslations(i18n, root);
    if (showTopbar || showNavbar) {
        bindTopbarActions();
        updateNavbarAvatar().catch((error) => {
            console.warn(
                "[dashboard-layout]:initial-navbar-avatar-render-failed",
                error,
            );
        });
        scheduleNavbarEnhancements();
        applyActiveNavigation();
        applyCompactNav(root);
        initRouter(root);
        initSearchBar(i18n);
        bindProfilePreviews(i18n);
    }
    bindHeaderScrollState(root);
    bindThemeToggle({ usePreferenceApi });
    registerServiceWorker();
}

const SEARCH_BAR_CSS = "/static/styles/reuse/search-bar.css";

function injectSearchBarStyles() {
    if (document.querySelector(`link[href="${SEARCH_BAR_CSS}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = SEARCH_BAR_CSS;
    document.head.appendChild(link);
}

function initSearchBar(i18n) {
    const wrap = document.getElementById("global-search-wrap");
    if (!wrap || wrap.dataset.searchBarBound === "true") return;
    wrap.dataset.searchBarBound = "true";
    injectSearchBarStyles();

    const navigationSearchGroup = {
        category: i18n.t("ui.reuse.navigation"),
        items: [
            {
                id: "page-dashboard",
                label: i18n.t("ui.reuse.dashboard"),
                url: "/dashboard",
            },
            {
                id: "page-messages",
                label: i18n.t("ui.reuse.messages"),
                url: "/messages",
            },
            {
                id: "page-settings",
                label: i18n.t("ui.reuse.settings"),
                url: "/settings",
            },
            {
                id: "page-docs",
                label: i18n.t("ui.reuse.docs"),
                url: "/docs",
            },
            ...(globalThis.__studyGatewayAvailable
                ? [
                      {
                          id: "page-study",
                          label: i18n.t("ui.reuse.study"),
                          url: "/study",
                      },
                  ]
                : []),
            ...(isTeacherRole()
                ? [
                      {
                          id: "page-classes",
                          label: i18n.t("ui.reuse.classes"),
                          url: "/classes",
                      },
                  ]
                : []),
            ...(isAdminRole()
                ? [
                      {
                          id: "page-administration",
                          label: i18n.t("ui.reuse.administration"),
                          url: "/administration",
                      },
                      {
                          id: "page-users",
                          label: i18n.t("ui.reuse.users"),
                          url: "/users",
                      },
                      {
                          id: "page-modules",
                          label: i18n.t("ui.reuse.modules"),
                          url: "/modules",
                      },
                  ]
                : []),
        ],
    };

    const settingsLocalSearchGroup = {
        category:
            i18n.t("ui.reuse.administration") +
            " / " +
            i18n.t("ui.app.settings.preferences"),
        items: [
            {
                id: "settings-general",
                label: i18n.t("ui.app.settings.general"),
                url: "/settings",
            },
            {
                id: "settings-language",
                label: i18n.t("ui.reuse.language"),
                url: "/settings#language",
            },
            ...(globalThis.__studyGatewayAvailable
                ? [
                      {
                          id: "settings-study",
                          label: i18n.t("ui.reuse.study"),
                          url: "/study",
                      },
                  ]
                : []),
        ],
    };

    const bar = createSearchBar({
        endpoint: "/api/v1/search",
        ariaLabel: i18n.t("ui.layout.search.aria"),
        noResultsText: i18n.t("ui.layout.search.no_results"),
        localGroups: [navigationSearchGroup, settingsLocalSearchGroup],
        onSelect: (result) => {
            if (result?.handle) {
                navigateTo(`/profile/${encodeURIComponent(result.handle)}`);
            } else if (result?.url) {
                navigateTo(result.url);
            }
        },
    });
    wrap.appendChild(bar);
}
