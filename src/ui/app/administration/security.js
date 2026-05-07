import { apiFetch } from "../../reuse/api-client.js";
import { escapeHtml } from "../../reuse/escape-html.js";

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
    let originalRegistrationsEnabled = true;

    async function loadSettings() {
        const res = await apiFetch("/api/v1/system/security");
        if (!res.ok) return { trustedDomains: [] };
        const payload = await res.json();
        return payload.data ?? { trustedDomains: [] };
    }

    async function persistSettings(trustedDomains, registrationsEnabled) {
        const res = await apiFetch("/api/v1/system/security", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ trustedDomains, registrationsEnabled }),
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

    function bindInput(settings) {
        const input = root.querySelector("#security-trusted-domains");
        if (!(input instanceof HTMLInputElement)) return;

        originalDomains = settings.trustedDomains ?? [];
        originalRegistrationsEnabled =
            settings.registrationsEnabled !== false;
        input.value = originalDomains.join(", ");
        const registrationsToggle = root.querySelector(
            "#security-registrations-enabled",
        );
        if (registrationsToggle instanceof HTMLInputElement) {
            registrationsToggle.checked = originalRegistrationsEnabled;
        }

        input.addEventListener("input", () => {
            const current = parseDomains(getInputValue()).join(",");
            const original = originalDomains.join(",");
            const currentRegistrationsToggle = root.querySelector(
                "#security-registrations-enabled",
            );
            const currentRegistrationsEnabled =
                currentRegistrationsToggle instanceof HTMLInputElement
                    ? currentRegistrationsToggle.checked
                    : true;
            onDirtyChange?.(
                current !== original ||
                    currentRegistrationsEnabled !== originalRegistrationsEnabled,
            );
        });
        if (registrationsToggle instanceof HTMLInputElement) {
            registrationsToggle.addEventListener("change", () => {
                const current = parseDomains(getInputValue()).join(",");
                const original = originalDomains.join(",");
                onDirtyChange?.(
                    current !== original ||
                        registrationsToggle.checked !==
                            originalRegistrationsEnabled,
                );
            });
        }
    }

    return {
        async init() {
            const settings = await loadSettings();
            bindInput(settings);
        },

        async save() {
            const domains = parseDomains(getInputValue());
            const registrationsToggle = root.querySelector(
                "#security-registrations-enabled",
            );
            const registrationsEnabled =
                registrationsToggle instanceof HTMLInputElement
                    ? registrationsToggle.checked
                    : true;
            await persistSettings(domains, registrationsEnabled);
            originalDomains = domains;
            originalRegistrationsEnabled = registrationsEnabled;
        },

        discard() {
            const input = root.querySelector("#security-trusted-domains");
            if (input instanceof HTMLInputElement) {
                input.value = originalDomains.join(", ");
            }
            const registrationsToggle = root.querySelector(
                "#security-registrations-enabled",
            );
            if (registrationsToggle instanceof HTMLInputElement) {
                registrationsToggle.checked = originalRegistrationsEnabled;
            }
            onDirtyChange?.(false);
        },

        renderContent() {
            return `
        <div class="security-settings-form">
          <label class="security-field-label" for="security-trusted-domains">
            ${escapeHtml(i18n.t("ui.app.admin.security.trusted_domains_label"))}
            <span class="security-field-hint">${escapeHtml(i18n.t("ui.app.admin.security.trusted_domains_hint"))}</span>
          </label>
          <div class="security-field-row">
            <input
              id="security-trusted-domains"
              type="text"
              class="security-domains-input"
              placeholder="${escapeHtml(i18n.t("ui.app.admin.security.trusted_domains_placeholder"))}"
            />
          </div>
          <label class="security-field-label" for="security-registrations-enabled">
            ${escapeHtml(i18n.t("ui.app.admin.security.enable_registrations_label"))}
            <span class="security-field-hint">${escapeHtml(i18n.t("ui.app.admin.security.enable_registrations_hint"))}</span>
          </label>
          <div class="security-field-row">
            <input id="security-registrations-enabled" type="checkbox" />
          </div>
        </div>
      `;
        },
    };
}
