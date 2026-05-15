import { ACCESS_ROLES, getRoleLabel } from "/static/reuse/access-role.js";
import { ensurePageStylesheet } from "/static/reuse/page-styles.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import {
    isTrustedHttpUrl,
    loadTrustedDomains,
} from "/static/reuse/trusted-domains.js";

/**
 * Broadcast administration section for the notification gateway.
 *
 * Contributes broadcast creation and status management controls to the
 * Administration page as its own section.
 *
 * Public exports:
 *   createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) — returns a
 *     page-composer-compatible element definition with a dataReady promise.
 *
 * Usage:
 *   const mod = await import('/static/gateways/notify/broadcast-admin-section.js');
 *   const def = mod.createAdminSection({ i18n, apiFetch, escapeHtml, showToast });
 *   await def.dataReady;
 *
 * @param {{ i18n: object, apiFetch: Function, escapeHtml: Function, showToast: Function }} deps
 * @returns {{ id: string, label: string, dataReady: Promise<void>, subComposerOptions: object }}
 */
export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
    const stylesheetReady = ensurePageStylesheet(
        "/static/gateways/notify/broadcast-admin.css",
    );

    async function loadUsers() {
        const response = await apiFetch("/api/v1/users");
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload?.data) ? payload.data : [];
    }

    async function loadBroadcasts() {
        const response = await apiFetch("/api/v1/notifications/broadcasts");
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload?.data) ? payload.data : [];
    }

    async function loadBroadcastStates(broadcastId) {
        const response = await apiFetch(
            `/api/v1/notifications/broadcasts/${encodeURIComponent(broadcastId)}/states`,
        );
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload?.data) ? payload.data : [];
    }

    function parseDateTimeLocalInput(inputValue) {
        const normalizedValue = String(inputValue ?? "").trim();
        if (!normalizedValue) {
            return { isInvalid: false, value: null };
        }
        const parsedDate = Date.parse(normalizedValue);
        if (!Number.isFinite(parsedDate)) {
            return { isInvalid: true, value: null };
        }
        return { isInvalid: false, value: parsedDate };
    }

    function resolveUserRole(userRecord) {
        const declaredRole = String(userRecord?.role ?? "").trim();
        if (declaredRole) return declaredRole;
        return userRecord?.isAdmin ? "admin" : "user";
    }

    function renderScheduleText(broadcast) {
        const startText = broadcast.startAt
            ? formatDateTime(broadcast.startAt)
            : "";
        const endText = broadcast.endAt ? formatDateTime(broadcast.endAt) : "";
        if (startText && endText) {
            return `${startText} → ${endText}`;
        }
        return startText || endText || "—";
    }

    function getTargetedUsersForBroadcast(broadcast, userRows) {
        const targetRoles = Array.isArray(broadcast.targetRoles)
            ? new Set(broadcast.targetRoles.map((role) => String(role)))
            : new Set();
        if (!targetRoles.size) return [];
        return userRows
            .filter((userRecord) =>
                targetRoles.has(resolveUserRole(userRecord)),
            )
            .map((userRecord) => {
                const username = String(userRecord?.username ?? "").trim();
                return {
                    accountId: username,
                    username,
                };
            })
            .filter((targetUser) => targetUser.accountId.length > 0)
            .sort((leftUser, rightUser) =>
                leftUser.username.localeCompare(rightUser.username),
            );
    }

    function renderBroadcastRows(broadcastRows) {
        if (!broadcastRows.length) {
            return `
        <tr>
          <td colspan="9" class="notif-broadcast-empty-cell">${escapeHtml(i18n.t("gateway.notify.admin.broadcast_none"))}</td>
        </tr>
      `;
        }

        return broadcastRows
            .map((broadcast) => {
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
                const detailToggleLabel = i18n.t(
                    "gateway.notify.admin.broadcast_expand_details",
                );
                const detailsCell = broadcast.requireAcknowledgement
                    ? '<span class="notif-broadcast-row-indicator" aria-hidden="true">▸</span>'
                    : `<span class="notif-broadcast-static-indicator">${escapeHtml(i18n.t("gateway.notify.admin.broadcast_details_static"))}</span>`;
                const expandableAttributes = broadcast.requireAcknowledgement
                    ? ` data-expandable="true" tabindex="0" role="button" aria-expanded="false" aria-label="${escapeHtml(detailToggleLabel)}"`
                    : "";

                return `
          <tr class="notif-broadcast-row${broadcast.requireAcknowledgement ? " notif-broadcast-row--expandable" : ""}" data-broadcast-id="${escapeHtml(broadcast.id)}"${expandableAttributes}>
            <td>${escapeHtml(broadcast.title ?? "")}</td>
            <td>${escapeHtml(broadcast.message ?? "")}</td>
            <td>${escapeHtml(roleText)}</td>
            <td>${escapeHtml(renderScheduleText(broadcast))}</td>
            <td>${escapeHtml(broadcast.displayMode === "popup" ? i18n.t("gateway.notify.admin.broadcast_mode_popup") : i18n.t("gateway.notify.admin.broadcast_mode_bar"))}</td>
            <td>${broadcast.requireAcknowledgement ? "✓" : "—"}</td>
            <td>
              <span class="state-pill ${broadcast.enabled ? "pill-active" : "pill-disabled"}">${escapeHtml(statusText)}</span>
            </td>
            <td>
              <button type="button" class="btn-animated notif-broadcast-toggle" data-broadcast-id="${escapeHtml(broadcast.id)}" data-toggle="${escapeHtml(toggleAction)}">${escapeHtml(toggleLabel)}</button>
            </td>
            <td class="notif-broadcast-row-details">${detailsCell}</td>
          </tr>
        `;
            })
            .join("");
    }

    function renderBroadcastContent(broadcastRows) {
        const roleCheckboxes = ACCESS_ROLES.map(
            (role) => `
          <label class="notif-checkbox-option">
            <input type="checkbox" name="broadcastRoles" value="${escapeHtml(role)}" />
            <span>${escapeHtml(getRoleLabel(i18n, role))}</span>
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
            <input name="broadcastStartAt" type="datetime-local" class="notif-broadcast-datetime-input" />
          </label>
          <label class="notif-debug-field">
            ${i18n.t("gateway.notify.admin.broadcast_end")}
            <input name="broadcastEndAt" type="datetime-local" class="notif-broadcast-datetime-input" />
          </label>
          <label class="notif-debug-field notif-debug-field--full">
            ${i18n.t("gateway.notify.admin.broadcast_redirect")}
            <input name="broadcastRedirectUrl" type="url" placeholder="/dashboard" />
          </label>
          <div class="notif-debug-field notif-debug-field--full">
            <p class="notif-broadcast-subheading">${i18n.t("gateway.notify.admin.broadcast_roles")}</p>
            <div class="notif-broadcast-role-options">${roleCheckboxes}</div>
          </div>
          <div class="notif-debug-field notif-debug-field--full">
            <label class="notif-broadcast-switch-field">
              <span class="notif-broadcast-toggle-label">${i18n.t("gateway.notify.admin.broadcast_require_ack")}</span>
              <span class="switch switch--inline">
                <input name="broadcastRequireAck" type="checkbox" />
                <span class="slider"></span>
              </span>
            </label>
          </div>
          <div class="notif-debug-field notif-debug-field--full">
            <label class="notif-broadcast-switch-field">
              <span class="notif-broadcast-toggle-label">${i18n.t("gateway.notify.admin.broadcast_enable_immediately")}</span>
              <span class="switch switch--inline">
                <input name="broadcastEnabled" type="checkbox" checked />
                <span class="slider"></span>
              </span>
            </label>
          </div>
        </div>
        <div class="notif-debug-actions">
          <button class="btn-animated notif-broadcast-create" type="button">${i18n.t("gateway.notify.admin.broadcast_create")}</button>
        </div>
        <div class="notif-broadcast-table-wrap">
          <table class="notif-broadcast-table">
            <thead>
              <tr>
                <th>${escapeHtml(i18n.t("gateway.notify.admin.broadcast_table_title"))}</th>
                <th>${escapeHtml(i18n.t("gateway.notify.admin.broadcast_table_message"))}</th>
                <th>${escapeHtml(i18n.t("gateway.notify.admin.broadcast_table_roles"))}</th>
                <th>${escapeHtml(i18n.t("gateway.notify.admin.broadcast_table_schedule"))}</th>
                <th>${escapeHtml(i18n.t("gateway.notify.admin.broadcast_table_mode"))}</th>
                <th>${escapeHtml(i18n.t("gateway.notify.admin.broadcast_table_ack"))}</th>
                <th>${escapeHtml(i18n.t("gateway.notify.admin.broadcast_table_status"))}</th>
                <th>${escapeHtml(i18n.t("ui.reuse.actions"))}</th>
                <th>${escapeHtml(i18n.t("gateway.notify.admin.broadcast_table_details"))}</th>
              </tr>
            </thead>
            <tbody class="notif-broadcast-table-body">
              ${renderBroadcastRows(broadcastRows)}
            </tbody>
          </table>
        </div>
      </div>
    `;
    }

    let userRows = [];
    let broadcastRows = [];
    const acknowledgementCache = new Map();

    const dataReady = Promise.all([
        stylesheetReady,
        loadUsers(),
        loadBroadcasts(),
    ]).then(([, loadedUserRows, loadedBroadcastRows]) => {
        userRows = loadedUserRows;
        broadcastRows = loadedBroadcastRows;
    });

    function findBroadcastById(broadcastId) {
        return broadcastRows.find(
            (broadcast) => String(broadcast.id) === String(broadcastId),
        );
    }

    function renderAcknowledgementStatusDetails(targetUsers, stateRows) {
        if (!targetUsers.length) {
            return `<p class="notif-broadcast-ack-empty">${escapeHtml(i18n.t("gateway.notify.admin.broadcast_ack_no_targets"))}</p>`;
        }

        const stateByAccountId = new Map(
            stateRows.map((stateRecord) => [
                String(stateRecord.accountId ?? ""),
                stateRecord,
            ]),
        );

        const targetUserRows = targetUsers
            .map((targetUser) => {
                const stateRow = stateByAccountId.get(targetUser.accountId);
                const acknowledgedAt =
                    stateRow?.acknowledgedAt == null
                        ? null
                        : Number(stateRow.acknowledgedAt);
                const dismissedAt =
                    stateRow?.dismissedAt == null
                        ? null
                        : Number(stateRow.dismissedAt);

                let stateLabel = i18n.t(
                    "gateway.notify.admin.broadcast_ack_state_pending",
                );
                let stateClassName = "pill-available";
                let stateTimestamp = "—";

                if (acknowledgedAt) {
                    stateLabel = i18n.t(
                        "gateway.notify.admin.broadcast_ack_state_acknowledged",
                    );
                    stateClassName = "pill-active";
                    stateTimestamp = formatDateTime(acknowledgedAt);
                } else if (dismissedAt) {
                    stateLabel = i18n.t(
                        "gateway.notify.admin.broadcast_ack_state_dismissed",
                    );
                    stateClassName = "pill-disabled";
                    stateTimestamp = formatDateTime(dismissedAt);
                }

                return `
              <tr>
                <td>${escapeHtml(targetUser.username)}</td>
                <td><span class="state-pill ${stateClassName}">${escapeHtml(stateLabel)}</span></td>
                <td>${escapeHtml(stateTimestamp)}</td>
              </tr>
            `;
            })
            .join("");

        return `
        <table class="notif-broadcast-ack-table">
          <thead>
            <tr>
              <th>${escapeHtml(i18n.t("gateway.notify.admin.broadcast_ack_user"))}</th>
              <th>${escapeHtml(i18n.t("gateway.notify.admin.broadcast_ack_state"))}</th>
              <th>${escapeHtml(i18n.t("gateway.notify.admin.broadcast_ack_timestamp"))}</th>
            </tr>
          </thead>
          <tbody>
            ${targetUserRows}
          </tbody>
        </table>
      `;
    }

    function removeAcknowledgementDetailRow(broadcastRow) {
        const nextRow = broadcastRow.nextElementSibling;
        if (
            nextRow instanceof HTMLTableRowElement &&
            nextRow.classList.contains("notif-broadcast-ack-row")
        ) {
            nextRow.remove();
        }
    }

    function detailRowLabel(isExpanded) {
        return isExpanded
            ? i18n.t("gateway.notify.admin.broadcast_collapse_details")
            : i18n.t("gateway.notify.admin.broadcast_expand_details");
    }

    function setBroadcastRowExpandedState(broadcastRow, isExpanded) {
        broadcastRow.classList.toggle(
            "notif-broadcast-row--expanded",
            isExpanded,
        );
        broadcastRow.setAttribute("aria-expanded", String(isExpanded));
        broadcastRow.setAttribute("aria-label", detailRowLabel(isExpanded));
    }

    function collapseExpandedBroadcastRows(root, exceptBroadcastId = null) {
        root.querySelectorAll(".notif-broadcast-row--expanded").forEach(
            (row) => {
                if (!(row instanceof HTMLTableRowElement)) return;
                if (
                    exceptBroadcastId !== null &&
                    String(row.dataset.broadcastId ?? "") === exceptBroadcastId
                ) {
                    return;
                }
                removeAcknowledgementDetailRow(row);
                setBroadcastRowExpandedState(row, false);
            },
        );
    }

    function getBroadcastCreateValidationError({
        titleValue,
        messageValue,
        targetRoles,
        startAtInput,
        endAtInput,
        redirectUrlValue,
        trustedDomains,
    }) {
        if (!titleValue) {
            return i18n.t("gateway.notify.admin.broadcast_error_missing_title");
        }
        if (!messageValue) {
            return i18n.t(
                "gateway.notify.admin.broadcast_error_missing_message",
            );
        }
        if (!targetRoles.length) {
            return i18n.t("gateway.notify.admin.broadcast_error_missing_roles");
        }
        if (startAtInput.isInvalid || endAtInput.isInvalid) {
            return i18n.t(
                "gateway.notify.admin.broadcast_error_invalid_timestamp",
            );
        }
        const hasStartAt = startAtInput.value !== null;
        const hasEndAt = endAtInput.value !== null;
        if (hasStartAt !== hasEndAt) {
            return i18n.t(
                "gateway.notify.admin.broadcast_error_partial_window",
            );
        }
        if (
            startAtInput.value !== null &&
            endAtInput.value !== null &&
            startAtInput.value >= endAtInput.value
        ) {
            return i18n.t("gateway.notify.admin.broadcast_error_invalid_range");
        }
        if (
            redirectUrlValue &&
            !isTrustedHttpUrl(redirectUrlValue, {
                baseUrl: window.location.origin,
                trustedDomains,
            })
        ) {
            return i18n.t(
                "gateway.notify.admin.broadcast_error_invalid_redirect",
            );
        }
        return null;
    }

    function resolveBroadcastCreateErrorMessage(errorCode) {
        const errorMessageByCode = {
            missing_broadcast_title:
                "gateway.notify.admin.broadcast_error_missing_title",
            missing_broadcast_message:
                "gateway.notify.admin.broadcast_error_missing_message",
            missing_broadcast_roles:
                "gateway.notify.admin.broadcast_error_missing_roles",
            invalid_broadcast_timestamp:
                "gateway.notify.admin.broadcast_error_invalid_timestamp",
            partial_broadcast_window:
                "gateway.notify.admin.broadcast_error_partial_window",
            invalid_broadcast_window_range:
                "gateway.notify.admin.broadcast_error_invalid_range",
            invalid_broadcast_redirect:
                "gateway.notify.admin.broadcast_error_invalid_redirect",
        };
        const messageKey = errorMessageByCode[errorCode];
        return messageKey
            ? i18n.t(messageKey)
            : i18n.t("gateway.notify.admin.broadcast_create_failed");
    }

    async function refreshBroadcastTable(root) {
        broadcastRows = await loadBroadcasts();
        const tableBody = root.querySelector(".notif-broadcast-table-body");
        if (!(tableBody instanceof HTMLElement)) return;
        tableBody.innerHTML = renderBroadcastRows(broadcastRows);
    }

    async function ensureAcknowledgementStateRows(broadcastId) {
        if (!acknowledgementCache.has(broadcastId)) {
            const stateRows = await loadBroadcastStates(broadcastId);
            acknowledgementCache.set(broadcastId, stateRows);
        }
        return acknowledgementCache.get(broadcastId) ?? [];
    }

    async function toggleBroadcastDetailRow(root, broadcastRow) {
        const broadcastId = String(
            broadcastRow.dataset.broadcastId ?? "",
        ).trim();
        if (!broadcastId) return;
        const isExpanded = broadcastRow.classList.contains(
            "notif-broadcast-row--expanded",
        );
        if (isExpanded) {
            removeAcknowledgementDetailRow(broadcastRow);
            setBroadcastRowExpandedState(broadcastRow, false);
            return;
        }

        const broadcast = findBroadcastById(broadcastId);
        if (!broadcast) return;
        const targetUsers = getTargetedUsersForBroadcast(broadcast, userRows);

        collapseExpandedBroadcastRows(root, broadcastId);
        setBroadcastRowExpandedState(broadcastRow, true);

        try {
            const stateRows = await ensureAcknowledgementStateRows(broadcastId);
            removeAcknowledgementDetailRow(broadcastRow);
            broadcastRow.insertAdjacentHTML(
                "afterend",
                `
              <tr class="notif-broadcast-ack-row" data-parent-id="${escapeHtml(
                  broadcastId,
              )}">
                <td colspan="9">
                  ${renderAcknowledgementStatusDetails(targetUsers, stateRows)}
                </td>
              </tr>
            `,
            );
        } catch {
            setBroadcastRowExpandedState(broadcastRow, false);
            showToast(i18n.t("gateway.notify.admin.broadcast_details_failed"), {
                variant: "error",
            });
        }
    }

    function bindBroadcastSection(root) {
        const panel = root.querySelector(".notif-broadcast-panel");
        if (!(panel instanceof HTMLElement)) return;

        const createButton = panel.querySelector(".notif-broadcast-create");
        createButton?.addEventListener("click", async () => {
            const titleInput = panel.querySelector('[name="broadcastTitle"]');
            const messageInput = panel.querySelector(
                '[name="broadcastMessage"]',
            );
            const modeSelect = panel.querySelector('[name="broadcastMode"]');
            const startInput = panel.querySelector('[name="broadcastStartAt"]');
            const endInput = panel.querySelector('[name="broadcastEndAt"]');
            const redirectInput = panel.querySelector(
                '[name="broadcastRedirectUrl"]',
            );
            const requireAckInput = panel.querySelector(
                '[name="broadcastRequireAck"]',
            );
            const enabledInput = panel.querySelector(
                '[name="broadcastEnabled"]',
            );
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
            const startAtInput = parseDateTimeLocalInput(
                startInput instanceof HTMLInputElement ? startInput.value : "",
            );
            const endAtInput = parseDateTimeLocalInput(
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
            const trustedDomains = await loadTrustedDomains(apiFetch);

            const validationMessage = getBroadcastCreateValidationError({
                titleValue,
                messageValue,
                targetRoles,
                startAtInput,
                endAtInput,
                redirectUrlValue,
                trustedDomains,
            });
            if (validationMessage) {
                showToast(validationMessage, {
                    variant: "warning",
                });
                return;
            }

            try {
                const response = await apiFetch(
                    "/api/v1/notifications/broadcasts",
                    {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                            title: titleValue,
                            message: messageValue,
                            displayMode: modeValue,
                            targetRoles,
                            startAt: startAtInput.value,
                            endAt: endAtInput.value,
                            requireAcknowledgement: requireAcknowledgementValue,
                            redirectUrl: redirectUrlValue || null,
                            enabled: enabledValue,
                        }),
                    },
                );
                if (!response.ok) {
                    const payload = await response.json().catch(() => null);
                    const errorCode = String(payload?.error?.code ?? "").trim();
                    showToast(resolveBroadcastCreateErrorMessage(errorCode), {
                        variant: "error",
                    });
                    return;
                }
                acknowledgementCache.clear();
                collapseExpandedBroadcastRows(root);
                showToast(i18n.t("gateway.notify.admin.broadcast_created"), {
                    variant: "success",
                });
                await refreshBroadcastTable(root);
            } catch {
                showToast(
                    i18n.t("gateway.notify.admin.broadcast_create_failed"),
                    {
                        variant: "error",
                    },
                );
            }
        });

        panel.addEventListener("click", async (event) => {
            const targetNode = event.target;
            if (!(targetNode instanceof Element)) return;

            const toggleButton = targetNode.closest(".notif-broadcast-toggle");
            if (toggleButton instanceof HTMLButtonElement) {
                const broadcastId = String(
                    toggleButton.dataset.broadcastId ?? "",
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
                    showToast(
                        i18n.t("gateway.notify.admin.broadcast_toggle_failed"),
                        {
                            variant: "error",
                        },
                    );
                    return;
                }

                acknowledgementCache.delete(broadcastId);
                collapseExpandedBroadcastRows(root);
                await refreshBroadcastTable(root);
                return;
            }

            if (
                targetNode.closest(
                    "button, a, input, label, select, textarea, .notif-broadcast-ack-row",
                )
            ) {
                return;
            }
            const broadcastRow = targetNode.closest(
                '.notif-broadcast-row[data-expandable="true"]',
            );
            if (!(broadcastRow instanceof HTMLTableRowElement)) return;
            await toggleBroadcastDetailRow(root, broadcastRow);
        });

        panel.addEventListener("keydown", async (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            const targetNode = event.target;
            if (!(targetNode instanceof Element)) return;
            const broadcastRow = targetNode.closest(
                '.notif-broadcast-row[data-expandable="true"]',
            );
            if (!(broadcastRow instanceof HTMLTableRowElement)) return;
            event.preventDefault();
            await toggleBroadcastDetailRow(root, broadcastRow);
        });
    }

    return {
        id: "broadcasts",
        label: i18n.t("gateway.notify.admin.broadcast_label"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-broadcasts-layout",
            heading: i18n.t("gateway.notify.admin.broadcast_label"),
            elements: [
                {
                    id: "notifications-broadcast",
                    label: i18n.t("gateway.notify.admin.broadcast_label"),
                    pinned: true,
                    render: () => renderBroadcastContent(broadcastRows),
                },
            ],
            onRender: (rootElement) => {
                bindBroadcastSection(rootElement);
            },
        },
    };
}
