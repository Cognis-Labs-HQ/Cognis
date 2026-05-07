import { createPageComposer } from "../../reuse/page-composer.js";
import { createI18n, applyDocumentTitle } from "../../reuse/i18n.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { showToast } from "../../reuse/toast.js";

const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.register");

const root = document.querySelector("#app");
const token = new URLSearchParams(window.location.search).get("token") ?? "";
const knownErrorCodes = new Set([
    "invalid_token",
    "username_taken",
    "username_and_password_required",
    "inviter_not_found",
    "generic",
]);

let inviteData = null;

if (token) {
    try {
        const response = await fetch(
            `/api/v1/registration/invite?token=${encodeURIComponent(token)}`,
        );
        if (response.ok) {
            const payload = await response.json();
            inviteData = payload.data ?? null;
        }
    } catch {
        inviteData = null;
    }
}

const composer = createPageComposer(root, {
    allowCustomization: false,
    i18n,
    preferenceKey: "register-layout",
    pageContext: {
        title: i18n.t("ui.app.register.page_title"),
        subtitle: i18n.t("ui.app.register.page_subtitle"),
    },
    toolbar: [],
    elements: [
        {
            id: "register-invite",
            label: i18n.t("ui.app.register.form_title"),
            pinned: true,
            render: () => {
                if (!inviteData) {
                    return `<p>${escapeHtml(i18n.t("ui.app.register.invalid_token"))}</p>`;
                }
                const invitedText = i18n
                    .t("ui.app.register.invited_you")
                    .replace("{inviter}", inviteData.inviterDisplayName);
                return `
          <p>${escapeHtml(invitedText)}</p>
          <p>${escapeHtml(i18n.t("ui.app.register.invitee_email"))}: ${escapeHtml(inviteData.inviteeEmail)}</p>
          <form id="register-form" class="stack">
            <label>
              <span>${escapeHtml(i18n.t("ui.app.register.username"))}</span>
              <input name="username" required />
            </label>
            <label>
              <span>${escapeHtml(i18n.t("ui.app.register.display_name"))}</span>
              <input name="displayName" />
            </label>
            <label>
              <span>${escapeHtml(i18n.t("ui.app.register.password"))}</span>
              <input name="password" type="password" required />
            </label>
            <button type="submit" class="btn-confirm btn-animated">${escapeHtml(i18n.t("ui.app.register.submit"))}</button>
          </form>
        `;
            },
            onRender: () => {
                const form = root.querySelector("#register-form");
                if (!(form instanceof HTMLFormElement)) return;
                form.addEventListener("submit", async (event) => {
                    event.preventDefault();
                    const payload = {
                        token,
                        username: form.username.value,
                        displayName: form.displayName.value,
                        password: form.password.value,
                    };
                    try {
                        const response = await fetch(
                            "/api/v1/registration/redeem",
                            {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify(payload),
                            },
                        );
                        const body = await response.json();
                        if (!response.ok) {
                            const errorCode = String(
                                body?.error?.code ?? "generic",
                            );
                            const i18nCode = knownErrorCodes.has(errorCode)
                                ? errorCode
                                : "generic";
                            showToast(
                                i18n.t(`ui.app.register.error.${i18nCode}`),
                                { variant: "error" },
                            );
                            return;
                        }
                        showToast(i18n.t("ui.app.register.success"), {
                            variant: "success",
                        });
                        window.setTimeout(() => {
                            window.location.href = "/login";
                        }, 1200);
                    } catch {
                        showToast(i18n.t("ui.app.register.error.generic"), {
                            variant: "error",
                        });
                    }
                });
            },
        },
    ],
});

await composer.init();
