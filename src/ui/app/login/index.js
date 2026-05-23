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
import { enforceRequiredTfaSetup } from "../../reuse/tfa-setup.js";

/**
 * Mounts the login page into the provided root element.
 *
 * @param {HTMLElement} root - Target app container.
 * @returns {Promise<void>} Resolves when the page has finished initialising.
 */
export async function mount(root) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.login");

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

    async function loadUserEmails(accountId, authToken) {
        const response = await apiFetch(
            `/api/v1/users/${encodeURIComponent(accountId)}/emails`,
            authToken
                ? {
                      headers: {
                          authorization: `Bearer ${authToken}`,
                      },
                  }
                : undefined,
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

    async function verifyRequiredEmailLoop(accountId, emailAddress, authToken) {
        while (true) {
            const code = await promptVerificationCode(emailAddress);
            if (!code) continue;
            const verifyResponse = await apiFetch(
                `/api/v1/users/${encodeURIComponent(accountId)}/emails/${encodeURIComponent(emailAddress)}/verify`,
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        ...(authToken
                            ? { authorization: `Bearer ${authToken}` }
                            : {}),
                    },
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

    let pendingTfaMethods = [];
    let selectedTfaMethodId = null;

    /**
     * Normalizes login TFA challenge payloads into a uniform method list for
     * in-panel rendering and verification dispatch.
     *
     * @param {Record<string, unknown> | null | undefined} payloadData
     * @returns {Array<{ id: string, name: string, challengeId: string, verifyPath: string }>}
     */
    function normalizeLoginTfaMethods(payloadData) {
        const declaredMethods = Array.isArray(payloadData?.methods)
            ? payloadData.methods
            : [];
        if (declaredMethods.length > 0) {
            return declaredMethods.map((method) => ({
                id: String(method.id ?? ""),
                name:
                    String(method.name ?? "").trim() ||
                    i18n.t("ui.app.login.email_tfa.title"),
                challengeId: String(method.challengeId ?? "").trim(),
                verifyPath:
                    String(method.verifyPath ?? "").trim() ||
                    "/api/v1/auth/smtp-tfa/verify-login",
            }));
        }
        return [];
    }

    function toggleLoginTfaPrompt(isVisible) {
        const loginForm = root.querySelector("#login-form");
        const tfaForm = root.querySelector("#login-tfa-form");
        if (loginForm instanceof HTMLFormElement) {
            loginForm.hidden = isVisible;
        }
        if (tfaForm instanceof HTMLFormElement) {
            tfaForm.hidden = !isVisible;
        }
    }

    function renderLoginTfaTabs() {
        const tabsHost = root.querySelector("#login-tfa-tabs");
        const methodLabel = root.querySelector("#login-tfa-method-label");
        if (!(tabsHost instanceof HTMLElement)) return;
        if (pendingTfaMethods.length < 1) {
            tabsHost.hidden = true;
            tabsHost.innerHTML = "";
            if (methodLabel instanceof HTMLElement) {
                methodLabel.textContent = "";
            }
            return;
        }
        if (!selectedTfaMethodId) {
            selectedTfaMethodId = pendingTfaMethods[0].id;
        }
        const selectedMethod = pendingTfaMethods.find(
            (method) => method.id === selectedTfaMethodId,
        );
        if (methodLabel instanceof HTMLElement) {
            methodLabel.textContent = selectedMethod?.name ?? "";
        }
        if (pendingTfaMethods.length < 2) {
            tabsHost.hidden = true;
            tabsHost.innerHTML = "";
            return;
        }
        tabsHost.hidden = false;
        tabsHost.innerHTML = pendingTfaMethods
            .map(
                (method) => `
            <button
              type="button"
              class="theme-btn${method.id === selectedTfaMethodId ? " active" : ""}"
              data-login-tfa-method="${escapeHtml(method.id)}"
            >${escapeHtml(method.name)}</button>`,
            )
            .join("");
        tabsHost
            .querySelectorAll("[data-login-tfa-method]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    selectedTfaMethodId = button.getAttribute(
                        "data-login-tfa-method",
                    );
                    renderLoginTfaTabs();
                });
            });
    }

    async function verifyPendingTfaLogin(code) {
        const selectedMethod = pendingTfaMethods.find(
            (method) => method.id === selectedTfaMethodId,
        );
        if (!selectedMethod || !code) return null;
        const response = await fetch(selectedMethod.verifyPath, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                challengeId: selectedMethod.challengeId,
                code,
            }),
        });
        const body = await response.json().catch(() => null);
        if (response.ok && body?.data) {
            return body.data;
        }
        if (response.status === 401) {
            showToast(i18n.t("ui.app.login.email_tfa.invalid_code"), {
                variant: "error",
            });
            return null;
        }
        showToast(
            body?.error?.message || i18n.t("ui.app.login.email_tfa.failed"),
            {
                variant: "error",
            },
        );
        return null;
    }

    async function enforceRequiredEmailSetup(accountId, authToken) {
        while (true) {
            const emails = await loadUserEmails(accountId, authToken);
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
                    headers: {
                        "content-type": "application/json",
                        ...(authToken
                            ? { authorization: `Bearer ${authToken}` }
                            : {}),
                    },
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

            await verifyRequiredEmailLoop(accountId, emailAddress, authToken);
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
        <label>
          <span>${escapeHtml(i18n.t("ui.app.login.form.username"))}</span>
          <input id="login-username" autocomplete="username" placeholder="${escapeHtml(i18n.t("ui.app.login.form.username"))}" required />
        </label>
        <label>
          <span>${escapeHtml(i18n.t("ui.app.login.form.password"))}</span>
          <input id="login-password" type="password" autocomplete="current-password" placeholder="${escapeHtml(i18n.t("ui.app.login.form.password"))}" required />
        </label>
        <div id="auth-provider-toggle" class="auth-provider-toggle" hidden></div>
        ${signupCalloutHtml}
        <button type="submit">${escapeHtml(i18n.t("ui.app.login.form.submit"))}</button>
      </form>
      <form id="login-tfa-form" class="stack auth-form" method="POST" hidden>
        <h3>${escapeHtml(i18n.t("ui.app.login.email_tfa.title"))}</h3>
        <div id="login-tfa-tabs" class="auth-provider-toggle" hidden></div>
        <p>${escapeHtml(i18n.t("ui.app.login.email_tfa.prompt"))}</p>
        <p id="login-tfa-method-label"></p>
        <label>
          <span>${escapeHtml(i18n.t("ui.app.login.email_tfa.code_label"))}</span>
          <input id="login-tfa-code" type="text" inputmode="numeric" maxlength="6" required />
        </label>
        <button type="submit">${escapeHtml(i18n.t("ui.app.login.email_tfa.submit"))}</button>
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
                            let loginData = null;
                            if (response.ok && body?.data) {
                                loginData = body.data;
                            } else if (response.status === 202 && body?.data) {
                                pendingTfaMethods = normalizeLoginTfaMethods(
                                    body.data,
                                ).filter(
                                    (method) =>
                                        method.id &&
                                        method.challengeId &&
                                        method.verifyPath,
                                );
                                if (pendingTfaMethods.length < 1) {
                                    showToast(
                                        i18n.t("ui.app.login.email_tfa.failed"),
                                        { variant: "error" },
                                    );
                                    return;
                                }
                                selectedTfaMethodId = pendingTfaMethods[0].id;
                                toggleLoginTfaPrompt(true);
                                renderLoginTfaTabs();
                                return;
                            }
                            if (!loginData) {
                                const errorMsg =
                                    body?.error?.message ||
                                    i18n.t("ui.app.login.error.generic");
                                showToast(errorMsg, { variant: "error" });
                                return;
                            }
                            localStorage.setItem(
                                "cognis_access_token",
                                loginData.token,
                            );
                            localStorage.setItem(
                                "cognis_account",
                                loginData.accountId,
                            );
                            localStorage.setItem(
                                "cognis_display_name",
                                loginData.displayName || loginData.accountId,
                            );
                            localStorage.setItem(
                                "cognis_role",
                                loginData.role || "user",
                            );
                            localStorage.setItem(
                                "cognis_is_founder",
                                loginData.isFounder ? "true" : "false",
                            );
                            localStorage.setItem(
                                "cognis_login_time",
                                new Date().toISOString(),
                            );
                            localStorage.setItem(
                                "cognis_user_validation_mode",
                                loginData.userValidationMode || "none",
                            );
                            const requiresUserValidation =
                                loginData.requiredUserValidation === true &&
                                loginData.userValidationMode === "smtp";
                            if (requiresUserValidation) {
                                await enforceRequiredEmailSetup(
                                    loginData.accountId,
                                    loginData.token,
                                );
                            }
                            if (loginData.requiresTfaSetup === true) {
                                await enforceRequiredTfaSetup({
                                    i18n,
                                    accountId: loginData.accountId,
                                    authToken: loginData.token,
                                    openPopup,
                                    showToast,
                                    escapeHtml,
                                    enforceRequiredEmailSetup,
                                });
                            }
                            await syncTimezoneOnLogin(loginData.accountId);
                            window.location.href = "/dashboard";
                        });
                    document
                        .querySelector("#login-tfa-form")
                        ?.addEventListener("submit", async (event) => {
                            event.preventDefault();
                            const form = event.target;
                            const codeInput =
                                form.querySelector("#login-tfa-code");
                            const code =
                                codeInput instanceof HTMLInputElement
                                    ? codeInput.value.trim()
                                    : "";
                            const loginData = await verifyPendingTfaLogin(code);
                            if (!loginData) return;
                            pendingTfaMethods = [];
                            selectedTfaMethodId = null;
                            toggleLoginTfaPrompt(false);
                            localStorage.setItem(
                                "cognis_access_token",
                                loginData.token,
                            );
                            localStorage.setItem(
                                "cognis_account",
                                loginData.accountId,
                            );
                            localStorage.setItem(
                                "cognis_display_name",
                                loginData.displayName || loginData.accountId,
                            );
                            localStorage.setItem(
                                "cognis_role",
                                loginData.role || "user",
                            );
                            localStorage.setItem(
                                "cognis_is_founder",
                                loginData.isFounder ? "true" : "false",
                            );
                            localStorage.setItem(
                                "cognis_login_time",
                                new Date().toISOString(),
                            );
                            localStorage.setItem(
                                "cognis_user_validation_mode",
                                loginData.userValidationMode || "none",
                            );
                            const requiresUserValidation =
                                loginData.requiredUserValidation === true &&
                                loginData.userValidationMode === "smtp";
                            if (requiresUserValidation) {
                                await enforceRequiredEmailSetup(
                                    loginData.accountId,
                                    loginData.token,
                                );
                            }
                            if (loginData.requiresTfaSetup === true) {
                                await enforceRequiredTfaSetup({
                                    i18n,
                                    accountId: loginData.accountId,
                                    authToken: loginData.token,
                                    openPopup,
                                    showToast,
                                    escapeHtml,
                                    enforceRequiredEmailSetup,
                                });
                            }
                            await syncTimezoneOnLogin(loginData.accountId);
                            window.location.href = "/dashboard";
                        });
                },
            },
        ],
    });

    await composer.init();
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
