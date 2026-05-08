import { createPageComposer } from "../../reuse/page-composer.js";
import { createI18n, applyDocumentTitle } from "../../reuse/i18n.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { showToast } from "../../reuse/toast.js";
import {
    loadAuthTypingSamples,
    runTypingShowcase,
} from "../../reuse/auth-typing.js";
import {
    renderAuthBrandline,
    renderAuthLayout,
} from "../../reuse/auth-layout.js";

const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.register");

const root = document.querySelector("#app");
const params = new URLSearchParams(window.location.search);
const tokenParam = params.get("token");
const token = String(tokenParam ?? "").trim();
const hasTokenParam = tokenParam !== null;
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
let tokenInvalid = false;
let openRegistrationsEnabled = false;
let invalidTokenToastToken = null;

if (token) {
    try {
        const response = await fetch(
            `/api/v1/registration/invite?token=${encodeURIComponent(token)}`,
        );
        if (response.ok) {
            const payload = await response.json();
            inviteData = payload.data ?? null;
        } else {
            tokenInvalid = true;
        }
    } catch {
        inviteData = null;
        tokenInvalid = true;
    }
} else if (hasTokenParam) {
    tokenInvalid = true;
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
const typingSamples = await loadAuthTypingSamples(i18n);

function formatCountdown(msRemaining) {
    if (msRemaining <= 0) return "00:00:00";
    const totalSeconds = Math.ceil(msRemaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
        .map((n) => String(n).padStart(2, "0"))
        .join(":");
}

function renderRegisterShell() {
    const isInviteFlow = Boolean(token);
    const isInvalid = isInviteFlow && tokenInvalid;
    const canRenderForm = isInviteFlow
        ? Boolean(inviteData) || isInvalid
        : openRegistrationsEnabled;
    const formDisabled = isInvalid;

    let formHtml = "";
    let messageHtml = "";

    if (!canRenderForm) {
        const messageKey = "ui.app.register.closed";
        messageHtml = `<p class="auth-intro">${escapeHtml(i18n.t(messageKey))}</p>`;
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
        const emailReadonly = emailLocked || formDisabled ? "disabled" : "";
        const emailLockedClass = emailLocked ? " auth-input--locked" : "";
        const disabledAttr = formDisabled ? "disabled" : "";
        const countdownHtml = inviteData?.expiresAt
            ? `<p id="register-countdown" class="auth-intro" style="font-size:1rem;margin-top:4px"></p>`
            : "";
        formHtml = `
      ${invitedText ? `<p class="auth-intro">${escapeHtml(invitedText)}</p>` : ""}
      ${countdownHtml}
      <div class="auth-form-shell${formDisabled ? " auth-form-shell--disabled" : ""}">
        <form id="register-form" class="stack auth-form">
          <label>
            <span>${escapeHtml(i18n.t("ui.app.register.email"))}</span>
            <input name="email" type="email" value="${escapeHtml(emailValue)}" ${emailReadonly} class="${emailLockedClass.trim()}" required />
          </label>
          <label>
            <span>${escapeHtml(i18n.t("ui.app.register.username"))}</span>
            <input name="username" required ${disabledAttr} />
          </label>
          <label>
            <span>${escapeHtml(i18n.t("ui.app.register.display_name"))}</span>
            <input name="displayName" ${disabledAttr} />
          </label>
          <label>
            <span>${escapeHtml(i18n.t("ui.app.register.password"))}</span>
            <input name="password" type="password" required ${disabledAttr} />
          </label>
          <button type="submit" class="btn-confirm btn-animated" ${disabledAttr}>${escapeHtml(i18n.t("ui.app.register.submit"))}</button>
        </form>
      </div>
    `;
    }

    const brandlineHtml = renderAuthBrandline(
        i18n.t("ui.shared.brand.name"),
        i18n.t("ui.app.login.hero.tagline"),
    );
    const introPanelHtml = `
      ${brandlineHtml}
      <p class="auth-intro">${escapeHtml(i18n.t("ui.app.login.hero.subtitle"))}</p>
      <div class="cognis-ad-frame" aria-live="polite">
        <span id="typing-text"></span><span class="typing-cursor" aria-hidden="true">_</span>
      </div>
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
    preferenceKey: "register-layout",
    showTopbar: false,
    showNavbar: false,
    showFooter: false,
    showThemeToggle: true,
    frameless: true,
    persistLayoutPreferences: false,
    toolbar: [],
    elements: [
        {
            id: "register-shell",
            label: i18n.t("ui.app.register.form_title"),
            pinned: true,
            gridSize: { default: [12, 8], min: [8, 6], max: "full" },
            render: () => renderRegisterShell(),
            onRender: () => {
                runTypingShowcase(typingSamples);

                if (tokenInvalid && invalidTokenToastToken !== token) {
                    invalidTokenToastToken = token;
                    showToast(i18n.t("ui.app.register.error.invalid_token"), {
                        variant: "error",
                        permanent: true,
                    });
                }

                if (inviteData?.expiresAt) {
                    const expiresAtMs = new Date(
                        inviteData.expiresAt,
                    ).getTime();
                    let countdownTimer = null;
                    function updateCountdown() {
                        const el = root.querySelector("#register-countdown");
                        if (!el) {
                            clearInterval(countdownTimer);
                            return;
                        }
                        const remaining = expiresAtMs - Date.now();
                        if (remaining <= 0) {
                            el.textContent = i18n.t(
                                "ui.app.register.token_expired",
                            );
                            clearInterval(countdownTimer);
                            return;
                        }
                        el.textContent = i18n
                            .t("ui.app.register.token_expires_in")
                            .replace("{countdown}", formatCountdown(remaining));
                    }
                    updateCountdown();
                    countdownTimer = setInterval(updateCountdown, 1000);
                }

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
