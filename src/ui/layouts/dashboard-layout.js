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
const NAV_COMPACT_BREAKPOINT_PX = 900;

function bindGlobalNavOverlay(i18n) {
    const navRow = document.querySelector(".global-navrow");
    const topnav = navRow?.querySelector(".topnav");
    if (!(navRow instanceof HTMLElement) || !(topnav instanceof HTMLElement)) {
        return;
    }

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "global-nav-toggle";
    toggle.setAttribute("aria-controls", "global-side-nav");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", i18n.t("ui.layout.nav.primary"));
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "☰";
    toggle.appendChild(icon);
    navRow.prepend(toggle);
    topnav.id = "global-side-nav";

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "global-nav-backdrop";
    backdrop.setAttribute("aria-label", i18n.t("ui.reuse.generic.dismiss"));
    navRow.insertAdjacentElement("afterend", backdrop);

    const closeMenu = () => {
        navRow.classList.remove("global-navrow--menu-open");
        backdrop.classList.remove("global-nav-backdrop--visible");
        toggle.setAttribute("aria-expanded", "false");
    };

    const openMenu = () => {
        navRow.classList.add("global-navrow--menu-open");
        backdrop.classList.add("global-nav-backdrop--visible");
        toggle.setAttribute("aria-expanded", "true");
    };

    toggle.addEventListener("click", () => {
        if (navRow.classList.contains("global-navrow--menu-open")) {
            closeMenu();
            return;
        }
        openMenu();
    });

    backdrop.addEventListener("click", closeMenu);

    topnav.querySelectorAll("a[href]").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
    });

    function checkOverflowInExpandedLayout() {
        const hadCompactClass = navRow.classList.contains(
            "global-navrow--compact",
        );
        if (hadCompactClass) navRow.classList.remove("global-navrow--compact");
        const hasOverflow = topnav.scrollWidth > topnav.clientWidth + 1;
        if (hadCompactClass) navRow.classList.add("global-navrow--compact");
        return hasOverflow;
    }

    function syncNavMode() {
        const isSmallViewport = window.matchMedia(
            `(max-width: ${NAV_COMPACT_BREAKPOINT_PX}px)`,
        ).matches;
        const shouldCompact =
            isSmallViewport || checkOverflowInExpandedLayout();
        navRow.classList.toggle("global-navrow--compact", shouldCompact);
        toggle.hidden = !shouldCompact;
        if (!shouldCompact) closeMenu();
    }

    new ResizeObserver(syncNavMode).observe(navRow);
    window.addEventListener("resize", syncNavMode);
    syncNavMode();
}

function bindTopbarActions() {
    const toggle = document.querySelector("#profile-toggle");
    const dropdown = document.querySelector("#profile-dropdown");
    const logout = document.querySelector("#profile-logout");
    const nameEl = document.querySelector("#profile-name");

    if (nameEl) nameEl.textContent = getDisplayName();

    window.addEventListener("storage", (event) => {
        if (event.key === "cognis_display_name") {
            const el = document.querySelector("#profile-name");
            if (el) el.textContent = getDisplayName();
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
    toggle?.addEventListener("click", (event) => {
        event.stopPropagation();
        if (profileMenu?.classList.contains("open")) {
            dropdown?.classList.add("hidden");
            profileMenu?.classList.remove("open");
            return;
        }
        openMenu();
    });
    profileMenu?.addEventListener("mouseleave", closeMenu);

    document.addEventListener("click", (event) => {
        if (!profileMenu?.contains(event.target)) closeMenu();
    });

    document.addEventListener("focusin", (event) => {
        if (!profileMenu?.contains(event.target)) closeMenu();
    });

    logout?.addEventListener("click", () => {
        localStorage.removeItem("cognis_token");
        localStorage.removeItem("cognis_account");
        localStorage.removeItem("cognis_display_name");
        localStorage.removeItem("cognis_role");
        localStorage.removeItem("cognis_is_founder");
        localStorage.removeItem("cognis_user_validation_mode");
        document.cookie = "cognis_token=; Path=/; Max-Age=0";
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

async function loadNavbarPlugins() {
    if (!localStorage.getItem("cognis_token")) return;
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
    } catch {
        // navbar plugin loading is best-effort; layout continues without them
    }
}

export async function renderDashboardLayout(root, slots = {}) {
    const {
        showTopbar = true,
        showNavbar = true,
        showThemeToggle = true,
        showFooter = true,
        usePreferenceApi = showTopbar || showNavbar,
    } = slots;
    const i18n = slots.i18n || (await createI18n());
    const template = await loadTemplate("dashboard-layout");
    const hasToolbar = Boolean(slots.toolbar);
    const hasFloatingToolbar = Boolean(slots.floatingToolbar);
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
        if (showNavbar) bindGlobalNavOverlay(i18n);
    }
    bindThemeToggle({ usePreferenceApi });
}
