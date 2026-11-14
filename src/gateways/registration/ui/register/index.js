import { createPageComposer } from "/static/reuse/page-composer/index.js";
import {
    loadAuthFooterPlugins,
    mountAuthFooter,
    renderAuthFooter,
} from "/static/reuse/auth-footer.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import {
    DEFAULT_LOCALE,
    createI18n,
    extendI18n,
    applyDocumentTitle,
    readPreferredLanguages,
    sanitizeLanguagePriority,
    selectSupportedLanguage,
    setPreferredLanguages,
} from "/static/reuse/i18n.js";
import {
    createOnboardingClient,
    registerPublicAccount,
} from "/static/gateways/auth/onboarding-client.js";
import { redeemRegistrationInvite } from "../client.js";
import { createRegistrationCompletion } from "./completion.js";
import { verifyRegistrationEmail } from "./email-verification.js";
import { loadRegistrationIntegrations } from "./integrations.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { renderInPageCallout } from "/static/reuse/in-page-callout.js";
import {
    loadAuthTypingSamples,
    runTypingShowcase,
} from "/static/reuse/auth-typing.js";
import {
    renderAuthBrandline,
    renderAuthLayout,
} from "/static/reuse/auth-layout.js";
import { formatCountdownClock } from "/static/gateways/auth/countdown.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import {
    DEFAULT_PASSWORD_POLICY,
    normalizePasswordPolicy,
} from "/static/gateways/auth/password-policy.js";
import { bindConfirmPasswordRevalidation } from "/static/gateways/auth/reuse/bind-confirm-password-revalidation.js";
import {
    bindAccountCreationAuthorization,
    readAccountCreationAuthorization,
    REGISTRATION_ERROR_CODES,
    renderAccountCreationAuthorization,
} from "./authorization.js";
import {
    getPendingAccountCreation,
    loadRegistrationConfig,
} from "/static/gateways/auth/login-client.js";
import { buildPasswordCriteria, resetAuthSessionForRegister } from "./form.js";
const REGISTER_EMAIL_MAX_CHARACTERS = 320;
const REGISTER_USERNAME_MAX_CHARACTERS = 25;
const REGISTER_DISPLAY_NAME_MAX_CHARACTERS = 80;

/**
 * Mounts the registration page into the provided root element.
 *
 * @param {HTMLElement} root - Target app container.
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<void>} Resolves when the page has finished initialising.
 */
