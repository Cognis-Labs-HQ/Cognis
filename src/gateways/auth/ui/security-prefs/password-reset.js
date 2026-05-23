import { attachCriteriaCheck } from "/static/reuse/criteria-check.js";
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

function buildPasswordCriteria(i18n, policy) {
    const criteria = [];
    if (policy.minLength > 0) {
        const minLength = policy.minLength;
        criteria.push({
            test: (value) => value.length >= minLength,
            message: i18n
                .t("gateway.auth.security.password_too_short")
                .replace("{min}", String(minLength)),
        });
    }
    if (policy.requireUppercase > 0) {
        criteria.push({
            test: (value) =>
                countPatternMatches(value, /[A-Z]/g) >= policy.requireUppercase,
            message: i18n
                .t("gateway.auth.security.password_requires_uppercase")
                .replace("{count}", String(policy.requireUppercase)),
        });
    }
    if (policy.requireLowercase > 0) {
        const minLowercaseCount = policy.requireLowercase;
        criteria.push({
            test: (value) =>
                countPatternMatches(value, /[a-z]/g) >= minLowercaseCount,
            message: i18n
                .t("gateway.auth.security.password_requires_lowercase")
                .replace("{count}", String(minLowercaseCount)),
        });
    }
    if (policy.requireDigit > 0) {
        criteria.push({
            test: (value) =>
                countPatternMatches(value, /[0-9]/g) >= policy.requireDigit,
            message: i18n
                .t("gateway.auth.security.password_requires_digit")
                .replace("{count}", String(policy.requireDigit)),
        });
    }
    if (policy.requireSpecial > 0) {
        criteria.push({
            test: (value) =>
                countPatternMatches(value, /[^A-Za-z0-9]/g) >=
                policy.requireSpecial,
            message: i18n
                .t("gateway.auth.security.password_requires_special")
                .replace("{count}", String(policy.requireSpecial)),
        });
    }
    return criteria;
}

export async function openPasswordResetPopup({
    i18n,
    apiFetch,
    openPopup,
    showToast,
}) {
    const policy = await loadPasswordPolicy(apiFetch);
    const passwordCriteria = buildPasswordCriteria(i18n, policy);

    let formElement = null;
    let criteriaCheckController = null;
    let mismatchController = null;

    const popupResult = await openPopup({
        title: i18n.t("gateway.auth.security.popup_title"),
        maxWidth: "420px",
        body: () => `
        <form class="auth-password-reset-form">
          <label>
            ${i18n.t("gateway.auth.security.new_password")}
            <input type="password" name="nextPassword" autocomplete="new-password" required />
          </label>
          <label>
            ${i18n.t("gateway.auth.security.confirm_password")}
            <input type="password" name="confirmPassword" autocomplete="new-password" required />
          </label>
        </form>
      `,
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
        onOpen: (overlay) => {
            formElement = overlay.querySelector(".auth-password-reset-form");
            if (!formElement) return;
            const nextPasswordInput =
                formElement.elements.namedItem("nextPassword");
            const confirmPasswordInput =
                formElement.elements.namedItem("confirmPassword");
            if (
                !(nextPasswordInput instanceof HTMLInputElement) ||
                !(confirmPasswordInput instanceof HTMLInputElement) ||
                passwordCriteria.length === 0
            ) {
                return;
            }
            criteriaCheckController = attachCriteriaCheck(
                nextPasswordInput,
                passwordCriteria,
                {
                    genericMessage: i18n.t(
                        "gateway.auth.security.password_policy",
                    ),
                },
            );
            mismatchController = attachCriteriaCheck(
                confirmPasswordInput,
                [
                    {
                        test: (value) => value === nextPasswordInput.value,
                        message: i18n.t(
                            "ui.app.register.error.password_mismatch",
                        ),
                    },
                ],
                {},
            );
        },
    });

    criteriaCheckController?.detach();
    mismatchController?.detach();

    if (popupResult !== "save" || !formElement) {
        return;
    }

    const formData = new FormData(formElement);
    const nextPassword = String(formData.get("nextPassword") ?? "").trim();
    const confirmPassword = String(
        formData.get("confirmPassword") ?? "",
    ).trim();
    if (!nextPassword || !confirmPassword) {
        showToast(i18n.t("gateway.auth.security.required"), {
            variant: "warning",
        });
        return;
    }
    if (nextPassword !== confirmPassword) {
        showToast(i18n.t("ui.app.register.error.password_mismatch"), {
            variant: "warning",
        });
        return;
    }

    const response = await apiFetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
