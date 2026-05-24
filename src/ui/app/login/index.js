import { renderInPageCallout } from "../../reuse/in-page-callout.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/init.js";
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
import { syncTimezoneOnLogin } from "../../reuse/timestamp.js";

/**
 * Mounts the login page into the provided root element.
 *
 * @param {HTMLElement} root - Target app container.
 * @returns {Promise<void>} Resolves when the page has finished initialising.
 */
export async function mount(root) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.login");
    let currentTfaLoginAttemptId = null;

    const typingSamples = await loadAuthTypingSamples(i18n);
    const loginReason = new URL(window.location.href).searchParams.get(
        "reason",
    );
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

    function resolveTranslatedMessage(key) {
        if (typeof key !== "string" || !key.trim()) {
            return null;
        }
        const translated = i18n.t(key);
        if (translated && translated !== key) {
            return translated;
        }
        return null;
    }

    function resolveTfaLoginErrorMessage(message) {
        const normalizedMessage = String(message ?? "").trim();
        const messageKeyByCode = {
            invalid_totp_code: "ui.app.login.tfa.error_invalid",
            invalid_recovery_code: "ui.app.login.tfa.error_invalid",
            code_required: "ui.app.login.tfa.error_invalid",
            recovery_code_required: "ui.app.login.tfa.error_invalid",
            method_not_configured: "ui.app.login.tfa.error_invalid",
            tfa_method_unavailable: "ui.app.login.tfa.error_invalid",
        };
        const mappedMessage = resolveTranslatedMessage(
            messageKeyByCode[normalizedMessage],
        );
        if (mappedMessage) {
            return mappedMessage;
        }
        return (
            resolveTranslatedMessage(normalizedMessage) ||
            i18n.t("ui.app.login.tfa.error_invalid")
        );
    }

    async function loadLoginMethods() {
        try {
            const res = await fetch("/api/v1/auth/login-methods");
            if (!res.ok) return;
            const body = await res.json();
            const methods = body.data ?? [];

            const providerInput = document.querySelector("#login-provider");
            const toggleContainer = document.querySelector(
                "#auth-provider-toggle",
            );
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
                        i18n.t(`ui.app.login.provider.${method.id}`) ||
                        method.name;
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
        <span>${i18n.t("ui.reuse.invite_email")}</span>
        <input id="required-email-input" type="email" placeholder="${i18n.t("ui.app.settings.emails_add_placeholder")}" />
      </label>
    `,
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("ui.reuse.confirm"),
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
                    showToast(
                        i18n.t("ui.app.settings.emails_verify_unavailable"),
                        {
                            variant: "error",
                        },
                    );
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

    function persistSession(data) {
        localStorage.setItem("cognis_access_token", data.token);
        localStorage.setItem("cognis_account", data.accountId);
        localStorage.setItem(
            "cognis_display_name",
            data.displayName || data.accountId,
        );
        localStorage.setItem("cognis_role", data.role || "user");
        localStorage.setItem(
            "cognis_is_founder",
            data.isFounder ? "true" : "false",
        );
        localStorage.setItem("cognis_login_time", new Date().toISOString());
        localStorage.setItem(
            "cognis_user_validation_mode",
            data.userValidationMode || "none",
        );
    }

    function setActiveTfaMethodHeading(activeMethodName) {
        const headingEl = document.querySelector("#login-tfa-code-label");
        if (!(headingEl instanceof HTMLElement)) {
            return;
        }
        const defaultLabel = i18n.t("ui.app.login.tfa.code_label");
        if (typeof activeMethodName !== "string" || !activeMethodName.trim()) {
            headingEl.textContent = defaultLabel;
            return;
        }
        headingEl.textContent = i18n
            .t("ui.app.login.tfa.code_label_for_method")
            .replace("{method}", activeMethodName);
    }

    function renderTfaMethodTabs(methods) {
        const tabsEl = document.querySelector("#login-tfa-method-nav");
        const methodInput = document.querySelector("#login-tfa-method");
        if (
            !(tabsEl instanceof HTMLElement) ||
            !(methodInput instanceof HTMLInputElement)
        ) {
            return;
        }
        tabsEl.replaceChildren();
        const normalizedMethods = Array.isArray(methods) ? methods : [];
        normalizedMethods.forEach((method, index) => {
            const tabLink = document.createElement("a");
            tabLink.href = "#";
            tabLink.textContent = method.name;
            tabLink.addEventListener("click", (event) => {
                event.preventDefault();
                methodInput.value = method.id;
                tabsEl.querySelectorAll("a").forEach((entry) => {
                    entry.classList.toggle("active", entry === tabLink);
                });
                setActiveTfaMethodHeading(method.name);
            });
            if (index === 0) {
                tabLink.classList.add("active");
                methodInput.value = method.id;
                setActiveTfaMethodHeading(method.name);
            }
            tabsEl.appendChild(tabLink);
        });
        tabsEl.hidden = normalizedMethods.length <= 1;
    }

    function switchToTfaPrompt(payload) {
        const credentialFields = document.querySelector(
            "#login-credential-fields",
        );
        const tfaFields = document.querySelector("#login-tfa-fields");
        const usernameInput = document.querySelector("#login-username");
        const passwordInput = document.querySelector("#login-password");
        const tfaCodeInput = document.querySelector("#login-tfa-code");
        if (
            !(credentialFields instanceof HTMLElement) ||
            !(tfaFields instanceof HTMLElement)
        ) {
            return;
        }
        currentTfaLoginAttemptId = payload.loginAttemptId;
        credentialFields.hidden = true;
        tfaFields.hidden = false;
        if (usernameInput instanceof HTMLInputElement) {
            usernameInput.required = false;
            usernameInput.disabled = true;
        }
        if (passwordInput instanceof HTMLInputElement) {
            passwordInput.required = false;
            passwordInput.disabled = true;
        }
        if (tfaCodeInput instanceof HTMLInputElement) {
            tfaCodeInput.required = true;
            tfaCodeInput.value = "";
            tfaCodeInput.focus();
        }
        renderTfaMethodTabs(payload.methods ?? []);
    }

    function renderLoginShell() {
        const brandlineHtml = renderAuthBrandline(
            i18n.t("ui.shared.brand.name"),
            i18n.t("ui.app.login.hero.tagline"),
        );
        const mobileBrandlineHtml = renderAuthBrandline(
            i18n.t("ui.shared.brand.name"),
            i18n.t("ui.app.login.hero.tagline"),
            "auth-brandline--panel-mobile",
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
        const formPanelHtml = `
      ${mobileBrandlineHtml}
      <h2 class="auth-heading">${escapeHtml(i18n.t("ui.app.login.title"))}</h2>
      <form id="login-form" class="stack auth-form" method="POST">
        <input type="hidden" id="login-provider" value="local" />
        <div id="login-credential-fields">
          <label>
            <span>${escapeHtml(i18n.t("ui.app.login.form.username"))}</span>
            <input id="login-username" autocomplete="username" placeholder="${escapeHtml(i18n.t("ui.app.login.form.username"))}" required />
          </label>
          <label>
            <span>${escapeHtml(i18n.t("ui.app.login.form.password"))}</span>
            <input id="login-password" type="password" autocomplete="current-password" placeholder="${escapeHtml(i18n.t("ui.app.login.form.password"))}" required />
          </label>
        </div>
        <div id="login-tfa-fields" hidden>
          <div id="login-tfa-method-nav" class="auth-provider-toggle"></div>
          <input type="hidden" id="login-tfa-method" value="" />
          <label>
           <span id="login-tfa-code-label">${escapeHtml(i18n.t("ui.app.login.tfa.code_label"))}</span>
           <input id="login-tfa-code" autocomplete="one-time-code" inputmode="numeric" required />
          </label>
        </div>
        <div id="auth-provider-toggle" class="auth-provider-toggle" hidden></div>
        ${signupCalloutHtml}
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

    const composer = createPageComposer(root, {
        allowCustomization: false,
        i18n,
        preferenceKey: "login-layout",
        pageContext: {
            title: i18n.t("ui.app.login.title"),
            subtitle: i18n.t("ui.app.login.page_subtitle"),
        },
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
                gridSize: {
                    default: [12, 6],
                    min: [8, 5],
                    max: ["full", "fill"],
                },
                render: () => renderLoginShell(),
                onRender: () => {
                    loadLoginMethods();
                    runTypingShowcase(typingSamples);
                    renderLoginReasonToast();
                    document
                        .querySelector("#login-form")
                        ?.addEventListener("submit", async (event) => {
                            event.preventDefault();
                            const form = event.target;
                            const tfaFields =
                                form.querySelector("#login-tfa-fields");
                            const isTfaMode =
                                tfaFields instanceof HTMLElement &&
                                !tfaFields.hidden;
                            if (isTfaMode) {
                                const tfaMethodEl =
                                    form.querySelector("#login-tfa-method");
                                const tfaCodeEl =
                                    form.querySelector("#login-tfa-code");
                                const payload = {
                                    loginAttemptId: currentTfaLoginAttemptId,
                                    methodId:
                                        tfaMethodEl instanceof HTMLInputElement
                                            ? tfaMethodEl.value
                                            : "",
                                    code:
                                        tfaCodeEl instanceof HTMLInputElement
                                            ? tfaCodeEl.value.trim()
                                            : "",
                                };
                                const tfaResponse = await fetch(
                                    "/api/v1/auth/login/tfa",
                                    {
                                        method: "POST",
                                        headers: {
                                            "content-type": "application/json",
                                        },
                                        body: JSON.stringify(payload),
                                    },
                                );
                                const tfaBody = await tfaResponse
                                    .json()
                                    .catch(() => null);
                                if (tfaResponse.ok && tfaBody?.data) {
                                    persistSession(tfaBody.data);
                                    const requiresUserValidation =
                                        tfaBody.data.requiredUserValidation ===
                                            true &&
                                        tfaBody.data.userValidationMode ===
                                            "smtp";
                                    if (requiresUserValidation) {
                                        await enforceRequiredEmailSetup(
                                            tfaBody.data.accountId,
                                        );
                                    }
                                    await syncTimezoneOnLogin(
                                        tfaBody.data.accountId,
                                    );
                                    window.location.href = "/dashboard";
                                    return;
                                }
                                showToast(
                                    resolveTfaLoginErrorMessage(
                                        tfaBody?.error?.message,
                                    ),
                                    { variant: "error" },
                                );
                                return;
                            }
                            const usernameEl =
                                form.querySelector("#login-username");
                            const passwordEl =
                                form.querySelector("#login-password");
                            const providerEl =
                                form.querySelector("#login-provider");
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
                            const body = await response
                                .json()
                                .catch(() => null);
                            if (response.ok && body?.data) {
                                if (body.data.tfaRequired === true) {
                                    switchToTfaPrompt(body.data);
                                    return;
                                }
                                persistSession(body.data);
                                const requiresUserValidation =
                                    body.data.requiredUserValidation === true &&
                                    body.data.userValidationMode === "smtp";
                                if (requiresUserValidation) {
                                    await enforceRequiredEmailSetup(
                                        body.data.accountId,
                                    );
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
                },
            },
        ],
    });

    await composer.init();
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
