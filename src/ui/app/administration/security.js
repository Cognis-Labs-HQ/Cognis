import { apiFetch } from "../../reuse/api-client.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import {
    clearTrustedDomainsCache,
    normalizeTrustedDomains,
} from "../../reuse/trusted-domains.js";

/**
 * Security sub-module for the Administration page.
 *
 * Manages system-level security settings including trusted domains for email
 * validation and approved external HTTP(S) links such as broadcast redirects.
 * An empty list permits all email domains while external trusted-link checks
 * continue to require the current site origin.
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
 * since `init()` sets `originalDomains` and binds the input element. They are
 * always called from the floating unsaved-changes bar, which only becomes
 * visible after the user edits the input (which itself requires `init()` to
 * have completed), so this ordering constraint is satisfied naturally.
 */
export function initSecuritySection(root, { i18n, onDirtyChange }) {
    let originalDomains = [];
    let currentPublicRegistrationEnabled = false;
    let originalUserValidationMode = "none";
    let currentUserValidationMode = "none";
    let originalTeacherManualApproval = true;

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
                teacherApprovalChanged,
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

    return {
        async init() {
            const [settings, publicRegistrationEnabled] = await Promise.all([
                loadSettings(),
                loadPublicRegistrationAdapterState(),
            ]);
            settings.registrationsEnabled = publicRegistrationEnabled;
            bindInput(settings);
        },

        async save() {
            const domains = parseDomains(getInputValue());
            const validationMode = getValidationModeValue();
            const registrationsEnabled = getRegistrationsEnabledValue();
            const requireTeacherManualApproval =
                getTeacherManualApprovalValue();
            await persistSettings(
                domains,
                registrationsEnabled,
                validationMode,
                requireTeacherManualApproval,
            );
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
        </div>
      `;
        },
    };
}
