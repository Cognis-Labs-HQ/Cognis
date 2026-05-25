import { renderInPageCallout } from "../../reuse/in-page-callout.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/init.js";
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
    let tfaLoginClientPromise = null;
    let requiredEmailEnforcementClientPromise = null;

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

    async function loadTfaLoginClient() {
        if (!tfaLoginClientPromise) {
            tfaLoginClientPromise = import("/static/gateways/tfa/login-flow.js")
                .then((mod) =>
                    mod.createTfaLoginClient({ baseI18n: i18n, root }),
                )
                .catch((error) => {
                    console.error(error);
                    return null;
                });
        }
        return tfaLoginClientPromise;
    }

    async function loadRequiredEmailEnforcementClient() {
        if (!requiredEmailEnforcementClientPromise) {
            requiredEmailEnforcementClientPromise =
                import("/static/gateways/notify/login-required-email-flow.js")
                    .then((mod) => mod.createRequiredEmailEnforcementClient())
                    .catch((error) => {
                        console.error(error);
                        return null;
                    });
        }
        return requiredEmailEnforcementClientPromise;
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
        <div id="login-tfa-fields" hidden></div>
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
                                const tfaLoginClient =
                                    await loadTfaLoginClient();
                                const { response: tfaResponse, body: tfaBody } =
                                    await tfaLoginClient.verifyCode(payload);
                                if (tfaResponse.ok && tfaBody?.data) {
                                    persistSession(tfaBody.data);
                                    const requiresUserValidation =
                                        tfaBody.data.requiredUserValidation ===
                                            true &&
                                        tfaBody.data.userValidationMode ===
                                            "smtp";
                                    if (requiresUserValidation) {
                                        const requiredEmailClient =
                                            await loadRequiredEmailEnforcementClient();
                                        try {
                                            await requiredEmailClient?.enforceRequiredEmailSetup(
                                                {
                                                    accountId:
                                                        tfaBody.data.accountId,
                                                    i18n,
                                                },
                                            );
                                        } catch {
                                            clearPersistedSession();
                                            return;
                                        }
                                    }
                                    await syncTimezoneOnLogin(
                                        tfaBody.data.accountId,
                                    );
                                    window.location.href = "/dashboard";
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
                                if (
                                    body.data.tfaRequired === true ||
                                    body.data.tfaSetupRequired === true
                                ) {
                                    const tfaLoginClient =
                                        await loadTfaLoginClient();
                                    if (body.data.tfaRequired === true) {
                                        currentTfaLoginAttemptId =
                                            tfaLoginClient?.switchToTfaPrompt(
                                                body.data,
                                            ) ?? null;
                                    } else {
                                        tfaLoginClient?.handleSetupRequired(
                                            persistSession,
                                            body.data,
                                        );
                                    }
                                    return;
                                }
                                persistSession(body.data);
                                const requiresUserValidation =
                                    body.data.requiredUserValidation === true &&
                                    body.data.userValidationMode === "smtp";
                                if (requiresUserValidation) {
                                    const requiredEmailClient =
                                        await loadRequiredEmailEnforcementClient();
                                    try {
                                        await requiredEmailClient?.enforceRequiredEmailSetup(
                                            {
                                                accountId: body.data.accountId,
                                                i18n,
                                            },
                                        );
                                    } catch {
                                        clearPersistedSession();
                                        return;
                                    }
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

await mountWhenDirect(mount);
