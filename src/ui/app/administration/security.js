import { apiFetch } from "../../reuse/api-client.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import {
    DEFAULT_PASSWORD_POLICY,
    normalizePasswordPolicy,
    parsePolicyCount,
} from "/static/gateways/auth/password-policy.js";
import {
    clearTrustedDomainsCache,
    normalizeTrustedDomains,
} from "../../reuse/trusted-domains.js";
import { isSmtpAdapterActive } from "/static/gateways/notify/smtp-adapter.js";

const POLICY_FIELDS = [
    {
        key: "minLength",
        id: "security-policy-min-length",
        min: 1,
        i18nSuffix: "policy_min_length",
    },
    {
        key: "requireUppercase",
        id: "security-policy-require-uppercase",
        min: 0,
        i18nSuffix: "policy_require_uppercase",
    },
    {
        key: "requireLowercase",
        id: "security-policy-require-lowercase",
        min: 0,
        i18nSuffix: "policy_require_lowercase",
    },
    {
        key: "requireDigit",
        id: "security-policy-require-digit",
        min: 0,
        i18nSuffix: "policy_require_digit",
    },
    {
        key: "requireSpecial",
        id: "security-policy-require-special",
        min: 0,
        i18nSuffix: "policy_require_special",
    },
];

/**
 * Security sub-module for the Administration page.
 *
 * Manages system-level security settings for trusted domains, registration
 * controls, user-validation mode, teacher approval requirements, and password
 * policy controls.
 *
 * Public exports:
 *   initSecuritySection(root, options) — initialises the security section.
 *
 * Usage:
 *   const security = initSecuritySection(root, { i18n, onDirtyChange });
 *   await security.init();
 *   await security.save();
 *   security.discard();
 *
 * @param {Element} root
 * @param {{ i18n: object, onDirtyChange?: (dirty: boolean) => void }} options
 * @returns {{ init: () => Promise<void>, refresh: () => Promise<void>, save: () => Promise<void>, discard: () => void, renderContent: () => string }}
 */
