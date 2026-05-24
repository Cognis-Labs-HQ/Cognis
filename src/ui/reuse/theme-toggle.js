/**
 * Theme persistence and DOM application helpers.
 *
 * - persistTheme(mode)      — writes theme to localStorage + cookie.
 * - getStoredTheme()        — reads stored theme (localStorage → cookie fallback), returns 'dark' | 'light'.
 * - applyTheme(mode)        — updates data-theme on <body> and the theme-toggle button.
 * - bindThemeToggle(opts)   — applies the initial theme and wires the #theme-toggle click handler.
 *
 * Usage:
 *   import { bindThemeToggle } from '../reuse/theme-toggle.js';
 *   bindThemeToggle({ onThemeChange: async (mode) => savePrefs({ mode }) });
 */
const THEME_KEY = "cognis_theme";
const TOGGLE_HANDLER_KEY = "__cognisThemeToggleHandler";
const TOGGLE_OPTIONS_KEY = "__cognisThemeToggleOptions";

function readCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : "";
}

function writeThemeCookie(mode) {
    document.cookie = `${THEME_KEY}=${encodeURIComponent(mode)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function persistTheme(mode) {
    const normalized = mode === "light" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, normalized);
    writeThemeCookie(normalized);
}

export function getStoredTheme() {
    const localTheme = localStorage.getItem(THEME_KEY);
    if (localTheme === "dark" || localTheme === "light") return localTheme;

    const cookieTheme = readCookie(THEME_KEY);
    return cookieTheme === "light" ? "light" : "dark";
}

export function applyTheme(mode) {
    const normalized = mode === "light" ? "light" : "dark";
    document.body.setAttribute("data-theme", normalized);

    const shell = document.querySelector(".app-shell");
    if (shell) {
        shell.setAttribute("data-theme", normalized);
    }

    const toggle = document.querySelector("#theme-toggle");
    if (toggle) {
        toggle.dataset.mode = normalized;
        toggle.textContent = normalized === "dark" ? "🌙" : "☀️";
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.content = normalized === "light" ? "#f4f8ff" : "#0f172a";
    }
}

export function bindThemeToggle(options = {}) {
    const readInitialTheme =
        options.readInitialTheme || (() => getStoredTheme());
    const onThemeChange = options.onThemeChange || (async () => {});

    applyTheme(readInitialTheme());

    const toggle = document.querySelector("#theme-toggle");
    if (!toggle) return;
    toggle[TOGGLE_OPTIONS_KEY] = { onThemeChange };
    if (toggle[TOGGLE_HANDLER_KEY]) return;
    const handler = async () => {
        const next =
            document.body.getAttribute("data-theme") === "dark"
                ? "light"
                : "dark";
        applyTheme(next);
        localStorage.setItem(THEME_KEY, next);
        writeThemeCookie(next);
        await (toggle[TOGGLE_OPTIONS_KEY]?.onThemeChange ?? onThemeChange)(
            next,
        );
    };
    toggle[TOGGLE_HANDLER_KEY] = handler;
    toggle.addEventListener("click", handler);
}
