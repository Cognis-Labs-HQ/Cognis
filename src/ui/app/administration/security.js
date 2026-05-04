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
 *   const security = initSecuritySection(root, { i18n });
 *   await security.init();
 *
 * @param {Element} root
 * @param {{ i18n: object }} options
 * @returns {{ init: () => Promise<void> }}
 */
export function initSecuritySection(root, { i18n }) {
    async function loadSettings() {
        const res = await apiFetch("/api/v1/system/security");
        if (!res.ok) return { trustedDomains: [] };
        const payload = await res.json();
        return payload.data ?? { trustedDomains: [] };
    }

    async function saveSettings(trustedDomains) {
        const res = await apiFetch("/api/v1/system/security", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ trustedDomains }),
        });
        if (!res.ok) throw new Error("save_failed");
    }

    function parseDomains(raw) {
        return raw
            .split(",")
            .map((d) => d.trim().toLowerCase())
            .filter(Boolean);
    }

    function bindActions(settings) {
        const input = root.querySelector("#security-trusted-domains");
        const saveBtn = root.querySelector("#security-save-btn");
        const statusEl = root.querySelector("#security-status");

        if (!input || !saveBtn) return;

        if (input instanceof HTMLInputElement) {
            input.value = (settings.trustedDomains ?? []).join(", ");
        }

        saveBtn.addEventListener("click", async () => {
            const raw = input instanceof HTMLInputElement ? input.value : "";
            const domains = parseDomains(raw);
            try {
                await saveSettings(domains);
                if (statusEl) {
                    statusEl.textContent = i18n.t(
                        "ui.app.admin.security.saved",
                    );
                    setTimeout(() => {
                        statusEl.textContent = "";
                    }, 3000);
                }
            } catch {
                if (statusEl)
                    statusEl.textContent = i18n.t(
                        "ui.app.admin.security.save_failed",
                    );
            }
        });
    }

    return {
        async init() {
            const settings = await loadSettings();
            bindActions(settings);
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
            <button id="security-save-btn" class="btn-confirm btn-animated" type="button">
              ${escapeHtml(i18n.t("ui.reuse.generic.save"))}
            </button>
          </div>
          <div id="security-status" class="notif-status-message" aria-live="polite"></div>
        </div>
      `;
        },
    };
}
