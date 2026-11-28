import {
    applyDocumentTitle,
    applyStaticTranslations,
    createI18n,
} from "/static/reuse/i18n.js";
import { beginPageLoading } from "/static/reuse/page-entry.js";
import { registerServiceWorker } from "/static/reuse/pwa.js";
import { applyTheme, getStoredTheme } from "/static/reuse/theme-toggle.js";

registerServiceWorker();
applyTheme(getStoredTheme());

const finishPageLoading = beginPageLoading();

try {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.verify_email");
    applyStaticTranslations(i18n);

    const iconElement = document.querySelector("#verify-icon");
    const titleElement = document.querySelector("#verify-title");
    const bodyElement = document.querySelector("#verify-body");
    const linkElement = document.querySelector("#verify-link");

    function showResult(success) {
        if (success) {
            iconElement.textContent = "✓\uFE0E";
            iconElement.classList.add("verify-icon-success");
            titleElement.textContent = i18n.t(
                "ui.app.verify_email.success_title",
            );
            bodyElement.textContent = i18n.t(
                "ui.app.verify_email.success_body",
            );
        } else {
            iconElement.textContent = "✗\uFE0E";
            iconElement.classList.add("verify-icon-invalid");
            titleElement.textContent = i18n.t(
                "ui.app.verify_email.invalid_title",
            );
            bodyElement.textContent = i18n.t(
                "ui.app.verify_email.invalid_body",
            );
        }
        linkElement.style.display = "";
    }

    const token =
        new URLSearchParams(window.location.search).get("token") ?? "";
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
            // Use the invalid-result fallback on the next line.
            showResult(false);
        }
    }
} finally {
    finishPageLoading();
}
