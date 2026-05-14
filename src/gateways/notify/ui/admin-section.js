/**
 * Notification gateway admin debug section.
 *
 * Contributes debug send controls to the Administration page.
 * Exported as a browser ES module; the admin page dynamically imports it
 * via the UIRegistry mechanism.
 *
 * Public exports:
 *   createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) — returns a
 *     page-composer-compatible element definition with a dataReady promise.
 *
 * Usage:
 *   const mod = await import('/static/gateways/notify/admin-section.js');
 *   const def = mod.createAdminSection({ i18n, apiFetch, escapeHtml, showToast });
 *   await def.dataReady;
 *
 * @param {{ i18n: object, apiFetch: Function, escapeHtml: Function, showToast: Function }} deps
 * @returns {{ id: string, label: string, dataReady: Promise<void>, subComposerOptions: object }}
 */
export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
    async function loadCategories() {
        const response = await apiFetch("/api/v1/notifications/categories");
        if (!response.ok) return [];
        const payload = await response.json();
        return payload.data ?? [];
    }

    async function loadUsers() {
        const response = await apiFetch("/api/v1/users");
        if (!response.ok) return [];
        const payload = await response.json();
        return payload.data ?? [];
    }

    let users = [];
    let categories = [];

    const dataReady = Promise.all([loadUsers(), loadCategories()]).then(
        ([userRows, categoryRows]) => {
            users = userRows;
            categories = categoryRows;
        },
    );

    function renderNotificationsDebugContent() {
        const userOptions = users
            .map(
                (userRow) => {
                    const escapedUsername = escapeHtml(userRow.username);
                    return `<option value="${escapedUsername}">${escapedUsername}</option>`;
                },
            )
            .join("");

        const categoryOptions = categories
            .map(
                (categoryRow) =>
                    `<option value="${escapeHtml(categoryRow.id)}">${escapeHtml(categoryRow.label)}</option>`,
            )
            .join("");

        const noUsers = !users.length
            ? `<p class="notif-debug-empty">${i18n.t("gateway.notify.admin.debug_no_users")}</p>`
            : "";
        const noCategories = !categories.length
            ? `<p class="notif-debug-empty">${i18n.t("gateway.notify.admin.debug_no_categories")}</p>`
            : "";

        return `
    <div class="notif-debug-panel">
      ${noUsers}
      ${noCategories}
      <div class="notif-debug-fields">
        <label class="notif-debug-field">
          ${i18n.t("gateway.notify.admin.debug_target_user")}
          <select name="debugUser" class="theme-select">${userOptions}</select>
        </label>
        <label class="notif-debug-field">
          ${i18n.t("gateway.notify.admin.debug_category")}
          <select name="debugCategory" class="theme-select">${categoryOptions}</select>
        </label>
        <label class="notif-debug-field notif-debug-field--full">
          ${i18n.t("ui.reuse.subject")}
          <input name="debugSubject" type="text" placeholder="${i18n.t("gateway.notify.admin.debug_subject_placeholder")}" />
        </label>
        <label class="notif-debug-field notif-debug-field--full">
          ${i18n.t("ui.reuse.message")}
          <textarea name="debugBody" rows="4" placeholder="${i18n.t("gateway.notify.admin.debug_body_placeholder")}"></textarea>
        </label>
      </div>
      <div class="notif-debug-actions">
        <button class="btn-animated notif-debug-send" type="button">${i18n.t("gateway.notify.admin.debug_send")}</button>
      </div>
    </div>
  `;
    }

    function bindNotificationsDebug(root) {
        const panel = root.querySelector(".notif-debug-panel");
        if (!panel) return;

        const sendButton = panel.querySelector(".notif-debug-send");
        if (!(sendButton instanceof HTMLButtonElement)) return;

        sendButton.addEventListener("click", async () => {
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
                showToast(i18n.t("gateway.notify.admin.debug_missing_fields"), {
                    variant: "warning",
                });
                return;
            }

            const response = await apiFetch("/api/v1/notifications/send", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    recipientUsername,
                    category,
                    subject,
                    body,
                }),
            });

            showToast(
                response.ok
                    ? i18n.t("gateway.notify.admin.debug_sent")
                    : i18n.t("gateway.notify.admin.debug_send_failed"),
                { variant: response.ok ? "success" : "error" },
            );
        });
    }

    return {
        id: "notifications",
        label: i18n.t("ui.reuse.notifications"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-notifications-layout",
            heading: i18n.t("ui.reuse.notifications"),
            elements: [
                {
                    id: "notifications-debug",
                    label: i18n.t("ui.reuse.debug"),
                    pinned: true,
                    render: () => renderNotificationsDebugContent(),
                },
            ],
            onRender: (rootElement) => {
                bindNotificationsDebug(rootElement);
            },
        },
    };
}
