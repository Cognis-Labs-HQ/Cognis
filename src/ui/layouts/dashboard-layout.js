import { apiFetch } from "../reuse/api-client.js";
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
import { initRouter } from "../reuse/app-router.js";
import {
    capturePwaInstallPrompt,
    registerServiceWorker,
} from "../reuse/pwa.js";
import { ensureFullAccountSession } from "../reuse/auth-session.js";

capturePwaInstallPrompt();

function isAdminRole() {
    return localStorage.getItem("cognis_role") === "admin";
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
        const isActive = link.getAttribute("href") === currentPath;
        link.classList.toggle("active", isActive);
        if (isActive) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    });
}

/**
 * Reveals the Messages topnav entry only when the messages adapter is loaded
 * server-side. The adapter exposes `GET /api/v1/messages/ping` for this
 * detection — mirroring the pattern used by the profile navbar plugin to
 * gate its avatar provider.
 */
async function showMessagesNavIfAvailable(root) {
    const link = root.querySelector("[data-messages-link]");
    if (!link) return;
    try {
        const res = await apiFetch("/api/v1/messages/ping");
        if (res.ok) link.removeAttribute("hidden");
    } catch {
        // Adapter unavailable — link stays hidden.
    }
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
        localStorage.removeItem("cognis_access_token");
        localStorage.removeItem("cognis_account");
        localStorage.removeItem("cognis_display_name");
        localStorage.removeItem("cognis_role");
        localStorage.removeItem("cognis_is_founder");
        localStorage.removeItem("cognis_user_validation_mode");
        document.cookie = "cognis_access_token=; Path=/; Max-Age=0";
        try {
            await fetch("/api/v1/auth/logout", {
                method: "POST",
                credentials: "same-origin",
            });
        } catch {
            // Best-effort server-side revocation; navigate to login regardless.
        }
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

let _navbarPluginsLoaded = false;

async function loadNavbarPlugins() {
    if (_navbarPluginsLoaded) return;
    if (!localStorage.getItem("cognis_access_token")) return;
    try {
        const res = await apiFetch("/api/v1/ui/navbar-plugins");
        if (!res.ok) return;
        const payload = await res.json();
        const plugins = Array.isArray(payload.data) ? payload.data : [];
        await Promise.all(
            plugins.map((p) =>
                p?.scriptUrl ? import(p.scriptUrl).catch(() => {}) : null,
            ),
        );
        _navbarPluginsLoaded = true;
    } catch {
        // navbar plugin loading is best-effort; layout continues without them
    }
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
                const isActive =
                    link.getAttribute("href") === window.location.pathname;
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
    const hasFloatingToolbar = Boolean(slots.floatingToolbar);

    if (
        existingShell &&
        shellMatchesConfig(root, showTopbar, showNavbar, showFooter)
    ) {
        const pageCtxEl = existingShell.querySelector(".page-context");
        if (pageCtxEl) pageCtxEl.innerHTML = slots.pageContext || "";

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
        return;
    }

    const template = await loadTemplate("dashboard-layout");
    root.innerHTML = template
        .replace("{{pageContext}}", slots.pageContext || "")
        .replace("{{topbar}}", slots.topbar)
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
        await loadNavbarPlugins();
        updateNavbarAvatar().catch(() => {});
        applyActiveNavigation();
        applyCompactNav(root);
        showMessagesNavIfAvailable(root).catch(() => {});
        initRouter(root);
    }
    bindThemeToggle({ usePreferenceApi });
    registerServiceWorker();
}
