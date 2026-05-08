import { createPageComposer } from "../../reuse/page-composer.js";
import { createI18n, applyDocumentTitle } from "../../reuse/i18n.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { showToast } from "../../reuse/toast.js";
import { bindThemeToggle } from "../../reuse/theme-toggle.js";

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
        messageHtml = `<p class="login-intro-copy">${escapeHtml(i18n.t(messageKey))}</p>`;
    } else {
        const invitedText =
            inviteData && isInviteFlow
                ? i18n
                      .t("ui.app.register.invited_you")
                      .replace("{inviter}", inviteData.inviterDisplayName)
                : "";
        const emailValue =
            isInviteFlow && inviteData ? inviteData.inviteeEmail : "";
        const emailReadonly = isInviteFlow ? "readonly" : "";
        const emailHint = isInviteFlow
            ? `<p class="security-field-hint">${escapeHtml(i18n.t("ui.app.register.email_locked_hint"))}</p>`
            : "";
        formHtml = `
      ${invitedText ? `<p class="login-intro-copy">${escapeHtml(invitedText)}</p>` : ""}
      <form id="register-form" class="stack login-form">
        <label>
          <span>${escapeHtml(i18n.t("ui.app.register.email"))}</span>
          <input name="email" type="email" value="${escapeHtml(emailValue)}" ${emailReadonly} required />
        </label>
        ${emailHint}
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

    return `
    <section class="auth-page auth-page--login-frame">
      <div class="login-layout">
        <aside class="panel login-intro" aria-label="${escapeHtml(i18n.t("ui.app.login.intro.aria"))}">
          <div class="login-brandline">
            <img src="/static/assets/icons/cognis-icon.png" alt="" class="login-icon" />
            <div>
              <h1 class="login-title">${escapeHtml(i18n.t("ui.shared.brand.name"))}</h1>
              <p class="login-typing">${escapeHtml(i18n.t("ui.app.login.hero.tagline"))}</p>
            </div>
          </div>
          <p class="login-intro-copy">${escapeHtml(i18n.t("ui.app.register.page_subtitle"))}</p>
        </aside>
        <main class="panel login-panel" aria-label="${escapeHtml(i18n.t("ui.app.register.form_title"))}">
          <h2 class="login-heading">${escapeHtml(i18n.t("ui.app.register.form_title"))}</h2>
          ${messageHtml}
          ${formHtml}
        </main>
      </div>
    </section>
  `;
}

const composer = createPageComposer(root, {
    allowCustomization: false,
    i18n,
    preferenceKey: "register-layout",
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
                                    .catch(() => null);
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
