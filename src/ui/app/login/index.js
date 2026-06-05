import { renderInPageCallout } from "../../reuse/in-page-callout.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
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
    let lastTfaPayload = null;
    let tfaLoginClientPromise = null;
    let requiredEmailEnforcementClientPromise = null;
    let loginUiConfigPromise = null;
    let passwordResetTokenHandled = false;
    let submitPasswordReset = null;

    const typingSamples = await loadAuthTypingSamples(i18n);
    const loginReason = new URL(window.location.href).searchParams.get(
        "reason",
    );
    let loginReasonToastShown = false;

    let publicRegistrationEnabled = false;
    let isPasswordResetMode = false;
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

    async function loadLoginUiConfig() {
        if (!loginUiConfigPromise) {
            loginUiConfigPromise = fetch("/api/v1/auth/login-ui")
                .then(async (response) => {
                    if (!response.ok) {
                        throw new Error("login_ui_unavailable");
                    }
                    const payload = await response.json().catch(() => null);
                    const data = payload?.data ?? {};
                    const methods = Array.isArray(data.methods)
                        ? data.methods
                        : [];
                    const integrations = Array.isArray(data.integrations)
                        ? data.integrations
                        : [];
                    return { methods, integrations };
                })
                .catch(() => ({
                    methods: [],
                    integrations: [],
                }));
        }
        return loginUiConfigPromise;
    }

    async function resolveLoginIntegration(id) {
        const config = await loadLoginUiConfig();
        return (
            config.integrations.find(
                (integration) =>
                    integration &&
                    integration.id === id &&
                    typeof integration.scriptUrl === "string" &&
                    integration.scriptUrl.trim().length > 0,
            ) ?? null
        );
    }

    async function loadTfaLoginClient() {
        if (!tfaLoginClientPromise) {
            tfaLoginClientPromise = resolveLoginIntegration("tfa")
                .then((integration) => {
                    if (!integration) {
                        return null;
                    }
                    return import(integration.scriptUrl).then((mod) =>
                        mod.createTfaLoginClient({ baseI18n: i18n, root }),
                    );
                })
                .catch((error) => {
                    console.error(error);
                    return null;
                });
        }
        return tfaLoginClientPromise;
    }

    async function loadRequiredEmailEnforcementClient() {
        if (!requiredEmailEnforcementClientPromise) {
            requiredEmailEnforcementClientPromise = resolveLoginIntegration(
                "required-email-enforcement",
            )
                .then((integration) => {
                    if (!integration) {
                        return null;
                    }
                    return import(integration.scriptUrl).then((mod) =>
                        mod.createRequiredEmailEnforcementClient(),
                    );
                })
                .catch((error) => {
                    console.error(error);
                    return null;
                });
        }
        return requiredEmailEnforcementClientPromise;
    }

    async function loadLoginMethods() {
        try {
            const flowConfig = await loadLoginUiConfig();
            const methods = flowConfig.methods;

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

    function clearPersistedSession() {
        localStorage.removeItem("cognis_access_token");
        localStorage.removeItem("cognis_account");
        localStorage.removeItem("cognis_display_name");
        localStorage.removeItem("cognis_role");
        localStorage.removeItem("cognis_is_founder");
        localStorage.removeItem("cognis_login_time");
        localStorage.removeItem("cognis_user_validation_mode");
    }

    async function finalizeAuthenticatedSession(data) {
        persistSession(data);
        const requiresUserValidation =
            data.requiredUserValidation === true &&
            data.userValidationMode === "smtp";
        if (requiresUserValidation) {
            const requiredEmailClient =
                await loadRequiredEmailEnforcementClient();
            try {
                await requiredEmailClient?.enforceRequiredEmailSetup({
                    accountId: data.accountId,
                    i18n,
                });
            } catch {
                clearPersistedSession();
                return;
            }
        }
        await syncTimezoneOnLogin(data.accountId);
        window.location.href = "/dashboard";
    }

    async function handleAuthResult(data) {
        if (data.tfaRequired === true || data.tfaSetupRequired === true) {
            const tfaLoginClient = await loadTfaLoginClient();
            if (!tfaLoginClient) {
                showToast(i18n.t("ui.app.login.error.generic"), {
                    variant: "error",
                });
                return;
            }
            if (data.tfaRequired === true) {
                lastTfaPayload = data;
                currentTfaLoginAttemptId = tfaLoginClient.switchToTfaPrompt(data);
            } else {
                tfaLoginClient.handleSetupRequired(persistSession, data);
            }
            return;
        }
        await finalizeAuthenticatedSession(data);
    }

    function buildSupportMessage(contactEmail) {
        if (contactEmail) {
            return escapeHtml(
                i18n.t("ui.app.login.login_link.contact_support_email"),
            ).replace("{email}", escapeHtml(contactEmail));
        }
        return escapeHtml(i18n.t("ui.app.login.login_link.contact_support"));
    }

    function replaceCredentialFieldsContent(html) {
        const credentialFields = document.querySelector(
            "#login-credential-fields",
        );
        if (!credentialFields) return false;
        credentialFields.innerHTML = html;
        return true;
    }

    function switchToLoginLinkEmailForm() {
        if (
            !replaceCredentialFieldsContent(`
            <label>
                <span>${escapeHtml(i18n.t("ui.app.login.login_link.email"))}</span>
                <input id="login-link-email" type="email" autocomplete="email"
                    placeholder="${escapeHtml(i18n.t("ui.app.login.login_link.email"))}"
                    required />
            </label>
            <div class="auth-reset-actions">
                <button type="button" id="login-link-back" class="btn-animated auth-secondary-action">
                    ${escapeHtml(i18n.t("ui.app.login.login_link.back"))}
                </button>
                <button type="submit" id="login-link-submit" class="btn-animated">
                    ${escapeHtml(i18n.t("ui.app.login.login_link.submit"))}
                </button>
            </div>
        `)
        ) {
            return;
        }
        enterPasswordResetMode();
        const backLink = document.querySelector("#login-link-back");
        const emailInput = document.querySelector("#login-link-email");
        emailInput?.focus();
        submitPasswordReset = async () => {
            try {
                await requestPasswordResetLink();
            } catch {
                showToast(i18n.t("ui.app.login.error.generic"), {
                    variant: "error",
                });
            }
        };
        backLink?.addEventListener("click", () => {
            composer.refresh();
        });
    }

    function showLoginLinkUnavailable(contactEmail) {
        if (
            !replaceCredentialFieldsContent(`
            <p class="auth-link-unavailable-message">${buildSupportMessage(contactEmail)}</p>
            <button type="button" id="login-link-back" class="btn-animated auth-secondary-action">
                ${escapeHtml(i18n.t("ui.app.login.login_link.back"))}
            </button>
        `)
        ) {
            return;
        }
        enterPasswordResetMode();
        submitPasswordReset = null;
        document
            .querySelector("#login-link-back")
            ?.addEventListener("click", () => {
                composer.refresh();
            });
    }

    function enterPasswordResetMode() {
        isPasswordResetMode = true;
        const heading = document.querySelector(".auth-heading");
        if (heading)
            heading.textContent = i18n.t("ui.app.login.login_link.title");
        const loginSubmit = document.querySelector("#login-form-submit");
        if (loginSubmit) loginSubmit.hidden = true;
        const signupCallout = document.querySelector("#login-signup-callout");
        if (signupCallout) signupCallout.hidden = true;
    }

    function resetPasswordResetMode() {
        isPasswordResetMode = false;
        submitPasswordReset = null;
    }

    async function handleRequestLinkClick() {
        const res = await fetch("/api/v1/auth/login-link-status");
        const body = await res.json().catch(() => null);
        if (body?.data?.available === true) {
            switchToLoginLinkEmailForm();
        } else {
            showLoginLinkUnavailable(body?.data?.contactEmail ?? "");
        }
    }

    async function requestPasswordResetLink() {
        const emailEl = document.querySelector("#login-link-email");
        const email = String(emailEl?.value ?? "")
            .trim()
            .toLowerCase();
        if (!email) {
            showToast(i18n.t("ui.app.login.login_link.email_required"), {
                variant: "warning",
            });
            emailEl?.focus();
            return;
        }
        const response = await fetch("/api/v1/auth/request-login-link", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const body = await response.json().catch(() => null);
        if (response.status === 429 || body?.error?.code === "rate_limited") {
            showToast(i18n.t("ui.app.login.login_link.rate_limited"), {
                variant: "warning",
            });
            return;
        }
        if (response.ok && body?.data?.outcome === "email_sent") {
            showToast(i18n.t("ui.app.login.login_link.sent"), {
                variant: "success",
                permanent: true,
            });
            return;
        }
        if (response.ok && body?.data?.outcome === "contact_support") {
            showToast(buildSupportMessage(body.data.contactEmail), {
                variant: "info",
                permanent: true,
            });
            return;
        }
        showToast(i18n.t("ui.app.login.error.generic"), { variant: "error" });
    }

    function showPasswordResetLinkInvalid() {
        if (
            !replaceCredentialFieldsContent(`
            ${renderInPageCallout({
                variant: "danger",
                title: i18n.t("ui.reuse.error"),
                body: i18n.t("ui.app.login.login_link.invalid"),
            })}
            <div class="auth-reset-actions">
                <button type="button" id="login-link-invalid-back" class="btn-animated auth-secondary-action">
                    ${escapeHtml(i18n.t("ui.app.login.login_link.go_back"))}
                </button>
            </div>
        `)
        ) {
            return;
        }
        enterPasswordResetMode();
        submitPasswordReset = null;
        document
            .querySelector("#login-link-invalid-back")
            ?.addEventListener("click", () => {
                window.history.replaceState({}, "", "/login");
                composer.refresh();
            });
    }

    function renderPasswordResetForm(token, showBackButton = true) {
        const backButtonHtml = showBackButton
            ? `<button type="button" id="login-link-back" class="btn-animated auth-secondary-action">
                    ${escapeHtml(i18n.t("ui.app.login.login_link.back"))}
                </button>`
            : "";
        if (
            !replaceCredentialFieldsContent(`
            <label>
                <span>${escapeHtml(i18n.t("ui.app.login.form.password"))}</span>
                <input id="login-link-password" type="password" autocomplete="new-password"
                    placeholder="${escapeHtml(i18n.t("ui.app.login.form.password"))}"
                    required />
            </label>
            <label>
                <span>${escapeHtml(i18n.t("ui.app.register.confirm_password"))}</span>
                <input id="login-link-confirm-password" type="password" autocomplete="new-password"
                    placeholder="${escapeHtml(i18n.t("ui.app.register.confirm_password"))}"
                    required />
            </label>
            <div class="auth-reset-actions">
                ${backButtonHtml}
                <button type="submit" id="login-link-submit" class="btn-animated">
                    ${escapeHtml(i18n.t("ui.app.login.login_link.submit"))}
                </button>
            </div>
        `)
        ) {
            return;
        }
        enterPasswordResetMode();
        submitPasswordReset = async () => {
            const nextPassword = String(
                document.querySelector("#login-link-password")?.value ?? "",
            ).trim();
            const confirmPassword = String(
                document.querySelector("#login-link-confirm-password")?.value ??
                    "",
            ).trim();
            if (!nextPassword || !confirmPassword) {
                showToast(i18n.t("ui.app.login.login_link.password_required"), {
                    variant: "warning",
                });
                return;
            }
            if (nextPassword !== confirmPassword) {
                showToast(i18n.t("ui.app.register.error.password_mismatch"), {
                    variant: "error",
                });
                return;
            }
            const response = await fetch("/api/v1/auth/consume-login-link", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token, password: nextPassword }),
            });
            const body = await response.json().catch(() => null);
            if (response.ok && body?.data?.updated === true) {
                window.history.replaceState({}, "", "/login");
                showToast(i18n.t("ui.app.login.login_link.reset_success"), {
                    variant: "success",
                    permanent: true,
                });
                composer.refresh();
                return;
            }
            showToast(
                body?.error?.message
                    ? String(body.error.message)
                    : i18n.t("ui.app.login.login_link.invalid"),
                {
                    variant: "error",
                    permanent: true,
                },
            );
        };
        if (showBackButton) {
            document
                .querySelector("#login-link-back")
                ?.addEventListener("click", () => {
                    window.history.replaceState({}, "", "/login");
                    composer.refresh();
                });
        }
    }

    async function consumePasswordResetToken() {
        if (passwordResetTokenHandled) return;
        const params = new URL(window.location.href).searchParams;
        const loginToken = String(
            params.get("passwordResetToken") ?? "",
        ).trim();
        if (!loginToken) return;
        try {
            passwordResetTokenHandled = true;
            const checkRes = await fetch(
                `/api/v1/auth/check-login-link?token=${encodeURIComponent(loginToken)}`,
            );
            if (!checkRes.ok) {
                passwordResetTokenHandled = false;
                showPasswordResetLinkInvalid();
                return;
            }
            renderPasswordResetForm(loginToken, false);
        } catch (error) {
            passwordResetTokenHandled = false;
            throw error;
        }
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
            ? `<div id="login-signup-callout">${renderInPageCallout({
                  variant: "info",
                  title: i18n.t("ui.app.login.not_registered.title"),
                  body: i18n.t("ui.app.login.not_registered.body"),
                  footerHtml: `<a href="/register" class="in-page-callout__link">${escapeHtml(i18n.t("ui.app.login.not_registered.link"))}</a>`,
              })}</div>`
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
          <a href="#" id="login-request-link" class="auth-text-action">${escapeHtml(i18n.t("ui.app.login.login_link.action"))}</a>
        </div>
        <div id="login-tfa-fields" hidden></div>
        <div id="auth-provider-toggle" class="auth-provider-toggle" hidden></div>
        ${signupCalloutHtml}
        <button type="submit" id="login-form-submit">${escapeHtml(i18n.t("ui.app.login.form.submit"))}</button>
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
                    resetPasswordResetMode();
                    if (lastTfaPayload !== null) {
                        // Restore saved TFA prompt state; on failure, fall through to login-method loading (lines 609-610 below).
                        loadTfaLoginClient()
                            .then((client) => {
                                if (client) {
                                    currentTfaLoginAttemptId =
                                        client.switchToTfaPrompt(
                                            lastTfaPayload,
                                        ) ?? null;
                                    return;
                                }
                                lastTfaPayload = null;
                                loadLoginMethods();
                                runTypingShowcase(typingSamples);
                            })
                            .catch((error) => {
                                console.error(error);
                                loadLoginMethods();
                                runTypingShowcase(typingSamples);
                            });
                    } else {
                        loadLoginMethods();
                        runTypingShowcase(typingSamples);
                    }
                    renderLoginReasonToast();
                    document
                        .querySelector("#login-request-link")
                        ?.addEventListener("click", (event) => {
                            event.preventDefault();
                            handleRequestLinkClick().catch(() => {
                                showToast(
                                    i18n.t("ui.app.login.error.generic"),
                                    {
                                        variant: "error",
                                    },
                                );
                            });
                        });
                    consumePasswordResetToken().catch(() => {
                        window.history.replaceState({}, "", "/login");
                        showToast(i18n.t("ui.app.login.login_link.invalid"), {
                            variant: "error",
                            permanent: true,
                        });
                    });
                    document
                        .querySelector("#login-form")
                        ?.addEventListener("submit", async (event) => {
                            event.preventDefault();
                            if (isPasswordResetMode) {
                                try {
                                    await submitPasswordReset?.();
                                } catch {
                                    showToast(
                                        i18n.t("ui.app.login.error.generic"),
                                        {
                                            variant: "error",
                                        },
                                    );
                                }
                                return;
                            }
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
                                const tfaLoginClient =
                                    await loadTfaLoginClient();
                                if (!tfaLoginClient) {
                                    showToast(
                                        i18n.t("ui.app.login.error.generic"),
                                        { variant: "error" },
                                    );
                                    return;
                                }
                                const { response: tfaResponse, body: tfaBody } =
                                    await tfaLoginClient.verifyCode(payload);
                                if (tfaResponse.ok && tfaBody?.data) {
                                    await finalizeAuthenticatedSession(
                                        tfaBody.data,
                                    );
                                    return;
                                }
                                showToast(
                                    tfaLoginClient?.resolveErrorMessage(
                                        tfaBody?.error?.message,
                                    ) ?? i18n.t("ui.app.login.error.generic"),
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
                                await handleAuthResult(body.data);
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

await mountWhenDirect(mount);
