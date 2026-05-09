import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";

const root = document.querySelector("#app");
const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.verify_email");

const token = new URLSearchParams(window.location.search).get("token") ?? "";

let verifyResult = null;

if (!token) {
    verifyResult = false;
} else {
    try {
        const res = await fetch("/api/v1/verify-email", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
        });
        verifyResult = res.ok;
    } catch {
        verifyResult = false;
    }
}

function renderVerifyCard() {
    const icon =
        verifyResult === null
            ? "⏳\uFE0E"
            : verifyResult
              ? "✓\uFE0E"
              : "✗\uFE0E";
    const title =
        verifyResult === null
            ? i18n.t("ui.app.verify_email.verifying")
            : verifyResult
              ? i18n.t("ui.app.verify_email.success_title")
              : i18n.t("ui.app.verify_email.invalid_title");
    const body =
        verifyResult === null
            ? ""
            : verifyResult
              ? i18n.t("ui.app.verify_email.success_body")
              : i18n.t("ui.app.verify_email.invalid_body");
    const linkHidden = verifyResult === null ? " hidden" : "";
    return `
      <div class="verify-card">
        <div class="verify-icon">${icon}</div>
        <h1 class="verify-title">${title}</h1>
        <p class="verify-body">${body}</p>
        <a href="/dashboard" class="verify-link"${linkHidden}>
          ${i18n.t("ui.app.verify_email.return_link")}
        </a>
      </div>
    `;
}

const composer = createPageComposer(root, {
    allowCustomization: false,
    i18n,
    preferenceKey: "verify-email-layout",
    showTopbar: false,
    showNavbar: false,
    showFooter: false,
    showThemeToggle: true,
    frameless: true,
    persistLayoutPreferences: false,
    toolbar: [],
    elements: [
        {
            id: "verify-result",
            label: i18n.t("ui.page.title.verify_email"),
            pinned: true,
            gridSize: { default: [6, 4], min: [4, 3], max: "full" },
            render: renderVerifyCard,
        },
    ],
});

await composer.init();
