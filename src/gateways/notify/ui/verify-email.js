import {
    applyDocumentTitle,
    applyStaticTranslations,
    createI18n,
} from "/static/reuse/i18n.js";
import { registerServiceWorker } from "/static/reuse/pwa.js";

registerServiceWorker();

const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.verify_email");
applyStaticTranslations(i18n);

function readThemeCookie() {
    const match = document.cookie.match(/(?:^|; )cognis_theme=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}

function resolveTheme() {
    const stored = localStorage.getItem("cognis_theme") || readThemeCookie();
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme:dark)").matches
        ? "dark"
        : "light";
}

document.body.setAttribute("data-theme", resolveTheme());

const iconEl = document.querySelector("#verify-icon");
const titleEl = document.querySelector("#verify-title");
const bodyEl = document.querySelector("#verify-body");
const linkEl = document.querySelector("#verify-link");

function showResult(success) {
    if (success) {
        iconEl.textContent = "✓\uFE0E";
        titleEl.textContent = i18n.t("ui.app.verify_email.success_title");
        bodyEl.textContent = i18n.t("ui.app.verify_email.success_body");
    } else {
        iconEl.textContent = "✗\uFE0E";
        titleEl.textContent = i18n.t("ui.app.verify_email.invalid_title");
        bodyEl.textContent = i18n.t("ui.app.verify_email.invalid_body");
    }
    linkEl.style.display = "";
}

const token = new URLSearchParams(window.location.search).get("token") ?? "";

if (!token) {
    showResult(false);
} else {
    try {
        const res = await fetch("/api/v1/verify-email", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
        });
        showResult(res.ok);
    } catch {
        showResult(false);
    }
}
