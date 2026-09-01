import { apiFetch } from "../reuse/api-client.js";
import { escapeHtml } from "../reuse/escape-html.js";
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
import {
    applyTimeFormatToLocalStorage,
    applyTimezoneToLocalStorage,
} from "../reuse/timestamp.js";
import { maybeShowReleaseChangelogPopup } from "./release-changelog/popup.js";
import { initRouter, navigateTo } from "../reuse/app-router.js";
import {
    capturePwaInstallPrompt,
    registerServiceWorker,
} from "../reuse/pwa.js";
import { ensureFullAccountSession } from "../reuse/auth-session.js";
import { createSearchBar } from "../reuse/search-util/popup.js";
import { highlightSearchTarget } from "../reuse/search-util/indexing.js";
import { uiCtx } from "../reuse/ui-ctx.js";
import { showToast } from "../reuse/toast.js";
import { bindLanguageToggle } from "../reuse/language-toggle.js";
import { bindUserMenuIntegrity } from "./user-menu.js";
import {
    ensureNavbarPluginsLoaded as loadNavbarPlugins,
    ensureUiProvidersLoaded,
    invalidateNavbarPlugins,
    invalidateUiProviders,
} from "../reuse/ui-provider-loader.js";

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

function updateDisplayedName(displayName = getDisplayName()) {
    const nameElement = document.querySelector("#profile-name");
    if (nameElement) nameElement.textContent = displayName;
}

function storeProfileDisplayName(displayName) {
    const normalizedName = String(displayName ?? "").trim();
    if (!normalizedName) return;
    localStorage.setItem("cognis_display_name", normalizedName);
    updateDisplayedName(normalizedName);
}

async function refreshDisplayNameFromProfile() {
    if (!localStorage.getItem("cognis_access_token")) return;
    const profileEndpoint =
        uiCtx.capabilities.get("session:isGuest")?.() === true
            ? "/api/v1/share/guest-profile"
            : "/api/v1/social/profile";
    try {
        const response = await apiFetch(profileEndpoint);
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        storeProfileDisplayName(payload?.data?.displayName);
    } catch {
        // Keep the login-provided name when profile refresh is unavailable.
    }
}