export async function mount(root, { signal } = {}) {
    const hadStoredSession = await resetAuthSessionForRegister();

    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/auth/languages",
            "/static/gateways/registration/languages",
        ],
    });
    await loadAuthFooterPlugins().catch(() => {
        showToast(i18n.t("ui.reuse.error"), { variant: "error" });
    });
    const registrationIntegrations = [];
    let registrationIntegrationsReady = false;
    applyDocumentTitle(i18n, "ui.page.title.register");
    if (hadStoredSession) {
        showToast(i18n.t("ui.app.register.reason.session_cleared"), {
            variant: "info",
        });
    }

    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    const token = String(tokenParam ?? "").trim();
    const hasTokenParam = tokenParam !== null;
    const accountCreationAuthorization = readAccountCreationAuthorization(
        await getPendingAccountCreation().catch(() => null),
    );
    const prefilledEmail = String(params.get("email") ?? "")
        .trim()
        .toLowerCase();
    const knownErrorCodes = REGISTRATION_ERROR_CODES;

    let inviteData = null;
    let tokenInvalid = false;
    let inviteAdapterDisabled = false;
    let openRegistrationsEnabled = false;
    let requiredFields = [];
    let invalidTokenToastToken = null;
    let availableLanguages = [];
    let selectedLanguage = DEFAULT_LOCALE;
    let passwordPolicy = { ...DEFAULT_PASSWORD_POLICY };

    if (token) {
        try {
            const response = await fetch(
                `/api/v1/registration/invite?token=${encodeURIComponent(token)}`,
            );
            if (response.ok) {
                const payload = await response.json();
                inviteData = payload.data ?? null;
            } else {
                const payload = await response.json().catch(() => null);
                const code = String(payload?.error?.code ?? "");
                if (code === "invite_disabled") {
                    inviteAdapterDisabled = true;
                } else {
                    tokenInvalid = true;
                }
            }
        } catch {
            inviteData = null;
            tokenInvalid = true;
        }
    } else if (hasTokenParam) {
        tokenInvalid = true;
    }

    try {
        const registrationConfig = await loadRegistrationConfig();
        if (!token && !hasTokenParam) {
            openRegistrationsEnabled = registrationConfig.registrationsEnabled;
        }
        requiredFields = registrationConfig.requiredFields;
        const loaded = await loadRegistrationIntegrations({
            descriptors: registrationConfig.integrations,
            loadModule: (scriptUrl) => import(scriptUrl),
            loadI18n: (stringsBaseUrl) => extendI18n(i18n, stringsBaseUrl),
            onError: (error, descriptor) => {
                console.error(
                    JSON.stringify({
                        level: "error",
                        component: "register-page",
                        operation: "load-registration-integration",
                        integrationId: String(descriptor.id),
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    }),
                );
                showToast(i18n.t("ui.app.register.error.generic"), {
                    variant: "error",
                });
            },
        });
        registrationIntegrations.push(...loaded.integrations);
        registrationIntegrationsReady = loaded.ready;
    } catch (error) {
        console.error(
            JSON.stringify({
                level: "error",
                component: "register-page",
                operation: "load-registration-configuration",
                error: error instanceof Error ? error.message : String(error),
            }),
        );
        showToast(i18n.t("ui.app.register.error.generic"), {
            variant: "error",
        });
        if (!token && !hasTokenParam) openRegistrationsEnabled = false;
    }

    try {
        const policyRes = await fetch("/api/v1/auth/password-policy");
        if (policyRes.ok) {
            const policyPayload = await policyRes.json();
            passwordPolicy = normalizePasswordPolicy(
                policyPayload?.data,
                passwordPolicy,
            );
        }
    } catch {
        // Use defaults when policy endpoint is unreachable.
    }

    try {
        const langRes = await fetch("/api/v1/system/languages");
        if (langRes.ok) {
            const langPayload = await langRes.json();
            availableLanguages = langPayload.data ?? [];
        }
    } catch {
        availableLanguages = [];
    }

    (function detectInitialLanguage() {
        const supportedLanguageCodes = availableLanguages.map(
            (languageOption) => languageOption.key,
        );
        selectedLanguage = selectSupportedLanguage(
            [i18n.locale, ...readPreferredLanguages()],
            supportedLanguageCodes,
            DEFAULT_LOCALE,
        );
    })();
    const typingSamples = await loadAuthTypingSamples(i18n);

    function createRegisterFormBuilder({
        emailValue,
        emailLocked,
        emailRequired,
    }) {
        const passwordCriteria = buildPasswordCriteria(passwordPolicy);
        const registerFormFields = [
            {
                name: "email",
                labelKey: "ui.app.register.email",
                type: "email",
                value: emailValue,
                disabled: emailLocked,
                required: emailRequired,
                maxCharacters: REGISTER_EMAIL_MAX_CHARACTERS,
                className: emailLocked ? "auth-input--locked" : "",
            },
            {
                name: "username",
                labelKey: "ui.app.register.username",
                type: "text",
                required: true,
                maxCharacters: REGISTER_USERNAME_MAX_CHARACTERS,
                criteria: [
                    {
                        id: "username-printable-ascii",
                        type: "custom",
                        test: (value) =>
                            value.length === 0 ||
                            /^[a-zA-Z0-9_-]+$/.test(value),
                        messageKey: "ui.app.register.error.username_invalid",
                        mode: "live",
                    },
                    {
                        id: "username-lowercase",
                        type: "custom",
                        test: (value) => value === value.toLowerCase(),
                        messageKey:
                            "ui.app.register.error.username_not_lowercase",
                        mode: "live",
                    },
                    {
                        id: "username-max-length",
                        type: "maxLength",
                        value: REGISTER_USERNAME_MAX_CHARACTERS,
                        messageKey: "ui.app.register.error.username_too_long",
                        mode: "live",
                    },
                ],
                criteriaDisplay: "floating-alert",
                floatingTitleKey: "ui.app.register.username_requirements",
            },
            {
                name: "displayName",
                labelKey: "ui.app.register.display_name",
                type: "text",
                maxCharacters: REGISTER_DISPLAY_NAME_MAX_CHARACTERS,
            },
            {
                name: "password",
                labelKey: "ui.app.register.password",
                type: "password",
                required: true,
                criteria: passwordCriteria,
                criteriaDisplay: "floating-alert",
                floatingTitleKey: "ui.app.register.password_requirements",
            },
            {
                name: "confirmPassword",
                labelKey: "ui.app.register.confirm_password",
                type: "password",
                required: true,
                criteria: [
                    {
                        id: "confirm-password-match",
                        type: "custom",
                        test: (value, values) => {
                            const passwordValue = String(
                                values?.password ?? "",
                            );
                            if (passwordValue.length === 0) {
                                return null;
                            }
                            return value === passwordValue;
                        },
                        messageKey: "ui.app.register.passwords_match",
                        mode: "live",
                    },
                ],
            },
        ];
        if (availableLanguages.length > 1) {
            registerFormFields.push({
                name: "language",
                labelKey: "ui.reuse.language",
                type: "select",
                value: selectedLanguage,
                options: availableLanguages.map((languageOption) => ({
                    value: languageOption.key,
                    label: languageOption.name,
                })),
            });
        }
        for (const integration of registrationIntegrations) {
            try {
                const field = integration.module.createRegistrationField?.({
                    i18n: integration.i18n,
                    descriptor: integration.descriptor,
                });
                if (field) registerFormFields.push(field);
            } catch (error) {
                if (
                    Object.hasOwn(
                        integration.descriptor,
                        "onboardingOperations",
                    )
                ) {
                    registrationIntegrationsReady = false;
                    showToast(i18n.t("ui.app.register.error.generic"), {
                        variant: "error",
                    });
                }
                console.error(
                    JSON.stringify({
                        level: "error",
                        component: "register-page",
                        operation: "create-registration-field",
                        integrationId: String(integration.descriptor.id),
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    }),
                );
            }
        }
        return createFormBuilder(
            { i18n, escapeHtml },
            {
                formId: "register-form",
                submitButtonClassName:
                    "btn-confirm btn-animated auth-form-action",
                submitLabelKey: "ui.app.register.submit",
                fields: registerFormFields,
            },
        );
    }

    function renderRegisterShell() {
        const accountCreationHtml = renderAccountCreationAuthorization({
            integrations: registrationIntegrations,
            request: accountCreationAuthorization,
            escapeHtml,
        });
        const isInviteFlow = Boolean(token);
        const isInvalid =
            isInviteFlow && tokenInvalid && !inviteAdapterDisabled;
        const canRenderForm =
            registrationIntegrationsReady &&
            (isInviteFlow
                ? Boolean(inviteData) && !isInvalid && !inviteAdapterDisabled
                : openRegistrationsEnabled);

        let formHtml = "";
        let messageHtml = "";

        if (accountCreationHtml && registrationIntegrationsReady) {
            formHtml = accountCreationHtml;
        } else if (isInvalid) {
            messageHtml = renderInPageCallout({
                variant: "danger",
                title: i18n.t("ui.reuse.error"),
            });
        } else if (!canRenderForm) {
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
            const countdownHtml = inviteData?.expiresAt
                ? `<p id="register-countdown" class="auth-countdown-pill" aria-live="off"></p>`
                : "";
            const registerFormBuilder = createRegisterFormBuilder({
                emailValue,
                emailLocked,
                emailRequired: requiredFields.includes("email"),
            });
            const emailVerifyNoticeHtml =
                !isInviteFlow && requiredFields.includes("email")
                    ? renderInPageCallout({
                          variant: "info",
                          body: i18n.t("ui.app.register.email_verify_notice"),
                      })
                    : "";
            formHtml = `
      ${invitedText ? `<p class="auth-intro">${escapeHtml(invitedText)}</p>` : ""}
      ${countdownHtml}
      ${emailVerifyNoticeHtml}
      <div class="auth-form-shell">
        ${registerFormBuilder.render()}
      </div>
    `;
        }

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
        const formPanelHtml = `
      ${mobileBrandlineHtml}
      <h2 class="auth-heading">${escapeHtml(i18n.t("ui.app.register.form_title"))}</h2>
      ${messageHtml}
      ${formHtml}
      <div class="auth-form">
        <a id="register-signin-instead" href="/login" class="btn-neutral btn-animated auth-form-action">${escapeHtml(i18n.t("ui.reuse.sign_in_instead"))}</a>
      </div>
      ${renderAuthFooter()}
    `;
        return renderAuthLayout({
            introPanelAriaLabel: i18n.t("ui.app.login.intro.aria"),
            introPanelHtml,
            formPanelAriaLabel: i18n.t("ui.app.register.form_title"),
            formPanelHtml,
        });
    }

    async function promptVerificationCodeForRegister(emailAddress) {
        let inputEl = null;
        const action = await openPopup({
            signal,
            title: i18n.t("ui.app.settings.emails_verify_title"),
            body: () => `
      <p>${escapeHtml(i18n.t("ui.app.register.verify_email_prompt").replace("{email}", emailAddress))}</p>
      <label class="stack">
        <span>${escapeHtml(i18n.t("ui.app.settings.emails_verify_submit"))}</span>
        <input id="reg-verify-code-input" type="text" inputmode="numeric" maxlength="6" />
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
                inputEl = overlay.querySelector("#reg-verify-code-input");
            },
        });
        if (action !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
            return null;
        }
        return inputEl.value.trim();
    }

    const completion = createRegistrationCompletion({
        createAccount: (account) =>
            token
                ? redeemRegistrationInvite({ ...account, token })
                : registerPublicAccount(account),
        createClient: (credential) =>
            createOnboardingClient(credential, { signal }),
        verifyEmail: (executeOnboarding, email, operations) =>
            verifyRegistrationEmail({
                executeOnboarding,
                email,
                operations,
                required: requiredFields.includes("email"),
                prompt: promptVerificationCodeForRegister,
                onInvalid: () =>
                    showToast(i18n.t("ui.app.settings.emails_verify_invalid"), {
                        variant: "error",
                    }),
                signal,
            }),
        integrations: registrationIntegrations,
        signal,
        reportCleanupError: (error) =>
            console.error(
                JSON.stringify({
                    level: "error",
                    component: "register-page",
                    operation: "revoke-onboarding",
                    error:
                        error instanceof Error ? error.message : String(error),
                }),
            ),
    });
    window.addEventListener("pagehide", completion.dispose, {
        once: true,
        ...(signal ? { signal } : {}),
    });

    const composer = createPageComposer(root, {
        allowCustomization: false,
        i18n,
        preferenceKey: "register-layout",
        pageContext: {
            title: i18n.t("ui.app.register.form_title"),
            subtitle: i18n.t("ui.app.register.page_subtitle"),
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
                id: "register-shell",
                label: i18n.t("ui.app.register.form_title"),
                pinned: true,
                gridSize: {
                    default: [12, 6],
                    min: [8, 5],
                    max: ["full", "fill"],
                },
                render: () => renderRegisterShell(),
                onRender: () => {
                    mountAuthFooter(root, { i18n, signal });
                    runTypingShowcase(typingSamples);

                    if (tokenInvalid && invalidTokenToastToken !== token) {
                        invalidTokenToastToken = token;
                        showToast(
                            i18n.t("ui.app.register.error.invalid_token"),
                            {
                                variant: "error",
                                permanent: true,
                            },
                        );
                    }

                    if (inviteData?.expiresAt) {
                        const expiresAtMs = new Date(
                            inviteData.expiresAt,
                        ).getTime();
                        let countdownTimer = null;
                        function updateCountdown() {
                            const countdown = root.querySelector(
                                "#register-countdown",
                            );
                            if (!countdown) {
                                clearInterval(countdownTimer);
                                return;
                            }
                            const remaining = expiresAtMs - Date.now();
                            if (remaining <= 0) {
                                countdown.textContent = i18n.t(
                                    "ui.app.register.token_expired",
                                );
                                clearInterval(countdownTimer);
                                return;
                            }
                            countdown.textContent = i18n
                                .t("ui.app.register.token_expires_in")
                                .replace(
                                    "{countdown}",
                                    formatCountdownClock(remaining),
                                );
                        }
                        updateCountdown();
                        countdownTimer = setInterval(updateCountdown, 1000);
                    }

                    if (
                        bindAccountCreationAuthorization({
                            integrations: registrationIntegrations,
                            request: accountCreationAuthorization,
                            root,
                            showToast,
                            signal,
                            formatCountdownClock,
                        })
                    ) {
                        return;
                    }

                    const form = root.querySelector("#register-form");
                    if (!(form instanceof HTMLFormElement)) return;
                    const inviteEmail =
                        token && inviteData ? inviteData.inviteeEmail : "";
                    const lockedEmail = inviteEmail || prefilledEmail;
                    const registerFormBuilder = createRegisterFormBuilder({
                        emailValue: lockedEmail || "",
                        emailLocked: Boolean(lockedEmail),
                        emailRequired: requiredFields.includes("email"),
                    });
                    const formController = registerFormBuilder.attach(form, {
                        signal: signal ?? undefined,
                    });
                    bindConfirmPasswordRevalidation({
                        form,
                        formController,
                        passwordFieldName: "password",
                        confirmFieldName: "confirmPassword",
                        signal,
                    });
                    const languageSelect = form.elements.namedItem("language");
                    if (languageSelect instanceof HTMLSelectElement) {
                        languageSelect.addEventListener(
                            "change",
                            () => {
                                selectedLanguage = languageSelect.value;
                            },
                            signal ? { signal } : undefined,
                        );
                    }

                    form.addEventListener(
                        "submit",
                        async (event) => {
                            event.preventDefault();
                            if (!registrationIntegrationsReady) {
                                showToast(
                                    i18n.t("ui.app.register.error.generic"),
                                    { variant: "error" },
                                );
                                return;
                            }
                            if (!formController.validateAll(true)) {
                                showToast(
                                    i18n.t(
                                        "ui.app.register.error.validation_failed",
                                    ),
                                    { variant: "error" },
                                );
                                return;
                            }
                            const email = String(form.email.value ?? "")
                                .trim()
                                .toLowerCase();
                            const username = String(
                                form.username.value ?? "",
                            ).trim();
                            const displayName = String(
                                form.displayName.value ?? "",
                            ).trim();
                            const password = String(form.password.value ?? "");
                            const confirmPassword = String(
                                form.confirmPassword.value ?? "",
                            );
                            const chosenLanguage =
                                form.language?.value ?? selectedLanguage;
                            const registrationValues = Object.fromEntries(
                                new FormData(form).entries(),
                            );
                            for (const integration of registrationIntegrations) {
                                let validationMessage;
                                try {
                                    validationMessage =
                                        await integration.module.validateRegistration?.(
                                            {
                                                values: registrationValues,
                                                i18n: integration.i18n,
                                            },
                                        );
                                } catch (error) {
                                    showToast(
                                        i18n.t("ui.app.register.error.generic"),
                                        { variant: "error" },
                                    );
                                    console.error(
                                        JSON.stringify({
                                            level: "error",
                                            component: "auth",
                                            operation:
                                                "validateRegistrationIntegration",
                                            integrationId: integration.id,
                                            error:
                                                error instanceof Error
                                                    ? error.message
                                                    : String(error),
                                        }),
                                    );
                                    return;
                                }
                                if (validationMessage) {
                                    showToast(validationMessage, {
                                        variant: "error",
                                    });
                                    return;
                                }
                            }
                            if (password !== confirmPassword) {
                                showToast(
                                    i18n.t(
                                        "ui.app.register.error.password_mismatch",
                                    ),
                                    { variant: "error" },
                                );
                                return;
                            }
                            try {
                                const result = await completion.run({
                                    account: {
                                        username,
                                        displayName,
                                        password,
                                        email,
                                    },
                                    values: registrationValues,
                                    invite: Boolean(token),
                                });
                                if (
                                    result.outcome !== "completed" ||
                                    signal?.aborted
                                )
                                    return;
                                setPreferredLanguages(
                                    sanitizeLanguagePriority([
                                        chosenLanguage,
                                        DEFAULT_LOCALE,
                                    ]),
                                    {
                                        mode: "manual",
                                    },
                                );
                                showToast(i18n.t("ui.app.register.success"), {
                                    variant: "success",
                                });
                                window.setTimeout(() => {
                                    if (completion.isCurrent())
                                        window.location.href = "/login";
                                }, 1200);
                            } catch (error) {
                                if (!completion.isCurrent()) return;
                                console.error(
                                    JSON.stringify({
                                        level: "error",
                                        component: "register-page",
                                        operation: "complete-registration",
                                        error:
                                            error instanceof Error
                                                ? error.message
                                                : String(error),
                                    }),
                                );
                                showToast(
                                    error.code === "registrations_disabled"
                                        ? i18n.t("ui.app.register.closed")
                                        : i18n.t(
                                              `ui.app.register.error.${knownErrorCodes.has(error.code) ? error.code : "generic"}`,
                                          ),
                                    { variant: "error" },
                                );
                                if (error.accountCreated) {
                                    window.setTimeout(() => {
                                        if (completion.isCurrent())
                                            window.location.href = "/login";
                                    }, 1200);
                                }
                            }
                        },
                        signal ? { signal } : undefined,
                    );
                },
            },
        ],
    });

    await composer.init();
}

await mountWhenDirect(mount);
