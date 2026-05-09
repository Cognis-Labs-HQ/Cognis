import { renderInPageCallout } from "../../reuse/in-page-callout.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { apiFetch } from "../../reuse/api-client.js";
import { openPopup } from "../../reuse/popup.js";
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
import { checkIsAuthenticated } from "../../reuse/auth-session.js";
import { syncTimezoneOnLogin } from "../../reuse/timestamp.js";

const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.login");

if (await checkIsAuthenticated()) {
    const accountId = localStorage.getItem("cognis_account");
    if (
        accountId &&
        localStorage.getItem("cognis_user_validation_mode") === "smtp"
    ) {
        const emailsRes = await apiFetch(
            `/api/v1/users/${encodeURIComponent(accountId)}/emails`,
        );
        if (emailsRes.ok) {
            const emailPayload = await emailsRes.json();
            const emails = Array.isArray(emailPayload?.data)
                ? emailPayload.data
                : [];
            const hasVerifiedPrimary = emails.some(
                (entry) => entry.primary && entry.verified,
            );
            if (!hasVerifiedPrimary) {
                await enforceRequiredEmailSetup(accountId);
            }
        }
    }
    window.location.replace("/dashboard");
    await new Promise(() => {});
}

const root = document.querySelector("#app");
const typingSamples = await loadAuthTypingSamples(i18n);
const loginReason = new URL(window.location.href).searchParams.get("reason");
let loginReasonToastShown = false;

let publicRegistrationEnabled = false;
try {
    const regConfigRes = await fetch("/api/v1/auth/registration-config");
    if (regConfigRes.ok) {
        const regConfigPayload = await regConfigRes.json();
        publicRegistrationEnabled =
            regConfigPayload?.data?.registrationsEnabled === true;
    }
} catch {
    publicRegistrationEnabled = false;
}

function renderLoginReasonToast() {
    if (loginReasonToastShown) return;
    const keyByReason = {
        session_expired: "ui.app.login.reason.session_expired",
        account_disabled: "ui.app.login.reason.account_disabled",
        account_deleted: "ui.app.login.reason.account_deleted",
    };
    const reasonKey = keyByReason[loginReason];
    if (!reasonKey) return;
    loginReasonToastShown = true;
    showToast(i18n.t(reasonKey), {
        variant: "error",
        permanent: true,
    });
}

async function loadLoginMethods() {
    try {
        const res = await fetch("/api/v1/auth/login-methods");
        if (!res.ok) return;
        const body = await res.json();
        const methods = body.data ?? [];

        const providerInput = document.querySelector("#login-provider");
        const toggleContainer = document.querySelector("#auth-provider-toggle");
        const ssoContainer = document.querySelector("#sso-buttons");

        const credentialProviders = methods.filter(
            (m) => m.id === "local" || m.id === "ldap",
        );
        const ssoProviders = methods.filter(
            (m) => m.id !== "local" && m.id !== "ldap",
        );

        if (credentialProviders.length > 1 && toggleContainer) {
            toggleContainer.hidden = false;
            toggleContainer.setAttribute(
                "aria-label",
                i18n.t("ui.app.login.provider.toggle.aria"),
            );
            credentialProviders.forEach((method) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.textContent =
                    i18n.t(`ui.app.login.provider.${method.id}`) || method.name;
                btn.className = "auth-provider-btn";
                btn.addEventListener("click", () => {
                    if (providerInput) providerInput.value = method.id;
                    toggleContainer
                        .querySelectorAll(".auth-provider-btn")
                        .forEach((b) => {
                            b.classList.toggle(
                                "auth-provider-btn--active",
                                b === btn,
                            );
                        });
                });
                if (method.id === "local") {
                    btn.classList.add("auth-provider-btn--active");
                }
                toggleContainer.appendChild(btn);
            });
        }

        if (ssoProviders.length > 0 && ssoContainer) {
            ssoProviders.forEach((method) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "btn-animated sso-login-btn";
                btn.textContent = i18n
                    .t("ui.app.login.sso.login_with")
                    .replace("{provider}", method.name);
                btn.addEventListener("click", async () => {
                    if (providerInput) providerInput.value = method.id;
                    document.querySelector("#login-form")?.requestSubmit();
                });
                ssoContainer.appendChild(btn);
            });
        }
    } catch {
        // Login methods unavailable — form works with local auth by default
    }
}

