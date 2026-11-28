import { escapeHtml } from "/static/reuse/escape-html.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";

/**
 * Notification preferences sub-module for the Settings page.
 *
 * Renders a matrix of notification providers vs categories so users can
 * opt in or out of each combination. Integrates with the unsaved-changes bar.
 *
 * When the user enables an email-dependent sender, the module verifies they have a primary verified
 * email address. If not, a toast explains the requirement and the checkbox is
 * reverted.
 *
 * Public exports:
 *   initNotificationPreferences(root, options) — initialises the notification preferences matrix.
 *   createSettingsSection({ i18n, root, markDirty }) — returns a settings section descriptor.
 *
 * Usage:
 *   const notifPrefs = initNotificationPreferences(root, { i18n, username, onDirtyChange });
 *   await notifPrefs.init();
 *
 * @param {Element} root
 * @param {{ i18n: object, username: string, onDirtyChange?: (dirty: boolean) => void }} options
 * @returns {{ init: () => Promise<void>, commit: () => void, discard: () => void, isDirty: () => boolean, getPendingPrefs: () => Array<{senderId: string, category: string, enabled: boolean}> }}
 */
function initNotificationPreferences(root, { i18n, username, onDirtyChange }) {
    let providers = [];
    let categories = [];
    let savedPreferences = {};
    let pendingPreferences = {};
    let userEmails = [];

    function makePreferenceKey(senderId, category) {
        return JSON.stringify([senderId, category]);
    }

    async function loadProviders() {
        const res = await apiFetch("/api/v1/notify/providers");
        if (!res.ok) return;
        const payload = await res.json();
        providers = payload.data ?? [];
    }

    async function loadCategories() {
        const res = await apiFetch("/api/v1/notify/categories");
        if (!res.ok) return;
        const payload = await res.json();
        categories = payload.data ?? [];
    }

    async function loadPreferences() {
        const res = await apiFetch(
            `/api/v1/notify/users/${encodeURIComponent(username)}/notification-prefs`,
        );
        if (!res.ok) return;
        const payload = await res.json();
        const raw = payload.data ?? [];
        savedPreferences = {};
        for (const entry of raw) {
            savedPreferences[
                makePreferenceKey(entry.senderId, entry.category)
            ] = true;
        }
        pendingPreferences = { ...savedPreferences };
    }

    async function loadUserEmails() {
        const res = await apiFetch(
            `/api/v1/notify/users/${encodeURIComponent(username)}/emails`,
        );
        if (!res.ok) return;
        const payload = await res.json();
        userEmails = payload.data ?? [];
    }

    function hasPrimaryVerifiedEmail() {
        return userEmails.some((email) => email.primary && email.verified);
    }

    function renderMatrix() {
        const container = root.querySelector("#notif-matrix-container");
        if (!container) return;

        if (!providers.length) {
            container.innerHTML = `<p>${i18n.t("ui.app.settings.notif_no_providers")}</p>`;
            return;
        }
        if (!categories.length) {
            container.innerHTML = `<p>${i18n.t("ui.app.settings.notif_no_categories")}</p>`;
            return;
        }

        const headerCells = providers
            .map((provider) => `<th>${escapeHtml(provider.name)}</th>`)
            .join("");
        const rows = categories
            .map((category) => {
                const cells = providers
                    .map((provider) => {
                        const preferenceKey = makePreferenceKey(
                            provider.senderId,
                            category.id,
                        );
                        const isAlwaysOn = provider.alwaysOn === true;
                        const checked =
                            isAlwaysOn ||
                            pendingPreferences[preferenceKey] === true
                                ? " checked"
                                : "";
                        const disabled = isAlwaysOn ? " disabled" : "";
                        return `<td><input type="checkbox" data-pref-key="${escapeHtml(preferenceKey)}" data-sender-id="${escapeHtml(provider.senderId)}"${checked}${disabled} /></td>`;
                    })
                    .join("");
                return `<tr><td>${escapeHtml(category.label)}</td>${cells}</tr>`;
            })
            .join("");

        container.innerHTML = `
      <h3>${i18n.t("ui.app.settings.notif_matrix_heading")}</h3>
      <table class="notif-matrix">
        <thead><tr><th></th>${headerCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    }

    function bindMatrixToggles() {
        const container = root.querySelector("#notif-matrix-container");
        if (!container) return;
        container
            .querySelectorAll("input[data-pref-key]")
            .forEach((checkbox) => {
                checkbox.addEventListener("change", () => {
                    const preferenceKey = checkbox.dataset.prefKey;
                    const senderId = checkbox.dataset.senderId;

                    if (
                        checkbox.checked &&
                        providers.find(
                            (provider) => provider.senderId === senderId,
                        )?.requiresVerifiedEmail === true &&
                        !hasPrimaryVerifiedEmail()
                    ) {
                        checkbox.checked = false;
                        showToast(
                            i18n.t("ui.app.settings.notif_email_required_body"),
                            { variant: "warning" },
                        );
                        return;
                    }

                    if (preferenceKey) {
                        pendingPreferences[preferenceKey] = checkbox.checked;
                    }
                    onDirtyChange?.(isDirty());
                });
            });
    }

    function isDirty() {
        const allKeys = new Set([
            ...Object.keys(savedPreferences),
            ...Object.keys(pendingPreferences),
        ]);
        for (const key of allKeys) {
            const saved = savedPreferences[key] === true;
            const pending = pendingPreferences[key] === true;
            if (saved !== pending) return true;
        }
        return false;
    }

    function commit() {
        savedPreferences = { ...pendingPreferences };
    }

    function discard() {
        pendingPreferences = { ...savedPreferences };
        renderMatrix();
        bindMatrixToggles();
        onDirtyChange?.(false);
    }

    function getPendingPreferences() {
        const result = [];
        const allKeys = new Set([
            ...Object.keys(savedPreferences),
            ...Object.keys(pendingPreferences),
        ]);
        for (const key of allKeys) {
            let parsed;
            try {
                parsed = JSON.parse(key);
            } catch {
                continue;
            }
            const senderId = parsed[0];
            const category = parsed[1];
            result.push({
                senderId,
                category,
                enabled: pendingPreferences[key] === true,
            });
        }
        return result;
    }

    return {
        async init() {
            await Promise.all([
                loadProviders(),
                loadCategories(),
                loadPreferences(),
                loadUserEmails(),
            ]);
            renderMatrix();
            bindMatrixToggles();
        },
        commit,
        discard,
        isDirty,
        getPendingPrefs: getPendingPreferences,
    };
}
export { initNotificationPreferences };

export function createSettingsSection({ i18n, root, markDirty }) {
    let notificationPreferences = null;

    return {
        id: "notifications",
        label: i18n.t("ui.reuse.notifications"),
        heading: i18n.t("ui.reuse.notifications"),
        preferenceKey: "settings-notifications-layout",
        renderContent: () => `<div id="notif-matrix-container"></div>`,
        onRender: () => {
            const account = localStorage.getItem("cognis_account") ?? "";
            notificationPreferences = initNotificationPreferences(root, {
                i18n,
                username: account,
                onDirtyChange: (dirty) => markDirty("notifications", dirty),
            });
            notificationPreferences.init();
        },
        isDirty: () => notificationPreferences?.isDirty() ?? false,
        async save() {
            if (!notificationPreferences?.isDirty()) return;
            const account = localStorage.getItem("cognis_account") ?? "";
            await apiFetch(
                `/api/v1/notify/users/${encodeURIComponent(account)}/notification-prefs`,
                {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(
                        notificationPreferences.getPendingPrefs(),
                    ),
                },
            );
        },
        commit: () => notificationPreferences?.commit(),
        discard: () => notificationPreferences?.discard(),
    };
}
