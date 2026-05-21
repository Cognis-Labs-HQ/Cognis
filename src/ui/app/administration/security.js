import { apiFetch } from "../../reuse/api-client.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import {
    clearTrustedDomainsCache,
    normalizeTrustedDomains,
} from "../../reuse/trusted-domains.js";
import {
    DEFAULT_PASSWORD_POLICY,
    normalizePasswordPolicy,
} from "../../reuse/password-policy.js";

/**
 * Security sub-module for the Administration page.
 *
 * Manages system-level security settings including trusted domains for email
 * validation, approved external HTTP(S) links, open registration state, and
 * the authentication password policy.
 *
 * Public exports:
 *   initSecuritySection(root, options) — initialises the security section.
 *
 * Usage:
 *   const security = initSecuritySection(root, { i18n, onDirtyChange });
 *   await security.init();
 *   // Save and discard are invoked by the floating unsaved-changes bar.
 *   await security.save();
 *   security.discard();
 *
 * @param {Element} root
 * @param {{ i18n: object, onDirtyChange?: (dirty: boolean) => void }} options
 * @returns {{ init: () => Promise<void>, save: () => Promise<void>, discard: () => void, renderContent: () => string }}
 *
 * Note: `save()` and `discard()` are only meaningful after `init()` resolves,
 * since `init()` sets original state and binds the input elements. They are
 * always called from the floating unsaved-changes bar, which only becomes
 * visible after the user edits a field (which itself requires `init()` to have
 * completed), so this ordering constraint is satisfied naturally.
 */
