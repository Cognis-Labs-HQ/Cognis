import { renderInPageCallout } from "../../reuse/in-page-callout.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { showToast } from "../../reuse/toast.js";
import { openPopup } from "../../reuse/popup.js";
import {
    loadAuthTypingSamples,
    runTypingShowcase,
} from "../../reuse/auth-typing.js";
import {
    renderAuthBrandline,
    renderAuthLayout,
} from "../../reuse/auth-layout.js";
import { syncTimezoneOnLogin } from "../../reuse/timestamp.js";
import { uiCtx } from "../../reuse/ui-ctx.js";
import { createLoginIntegrationLoader } from "./integrations.js";
import {
    clearLoginSession,
    persistLoginSession as persistSession,
} from "./session.js";
import "../../reuse/flow-registry.js";
import "/static/adapters/auth/keyring/keyring.js";

const AUTH_SOURCE_PREFERENCE_KEY = "cognis_login_auth_source";

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
    let pendingKeyringPassword = "";
    let lastTfaPayload = null;
    let tfaLoginClientPromise = null;
    let requiredEmailEnforcementClientPromise = null;
    let passwordResetTokenHandled = false;
    let submitPasswordReset = null;
    const {
        loadConfig: loadLoginUiConfig,
        loadClient: loadLoginIntegrationClient,
    } = createLoginIntegrationLoader();

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
            account_archived: "ui.app.login.reason.account_archived",
            account_deactivated: "ui.app.login.reason.account_deactivated",
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

    async function loadTfaLoginClient() {
        if (!tfaLoginClientPromise) {
            tfaLoginClientPromise = loadLoginIntegrationClient(
                "tfa",
                (module) =>
                    module.createTfaLoginClient({ baseI18n: i18n, root }),
            );
        }
        return tfaLoginClientPromise;
    }

    async function loadRequiredEmailEnforcementClient() {
        if (!requiredEmailEnforcementClientPromise) {
            requiredEmailEnforcementClientPromise = loadLoginIntegrationClient(
                "required-email-enforcement",
                (module) => module.createRequiredEmailEnforcementClient(),
            );
        }
        return requiredEmailEnforcementClientPromise;
    }

    function hideCredentialProviderSelector() {
        const providerToggle = document.querySelector("#auth-provider-toggle");
        if (providerToggle instanceof HTMLElement) {
            providerToggle.hidden = true;
        }
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

            if (toggleContainer) {
                toggleContainer.replaceChildren();
                toggleContainer.hidden = true;
            }
            ssoContainer?.replaceChildren();

            const credentialProviders = methods.filter(
                (method) => method.id === "local" || method.credential === true,
            );
            const ssoProviders = methods.filter(
                (method) => method.id !== "local" && method.credential !== true,
            );

            const updateSignupCallout = (method) => {
                const signupCallout = document.querySelector(
                    "#login-signup-callout",
                );
                if (signupCallout instanceof HTMLElement) {
                    signupCallout.hidden =
                        isPasswordResetMode || method?.id !== "local";
                }
            };

            const renderProviderActions = (method) => {
                const actions = document.querySelector(
                    "#login-provider-actions",
                );
                if (!actions) return;
                actions.replaceChildren();
                if (method?.forgotPassword !== true) return;
                const link = document.createElement("a");
                link.href = "#";
                link.id = "login-request-link";
                link.className = "auth-text-action";
                link.textContent = i18n.t("ui.app.login.login_link.action");
                actions.appendChild(link);
            };

            if (credentialProviders.length > 1 && toggleContainer) {
                toggleContainer.hidden = false;
                toggleContainer.setAttribute(
                    "aria-label",
                    i18n.t("ui.app.login.provider.toggle.aria"),
                );
                const methodButtons = new Map();
                const selectCredentialProvider = (method) => {
                    if (providerInput) providerInput.value = method.id;
                    localStorage.setItem(AUTH_SOURCE_PREFERENCE_KEY, method.id);
                    renderProviderActions(method);
                    updateSignupCallout(method);
                    methodButtons.forEach((button, methodId) => {
                        const active = methodId === method.id;
                        button.classList.toggle(
                            "auth-provider-btn--active",
                            active,
                        );
                        button.setAttribute("aria-pressed", String(active));
                    });
                };
                credentialProviders.forEach((method) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.dataset.loginProviderId = method.id;
                    if (method.id === "local" || method.id === "ldap") {
                        const methodLabelKey = `ui.app.login.provider.${method.id}`;
                        const translatedMethodName = i18n.t(methodLabelKey);
                        btn.textContent =
                            translatedMethodName &&
                            translatedMethodName !== methodLabelKey
                                ? translatedMethodName
                                : method.name;
                    } else {
                        btn.textContent = method.name;
                    }
                    btn.className = "auth-provider-btn";
                    btn.setAttribute(
                        "aria-pressed",
                        String(method.id === "local"),
                    );
                    btn.addEventListener("click", () => {
                        selectCredentialProvider(method);
                    });
                    if (method.id === "local") {
                        btn.classList.add("auth-provider-btn--active");
                    }
                    methodButtons.set(method.id, btn);
                    toggleContainer.appendChild(btn);
                });
                const overflowButton = document.createElement("button");
                overflowButton.type = "button";
                overflowButton.textContent = "…";
                overflowButton.className =
                    "auth-provider-btn auth-provider-overflow-btn";
                overflowButton.setAttribute(
                    "aria-label",
                    i18n.t("ui.app.login.provider.toggle.aria"),
                );
                overflowButton.hidden = true;
                overflowButton.addEventListener("click", async () => {
                    await openPopup({
                        title: i18n.t("ui.app.login.provider.toggle.aria"),
                        body: `<div class="auth-provider-overflow-list">${credentialProviders
                            .map(
                                (method) =>
                                    `<button type="button" class="auth-provider-overflow-option" data-login-provider-id="${escapeHtml(method.id)}">${escapeHtml(method.name)}</button>`,
                            )
                            .join("")}</div>`,
                        actions: [
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "cancel",
                            },
                        ],
                        onOpen: (overlay, close) => {
                            overlay
                                .querySelectorAll("[data-login-provider-id]")
                                .forEach((option) =>
                                    option.addEventListener("click", () => {
                                        const method = credentialProviders.find(
                                            (entry) =>
                                                entry.id ===
                                                option.dataset.loginProviderId,
                                        );
                                        if (method) {
                                            selectCredentialProvider(method);
                                            close();
                                        }
                                    }),
                                );
                        },
                    });
                });
                toggleContainer.appendChild(overflowButton);

                const fitCredentialProviderButtons = () => {
                    const minimumButtonWidth = 96;
                    const gap = 10;
                    const availableSlots = Math.max(
                        1,
                        Math.floor(
                            (toggleContainer.clientWidth + gap) /
                                (minimumButtonWidth + gap),
                        ),
                    );
                    const needsOverflow =
                        credentialProviders.length > availableSlots;
                    const visibleIds = new Set(
                        credentialProviders
                            .slice(
                                0,
                                needsOverflow
                                    ? Math.max(1, availableSlots - 1)
                                    : credentialProviders.length,
                            )
                            .map((method) => method.id),
                    );
                    const selectedId = providerInput?.value;
                    if (selectedId && !visibleIds.has(selectedId)) {
                        const lastVisibleId = [...visibleIds].at(-1);
                        if (lastVisibleId !== "local")
                            visibleIds.delete(lastVisibleId);
                        visibleIds.add(selectedId);
                    }
                    methodButtons.forEach((button, methodId) => {
                        button.hidden = !visibleIds.has(methodId);
                    });
                    overflowButton.hidden = !needsOverflow;
                };
                fitCredentialProviderButtons();
                new ResizeObserver(fitCredentialProviderButtons).observe(
                    toggleContainer,
                );
            }
            const preferredProviderId = localStorage.getItem(
                AUTH_SOURCE_PREFERENCE_KEY,
            );
            const initialProvider =
                credentialProviders.find(
                    (method) => method.id === preferredProviderId,
                ) ??
                credentialProviders.find((method) => method.id === "local") ??
                credentialProviders[0];
            if (providerInput && initialProvider) {
                providerInput.value = initialProvider.id;
            }
            renderProviderActions(initialProvider);
            updateSignupCallout(initialProvider);

            if (credentialProviders.length > 1 && initialProvider) {
                document
                    .querySelectorAll(".auth-provider-btn")
                    .forEach((button) => {
                        const active =
                            button.dataset.loginProviderId ===
                            initialProvider.id;
                        button.classList.toggle(
                            "auth-provider-btn--active",
                            active,
                        );
                        button.setAttribute("aria-pressed", String(active));
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

    async function finalizeAuthenticatedSession(data, password = "") {
        persistSession(data);
        await uiCtx.runFlow("complete-login", {
            accountPassword: password,
        });
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
                clearLoginSession();
                return;
            }
        }
        await syncTimezoneOnLogin(data.accountId);
        window.location.href = "/dashboard";
    }

    async function handleAuthResult(data, password = "") {
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
                pendingKeyringPassword = password;
                hideCredentialProviderSelector();
                currentTfaLoginAttemptId =
                    tfaLoginClient.switchToTfaPrompt(data);
            } else {
                persistSession(data);
                await uiCtx.runFlow("complete-login", {
                    accountPassword: password,
                });
                tfaLoginClient.handleSetupRequired(() => undefined, data);
            }
            return;
        }
        await finalizeAuthenticatedSession(data, password);
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

    function renderCredentialFields() {
        return `
          <label>
            <span>${escapeHtml(i18n.t("ui.app.login.form.username"))}</span>
            <input id="login-username" autocomplete="username" placeholder="${escapeHtml(i18n.t("ui.app.login.form.username"))}" required />
          </label>
          <label>
            <span>${escapeHtml(i18n.t("ui.app.login.form.password"))}</span>
            <input id="login-password" type="password" autocomplete="current-password" placeholder="${escapeHtml(i18n.t("ui.app.login.form.password"))}" required />
          </label>
          <div id="login-provider-actions"></div>
        `;
    }

    function restoreLoginForm() {
        replaceCredentialFieldsContent(renderCredentialFields());
        resetPasswordResetMode();
        lastTfaPayload = null;
        const heading = document.querySelector(".auth-heading");
        if (heading) heading.textContent = i18n.t("ui.app.login.title");
        const loginSubmit = document.querySelector("#login-form-submit");
        if (loginSubmit) loginSubmit.hidden = false;
        const signupCallout = document.querySelector("#login-signup-callout");
        if (signupCallout) signupCallout.hidden = false;
        const tfaFields = document.querySelector("#login-tfa-fields");
        if (tfaFields instanceof HTMLElement) tfaFields.hidden = true;
        loadLoginMethods();
        document.querySelector("#login-username")?.focus();
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
            restoreLoginForm();
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
                restoreLoginForm();
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
                restoreLoginForm();
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
                restoreLoginForm();
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
                    restoreLoginForm();
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
      <div id="auth-provider-toggle" class="auth-provider-toggle" hidden></div>
      <form id="login-form" class="stack auth-form" method="POST">
        <input type="hidden" id="login-provider" value="local" />
        <div id="login-credential-fields">${renderCredentialFields()}</div>
        <div id="login-tfa-fields" hidden></div>
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
                                    hideCredentialProviderSelector();
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
                        .querySelector("#login-form")
                        ?.addEventListener("click", (event) => {
                            if (
                                !(event.target instanceof Element) ||
                                !event.target.closest("#login-request-link")
                            ) {
                                return;
                            }
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
                                        pendingKeyringPassword,
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
                                await handleAuthResult(
                                    body.data,
                                    payload.password,
                                );
                                return;
                            }
                            const errorKeyByCode = {
                                account_archived:
                                    "ui.app.login.reason.account_archived",
                                account_deactivated:
                                    "ui.app.login.reason.account_deactivated",
                            };
                            const errorKey = errorKeyByCode[body?.error?.code];
                            const errorMsg = errorKey
                                ? i18n.t(errorKey)
                                : body?.error?.message ||
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
