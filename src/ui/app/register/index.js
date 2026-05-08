import { createPageComposer } from "../../reuse/page-composer.js";
import { createI18n, applyDocumentTitle } from "../../reuse/i18n.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { showToast } from "../../reuse/toast.js";
import { bindThemeToggle } from "../../reuse/theme-toggle.js";
import {
    renderAuthBrandline,
    renderAuthLayout,
} from "../../reuse/auth-layout.js";

const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.register");

const root = document.querySelector("#app");
const params = new URLSearchParams(window.location.search);
const token = params.get("token") ?? "";
const prefilledEmail = String(params.get("email") ?? "")
    .trim()
    .toLowerCase();
const knownErrorCodes = new Set([
    "invalid_token",
    "username_taken",
    "username_and_password_required",
    "inviter_not_found",
    "generic",
]);

let inviteData = null;
let openRegistrationsEnabled = false;

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
} else {
    try {
        const response = await fetch("/api/v1/auth/registration-config");
        if (response.ok) {
            const payload = await response.json();
            openRegistrationsEnabled =
                payload?.data?.registrationsEnabled === true;
        }
    } catch {
        openRegistrationsEnabled = false;
    }
}

function renderRegisterShell() {
    const isInviteFlow = Boolean(token);
    const canRenderForm = isInviteFlow
        ? Boolean(inviteData)
        : openRegistrationsEnabled;

    let formHtml = "";
    let messageHtml = "";

    if (!canRenderForm) {
        const messageKey = isInviteFlow
            ? "ui.app.register.invalid_token"
            : "ui.app.register.closed";
        messageHtml = `<p class="auth-intro-copy">${escapeHtml(i18n.t(messageKey))}</p>`;
    } else {
        const invitedText =
            inviteData && isInviteFlow
                ? i18n
                      .t("ui.app.register.invited_you")
                      .replace("{inviter}", inviteData.inviterDisplayName)
                : "";
        const inviteEmail =
            isInviteFlow && inviteData ? inviteData.inviteeEmail : "";
        const lockedEmail = inviteEmail || prefilledEmail;
        const emailValue = lockedEmail || "";
        const emailLocked = Boolean(lockedEmail);
        const emailReadonly = emailLocked ? "disabled" : "";
        const emailLockedClass = emailLocked ? " auth-input--locked" : "";
        formHtml = `
      ${invitedText ? `<p class="auth-intro-copy">${escapeHtml(invitedText)}</p>` : ""}
      <form id="register-form" class="stack auth-form">
        <label>
          <span>${escapeHtml(i18n.t("ui.app.register.email"))}</span>
          <input name="email" type="email" value="${escapeHtml(emailValue)}" ${emailReadonly} class="${emailLockedClass.trim()}" required />
        </label>
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
    }

    const brandlineHtml = renderAuthBrandline(
        i18n.t("ui.shared.brand.name"),
        i18n.t("ui.app.login.hero.tagline"),
    );
    const introPanelHtml = `
      ${brandlineHtml}
      <p class="auth-intro-copy">${escapeHtml(i18n.t("ui.app.register.page_subtitle"))}</p>
    `;
    const formPanelHtml = `
      <h2 class="auth-heading">${escapeHtml(i18n.t("ui.app.register.form_title"))}</h2>
      ${messageHtml}
      ${formHtml}
    `;
    return renderAuthLayout({
        introPanelAriaLabel: i18n.t("ui.app.login.intro.aria"),
        introPanelHtml,
        formPanelAriaLabel: i18n.t("ui.app.register.form_title"),
        formPanelHtml,
    });
}

const composer = createPageComposer(root, {
    allowCustomization: false,
    i18n,
    preferenceKey: "register-layout-v2",
    showTopbar: false,
    showNavbar: false,
    showFooter: false,
    showThemeToggle: true,
    toolbar: [],
    elements: [
        {
            id: "register-shell",
            label: i18n.t("ui.app.register.form_title"),
            pinned: true,
            gridSize: { default: [12, 8], min: [8, 6], max: "full" },
            render: () => renderRegisterShell(),
            onRender: () => {
                const form = root.querySelector("#register-form");
                if (!(form instanceof HTMLFormElement)) return;
                form.addEventListener("submit", async (event) => {
                    event.preventDefault();
                    const email = String(form.email.value ?? "")
                        .trim()
                        .toLowerCase();
                    const username = String(form.username.value ?? "").trim();
                    const displayName = String(
                        form.displayName.value ?? "",
                    ).trim();
                    const password = String(form.password.value ?? "");
                    try {
                        if (token) {
                            const response = await fetch(
                                "/api/v1/registration/redeem",
                                {
                                    method: "POST",
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        token,
                                        username,
                                        displayName,
                                        password,
                                    }),
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
                        } else {
                            const response = await fetch(
                                "/api/v1/auth/register",
                                {
                                    method: "POST",
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        username,
                                        password,
                                        email,
                                    }),
                                },
                            );
                            if (!response.ok) {
                                const body = await response
                                    .json()
                                    .catch((error) => {
                                        console.warn(
                                            JSON.stringify({
                                                level: "warn",
                                                component: "register-page",
                                                message: "register_parse_error",
                                                error:
                                                    error instanceof Error
                                                        ? error.message
                                                        : String(error),
                                            }),
                                        );
                                        return null;
                                    });
                                const code = String(
                                    body?.error?.code ?? "register_failed",
                                );
                                const message =
                                    code === "registrations_disabled"
                                        ? i18n.t("ui.app.register.closed")
                                        : i18n.t(
                                              "ui.app.register.error.generic",
                                          );
                                showToast(message, { variant: "error" });
                                return;
                            }
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
bindThemeToggle();