export function initSecuritySection(root, { i18n, onDirtyChange }) {
    let originalDomains = [];
    let currentPublicRegistrationEnabled = false;
    let originalUserValidationMode = "none";
    let currentUserValidationMode = "none";
    let originalTeacherManualApproval = true;
    let originalEnforceTfaForAllUsers = false;
    let originalPasswordPolicy = { ...DEFAULT_PASSWORD_POLICY };
    let smtpAdapterActive = false;
    let initialized = false;

    async function loadSettings() {
        const response = await apiFetch("/api/v1/system/security");
        if (!response.ok) {
            return {
                trustedDomains: [],
                enforceTfaForAllUsers: false,
            };
        }
        const payload = await response.json();
        return (
            payload.data ?? {
                trustedDomains: [],
                enforceTfaForAllUsers: false,
            }
        );
    }

    async function loadPasswordPolicy() {
        const response = await apiFetch("/api/v1/auth/password-policy");
        if (!response.ok) {
            return { ...DEFAULT_PASSWORD_POLICY };
        }
        const payload = await response.json();
        return normalizePasswordPolicy(payload?.data, originalPasswordPolicy);
    }

    async function loadPublicRegistrationAdapterState() {
        const response = await apiFetch(
            "/api/v1/gateways/registration/adapters",
        );
        if (!response.ok) return false;
        const payload = await response.json();
        const adapters = Array.isArray(payload?.data) ? payload.data : [];
        const publicAdapter = adapters.find((entry) => entry.id === "public");
        return publicAdapter?.enabled === true;
    }

    async function persistSettings(
        trustedDomains,
        registrationsEnabled,
        userValidationMode,
        requireTeacherManualApproval,
        enforceTfaForAllUsers,
    ) {
        const response = await apiFetch("/api/v1/system/security", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                trustedDomains,
                registrationsEnabled,
                userValidationMode,
                requireTeacherManualApproval,
                enforceTfaForAllUsers,
            }),
        });
        if (!response.ok) throw new Error("save_failed");
    }

    async function persistPasswordPolicy(passwordPolicy) {
        const response = await apiFetch("/api/v1/auth/password-policy", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(passwordPolicy),
        });
        if (!response.ok) throw new Error("save_failed");
    }

    function parseDomains(raw) {
        return normalizeTrustedDomains(raw.split(","));
    }

    function getInputValue() {
        const input = root.querySelector("#security-trusted-domains");
        return input instanceof HTMLInputElement ? input.value : "";
    }

    function getValidationModeValue() {
        if (!smtpAdapterActive) return "none";
        const select = root.querySelector("#security-user-validation-mode");
        if (!(select instanceof HTMLSelectElement)) return "none";
        return select.value === "smtp" ? "smtp" : "none";
    }

    function getRegistrationsEnabledValue() {
        const input = root.querySelector("#security-enable-registrations");
        if (!(input instanceof HTMLInputElement)) return false;
        return input.checked;
    }

    function getTeacherManualApprovalValue() {
        const input = root.querySelector("#security-require-teacher-approval");
        if (!(input instanceof HTMLInputElement)) return true;
        return input.checked;
    }

    function getEnforceTfaForAllUsersValue() {
        const input = root.querySelector("#security-enforce-tfa-for-all-users");
        if (!(input instanceof HTMLInputElement)) return false;
        return input.checked;
    }

    function getPasswordPolicyValue() {
        return Object.fromEntries(
            POLICY_FIELDS.map(({ key, id, min }) => {
                const policyInput = root.querySelector(`#${id}`);
                return [
                    key,
                    policyInput instanceof HTMLInputElement
                        ? parsePolicyCount(
                              policyInput.value,
                              min,
                              originalPasswordPolicy[key],
                          )
                        : originalPasswordPolicy[key],
                ];
            }),
        );
    }

    function isPasswordPolicyChanged() {
        const currentPolicy = getPasswordPolicyValue();
        return POLICY_FIELDS.some(
            ({ key }) => currentPolicy[key] !== originalPasswordPolicy[key],
        );
    }

    function markDirtyState() {
        const currentDomains = parseDomains(getInputValue()).join(",");
        const originalDomainsValue = originalDomains.join(",");
        const effectiveOriginalValidationMode =
            !smtpAdapterActive && originalUserValidationMode === "smtp"
                ? "none"
                : originalUserValidationMode;
        const modeChanged =
            getValidationModeValue() !== effectiveOriginalValidationMode;
        const registrationsChanged =
            getRegistrationsEnabledValue() !== currentPublicRegistrationEnabled;
        const teacherApprovalChanged =
            getTeacherManualApprovalValue() !== originalTeacherManualApproval;
        const enforceTfaChanged =
            getEnforceTfaForAllUsersValue() !== originalEnforceTfaForAllUsers;
        onDirtyChange?.(
            currentDomains !== originalDomainsValue ||
                modeChanged ||
                registrationsChanged ||
                teacherApprovalChanged ||
                enforceTfaChanged ||
                isPasswordPolicyChanged(),
        );
    }

    function bindSecurityInputs(settings, passwordPolicy, smtpActive) {
        const input = root.querySelector("#security-trusted-domains");
        if (!(input instanceof HTMLInputElement)) return;
        smtpAdapterActive = smtpActive;

        originalDomains = settings.trustedDomains ?? [];
        currentPublicRegistrationEnabled =
            settings.registrationsEnabled === true;
        currentUserValidationMode =
            settings.userValidationMode === "smtp" ? "smtp" : "none";
        originalUserValidationMode = currentUserValidationMode;
        originalTeacherManualApproval =
            settings.requireTeacherManualApproval !== false;
        originalEnforceTfaForAllUsers = settings.enforceTfaForAllUsers === true;
        originalPasswordPolicy = normalizePasswordPolicy(
            passwordPolicy,
            originalPasswordPolicy,
        );

        input.value = originalDomains.join(", ");
        const validationSelect = root.querySelector(
            "#security-user-validation-mode",
        );
        const registrationsToggle = root.querySelector(
            "#security-enable-registrations",
        );
        const teacherApprovalToggle = root.querySelector(
            "#security-require-teacher-approval",
        );
        const enforceTfaToggle = root.querySelector(
            "#security-enforce-tfa-for-all-users",
        );
        if (validationSelect instanceof HTMLSelectElement) {
            const smtpOption = validationSelect.querySelector(
                "option[value='smtp']",
            );
            const effectiveValidationMode =
                !smtpAdapterActive && currentUserValidationMode === "smtp"
                    ? "none"
                    : currentUserValidationMode;
            if (smtpOption instanceof HTMLOptionElement && !smtpActive) {
                smtpOption.disabled = true;
                smtpOption.hidden = true;
                smtpOption.textContent = i18n.t(
                    "ui.app.admin.security.user_validation_mode.smtp_unavailable",
                );
            }
            validationSelect.value = effectiveValidationMode;
        }
        if (registrationsToggle instanceof HTMLInputElement) {
            registrationsToggle.checked = currentPublicRegistrationEnabled;
        }
        if (teacherApprovalToggle instanceof HTMLInputElement) {
            teacherApprovalToggle.checked = originalTeacherManualApproval;
        }
        if (enforceTfaToggle instanceof HTMLInputElement) {
            enforceTfaToggle.checked = originalEnforceTfaForAllUsers;
        }
        for (const { key, id } of POLICY_FIELDS) {
            const policyInput = root.querySelector(`#${id}`);
            if (policyInput instanceof HTMLInputElement) {
                policyInput.value = String(originalPasswordPolicy[key]);
                policyInput.addEventListener("input", markDirtyState);
            }
        }

        input.addEventListener("input", markDirtyState);
        validationSelect?.addEventListener("change", markDirtyState);
        registrationsToggle?.addEventListener("change", markDirtyState);
        teacherApprovalToggle?.addEventListener("change", markDirtyState);
        enforceTfaToggle?.addEventListener("change", markDirtyState);
    }

    return {
        async init() {
            const [
                settings,
                publicRegistrationEnabled,
                passwordPolicy,
                smtpActive,
            ] = await Promise.all([
                loadSettings(),
                loadPublicRegistrationAdapterState(),
                loadPasswordPolicy(),
                isSmtpAdapterActive(apiFetch),
            ]);
            settings.registrationsEnabled = publicRegistrationEnabled;
            bindSecurityInputs(settings, passwordPolicy, smtpActive);
            initialized = true;
        },

        async refresh() {
            if (!initialized) {
                await this.init();
                return;
            }
            const smtpActive = await isSmtpAdapterActive(apiFetch);
            bindSecurityInputs(
                {
                    trustedDomains: originalDomains,
                    registrationsEnabled: currentPublicRegistrationEnabled,
                    userValidationMode: originalUserValidationMode,
                    requireTeacherManualApproval: originalTeacherManualApproval,
                    enforceTfaForAllUsers: originalEnforceTfaForAllUsers,
                },
                originalPasswordPolicy,
                smtpActive,
            );
        },

        async save() {
            const domains = parseDomains(getInputValue());
            const validationMode = smtpAdapterActive
                ? getValidationModeValue()
                : originalUserValidationMode;
            const registrationsEnabled = getRegistrationsEnabledValue();
            const requireTeacherManualApproval =
                getTeacherManualApprovalValue();
            const enforceTfaForAllUsers = getEnforceTfaForAllUsersValue();
            const passwordPolicy = getPasswordPolicyValue();

            await persistSettings(
                domains,
                registrationsEnabled,
                validationMode,
                requireTeacherManualApproval,
                enforceTfaForAllUsers,
            );
            await persistPasswordPolicy(passwordPolicy);
            clearTrustedDomainsCache();
            if (registrationsEnabled !== currentPublicRegistrationEnabled) {
                await apiFetch(
                    `/api/v1/gateways/registration/adapters/public/${registrationsEnabled ? "enable" : "disable"}`,
                    { method: "POST" },
                );
            }
            originalDomains = domains;
            currentPublicRegistrationEnabled = registrationsEnabled;
            currentUserValidationMode = validationMode;
            originalUserValidationMode = validationMode;
            originalTeacherManualApproval = requireTeacherManualApproval;
            originalEnforceTfaForAllUsers = enforceTfaForAllUsers;
            originalPasswordPolicy = passwordPolicy;
        },

        discard() {
            const input = root.querySelector("#security-trusted-domains");
            if (input instanceof HTMLInputElement) {
                input.value = originalDomains.join(", ");
            }
            const validationSelect = root.querySelector(
                "#security-user-validation-mode",
            );
            if (validationSelect instanceof HTMLSelectElement) {
                validationSelect.value =
                    !smtpAdapterActive && originalUserValidationMode === "smtp"
                        ? "none"
                        : originalUserValidationMode;
            }
            const registrationsToggle = root.querySelector(
                "#security-enable-registrations",
            );
            const teacherApprovalToggle = root.querySelector(
                "#security-require-teacher-approval",
            );
            const enforceTfaToggle = root.querySelector(
                "#security-enforce-tfa-for-all-users",
            );
            if (registrationsToggle instanceof HTMLInputElement) {
                registrationsToggle.checked = currentPublicRegistrationEnabled;
            }
            if (teacherApprovalToggle instanceof HTMLInputElement) {
                teacherApprovalToggle.checked = originalTeacherManualApproval;
            }
            if (enforceTfaToggle instanceof HTMLInputElement) {
                enforceTfaToggle.checked = originalEnforceTfaForAllUsers;
            }
            for (const { key, id } of POLICY_FIELDS) {
                const policyInput = root.querySelector(`#${id}`);
                if (policyInput instanceof HTMLInputElement) {
                    policyInput.value = String(originalPasswordPolicy[key]);
                }
            }
            onDirtyChange?.(false);
        },

        renderContent() {
            const tooltipAria = i18n.t("ui.reuse.more_information");
            return `
        <div class="security-settings-form">
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.trusted_domains_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.trusted_domains_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <input
                id="security-trusted-domains"
                type="text"
                class="security-domains-input"
                placeholder="${escapeHtml(i18n.t("ui.app.admin.security.trusted_domains_placeholder"))}"
              />
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.enable_registrations_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.enable_registrations_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <label class="switch">
                <input id="security-enable-registrations" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.user_validation_mode_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.user_validation_mode_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <select id="security-user-validation-mode" class="theme-select">
                <option value="none">${escapeHtml(i18n.t("ui.app.admin.security.user_validation_mode.none"))}</option>
                <option value="smtp">${escapeHtml(i18n.t("ui.app.admin.security.user_validation_mode.smtp"))}</option>
              </select>
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.require_teacher_approval_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.require_teacher_approval_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <label class="switch">
                <input id="security-require-teacher-approval" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.tfa_enforce_all_users_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.tfa_enforce_all_users_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <label class="switch">
                <input id="security-enforce-tfa-for-all-users" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.password_policy_heading"))}
            </h3>
            ${POLICY_FIELDS.map(
                ({ id, min, i18nSuffix }) => `
            <div class="security-field-row">
              <label for="${id}">${escapeHtml(i18n.t(`ui.app.admin.security.${i18nSuffix}`))}</label>
              <input id="${id}" class="security-policy-number-input" type="number" min="${min}" max="128" />
            </div>`,
            ).join("")}
          </div>
        </div>`;
        },
    };
}
