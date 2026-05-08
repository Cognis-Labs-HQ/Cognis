import { apiFetch } from "../../reuse/api-client.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";

/**
 * Security sub-module for the Administration page.
 *
 * Manages system-level security settings including trusted email domains.
 * When trusted domains are configured, users may only trigger the email
 * verification flow for addresses whose domain appears in the list.
 * An empty list permits all domains.
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
    let currentRegistrationsEnabled = false;
    let originalUserValidationMode = "none";
    let currentUserValidationMode = "none";

    async function loadSettings() {
        const res = await apiFetch("/api/v1/system/security");
        if (!res.ok) return { trustedDomains: [] };
        const payload = await res.json();
        return payload.data ?? { trustedDomains: [] };
    }

    async function persistSettings(
        trustedDomains,
        registrationsEnabled,
        userValidationMode,
    ) {
        const res = await apiFetch("/api/v1/system/security", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                trustedDomains,
                registrationsEnabled,
                userValidationMode,
            }),
        });
        if (!res.ok) throw new Error("save_failed");
    }

    function parseDomains(raw) {
        return raw
            .split(",")
            .map((d) => d.trim().toLowerCase())
            .filter(Boolean);
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

    function markDirtyState() {
        const currentDomains = parseDomains(getInputValue()).join(",");
        const originalDomainsValue = originalDomains.join(",");
        const modeChanged =
            getValidationModeValue() !== originalUserValidationMode;
        const registrationsChanged =
            getRegistrationsEnabledValue() !== currentRegistrationsEnabled;
        onDirtyChange?.(
            currentDomains !== originalDomainsValue ||
                modeChanged ||
                registrationsChanged,
        );
    }

    function bindInput(settings) {
        const input = root.querySelector("#security-trusted-domains");
        if (!(input instanceof HTMLInputElement)) return;

        originalDomains = settings.trustedDomains ?? [];
        currentRegistrationsEnabled = settings.registrationsEnabled === true;
        currentUserValidationMode =
            settings.userValidationMode === "smtp" ? "smtp" : "none";
        originalUserValidationMode = currentUserValidationMode;
        input.value = originalDomains.join(", ");
        const validationSelect = root.querySelector(
            "#security-user-validation-mode",
        );
        const registrationsToggle = root.querySelector(
            "#security-enable-registrations",
        );
        if (validationSelect instanceof HTMLSelectElement) {
            validationSelect.value = currentUserValidationMode;
        }
        if (registrationsToggle instanceof HTMLInputElement) {
            registrationsToggle.checked = currentRegistrationsEnabled;
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
    }

    return {
        async init() {
            const settings = await loadSettings();
            bindInput(settings);
        },

        async save() {
            const domains = parseDomains(getInputValue());
            const validationMode = getValidationModeValue();
            const registrationsEnabled = getRegistrationsEnabledValue();
            await persistSettings(
                domains,
                registrationsEnabled,
                validationMode,
            );
            originalDomains = domains;
            currentRegistrationsEnabled = registrationsEnabled;
            currentUserValidationMode = validationMode;
            originalUserValidationMode = validationMode;
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
            if (registrationsToggle instanceof HTMLInputElement) {
                registrationsToggle.checked = currentRegistrationsEnabled;
            }
            onDirtyChange?.(false);
        },

        renderContent() {
            const tooltipAria = i18n.t("ui.reuse.info_tooltip.aria");
            return `
        <div class="security-settings-form">
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.trusted_domains_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.trusted_domains_hint"), undefined, tooltipAria)}
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
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.enable_registrations_hint"), undefined, tooltipAria)}
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
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.user_validation_mode_hint"), undefined, tooltipAria)}
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
