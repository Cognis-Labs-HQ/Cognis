import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { attachCriteriaCheck } from "/static/reuse/criteria-check.js";
import {
    DEFAULT_PASSWORD_POLICY,
    countPatternMatches,
    normalizePasswordPolicy,
} from "/static/reuse/password-policy.js";

export function createSettingsSection({ i18n, root }) {
    let capability = null;
    let lastUnsupportedToastKey = null;
    const settingsRoot = root ?? document;

    async function loadCapability() {
        const response = await apiFetch(
            "/api/v1/auth/password-change-capability",
        );
        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            console.warn(
                "[settings:security] password change capability lookup failed",
                {
                    status: response.status,
                    message: payload?.error?.message,
                },
            );
            capability = {
                supported: false,
                reason:
                    payload?.error?.message ||
                    i18n.t("gateway.auth.security.load_failed"),
            };
            return;
        }
        const payload = await response.json();
        capability = payload.data ?? null;
    }

    async function loadPasswordPolicy() {
        const response = await apiFetch("/api/v1/auth/password-policy").catch(
            () => null,
        );
        if (!response?.ok) {
            return { ...DEFAULT_PASSWORD_POLICY };
        }
        const payload = await response.json().catch(() => null);
        return normalizePasswordPolicy(payload?.data, DEFAULT_PASSWORD_POLICY);
    }

    function buildPasswordCriteria(policy) {
        const criteria = [];
        if (policy.minLength > 0) {
            const minLen = policy.minLength;
            criteria.push({
                test: (value) => value.length >= minLen,
                message: i18n
                    .t("gateway.auth.security.password_too_short")
                    .replace("{min}", String(minLen)),
            });
        }
        if (policy.requireUppercase > 0) {
            criteria.push({
                test: (value) =>
                    countPatternMatches(value, /[A-Z]/g) >=
                    policy.requireUppercase,
                message: i18n
                    .t("gateway.auth.security.password_requires_uppercase")
                    .replace("{count}", String(policy.requireUppercase)),
            });
        }
        if (policy.requireLowercase) {
            criteria.push({
                test: (value) => /[a-z]/.test(value),
                message: i18n.t(
                    "gateway.auth.security.password_requires_lowercase",
                ),
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

    function renderBody() {
        if (!capability) {
            return `<p>${i18n.t("gateway.auth.security.loading")}</p>`;
        }
        const disabled = capability?.supported === true ? "" : " disabled";
        const reason =
            capability?.supported === true
                ? ""
                : `<p>${escapeHtml(
                      capability?.reason ||
                          i18n.t("gateway.auth.security.unsupported_default"),
                  )}</p>`;
        return `
      <div class="settings-auth-password-reset">
        <h3>${i18n.t("gateway.auth.security.reset_title")}</h3>
        ${reason}
        <button class="btn-animated" type="button" id="settings-reset-password-btn"${disabled}>${i18n.t("gateway.auth.security.reset_action")}</button>
      </div>
    `;
    }

    function renderContent() {
        return `<div id="auth-security-reset-panel">${renderBody()}</div>`;
    }

    async function openPasswordResetPopup() {
        const policy = await loadPasswordPolicy();
        const passwordCriteria = buildPasswordCriteria(policy);

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
                formElement = overlay.querySelector(
                    ".auth-password-reset-form",
                );
                if (formElement) {
                    const nextPasswordInput =
                        formElement.elements.namedItem("nextPassword");
                    const confirmPasswordInput =
                        formElement.elements.namedItem("confirmPassword");
                    if (
                        nextPasswordInput instanceof HTMLInputElement &&
                        confirmPasswordInput instanceof HTMLInputElement &&
                        passwordCriteria.length > 0
                    ) {
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
                                    test: (value) =>
                                        value === nextPasswordInput.value,
                                    message: i18n.t(
                                        "ui.app.register.error.password_mismatch",
                                    ),
                                },
                            ],
                            {},
                        );
                    }
                }
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

    return {
        id: "security",
        label: i18n.t("gateway.auth.security.section_title"),
        heading: i18n.t("gateway.auth.security.section_title"),
        preferenceKey: "settings-security-layout",
        renderContent,
        async onRender() {
            await loadCapability();
            const panel = settingsRoot.querySelector(
                "#auth-security-reset-panel",
            );
            if (panel) {
                panel.innerHTML = renderBody();
            }
            if (capability?.supported === true) {
                lastUnsupportedToastKey = null;
            }
            const unsupportedToastKey =
                capability?.supported === false
                    ? `${capability.adapterId || "unknown"}:${capability.reason || ""}`
                    : null;
            if (
                capability?.supported === false &&
                unsupportedToastKey &&
                unsupportedToastKey !== lastUnsupportedToastKey
            ) {
                lastUnsupportedToastKey = unsupportedToastKey;
                showToast(
                    capability.reason ||
                        i18n.t("gateway.auth.security.unsupported_default"),
                    {
                        variant: "warning",
                    },
                );
            }
            const button = settingsRoot.querySelector(
                "#settings-reset-password-btn",
            );
            if (!button) {
                return;
            }
            button.onclick = () => {
                openPasswordResetPopup();
            };
        },
        isDirty: () => false,
        save: async () => undefined,
        commit: () => undefined,
        discard: () => undefined,
    };
}
