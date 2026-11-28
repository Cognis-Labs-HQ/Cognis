import { apiFetch } from "../../reuse/api-client.js";
import { extendI18n } from "../../reuse/i18n.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import {
    joinDurationMinutes,
    splitDurationMinutes,
} from "../../reuse/duration-input.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import {
    normalizePasswordPolicy,
    parsePolicyCount,
} from "/static/gateways/auth/password-policy.js";
import {
    clearTrustedDomainsCache,
    normalizeTrustedDomains,
} from "../../reuse/trusted-domains.js";
import { uiCtx } from "../../reuse/ui-ctx.js";

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
 * Manages system-level security settings for trusted domains,
 * user-validation mode, teacher approval requirements, and password policy
 * controls.
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
 * @param {{ i18n: object, onDirtyChange?: (dirty: boolean) => void, signal?: AbortSignal }} options
 * @returns {{ isDirty: () => boolean, init: () => Promise<void>, refresh: () => Promise<void>, save: () => Promise<void>, discard: () => void, renderContent: () => string }}
 */
export function initSecuritySection(root, { i18n, onDirtyChange, signal }) {
    let originalSettings = null;
    let draftSettings = null;
    let originalPasswordPolicy = null;
    let draftPasswordPolicy = null;
    let validationModes = [];
    let initialized = false;
    let loading = null;
    let bindings = null;
    signal?.addEventListener("abort", () => bindings?.abort(), { once: true });
    const log = (...args) => uiCtx.capabilities.get("ui:log")?.(...args);

    async function loadData(url) {
        const response = await apiFetch(url);
        if (!response.ok) throw new Error("load_failed");
        const payload = await response.json();
        if (!payload?.data || typeof payload.data !== "object") {
            throw new Error("load_failed");
        }
        return payload.data;
    }

    async function persistSettings(
        trustedDomains,
        userValidationMode,
        requireTeacherManualApproval,
        enforceTfaForAllUsers,
        loginSessionTimeoutMinutes,
    ) {
        const response = await apiFetch("/api/v1/system/security", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                trustedDomains,
                userValidationMode,
                requireTeacherManualApproval,
                enforceTfaForAllUsers,
                loginSessionTimeoutMinutes,
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
        return input instanceof HTMLInputElement
            ? input.value
            : draftSettings.trustedDomains.join(",");
    }

    function getValidationModeValue() {
        const select = root.querySelector("#security-user-validation-mode");
        if (!(select instanceof HTMLSelectElement))
            return draftSettings.userValidationMode;
        return select.value;
    }

    function getTeacherManualApprovalValue() {
        const input = root.querySelector("#security-require-teacher-approval");
        if (!(input instanceof HTMLInputElement))
            return draftSettings.requireTeacherManualApproval;
        return input.checked;
    }

    function getEnforceTfaForAllUsersValue() {
        const input = root.querySelector("#security-enforce-tfa-for-all-users");
        if (!(input instanceof HTMLInputElement))
            return draftSettings.enforceTfaForAllUsers;
        return input.checked;
    }

    function getLoginSessionTimeoutMinutesValue() {
        const input = root.querySelector("#security-login-session-timeout");
        const unit = root.querySelector("#security-login-session-timeout-unit");
        if (!(unit instanceof HTMLSelectElement)) {
            return draftSettings.loginSessionTimeoutMinutes;
        }
        return unit.value === "never"
            ? 0
            : input instanceof HTMLInputElement
              ? joinDurationMinutes(input.value, unit.value)
              : draftSettings.loginSessionTimeoutMinutes;
    }

    function updateLoginSessionTimeoutControls() {
        const input = root.querySelector("#security-login-session-timeout");
        const unit = root.querySelector("#security-login-session-timeout-unit");
        const warning = root.querySelector(
            "#security-login-session-timeout-warning",
        );
        if (
            !(input instanceof HTMLInputElement) ||
            !(unit instanceof HTMLSelectElement)
        )
            return;
        const never = unit.value === "never";
        input.disabled = never;
        input.hidden = never;
        warning?.toggleAttribute("hidden", !never);
    }

    function setLoginSessionTimeoutControls(minutes) {
        const input = root.querySelector("#security-login-session-timeout");
        const unit = root.querySelector("#security-login-session-timeout-unit");
        if (
            !(input instanceof HTMLInputElement) ||
            !(unit instanceof HTMLSelectElement)
        ) {
            return;
        }
        const duration = splitDurationMinutes(minutes || 1);
        input.value = String(duration.value);
        unit.value = minutes === 0 ? "never" : duration.unit;
        updateLoginSessionTimeoutControls();
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
                              draftPasswordPolicy[key],
                          )
                        : draftPasswordPolicy[key],
                ];
            }),
        );
    }

    function changed(current, original) {
        return JSON.stringify(current) !== JSON.stringify(original);
    }

    function isDirty() {
        return (
            initialized &&
            (changed(draftSettings, originalSettings) ||
                changed(draftPasswordPolicy, originalPasswordPolicy))
        );
    }

    function markDirtyState() {
        if (!initialized) return;
        draftSettings = {
            trustedDomains: parseDomains(getInputValue()),
            userValidationMode: getValidationModeValue(),
            requireTeacherManualApproval: getTeacherManualApprovalValue(),
            enforceTfaForAllUsers: getEnforceTfaForAllUsersValue(),
            loginSessionTimeoutMinutes: getLoginSessionTimeoutMinutesValue(),
        };
        draftPasswordPolicy = getPasswordPolicyValue();
        onDirtyChange?.(isDirty());
    }

    function bindSecurityInputs() {
        if (signal?.aborted) return;
        bindings?.abort();
        bindings = new AbortController();
        const options = { signal: bindings.signal };
        const input = root.querySelector("#security-trusted-domains");
        if (!(input instanceof HTMLInputElement)) return;
        input.value = draftSettings.trustedDomains.join(", ");
        for (const control of root.querySelectorAll(
            ".security-settings-form input, .security-settings-form select",
        )) {
            control.disabled = false;
        }
        const currentUserValidationMode = draftSettings.userValidationMode;
        const validationSelect = root.querySelector(
            "#security-user-validation-mode",
        );
        const teacherApprovalToggle = root.querySelector(
            "#security-require-teacher-approval",
        );
        const enforceTfaToggle = root.querySelector(
            "#security-enforce-tfa-for-all-users",
        );
        const loginTimeoutInput = root.querySelector(
            "#security-login-session-timeout",
        );
        const loginTimeoutUnit = root.querySelector(
            "#security-login-session-timeout-unit",
        );
        if (validationSelect instanceof HTMLSelectElement) {
            const choices = [...validationModes];
            if (!choices.some((mode) => mode.id === currentUserValidationMode))
                choices.push({
                    id: currentUserValidationMode,
                    labelKey: "ui.reuse.unavailable",
                    available: false,
                });
            validationSelect.innerHTML = choices
                .map(
                    (mode) =>
                        `<option value="${escapeHtml(mode.id)}"${mode.available ? "" : " disabled"}>${escapeHtml(i18n.t(mode.labelKey))}</option>`,
                )
                .join("");
            validationSelect.value = currentUserValidationMode;
        }
        if (teacherApprovalToggle instanceof HTMLInputElement) {
            teacherApprovalToggle.checked =
                draftSettings.requireTeacherManualApproval;
        }
        if (enforceTfaToggle instanceof HTMLInputElement) {
            enforceTfaToggle.checked = draftSettings.enforceTfaForAllUsers;
        }
        setLoginSessionTimeoutControls(
            draftSettings.loginSessionTimeoutMinutes,
        );
        for (const { key, id } of POLICY_FIELDS) {
            const policyInput = root.querySelector(`#${id}`);
            if (policyInput instanceof HTMLInputElement) {
                policyInput.value = String(draftPasswordPolicy[key]);
                policyInput.addEventListener("input", markDirtyState, options);
            }
        }

        input.addEventListener("input", markDirtyState, options);
        validationSelect?.addEventListener("change", markDirtyState, options);
        teacherApprovalToggle?.addEventListener(
            "change",
            markDirtyState,
            options,
        );
        enforceTfaToggle?.addEventListener("change", markDirtyState, options);
        loginTimeoutInput?.addEventListener("input", markDirtyState, options);
        loginTimeoutUnit?.addEventListener(
            "change",
            () => {
                updateLoginSessionTimeoutControls();
                markDirtyState();
            },
            options,
        );
    }

    async function initialize() {
        const [settings, passwordPolicy] = await Promise.all([
            loadData("/api/v1/system/security"),
            loadData("/api/v1/auth/password-policy"),
        ]);
        const policyKeys = POLICY_FIELDS.map(({ key }) => key);
        if (
            !Array.isArray(settings.trustedDomains) ||
            typeof settings.userValidationMode !== "string" ||
            typeof settings.requireTeacherManualApproval !== "boolean" ||
            typeof settings.enforceTfaForAllUsers !== "boolean" ||
            !settings.trustedDomains.every(
                (domain) => typeof domain === "string",
            ) ||
            !Number.isInteger(settings.loginSessionTimeoutMinutes) ||
            settings.loginSessionTimeoutMinutes < 0 ||
            !policyKeys.every(
                (key) =>
                    Number.isInteger(passwordPolicy[key]) &&
                    passwordPolicy[key] >= (key === "minLength" ? 1 : 0),
            )
        ) {
            throw new Error("load_failed");
        }
        validationModes = settings.userValidationModes ?? [];
        const stringBases = [
            ...new Set(
                validationModes
                    .map((mode) => mode.stringsBaseUrl)
                    .filter(Boolean),
            ),
        ];
        i18n = await extendI18n(i18n, stringBases);
        if (signal?.aborted) throw new Error("security_load_cancelled");
        originalSettings = {
            trustedDomains: [...settings.trustedDomains],
            userValidationMode: settings.userValidationMode,
            requireTeacherManualApproval: settings.requireTeacherManualApproval,
            enforceTfaForAllUsers: settings.enforceTfaForAllUsers,
            loginSessionTimeoutMinutes: settings.loginSessionTimeoutMinutes,
        };
        originalPasswordPolicy = normalizePasswordPolicy(passwordPolicy);
        draftSettings = structuredClone(originalSettings);
        draftPasswordPolicy = { ...originalPasswordPolicy };
        initialized = true;
    }

    return {
        isDirty,

        async init() {
            if (!initialized) {
                loading ??= initialize().finally(() => {
                    loading = null;
                });
                await loading;
            }
            bindSecurityInputs();
        },

        async refresh() {
            if (!initialized) {
                await this.init();
                return;
            }
            bindSecurityInputs();
        },

        async save() {
            if (!initialized) throw new Error("security_not_loaded");
            if (!isDirty()) return;
            const settings = structuredClone(draftSettings);
            const passwordPolicy = { ...draftPasswordPolicy };
            try {
                if (changed(settings, originalSettings)) {
                    await persistSettings(
                        settings.trustedDomains,
                        settings.userValidationMode,
                        settings.requireTeacherManualApproval,
                        settings.enforceTfaForAllUsers,
                        settings.loginSessionTimeoutMinutes,
                    );
                    originalSettings = settings;
                    clearTrustedDomainsCache();
                    log("info", "security_settings_saved", {
                        component: "administration",
                        operation: "saveSettings",
                    });
                }
                if (changed(passwordPolicy, originalPasswordPolicy)) {
                    await persistPasswordPolicy(passwordPolicy);
                    originalPasswordPolicy = passwordPolicy;
                    log("info", "password_policy_saved", {
                        component: "administration",
                        operation: "savePasswordPolicy",
                    });
                }
            } finally {
                onDirtyChange?.(isDirty());
            }
        },

        discard() {
            if (!initialized) return;
            draftSettings = structuredClone(originalSettings);
            draftPasswordPolicy = { ...originalPasswordPolicy };
            bindSecurityInputs();
            onDirtyChange?.(false);
        },

        renderContent() {
            const tooltipAria = i18n.t("ui.reuse.more_information");
            return `
        <div class="security-settings-form">
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.login_session_timeout_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.login_session_timeout_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <input ${initialized ? "" : "disabled"} id="security-login-session-timeout" class="security-policy-number-input" type="number" min="1" step="1" />
              <select ${initialized ? "" : "disabled"} id="security-login-session-timeout-unit" class="theme-select">
                <option value="minutes">${escapeHtml(i18n.t("ui.reuse.duration.minutes"))}</option>
                <option value="hours">${escapeHtml(i18n.t("ui.reuse.duration.hours"))}</option>
                <option value="days">${escapeHtml(i18n.t("ui.reuse.duration.days"))}</option>
                <option value="weeks">${escapeHtml(i18n.t("ui.reuse.duration.weeks"))}</option>
                <option value="never">${escapeHtml(i18n.t("ui.app.admin.security.login_session_timeout_never"))}</option>
              </select>
              <p id="security-login-session-timeout-warning" class="structured-content__text" hidden>${escapeHtml(i18n.t("ui.app.admin.security.login_session_timeout_never_warning"))}</p>
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.trusted_domains_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.trusted_domains_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <input ${initialized ? "" : "disabled"}
                id="security-trusted-domains"
                type="text"
                class="security-domains-input"
                placeholder="${escapeHtml(i18n.t("ui.app.admin.security.trusted_domains_placeholder"))}"
              />
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.user_validation_mode_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.user_validation_mode_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <select ${initialized ? "" : "disabled"} id="security-user-validation-mode" class="theme-select">

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
                <input ${initialized ? "" : "disabled"} id="security-require-teacher-approval" type="checkbox" />
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
                <input ${initialized ? "" : "disabled"} id="security-enforce-tfa-for-all-users" type="checkbox" />
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
              <input ${initialized ? "" : "disabled"} id="${id}" class="security-policy-number-input" type="number" min="${min}" max="128" />
            </div>`,
            ).join("")}
          </div>
        </div>`;
        },
    };
}