async function loadUserEmails(accountId) {
    const response = await apiFetch(
        `/api/v1/users/${encodeURIComponent(accountId)}/emails`,
    );
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}

async function promptRequiredEmailAddress() {
    let inputEl = null;
    const action = await openPopup({
        title: i18n.t("ui.app.settings.emails_add"),
        body: () => `
      <label class="stack">
        <span>${i18n.t("ui.app.users.invite_email")}</span>
        <input id="required-email-input" type="email" placeholder="${i18n.t("ui.app.settings.emails_add_placeholder")}" />
      </label>
    `,
        actions: [
            {
                id: "confirm",
                label: i18n.t("ui.reuse.generic.confirm"),
                variant: "confirm",
            },
        ],
        onOpen: (overlay) => {
            inputEl = overlay.querySelector("#required-email-input");
        },
    });
    if (action !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
        return null;
    }
    return inputEl.value.trim().toLowerCase();
}

async function promptVerificationCode(emailAddress) {
    let inputEl = null;
    const action = await openPopup({
        title: i18n.t("ui.app.settings.emails_verify_title"),
        body: `
      <p>${escapeHtml(i18n.t("ui.app.settings.emails_verify_prompt").replace("{email}", emailAddress))}</p>
      <label class="stack">
        <span>${i18n.t("ui.app.settings.emails_verify_submit")}</span>
        <input id="required-email-code-input" type="text" inputmode="numeric" maxlength="6" />
      </label>
    `,
        actions: [
            {
                id: "confirm",
                label: i18n.t("ui.app.settings.emails_verify_submit"),
                variant: "confirm",
            },
        ],
        onOpen: (overlay) => {
            inputEl = overlay.querySelector("#required-email-code-input");
        },
    });
    if (action !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
        return null;
    }
    return inputEl.value.trim();
}

async function verifyRequiredEmailLoop(accountId, emailAddress) {
    while (true) {
        const code = await promptVerificationCode(emailAddress);
        if (!code) continue;
        const verifyResponse = await apiFetch(
            `/api/v1/users/${encodeURIComponent(accountId)}/emails/${encodeURIComponent(emailAddress)}/verify`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ code }),
            },
        );
        if (verifyResponse.ok) return;
        if (verifyResponse.status === 422) {
            showToast(i18n.t("ui.app.settings.emails_verify_invalid"), {
                variant: "error",
            });
            continue;
        }
        showToast(i18n.t("ui.app.settings.emails_verify_failed"), {
            variant: "error",
        });
    }
}

async function enforceRequiredEmailSetup(accountId) {
    while (true) {
        const emails = await loadUserEmails(accountId);
        const hasVerifiedPrimary = emails.some(
            (entry) => entry.primary && entry.verified,
        );
        if (hasVerifiedPrimary) return;

        const emailAddress = await promptRequiredEmailAddress();
        if (!emailAddress) continue;

        const addResponse = await apiFetch(
            `/api/v1/users/${encodeURIComponent(accountId)}/emails`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email: emailAddress }),
            },
        );
        if (!addResponse.ok) {
            let code = "add_failed";
            try {
                const payload = await addResponse.json();
                code = String(payload?.error?.code ?? code);
            } catch {
                // parse/network error while reading error JSON; keep default add_failed code
            }
            if (code === "email_taken") {
                showToast(i18n.t("ui.app.settings.emails_email_taken"), {
                    variant: "error",
                });
            } else if (code === "rate_limited") {
                showToast(
                    i18n.t("ui.app.settings.emails_verify_rate_limited"),
                    {
                        variant: "error",
                    },
                );
            } else if (code === "smtp_unavailable") {
                showToast(i18n.t("ui.app.settings.emails_verify_unavailable"), {
                    variant: "error",
                });
            } else {
                showToast(i18n.t("ui.app.settings.emails_add_failed"), {
                    variant: "error",
                });
            }
            continue;
        }

        await verifyRequiredEmailLoop(accountId, emailAddress);
    }
}

