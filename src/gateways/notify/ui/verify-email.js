import {
    applyDocumentTitle,
    applyStaticTranslations,
    createI18n,
} from "/static/reuse/i18n.js";
import { registerServiceWorker } from "/static/reuse/pwa.js";
import { applyTheme, getStoredTheme } from "/static/reuse/theme-toggle.js";

registerServiceWorker();

const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.verify_email");
applyStaticTranslations(i18n);

applyTheme(getStoredTheme());

const iconEl = document.querySelector("#verify-icon");
const titleEl = document.querySelector("#verify-title");
const bodyEl = document.querySelector("#verify-body");
const linkEl = document.querySelector("#verify-link");

function showResult(success) {
    if (success) {
        iconEl.textContent = "✓\uFE0E";
        iconEl.classList.add("verify-icon-success");
        titleEl.textContent = i18n.t("ui.app.verify_email.success_title");
        bodyEl.textContent = i18n.t("ui.app.verify_email.success_body");
    } else {
        iconEl.textContent = "✗\uFE0E";
        iconEl.classList.add("verify-icon-invalid");
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
        const res = await fetch("/api/v1/notify/verify-email", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
        });
        showResult(res.ok);
    } catch {
        showResult(false);
    }
}