export function initSecuritySection(root, { i18n, onDirtyChange }) {
    let originalDomains = [];
    let currentPublicRegistrationEnabled = false;
    let originalUserValidationMode = "none";
    let currentUserValidationMode = "none";
    let originalTeacherManualApproval = true;

    let originalPolicy = { ...DEFAULT_PASSWORD_POLICY };
    let currentPolicy = { ...originalPolicy };

    async function loadSettings() {
        const res = await apiFetch("/api/v1/system/security");
        if (!res.ok) return { trustedDomains: [] };
        const payload = await res.json();
        return payload.data ?? { trustedDomains: [] };
    }

    async function loadPublicRegistrationAdapterState() {
        const res = await apiFetch("/api/v1/gateways/registration/adapters");
        if (!res.ok) return false;
        const payload = await res.json();
        const adapters = Array.isArray(payload?.data) ? payload.data : [];
        const publicAdapter = adapters.find((entry) => entry.id === "public");
        return publicAdapter?.enabled === true;
    }

    async function loadPasswordPolicy() {
        const res = await apiFetch("/api/v1/auth/password-policy").catch(
            () => null,
        );
        if (!res?.ok) return { ...DEFAULT_PASSWORD_POLICY };
        const payload = await res.json().catch(() => null);
        return normalizePasswordPolicy(payload?.data, DEFAULT_PASSWORD_POLICY);
    }

    async function persistSettings(
        trustedDomains,
        registrationsEnabled,
        userValidationMode,
        requireTeacherManualApproval,
    ) {
        const res = await apiFetch("/api/v1/system/security", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                trustedDomains,
                registrationsEnabled,
                userValidationMode,
                requireTeacherManualApproval,
            }),
        });
        if (!res.ok) throw new Error("save_failed");
    }

    async function persistPasswordPolicy(policy) {
        const res = await apiFetch("/api/v1/auth/password-policy", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(policy),
        });
        if (!res.ok) throw new Error("policy_save_failed");
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

    function getPasswordPolicyInputs() {
        return {
            minLengthInput: root.querySelector("#policy-min-length"),
            uppercaseInput: root.querySelector("#policy-require-uppercase"),
            lowercaseInput: root.querySelector("#policy-require-lowercase"),
            digitInput: root.querySelector("#policy-require-digit"),
            specialInput: root.querySelector("#policy-require-special"),
        };
    }

    function readPolicyFromDom() {
        const {
            minLengthInput,
            uppercaseInput,
            lowercaseInput,
            digitInput,
            specialInput,
        } = getPasswordPolicyInputs();
        return {
            minLength:
                minLengthInput instanceof HTMLInputElement
                    ? Math.max(1, parseInt(minLengthInput.value, 10) || 8)
                    : originalPolicy.minLength,
            requireUppercase:
                uppercaseInput instanceof HTMLInputElement
                    ? Math.max(0, parseInt(uppercaseInput.value, 10) || 0)
                    : currentPolicy.requireUppercase,
            requireLowercase:
                lowercaseInput instanceof HTMLInputElement
                    ? lowercaseInput.checked
                    : currentPolicy.requireLowercase,
            requireDigit:
                digitInput instanceof HTMLInputElement
                    ? Math.max(0, parseInt(digitInput.value, 10) || 0)
                    : currentPolicy.requireDigit,
            requireSpecial:
                specialInput instanceof HTMLInputElement
                    ? Math.max(0, parseInt(specialInput.value, 10) || 0)
                    : currentPolicy.requireSpecial,
        };
    }

    function isPolicyDirty() {
        const dom = readPolicyFromDom();
        return (
            dom.minLength !== originalPolicy.minLength ||
            dom.requireUppercase !== originalPolicy.requireUppercase ||
            dom.requireLowercase !== originalPolicy.requireLowercase ||
            dom.requireDigit !== originalPolicy.requireDigit ||
            dom.requireSpecial !== originalPolicy.requireSpecial
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
                isPolicyDirty(),
        );
    }

    function bindInput(settings) {
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
        if (validationSelect instanceof HTMLSelectElement) {
            validationSelect.value = currentUserValidationMode;
        }
        if (registrationsToggle instanceof HTMLInputElement) {
            registrationsToggle.checked = currentPublicRegistrationEnabled;
        }
        if (teacherApprovalToggle instanceof HTMLInputElement) {
            teacherApprovalToggle.checked = originalTeacherManualApproval;
        }

        input.addEventListener("input", () => {
            markDirtyState();
        });

        validationSelect?.addEventListener("change", () => {
            markDirtyState();
        });
        registrationsToggle?.addEventListener("change", () => {
            markDirtyState();
        });
        teacherApprovalToggle?.addEventListener("change", () => {
            markDirtyState();
        });
    }

    function bindPasswordPolicyInputs() {
        const policyFields = root.querySelectorAll(
            "#policy-min-length, #policy-require-uppercase, #policy-require-lowercase, #policy-require-digit, #policy-require-special",
        );
        policyFields.forEach((field) => {
            field.addEventListener("input", () => {
                markDirtyState();
            });
            field.addEventListener("change", () => {
                markDirtyState();
            });
        });
    }

    function applyPolicyToDom(policy) {
        const {
            minLengthInput,
            uppercaseInput,
            lowercaseInput,
            digitInput,
            specialInput,
        } = getPasswordPolicyInputs();
        if (minLengthInput instanceof HTMLInputElement) {
            minLengthInput.value = String(policy.minLength);
        }
        if (uppercaseInput instanceof HTMLInputElement) {
            uppercaseInput.value = String(policy.requireUppercase);
        }
        if (lowercaseInput instanceof HTMLInputElement) {
            lowercaseInput.checked = policy.requireLowercase;
        }
        if (digitInput instanceof HTMLInputElement) {
            digitInput.value = String(policy.requireDigit);
        }
        if (specialInput instanceof HTMLInputElement) {
            specialInput.value = String(policy.requireSpecial);
        }
    }

    function renderPasswordPolicy() {
        const tooltipAria = i18n.t("ui.reuse.more_information");
        return `
      <div class="components-section">
        <h3 class="components-section-heading">
          ${escapeHtml(i18n.t("ui.app.admin.security.password_policy_heading"))}
        </h3>
        <div class="security-policy-fields">
          <div class="security-policy-row">
            <label for="policy-min-length">
              ${escapeHtml(i18n.t("ui.app.admin.security.policy_min_length"))}
            </label>
            <input
              id="policy-min-length"
              type="number"
              min="1"
              max="128"
              value="${escapeHtml(String(currentPolicy.minLength))}"
              class="security-policy-number-input"
            />
          </div>
          <div class="security-policy-row">
            <label for="policy-require-uppercase">
              ${escapeHtml(i18n.t("ui.app.admin.security.policy_require_uppercase"))}
            </label>
            <input
              id="policy-require-uppercase"
              type="number"
              min="0"
              max="128"
              value="${escapeHtml(String(currentPolicy.requireUppercase))}"
              class="security-policy-number-input"
            />
          </div>
          <div class="security-policy-row">
            <label for="policy-require-lowercase">
              ${escapeHtml(i18n.t("ui.app.admin.security.policy_require_lowercase"))}
            </label>
            <input
              id="policy-require-lowercase"
              type="checkbox"
              ${currentPolicy.requireLowercase ? "checked" : ""}
            />
          </div>
          <div class="security-policy-row">
            <label for="policy-require-digit">
              ${escapeHtml(i18n.t("ui.app.admin.security.policy_require_digit"))}
            </label>
            <input
              id="policy-require-digit"
              type="number"
              min="0"
              max="128"
              value="${escapeHtml(String(currentPolicy.requireDigit))}"
              class="security-policy-number-input"
            />
          </div>
          <div class="security-policy-row">
            <label for="policy-require-special">
              ${escapeHtml(i18n.t("ui.app.admin.security.policy_require_special"))}
            </label>
            <input
              id="policy-require-special"
              type="number"
              min="0"
              max="128"
              value="${escapeHtml(String(currentPolicy.requireSpecial))}"
              class="security-policy-number-input"
            />
          </div>
        </div>
      </div>
    `;
    }

    return {
        async init() {
            const [settings, publicRegistrationEnabled, policy] =
                await Promise.all([
                    loadSettings(),
                    loadPublicRegistrationAdapterState(),
                    loadPasswordPolicy(),
                ]);
            settings.registrationsEnabled = publicRegistrationEnabled;
            originalPolicy = policy;
            currentPolicy = { ...policy };
            bindInput(settings);
            bindPasswordPolicyInputs();
        },

        async save() {
            const domains = parseDomains(getInputValue());
            const validationMode = getValidationModeValue();
            const registrationsEnabled = getRegistrationsEnabledValue();
            const requireTeacherManualApproval =
                getTeacherManualApprovalValue();
            const policy = readPolicyFromDom();

            await Promise.all([
                persistSettings(
                    domains,
                    registrationsEnabled,
                    validationMode,
                    requireTeacherManualApproval,
                ),
                persistPasswordPolicy(policy),
            ]);

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
            originalPolicy = { ...policy };
            currentPolicy = { ...policy };
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
            if (registrationsToggle instanceof HTMLInputElement) {
                registrationsToggle.checked = currentPublicRegistrationEnabled;
            }
            if (teacherApprovalToggle instanceof HTMLInputElement) {
                teacherApprovalToggle.checked = originalTeacherManualApproval;
            }
            applyPolicyToDom(originalPolicy);
            currentPolicy = { ...originalPolicy };
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
              ${escapeHtml(i18n.t("ui.app.admin.security.user_validation_mode_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.user_validation_mode_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <select id="security-user-validation-mode" class="security-domains-input theme-select">
                <option value="none">${escapeHtml(i18n.t("ui.app.admin.security.user_validation_mode.none"))}</option>
                <option value="smtp">${escapeHtml(i18n.t("ui.app.admin.security.user_validation_mode.smtp"))}</option>
              </select>
            </div>
          </div>
          ${renderPasswordPolicy()}
        </div>
      `;
        },
    };
}
