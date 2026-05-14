/**
 * Notification gateway admin section.
 *
 * Contributes the Notifications debug panel to the Administration page.
 * Exported as a browser ES module; the admin page dynamically imports it
 * via the UIRegistry mechanism.
 *
 * Public exports:
 *   createAdminSection({ i18n, apiFetch, escapeHtml, openPopup, showToast }) — returns a
 *     page-composer-compatible element definition with a dataReady promise.
 *
 * Usage:
 *   const mod = await import("/static/gateways/notify/admin-section.js");
 *   const def = mod.createAdminSection({ i18n, apiFetch, escapeHtml, openPopup, showToast });
 *   await def.dataReady;
 *
 * @param {{ i18n: object, apiFetch: Function, escapeHtml: Function, openPopup: Function, showToast: Function }} deps
 * @returns {{ id: string, label: string, dataReady: Promise<void>, subComposerOptions: object }}
 */
import { ACCESS_ROLES, getRoleLabel } from "/static/reuse/access-role.js";

export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
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

    async function loadBroadcasts() {
        const res = await apiFetch("/api/v1/notifications/broadcasts");
        if (!res.ok) return [];
        const payload = await res.json();
        return payload.data ?? [];
    }

    let users = [];
    let categories = [];
    let broadcasts = [];

    const dataReady = Promise.all([
        loadUsers(),
        loadCategories(),
        loadBroadcasts(),
    ]).then(([userRows, categoryRows, broadcastRows]) => {
            users = userRows;
            categories = categoryRows;
            broadcasts = broadcastRows;
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

    function renderBroadcastRows() {
        if (!broadcasts.length) {
            return `<p class="notif-debug-empty">${i18n.t("gateway.notify.admin.broadcast_none")}</p>`;
        }
        return broadcasts
            .map((broadcast) => {
                const scheduleText = [
                    broadcast.startAt
                        ? `${i18n.t("gateway.notify.admin.broadcast_start")}: ${new Date(broadcast.startAt).toLocaleString()}`
                        : "",
                    broadcast.endAt
                        ? `${i18n.t("gateway.notify.admin.broadcast_end")}: ${new Date(broadcast.endAt).toLocaleString()}`
                        : "",
                ]
                    .filter(Boolean)
                    .join(" • ");
                const roleText = Array.isArray(broadcast.targetRoles)
                    ? broadcast.targetRoles
                          .map((role) => getRoleLabel(i18n, role))
                          .join(", ")
                    : "";
                const statusText = broadcast.enabled
                    ? i18n.t("ui.reuse.enabled")
                    : i18n.t("ui.reuse.disabled");
                const toggleAction = broadcast.enabled ? "disable" : "enable";
                const toggleLabel = broadcast.enabled
                    ? i18n.t("ui.reuse.disable")
                    : i18n.t("ui.reuse.enable");
                return `
          <article class="notif-broadcast-row" data-broadcast-id="${escapeHtml(broadcast.id)}">
            <header class="notif-broadcast-row-header">
              <strong>${escapeHtml(broadcast.title ?? "")}</strong>
              <span class="state-pill ${broadcast.enabled ? "pill-active" : "pill-disabled"}">${escapeHtml(statusText)}</span>
            </header>
            <p>${escapeHtml(broadcast.message ?? "")}</p>
            <p>${escapeHtml(roleText)}</p>
            ${
                scheduleText
                    ? `<p>${escapeHtml(scheduleText)}</p>`
                    : ""
            }
            <p>${escapeHtml(broadcast.displayMode === "popup" ? i18n.t("gateway.notify.admin.broadcast_mode_popup") : i18n.t("gateway.notify.admin.broadcast_mode_bar"))}</p>
            <button type="button" class="btn-animated notif-broadcast-toggle" data-toggle="${escapeHtml(toggleAction)}">${escapeHtml(toggleLabel)}</button>
          </article>
        `;
            })
            .join("");
    }

    function renderBroadcastContent() {
        const roleCheckboxes = ACCESS_ROLES.map(
            (role) => `
          <label class="notif-debug-field">
            <input type="checkbox" name="broadcastRoles" value="${escapeHtml(role)}" />
            ${escapeHtml(getRoleLabel(i18n, role))}
          </label>
        `,
        ).join("");

        return `
      <div class="notif-broadcast-panel">
        <div class="notif-debug-fields">
          <label class="notif-debug-field notif-debug-field--full">
            ${i18n.t("gateway.notify.admin.broadcast_title")}
            <input name="broadcastTitle" type="text" />
          </label>
          <label class="notif-debug-field notif-debug-field--full">
            ${i18n.t("gateway.notify.admin.broadcast_message")}
            <textarea name="broadcastMessage" rows="4"></textarea>
          </label>
          <label class="notif-debug-field">
            ${i18n.t("gateway.notify.admin.broadcast_mode")}
            <select name="broadcastMode" class="theme-select">
              <option value="bar">${i18n.t("gateway.notify.admin.broadcast_mode_bar")}</option>
              <option value="popup">${i18n.t("gateway.notify.admin.broadcast_mode_popup")}</option>
            </select>
          </label>
          <label class="notif-debug-field">
            ${i18n.t("gateway.notify.admin.broadcast_start")}
            <input name="broadcastStartAt" type="datetime-local" />
          </label>
          <label class="notif-debug-field">
            ${i18n.t("gateway.notify.admin.broadcast_end")}
            <input name="broadcastEndAt" type="datetime-local" />
          </label>
          <label class="notif-debug-field notif-debug-field--full">
            ${i18n.t("gateway.notify.admin.broadcast_redirect")}
            <input name="broadcastRedirectUrl" type="url" placeholder="/dashboard" />
          </label>
          <div class="notif-debug-field notif-debug-field--full">
            <p>${i18n.t("gateway.notify.admin.broadcast_roles")}</p>
            <div class="notif-broadcast-roles">${roleCheckboxes}</div>
          </div>
          <label class="notif-debug-field">
            <input name="broadcastRequireAck" type="checkbox" />
            ${i18n.t("gateway.notify.admin.broadcast_require_ack")}
          </label>
          <label class="notif-debug-field">
            <input name="broadcastEnabled" type="checkbox" checked />
            ${i18n.t("ui.reuse.enabled")}
          </label>
        </div>
        <div class="notif-debug-actions">
          <button class="btn-animated notif-broadcast-create" type="button">${i18n.t("gateway.notify.admin.broadcast_create")}</button>
        </div>
        <div class="notif-broadcast-list">
          ${renderBroadcastRows()}
        </div>
      </div>
    `;
    }

    function bindNotificationsDebug(root) {
        const panel = root.querySelector(".notif-debug-panel");
        if (!panel) return;

        const sendBtn = panel.querySelector(".notif-debug-send");

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
                showToast(i18n.t("gateway.notify.admin.debug_missing_fields"), {
                    variant: "warning",
                });
                return;
            }

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

            showToast(
                res.ok
                    ? i18n.t("gateway.notify.admin.debug_sent")
                    : i18n.t("gateway.notify.admin.debug_send_failed"),
                { variant: res.ok ? "success" : "error" },
            );
        });
    }

    function parseDateTimeLocal(inputValue) {
        const normalizedValue = String(inputValue ?? "").trim();
        if (!normalizedValue) return null;
        const parsedDate = Date.parse(normalizedValue);
        if (!Number.isFinite(parsedDate)) return undefined;
        return parsedDate;
    }

    async function refreshBroadcastPanel(root) {
        broadcasts = await loadBroadcasts();
        const listContainer = root.querySelector(".notif-broadcast-list");
        if (listContainer) {
            listContainer.innerHTML = renderBroadcastRows();
        }
    }

    function bindBroadcastPanel(root) {
        const panel = root.querySelector(".notif-broadcast-panel");
        if (!panel) return;
        const createButton = panel.querySelector(".notif-broadcast-create");
        createButton?.addEventListener("click", async () => {
            const titleInput = panel.querySelector('[name="broadcastTitle"]');
            const messageInput = panel.querySelector('[name="broadcastMessage"]');
            const modeSelect = panel.querySelector('[name="broadcastMode"]');
            const startInput = panel.querySelector('[name="broadcastStartAt"]');
            const endInput = panel.querySelector('[name="broadcastEndAt"]');
            const redirectInput = panel.querySelector(
                '[name="broadcastRedirectUrl"]',
            );
            const requireAckInput = panel.querySelector(
                '[name="broadcastRequireAck"]',
            );
            const enabledInput = panel.querySelector('[name="broadcastEnabled"]');
            const selectedRoleInputs = Array.from(
                panel.querySelectorAll('[name="broadcastRoles"]:checked'),
            );

            const titleValue =
                titleInput instanceof HTMLInputElement
                    ? titleInput.value.trim()
                    : "";
            const messageValue =
                messageInput instanceof HTMLTextAreaElement
                    ? messageInput.value.trim()
                    : "";
            const modeValue =
                modeSelect instanceof HTMLSelectElement
                    ? modeSelect.value
                    : "bar";
            const startAtValue = parseDateTimeLocal(
                startInput instanceof HTMLInputElement
                    ? startInput.value
                    : "",
            );
            const endAtValue = parseDateTimeLocal(
                endInput instanceof HTMLInputElement ? endInput.value : "",
            );
            const redirectUrlValue =
                redirectInput instanceof HTMLInputElement
                    ? redirectInput.value.trim()
                    : "";
            const requireAcknowledgementValue =
                requireAckInput instanceof HTMLInputElement
                    ? requireAckInput.checked
                    : false;
            const enabledValue =
                enabledInput instanceof HTMLInputElement
                    ? enabledInput.checked
                    : true;
            const targetRoles = selectedRoleInputs
                .map((selectedRoleInput) =>
                    selectedRoleInput instanceof HTMLInputElement
                        ? selectedRoleInput.value
                        : "",
                )
                .filter(Boolean);

            if (
                !titleValue ||
                !messageValue ||
                !targetRoles.length ||
                startAtValue === undefined ||
                endAtValue === undefined
            ) {
                showToast(i18n.t("gateway.notify.admin.broadcast_invalid"), {
                    variant: "warning",
                });
                return;
            }

            const response = await apiFetch("/api/v1/notifications/broadcasts", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    title: titleValue,
                    message: messageValue,
                    displayMode: modeValue,
                    targetRoles,
                    startAt: startAtValue,
                    endAt: endAtValue,
                    requireAcknowledgement: requireAcknowledgementValue,
                    redirectUrl: redirectUrlValue || null,
                    enabled: enabledValue,
                }),
            });
            if (!response.ok) {
                showToast(i18n.t("gateway.notify.admin.broadcast_create_failed"), {
                    variant: "error",
                });
                return;
            }
            showToast(i18n.t("gateway.notify.admin.broadcast_created"), {
                variant: "success",
            });
            await refreshBroadcastPanel(root);
        });

        panel.addEventListener("click", async (event) => {
            const toggleButton = event.target.closest(".notif-broadcast-toggle");
            if (!(toggleButton instanceof HTMLButtonElement)) return;
            const broadcastRow = toggleButton.closest("[data-broadcast-id]");
            if (!(broadcastRow instanceof HTMLElement)) return;
            const broadcastId = String(
                broadcastRow.dataset.broadcastId ?? "",
            ).trim();
            const toggleAction = String(
                toggleButton.dataset.toggle ?? "",
            ).trim();
            if (!broadcastId || !toggleAction) return;
            const response = await apiFetch(
                `/api/v1/notifications/broadcasts/${encodeURIComponent(broadcastId)}/${encodeURIComponent(toggleAction)}`,
                { method: "POST" },
            );
            if (!response.ok) {
                showToast(i18n.t("gateway.notify.admin.broadcast_toggle_failed"), {
                    variant: "error",
                });
                return;
            }
            await refreshBroadcastPanel(root);
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
                {
                    id: "notifications-broadcast",
                    label: i18n.t("gateway.notify.admin.broadcast_label"),
                    pinned: true,
                    render: () => renderBroadcastContent(),
                },
            ],
            onRender: (root) => {
                bindNotificationsDebug(root);
                bindBroadcastPanel(root);
            },
        },
    };
}