function renderLoginShell() {
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
    const signupCalloutHtml = publicRegistrationEnabled
        ? renderInPageCallout({
              variant: "info",
              title: i18n.t("ui.app.login.not_registered.title"),
              body: i18n.t("ui.app.login.not_registered.body"),
          }).replace(
              "</section>",
              `<a href="/register" class="in-page-callout__link">${escapeHtml(i18n.t("ui.app.login.not_registered.link"))}</a></section>`,
          )
        : "";
    const signupCompactHtml = publicRegistrationEnabled
        ? `<p class="auth-compact-register">ℹ️ <a href="/register">${escapeHtml(i18n.t("ui.app.login.not_registered.hint"))}</a></p>`
        : "";
    const formPanelHtml = `
      <h2 class="auth-heading">${escapeHtml(i18n.t("ui.app.login.title"))}</h2>
      <form id="login-form" class="stack auth-form" method="POST">
        <input type="hidden" id="login-provider" value="local" />
        <label>
          <span>${escapeHtml(i18n.t("ui.app.login.form.username"))}</span>
          <input id="login-username" autocomplete="username" placeholder="${escapeHtml(i18n.t("ui.app.login.form.username"))}" required />
        </label>
        <label>
          <span>${escapeHtml(i18n.t("ui.app.login.form.password"))}</span>
          <input id="login-password" type="password" autocomplete="current-password" placeholder="${escapeHtml(i18n.t("ui.app.login.form.password"))}" required />
        </label>
        <div id="auth-provider-toggle" class="auth-provider-toggle" hidden></div>
        <div class="auth-signup-callout">${signupCalloutHtml}</div>
        ${signupCompactHtml}
        <button type="submit">${escapeHtml(i18n.t("ui.app.login.form.submit"))}</button>
      </form>
      <div id="sso-buttons" class="sso-buttons"></div>
    `;
    return renderAuthLayout({
        introPanelAriaLabel: i18n.t("ui.app.login.intro.aria"),
        introPanelHtml,
        formPanelAriaLabel: i18n.t("ui.app.login.title"),
        formPanelHtml,
    });
}

function bindLoginForm() {
    document
        .querySelector("#login-form")
        ?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const form = event.target;
            const usernameEl = form.querySelector("#login-username");
            const passwordEl = form.querySelector("#login-password");
            const providerEl = form.querySelector("#login-provider");
            const payload = {
                username: usernameEl?.value ?? "",
                password: passwordEl?.value ?? "",
                provider: providerEl?.value ?? "local",
            };
            const response = await fetch("/api/v1/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await response.json().catch(() => null);
            if (response.ok && body?.data) {
                localStorage.setItem("cognis_token", body.data.token);
                localStorage.setItem("cognis_account", body.data.accountId);
                localStorage.setItem(
                    "cognis_display_name",
                    body.data.displayName || body.data.accountId,
                );
                localStorage.setItem(
                    "cognis_role",
                    body.data.role || "user",
                );
                localStorage.setItem(
                    "cognis_is_founder",
                    body.data.isFounder ? "true" : "false",
                );
                localStorage.setItem(
                    "cognis_login_time",
                    new Date().toISOString(),
                );
                localStorage.setItem(
                    "cognis_user_validation_mode",
                    body.data.userValidationMode || "none",
                );
                const requiresUserValidation =
                    body.data.requiredUserValidation === true &&
                    body.data.userValidationMode === "smtp";
                if (requiresUserValidation) {
                    await enforceRequiredEmailSetup(body.data.accountId);
                }
                await syncTimezoneOnLogin(body.data.accountId);
                window.location.href = "/dashboard";
                return;
            }
            const errorMsg =
                body?.error?.message ||
                i18n.t("ui.app.login.error.generic");
            showToast(errorMsg, { variant: "error" });
        });
}

const composer = createPageComposer(root, {
    allowCustomization: false,
    i18n,
    preferenceKey: "login-layout",
    showTopbar: false,
    showNavbar: false,
    showFooter: false,
    showThemeToggle: true,
    frameless: true,
    persistLayoutPreferences: false,
    toolbar: [],
    elements: [
        {
            id: "login-shell",
            label: i18n.t("ui.app.login.title"),
            pinned: true,
            gridSize: { default: [12, 5], min: [8, 4], max: "full" },
            render: () => renderLoginShell(),
            onRender: () => {
                loadLoginMethods();
                runTypingShowcase(typingSamples);
                renderLoginReasonToast();
                bindLoginForm();
            },
        },
    ],
});

await composer.init();
