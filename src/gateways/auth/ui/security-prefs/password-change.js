import { createFormBuilder } from "/static/reuse/form-builder.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    DEFAULT_PASSWORD_POLICY,
    countPatternMatches,
    normalizePasswordPolicy,
} from "/static/gateways/auth/password-policy.js";

async function loadPasswordPolicy(apiFetch) {
    const response = await apiFetch("/api/v1/auth/password-policy").catch(
        () => null,
    );
    if (!response?.ok) {
        return { ...DEFAULT_PASSWORD_POLICY };
    }
    const payload = await response.json().catch(() => null);
    return normalizePasswordPolicy(payload?.data, DEFAULT_PASSWORD_POLICY);
}

function buildFormPasswordCriteria(policy) {
    const criteria = [];
    if (policy.minLength > 0) {
        const minLength = policy.minLength;
        criteria.push({
            id: "password-min-length",
            type: "custom",
            test: (value) => value.length >= minLength,
            messageKey: "gateway.auth.security.password_too_short",
            messageParams: { min: minLength },
            mode: "live",
        });
    }
    if (policy.requireUppercase > 0) {
        const minUppercaseCount = policy.requireUppercase;
        criteria.push({
            id: "password-uppercase-count",
            type: "custom",
            test: (value) =>
                countPatternMatches(value, /[A-Z]/g) >= minUppercaseCount,
            messageKey: "gateway.auth.security.password_requires_uppercase",
            messageParams: { count: minUppercaseCount },
            mode: "live",
        });
    }
    if (policy.requireLowercase > 0) {
        const minLowercaseCount = policy.requireLowercase;
        criteria.push({
            id: "password-lowercase-count",
            type: "custom",
            test: (value) =>
                countPatternMatches(value, /[a-z]/g) >= minLowercaseCount,
            messageKey: "gateway.auth.security.password_requires_lowercase",
            messageParams: { count: minLowercaseCount },
            mode: "live",
        });
    }
    if (policy.requireDigit > 0) {
        const minDigitCount = policy.requireDigit;
        criteria.push({
            id: "password-digit-count",
            type: "custom",
            test: (value) =>
                countPatternMatches(value, /[0-9]/g) >= minDigitCount,
            messageKey: "gateway.auth.security.password_requires_digit",
            messageParams: { count: minDigitCount },
            mode: "live",
        });
    }
    if (policy.requireSpecial > 0) {
        const minSpecialCount = policy.requireSpecial;
        criteria.push({
            id: "password-special-count",
            type: "custom",
            test: (value) =>
                countPatternMatches(value, /[^A-Za-z0-9]/g) >= minSpecialCount,
            messageKey: "gateway.auth.security.password_requires_special",
            messageParams: { count: minSpecialCount },
            mode: "live",
        });
    }
    return criteria;
}

export async function openPasswordChangePopup({
    i18n,
    apiFetch,
    openPopup,
    showToast,
}) {
    const policy = await loadPasswordPolicy(apiFetch);
    const passwordCriteria = buildFormPasswordCriteria(policy);

    const formBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "auth-password-change-form",
            formClassName: "auth-password-change-form",
            includeSubmitButton: false,
            submitLabelKey: "ui.reuse.save",
            fields: [
                {
                    name: "currentPassword",
                    labelKey: "gateway.auth.security.current_password",
                    type: "password",
                    required: true,
                    attributes: { autocomplete: "current-password" },
                },
                {
                    name: "nextPassword",
                    labelKey: "gateway.auth.security.new_password",
                    type: "password",
                    required: true,
                    criteria: passwordCriteria,
                    criteriaDisplay:
                        passwordCriteria.length > 0
                            ? "floating-alert"
                            : "inline",
                    floatingTitleKey: "ui.app.register.password_requirements",
                    attributes: { autocomplete: "new-password" },
                },
                {
                    name: "confirmPassword",
                    labelKey: "gateway.auth.security.confirm_password",
                    type: "password",
                    required: true,
                    criteria: [
                        {
                            id: "confirm-password-match",
                            type: "custom",
                            test: (value, values) => {
                                const passwordValue = String(
                                    values?.nextPassword ?? "",
                                );
                                // Return null (indeterminate) until the password field
                                // has content, matching the registration form pattern.
                                // This avoids showing a red error before the user has
                                // started filling in the new password field.
                                if (passwordValue.length === 0) return null;
                                return value === passwordValue;
                            },
                            messageKey:
                                "ui.app.register.error.password_mismatch",
                            mode: "live",
                        },
                    ],
                    attributes: { autocomplete: "new-password" },
                },
            ],
        },
    );

    let formController = null;

    const popupResult = await openPopup({
        title: i18n.t("gateway.auth.security.popup_title"),
        maxWidth: "420px",
        body: () => formBuilder.render(),
        actions: [
            {
                id: "save",
                label: i18n.t("ui.reuse.save"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        closeProtection: true,
        onOpen: (overlay) => {
            const formElement = overlay.querySelector(
                "#auth-password-change-form",
            );
            if (formElement instanceof HTMLFormElement) {
                formController = formBuilder.attach(formElement);
            }
        },
        onAction: (actionId) => {
            if (actionId !== "save") return true;
            if (!formController) return false;
            return formController.validateAll(true);
        },
    });

    if (popupResult !== "save" || !formController) {
        return;
    }

    const values = formController.getValues();
    const currentPassword = String(values.currentPassword ?? "");
    const nextPassword = (values.nextPassword ?? "").trim();
    const confirmPassword = (values.confirmPassword ?? "").trim();
    if (!currentPassword.length || !nextPassword || !confirmPassword) {
        showToast(i18n.t("gateway.auth.security.required"), {
            variant: "warning",
        });
        return;
    }

    const response = await apiFetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            currentPassword,
            password: nextPassword,
        }),
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        showToast(
            payload?.error?.message ||
                i18n.t("gateway.auth.security.reset_failed"),
            {
                variant: "error",
            },
        );
        return;
    }
    localStorage.removeItem("cognis_access_token");
    showToast(i18n.t("gateway.auth.security.reset_success"), {
        variant: "success",
    });
    setTimeout(() => {
        window.location.href = "/login?reason=session_expired";
    }, 500);
}
