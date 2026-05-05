/**
 * Notification gateway admin section.
 *
 * Contributes the Notifications debug panel to the Administration page.
 * Exported as a browser ES module; the admin page dynamically imports it
 * via the UIRegistry mechanism.
 *
 * Public exports:
 *   createAdminSection({ i18n, apiFetch, escapeHtml, openPopup }) — returns a
 *     page-composer-compatible element definition with a dataReady promise.
 *
 * Usage:
 *   const mod = await import("/static/gateways/notify/admin-section.js");
 *   const def = mod.createAdminSection({ i18n, apiFetch, escapeHtml, openPopup });
 *   await def.dataReady;
 *
 * @param {{ i18n: object, apiFetch: Function, escapeHtml: Function, openPopup: Function }} deps
 * @returns {{ id: string, label: string, dataReady: Promise<void>, subComposerOptions: object }}
 */
export function createAdminSection({ i18n, apiFetch, escapeHtml }) {
    async function loadCategories() {
        const res = await apiFetch("/api/v1/notifications/categories");
        if (!res.ok) return [];
        const payload = await res.json();
        return payload.data ?? [];
    }

    async function loadUsers() {
        const res = await apiFetch("/api/v1/users");
        if (!res.ok) return [];
        const payload = await res.json();
        return payload.data ?? [];
    }

    let users = [];
    let categories = [];

    const dataReady = Promise.all([loadUsers(), loadCategories()]).then(
        ([u, c]) => {
            users = u;
            categories = c;
        },
    );

    function renderNotificationsDebugContent() {
        const userOptions = users
            .map(
                (u) =>
                    `<option value="${escapeHtml(u.username)}">${escapeHtml(u.username)}</option>`,
            )
            .join("");

        const categoryOptions = categories
            .map(
                (c) =>
                    `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`,
            )
            .join("");

        const noUsers = !users.length
            ? `<p class="notif-debug-empty">${i18n.t("ui.app.admin.notif.debug_no_users")}</p>`
            : "";
        const noCategories = !categories.length
            ? `<p class="notif-debug-empty">${i18n.t("ui.app.admin.notif.debug_no_categories")}</p>`
            : "";

        return `
    <div class="notif-debug-panel">
      ${noUsers}
      ${noCategories}
      <div class="notif-debug-fields">
        <label class="notif-debug-field">
          ${i18n.t("ui.app.admin.notif.debug_target_user")}
          <select name="debugUser" class="theme-select">${userOptions}</select>
        </label>
        <label class="notif-debug-field">
          ${i18n.t("ui.app.admin.notif.debug_category")}
          <select name="debugCategory" class="theme-select">${categoryOptions}</select>
        </label>
        <label class="notif-debug-field notif-debug-field--full">
          ${i18n.t("ui.app.admin.notif.debug_subject")}
          <input name="debugSubject" type="text" placeholder="${i18n.t("ui.app.admin.notif.debug_subject_placeholder")}" />
        </label>
        <label class="notif-debug-field notif-debug-field--full">
          ${i18n.t("ui.app.admin.notif.debug_body")}
          <textarea name="debugBody" rows="4" placeholder="${i18n.t("ui.app.admin.notif.debug_body_placeholder")}"></textarea>
        </label>
      </div>
      <div class="notif-debug-actions">
        <button class="btn-animated notif-debug-send" type="button">${i18n.t("ui.app.admin.notif.debug_send")}</button>
        <span class="notif-debug-status notif-status-message"></span>
      </div>
    </div>
  `;
    }

    function bindNotificationsDebug(root) {
        const panel = root.querySelector(".notif-debug-panel");
        if (!panel) return;

        const sendBtn = panel.querySelector(".notif-debug-send");
        const statusEl = panel.querySelector(".notif-debug-status");

        if (!sendBtn) return;

        sendBtn.addEventListener("click", async () => {
            const userSelect = panel.querySelector('[name="debugUser"]');
            const categorySelect = panel.querySelector(
                '[name="debugCategory"]',
            );
            const subjectInput = panel.querySelector('[name="debugSubject"]');
            const bodyInput = panel.querySelector('[name="debugBody"]');

            const recipientUsername =
                userSelect instanceof HTMLSelectElement ? userSelect.value : "";
            const category =
                categorySelect instanceof HTMLSelectElement
                    ? categorySelect.value
                    : "";
            const subject =
                subjectInput instanceof HTMLInputElement
                    ? subjectInput.value.trim()
                    : "";
            const body =
                bodyInput instanceof HTMLTextAreaElement
                    ? bodyInput.value.trim()
                    : "";

            if (!recipientUsername || !category || !subject || !body) {
                if (statusEl)
                    statusEl.textContent = i18n.t(
                        "ui.app.admin.notif.debug_missing_fields",
                    );
                return;
            }

            if (statusEl) statusEl.textContent = "";
            const res = await apiFetch("/api/v1/notifications/send", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    recipientUsername,
                    category,
                    subject,
                    body,
                }),
            });

            if (statusEl) {
                statusEl.textContent = res.ok
                    ? i18n.t("ui.app.admin.notif.debug_sent")
                    : i18n.t("ui.app.admin.notif.debug_send_failed");
            }
        });
    }

    return {
        id: "notifications",
        label: i18n.t("ui.app.admin.notifications"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-notifications-layout",
            heading: i18n.t("ui.app.admin.notifications"),
            elements: [
                {
                    id: "notifications-debug",
                    label: i18n.t("ui.app.admin.notif.debug"),
                    pinned: true,
                    render: () => renderNotificationsDebugContent(),
                },
            ],
            onRender: (root) => {
                bindNotificationsDebug(root);
            },
        },
    };
}