function applyActiveNavigation() {
    const currentPath = window.location.pathname;
    document
        .querySelectorAll(
            ".topnav a, .nav-drawer-nav a, .user-dropdown-content a",
        )
        .forEach((link) => {
            const isActive = isNavigationLinkActive(
                currentPath,
                link.getAttribute("href"),
            );
            link.classList.toggle("active", isActive);
            if (isActive) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
}

function navigationEntryLabel(entry) {
    return (
        entry.textContent.trim() ||
        entry.dataset.i18n ||
        entry.getAttribute("href") ||
        ""
    );
}

function navigationEntryRank(entry) {
    return entry.getAttribute("href") === "/dashboard" ? 0 : 1;
}

function sortNavigationEntries(topnav) {
    const entries = Array.from(topnav.children).filter((entry) =>
        entry.matches("a"),
    );
    const collator = new Intl.Collator(
        document.documentElement.lang || undefined,
        {
            numeric: true,
            sensitivity: "base",
        },
    );
    const sortedEntries = [...entries].sort((left, right) => {
        const rankDifference =
            navigationEntryRank(left) - navigationEntryRank(right);
        return (
            rankDifference ||
            collator.compare(
                navigationEntryLabel(left),
                navigationEntryLabel(right),
            )
        );
    });
    if (entries.every((entry, index) => entry === sortedEntries[index])) return;
    topnav.append(...sortedEntries);
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
    applyTimezoneToLocalStorage(
        prefs?.timezone ?? null,
        prefs?.detectedTimezone ?? null,
    );
    applyTimeFormatToLocalStorage(prefs?.timeFormat ?? "auto");
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

function bindSwitcherSettingsLinks(root) {
    root.querySelector("#theme-toggle")?.addEventListener(
        "contextmenu",
        (event) => {
            event.preventDefault();
            navigateTo("/settings#appearance");
        },
    );
}

function bindTopbarActions() {
    const toggle = document.querySelector("#profile-toggle");
    const dropdown = document.querySelector("#profile-dropdown");
    const logout = document.querySelector("#profile-logout");
    const nameEl = document.querySelector("#profile-name");

    if (dropdown) bindUserMenuIntegrity(dropdown);

    if (nameEl) nameEl.textContent = getDisplayName();
    refreshDisplayNameFromProfile().catch(() => {});

    window.addEventListener("storage", (event) => {
        if (event.key === "cognis_display_name") {
            updateDisplayedName();
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

    const openMenu = () => {
        dropdown?.classList.remove("hidden");
        profileMenu?.classList.add("open");
        toggle?.classList.add("active");
        toggle?.setAttribute("aria-expanded", "true");
    };

    const closeMenu = () => {
        dropdown?.classList.add("hidden");
        profileMenu?.classList.remove("open");
        toggle?.classList.remove("active");
        toggle?.setAttribute("aria-expanded", "false");
    };

    toggle?.setAttribute("aria-expanded", "false");
    toggle?.addEventListener("mouseenter", openMenu);
    toggle?.addEventListener("click", (event) => {
        event.stopPropagation();
        openMenu();
    });

    document.addEventListener("click", (event) => {
        if (!profileMenu?.contains(event.target)) closeMenu();
    });

    logout?.addEventListener("click", async () => {
        const accessToken = localStorage.getItem("cognis_access_token");
        try {
            await fetch("/api/v1/auth/logout", {
                method: "POST",
                credentials: "same-origin",
                ...(accessToken
                    ? { headers: { Authorization: `Bearer ${accessToken}` } }
                    : {}),
            });
        } catch {
            // Best-effort server-side revocation; navigate to login regardless.
        }
        await uiCtx.capabilities.get("keyring:lock")?.();
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
 * Refreshes the navbar avatar through the optional profile-owned CTX provider.
 * The existing image remains mounted while navbar plugins are still loading so
 * SPA page composition cannot temporarily erase a resolved profile avatar.
 */
export async function updateNavbarAvatar() {
    const avatarBtn = document.querySelector(".avatar-button");
    const profileLink = document.querySelector("[data-profile-link]");
    if (!avatarBtn) return;
    const handle = localStorage.getItem("cognis_account") ?? "";

    const availabilityIndicator = avatarBtn.querySelector(
        ".availability-indicator",
    );

    let profileAvailable = false;
    let avatarBlobUrl = null;
    let avatarInitials = "?";
    let avatarColor = null;
    const avatarProvider = uiCtx.capabilities.get("ui:navbarAvatarProvider");

    if (!avatarProvider && avatarBtn.querySelector(".avatar-image")) return;

    if (avatarProvider) {
        try {
            const result = await avatarProvider();
            profileAvailable = result?.profileAvailable ?? false;
            avatarBlobUrl = result?.avatarBlobUrl ?? null;
            avatarInitials = result?.avatarInitials ?? avatarInitials;
            avatarColor = result?.avatarColor ?? avatarColor;
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
        if (availabilityIndicator) avatarBtn.append(availabilityIndicator);
        return;
    }

    const initialsEl = document.createElement("span");
    initialsEl.className = "avatar-initials";
    initialsEl.textContent = avatarInitials;
    if (avatarColor) initialsEl.style.background = avatarColor;
    avatarBtn.replaceChildren(initialsEl);
    if (availabilityIndicator) avatarBtn.append(availabilityIndicator);
}

let releaseChangelogPopupChecked = false;

export async function ensureNavbarPluginsLoaded() {
    await ensureUiProvidersLoaded();
    return loadNavbarPlugins();
}

function completeDeferredLoginSetup() {
    return ensureNavbarPluginsLoaded().then(() => {
        const hasDeferredKeyringSetup = uiCtx.capabilities.get(
            "keyring:hasDeferredSetup",
        );
        return hasDeferredKeyringSetup?.()
            ? uiCtx.runFlow("complete-login", {})
            : undefined;
    });
}

function scheduleDeferredLoginSetup(i18n) {
    requestAnimationFrame(() => {
        completeDeferredLoginSetup().catch((error) => {
            console.error(
                "[dashboard-layout]:deferred-login-setup-failed",
                error,
            );
            showToast(i18n.t("ui.reuse.error"), { variant: "error" });
        });
    });
}

window.addEventListener("cognis:navbar-plugins-refresh", () => {
    invalidateUiProviders();
    invalidateNavbarPlugins();
    ensureNavbarPluginsLoaded().catch(() => {});
});

function scheduleNavbarEnhancements() {
    const runEnhancements = () => {
        ensureNavbarPluginsLoaded()
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

function ensureReleaseChangelogPopupChecked(i18n) {
    if (
        releaseChangelogPopupChecked ||
        uiCtx.capabilities.get("session:isGuest")?.() === true
    )
        return;
    releaseChangelogPopupChecked = true;
    maybeShowReleaseChangelogPopup(i18n).catch(() => {});
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

    function redrawNavigation() {
        sortNavigationEntries(topnav);
        if (drawerNav) {
            drawerNav.innerHTML = topnav.innerHTML;
            applyActiveNavigation();
        }
        syncCompactState();
    }

    function syncCompactState() {
        const overflows = topnav.scrollWidth > topnav.clientWidth + 2;
        navrow.classList.toggle("global-navrow--compact", overflows);
        compactToggle.hidden = !overflows;
        if (!overflows && drawerOpen) closeDrawer();
    }

    function openDrawer() {
        if (drawerOpen) return;
        drawerOpen = true;
        redrawNavigation();
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
    const navigationObserver = new MutationObserver(redrawNavigation);
    navigationObserver.observe(topnav, { childList: true });
    redrawNavigation();
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
    const componentWindow = Boolean(root.closest?.(".component-page-window"));
    if (componentWindow) {
        slots = {
            ...slots,
            showTopbar: false,
            showNavbar: false,
            showThemeToggle: false,
            showFooter: false,
            usePreferenceApi: false,
            requireAccountSession: false,
            enableAccountEnhancements: false,
        };
    }
    const {
        showTopbar = true,
        showNavbar = true,
        showThemeToggle = true,
        showFooter = true,
        usePreferenceApi = showTopbar || showNavbar,
        // Pages that manage their own auth/session flow (e.g. the Share
        // gateway's anonymous-guest landing page) can render the topbar
        // chrome without a full account session. For those pages,
        // `ensureFullAccountSession()` legitimately resolves to `false` with
        // no redirect in flight (e.g. an expired/invalid share token), so
        // this must not fall into the "redirect is coming" hang below.
        requireAccountSession = showTopbar || showNavbar,
        enableAccountEnhancements = true,
    } = slots;

    if (requireAccountSession && !(await ensureFullAccountSession())) {
        await new Promise(() => {});
    }

    const i18n = slots.i18n || (await createI18n());
    const template = await DASHBOARD_LAYOUT_TEMPLATE_PROMISE;

    const existingShell = root.querySelector(".app-shell");
    const hasToolbar = Boolean(slots.toolbar);
    const hasSubNavigation = Boolean(slots.subNavigation);
    const hasFloatingToolbar = Boolean(slots.floatingToolbar);

    if (
        existingShell &&
        shellMatchesConfig(root, showTopbar, showNavbar, showFooter)
    ) {
        const templateContent = document.createElement("template");
        templateContent.innerHTML = template;
        const freshActionDock = templateContent.content.querySelector(
            "[data-page-action-dock]",
        );
        const existingActionDock = existingShell.querySelector(
            "[data-page-action-dock]",
        );
        if (freshActionDock && existingActionDock) {
            existingActionDock.replaceWith(freshActionDock);
        }
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
                `<section class="content-grid">${slots.content || ""}</section>`;
        }

        if (hasFloatingToolbar) {
            const footerElement = existingShell.querySelector(".global-footer");
            const existingToolbar =
                existingShell.querySelector(".floating-toolbar");
            const toolbarElement =
                existingToolbar ?? document.createElement("div");
            if (!existingToolbar) {
                toolbarElement.className = "floating-toolbar";
            }
            toolbarElement.hidden = true;
            toolbarElement.innerHTML = slots.floatingToolbar;
            if (footerElement) {
                const needsPlacementBeforeFooter =
                    toolbarElement.parentElement !== existingShell ||
                    toolbarElement.nextElementSibling !== footerElement;
                if (needsPlacementBeforeFooter) {
                    footerElement.before(toolbarElement);
                }
            } else if (toolbarElement.parentElement !== existingShell) {
                existingShell.append(toolbarElement);
            }
        } else {
            existingShell.querySelector(".floating-toolbar")?.remove();
        }

        const existingThemeToggle =
            existingShell.querySelector("#theme-toggle");
        if (!showThemeToggle) {
            existingThemeToggle?.remove();
        } else {
            existingThemeToggle?.removeAttribute("hidden");
        }
        applyStaticTranslations(
            i18n,
            existingShell.querySelector(".main-window") ?? existingShell,
        );
        applyActiveNavigation();
        if (
            enableAccountEnhancements &&
            (showTopbar || showNavbar) &&
            uiCtx.capabilities.get("session:isGuest")?.() !== true
        ) {
            updateNavbarAvatar().catch((error) => {
                console.warn(
                    "[dashboard-layout]:initial-navbar-avatar-render-failed",
                    error,
                );
            });
            scheduleNavbarEnhancements();
            scheduleDeferredLoginSetup(i18n);
            initSearchBar(i18n);
            ensureReleaseChangelogPopupChecked(i18n);
        }
        bindHeaderScrollState(root);
        if (!componentWindow) {
            bindThemeToggle({ usePreferenceApi });
            bindLanguageToggle({ i18n, navigateTo, showToast });
            bindSwitcherSettingsLinks(root);
        }
        return;
    }

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
    if (
        enableAccountEnhancements &&
        (showTopbar || showNavbar) &&
        uiCtx.capabilities.get("session:isGuest")?.() !== true
    ) {
        bindTopbarActions();
        updateNavbarAvatar().catch((error) => {
            console.warn(
                "[dashboard-layout]:initial-navbar-avatar-render-failed",
                error,
            );
        });
        scheduleNavbarEnhancements();
        scheduleDeferredLoginSetup(i18n);
        applyActiveNavigation();
        applyCompactNav(root);
        initRouter(root);
        initSearchBar(i18n);
        ensureReleaseChangelogPopupChecked(i18n);
    }
    bindHeaderScrollState(root);
    if (!componentWindow) {
        bindThemeToggle({ usePreferenceApi });
        bindLanguageToggle({ i18n, navigateTo, showToast });
        bindSwitcherSettingsLinks(root);
    }
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
        category: "Pages",
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
                id: "page-profile",
                label: i18n.t("ui.reuse.profile"),
                url: "/profile",
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
                          label: `${i18n.t("ui.reuse.administration")} → ${i18n.t("ui.reuse.modules")}`,
                          url: "/administration/modules",
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
        onSelect: async (result) => {
            if (result?.handle) {
                await navigateTo(
                    `/profile/${encodeURIComponent(result.handle)}`,
                );
            } else if (result?.url) {
                await navigateTo(result.url);
            }
            requestAnimationFrame(() => highlightSearchTarget(result));
        },
    });
    wrap.appendChild(bar);
}
