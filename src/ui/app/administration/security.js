import { apiFetch } from "../../reuse/api-client.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import {
    DEFAULT_PASSWORD_POLICY,
    normalizePasswordPolicy,
    parsePolicyCount,
} from "../../reuse/password-policy.js";
import {
    clearTrustedDomainsCache,
    normalizeTrustedDomains,
} from "../../reuse/trusted-domains.js";

const PASSWORD_POLICY_KEYS = Object.keys(DEFAULT_PASSWORD_POLICY);

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
 * @returns {{ init: () => Promise<void>, save: () => Promise<void>, discard: () => void, renderContent: () => string }}
 */
export function initSecuritySection(root, { i18n, onDirtyChange }) {
    let originalDomains = [];
    let currentPublicRegistrationEnabled = false;
    let originalUserValidationMode = "none";
    let currentUserValidationMode = "none";
    let originalTeacherManualApproval = true;
    let originalPasswordPolicy = { ...DEFAULT_PASSWORD_POLICY };

    async function loadSettings() {
        const response = await apiFetch("/api/v1/system/security");
        if (!response.ok) return { trustedDomains: [] };
        const payload = await response.json();
        return payload.data ?? { trustedDomains: [] };
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
    ) {
        const response = await apiFetch("/api/v1/system/security", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                trustedDomains,
                registrationsEnabled,
                userValidationMode,
                requireTeacherManualApproval,
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

    function getPasswordPolicyValue() {
        const minLengthInput = root.querySelector(
            "#security-policy-min-length",
        );
        const uppercaseInput = root.querySelector(
            "#security-policy-require-uppercase",
        );
        const lowercaseInput = root.querySelector(
            "#security-policy-require-lowercase",
        );
        const digitInput = root.querySelector("#security-policy-require-digit");
        const specialInput = root.querySelector(
            "#security-policy-require-special",
        );

        return {
            minLength:
                minLengthInput instanceof HTMLInputElement
                    ? parsePolicyCount(
                          minLengthInput.value,
                          1,
                          originalPasswordPolicy.minLength,
                      )
                    : originalPasswordPolicy.minLength,
            requireUppercase:
                uppercaseInput instanceof HTMLInputElement
                    ? parsePolicyCount(
                          uppercaseInput.value,
                          0,
                          originalPasswordPolicy.requireUppercase,
                      )
                    : originalPasswordPolicy.requireUppercase,
            requireLowercase:
                lowercaseInput instanceof HTMLInputElement
                    ? parsePolicyCount(
                          lowercaseInput.value,
                          0,
                          originalPasswordPolicy.requireLowercase,
                      )
                    : originalPasswordPolicy.requireLowercase,
            requireDigit:
                digitInput instanceof HTMLInputElement
                    ? parsePolicyCount(
                          digitInput.value,
                          0,
                          originalPasswordPolicy.requireDigit,
                      )
                    : originalPasswordPolicy.requireDigit,
            requireSpecial:
                specialInput instanceof HTMLInputElement
                    ? parsePolicyCount(
                          specialInput.value,
                          0,
                          originalPasswordPolicy.requireSpecial,
                      )
                    : originalPasswordPolicy.requireSpecial,
        };
    }

    function isPasswordPolicyChanged() {
        const currentPolicy = getPasswordPolicyValue();
        return PASSWORD_POLICY_KEYS.some(
            (fieldName) =>
                currentPolicy[fieldName] !== originalPasswordPolicy[fieldName],
        );
    }

    function markDirtyState() {
        const currentDomains = parseDomains(getInputValue()).join(",");
        const originalDomainsValue = originalDomains.join(",");
        const modeChanged =
            getValidationModeValue() !== originalUserValidationMode;
        const registrationsChanged =
            getRegistrationsEnabledValue() !== currentPublicRegistrationEnabled;
        const teacherApprovalChanged =
            getTeacherManualApprovalValue() !== originalTeacherManualApproval;

        onDirtyChange?.(
            currentDomains !== originalDomainsValue ||
                modeChanged ||
                registrationsChanged ||
                teacherApprovalChanged ||
                isPasswordPolicyChanged(),
        );
    }

    function bindSecurityInputs(settings, passwordPolicy) {
        const input = root.querySelector("#security-trusted-domains");
        if (!(input instanceof HTMLInputElement)) return;

        originalDomains = settings.trustedDomains ?? [];
        currentPublicRegistrationEnabled =
            settings.registrationsEnabled === true;
        currentUserValidationMode =
            settings.userValidationMode === "smtp" ? "smtp" : "none";
        originalUserValidationMode = currentUserValidationMode;
        originalTeacherManualApproval =
            settings.requireTeacherManualApproval !== false;
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
        const minLengthInput = root.querySelector(
            "#security-policy-min-length",
        );
        const uppercaseInput = root.querySelector(
            "#security-policy-require-uppercase",
        );
        const lowercaseInput = root.querySelector(
            "#security-policy-require-lowercase",
        );
        const digitInput = root.querySelector("#security-policy-require-digit");
        const specialInput = root.querySelector(
            "#security-policy-require-special",
        );

        if (validationSelect instanceof HTMLSelectElement) {
            validationSelect.value = currentUserValidationMode;
        }
        if (registrationsToggle instanceof HTMLInputElement) {
            registrationsToggle.checked = currentPublicRegistrationEnabled;
        }
        if (teacherApprovalToggle instanceof HTMLInputElement) {
            teacherApprovalToggle.checked = originalTeacherManualApproval;
        }
        if (minLengthInput instanceof HTMLInputElement) {
            minLengthInput.value = String(originalPasswordPolicy.minLength);
        }
        if (uppercaseInput instanceof HTMLInputElement) {
            uppercaseInput.value = String(
                originalPasswordPolicy.requireUppercase,
            );
        }
        if (lowercaseInput instanceof HTMLInputElement) {
            lowercaseInput.value = String(
                originalPasswordPolicy.requireLowercase,
            );
        }
        if (digitInput instanceof HTMLInputElement) {
            digitInput.value = String(originalPasswordPolicy.requireDigit);
        }
        if (specialInput instanceof HTMLInputElement) {
            specialInput.value = String(originalPasswordPolicy.requireSpecial);
        }

        input.addEventListener("input", markDirtyState);
        validationSelect?.addEventListener("change", markDirtyState);
        registrationsToggle?.addEventListener("change", markDirtyState);
        teacherApprovalToggle?.addEventListener("change", markDirtyState);
        minLengthInput?.addEventListener("input", markDirtyState);
        uppercaseInput?.addEventListener("input", markDirtyState);
        lowercaseInput?.addEventListener("input", markDirtyState);
        digitInput?.addEventListener("input", markDirtyState);
        specialInput?.addEventListener("input", markDirtyState);
    }

    return {
        async init() {
            const [settings, publicRegistrationEnabled, passwordPolicy] =
                await Promise.all([
                    loadSettings(),
                    loadPublicRegistrationAdapterState(),
                    loadPasswordPolicy(),
                ]);
            settings.registrationsEnabled = publicRegistrationEnabled;
            bindSecurityInputs(settings, passwordPolicy);
        },

        async save() {
            const domains = parseDomains(getInputValue());
            const validationMode = getValidationModeValue();
            const registrationsEnabled = getRegistrationsEnabledValue();
            const requireTeacherManualApproval =
                getTeacherManualApprovalValue();
            const passwordPolicy = getPasswordPolicyValue();

            await persistSettings(
                domains,
                registrationsEnabled,
                validationMode,
                requireTeacherManualApproval,
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
                validationSelect.value = originalUserValidationMode;
            }
            const registrationsToggle = root.querySelector(
                "#security-enable-registrations",
            );
            const teacherApprovalToggle = root.querySelector(
                "#security-require-teacher-approval",
            );
            const minLengthInput = root.querySelector(
                "#security-policy-min-length",
            );
            const uppercaseInput = root.querySelector(
                "#security-policy-require-uppercase",
            );
            const lowercaseInput = root.querySelector(
                "#security-policy-require-lowercase",
            );
            const digitInput = root.querySelector(
                "#security-policy-require-digit",
            );
            const specialInput = root.querySelector(
                "#security-policy-require-special",
            );

            if (registrationsToggle instanceof HTMLInputElement) {
                registrationsToggle.checked = currentPublicRegistrationEnabled;
            }
            if (teacherApprovalToggle instanceof HTMLInputElement) {
                teacherApprovalToggle.checked = originalTeacherManualApproval;
            }
            if (minLengthInput instanceof HTMLInputElement) {
                minLengthInput.value = String(originalPasswordPolicy.minLength);
            }
            if (uppercaseInput instanceof HTMLInputElement) {
                uppercaseInput.value = String(
                    originalPasswordPolicy.requireUppercase,
                );
            }
            if (lowercaseInput instanceof HTMLInputElement) {
                lowercaseInput.value = String(
                    originalPasswordPolicy.requireLowercase,
                );
            }
            if (digitInput instanceof HTMLInputElement) {
                digitInput.value = String(originalPasswordPolicy.requireDigit);
            }
            if (specialInput instanceof HTMLInputElement) {
                specialInput.value = String(
                    originalPasswordPolicy.requireSpecial,
                );
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
              ${escapeHtml(i18n.t("ui.app.admin.security.password_policy_heading"))}
            </h3>
            <div class="security-field-row">
              <label for="security-policy-min-length">${escapeHtml(i18n.t("ui.app.admin.security.policy_min_length"))}</label>
              <input id="security-policy-min-length" class="security-policy-number-input" type="number" min="1" max="128" />
            </div>
            <div class="security-field-row">
              <label for="security-policy-require-uppercase">${escapeHtml(i18n.t("ui.app.admin.security.policy_require_uppercase"))}</label>
              <input id="security-policy-require-uppercase" class="security-policy-number-input" type="number" min="0" max="128" />
            </div>
            <div class="security-field-row">
              <label for="security-policy-require-lowercase">${escapeHtml(i18n.t("ui.app.admin.security.policy_require_lowercase"))}</label>
              <input id="security-policy-require-lowercase" class="security-policy-number-input" type="number" min="0" max="128" />
            </div>
            <div class="security-field-row">
              <label for="security-policy-require-digit">${escapeHtml(i18n.t("ui.app.admin.security.policy_require_digit"))}</label>
              <input id="security-policy-require-digit" class="security-policy-number-input" type="number" min="0" max="128" />
            </div>
            <div class="security-field-row">
              <label for="security-policy-require-special">${escapeHtml(i18n.t("ui.app.admin.security.policy_require_special"))}</label>
              <input id="security-policy-require-special" class="security-policy-number-input" type="number" min="0" max="128" />
            </div>
          </div>
        </div>`;
        },
    };
}
