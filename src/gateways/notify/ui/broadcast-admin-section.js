import { loadAdminTemplates } from "./reuse/templates.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import { createAdminDraft } from "./reuse/admin-draft.js";
import { ACCESS_ROLES, getRoleLabel } from "/static/reuse/access-role.js";
import { ensurePageStylesheet } from "/static/reuse/page-styles.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import {
    isTrustedHttpUrl,
    loadTrustedDomains,
} from "/static/reuse/trusted-domains.js";

/**
 * Contribute broadcast publication with memory-only drafts and mounted action ownership.
 * @param {{ i18n: object, apiFetch: Function, escapeHtml: Function, showToast: Function, onDirtyChange?: Function }} deps
 * @returns {object} Administration contribution with dirty, discard and subcomposer lifecycle hooks.
 */
export function createAdminSection({
    i18n,
    apiFetch,
    escapeHtml,
    showToast,
    onDirtyChange,
}) {
    const draft = createAdminDraft({
        id: "broadcasts",
        onDirtyChange,
        submitSelector:
            ".notif-broadcast-create, .notif-broadcast-toggle, .notif-broadcast-refresh",
    });
    let detailIntent = null;
    const stylesheetReady = ensurePageStylesheet(
        "/static/gateways/notify/broadcast-admin.css",
    );

    async function loadUsers() {
        const response = await apiFetch("/api/v1/users");
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload?.data) ? payload.data : [];
    }

    async function loadBroadcasts(signal) {
        const response = await apiFetch("/api/v1/notify/broadcasts", {
            signal,
        });
        if (!response.ok) throw new Error("broadcast_list_failed");
        const payload = await response.json();
        if (!Array.isArray(payload?.data))
            throw new Error("broadcast_list_invalid");
        return payload.data;
    }

    async function loadBroadcastStates(broadcastId, signal) {
        const response = await apiFetch(
            `/api/v1/notify/broadcasts/${encodeURIComponent(broadcastId)}/states`,
            { signal },
        );
        if (!response.ok) throw new Error("broadcast_states_failed");
        const payload = await response.json();
        if (!Array.isArray(payload?.data))
            throw new Error("broadcast_states_invalid");
        return payload.data;
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
        return "user";
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
            <td class="notif-broadcast-message-cell">${renderMarkdown(broadcast.message ?? "")}</td>
            <td>${escapeHtml(roleText)}</td>
            <td>${escapeHtml(renderScheduleText(broadcast))}</td>
            <td>${escapeHtml(broadcast.displayMode === "popup" ? i18n.t("gateway.notify.admin.broadcast_mode_popup") : i18n.t("gateway.notify.admin.broadcast_mode_bar"))}</td>
            <td>${broadcast.requireAcknowledgement ? "✓" : "—"}</td>
            <td>
              <span class="state-pill ${broadcast.enabled ? "pill-active" : "pill-disabled"}">${escapeHtml(statusText)}</span>
            </td>
            <td>
              <button type="button" class="${broadcast.enabled ? "btn-cancel" : "btn-confirm"} btn-animated notif-broadcast-toggle" data-broadcast-id="${escapeHtml(broadcast.id)}" data-toggle="${escapeHtml(toggleAction)}">${escapeHtml(toggleLabel)}</button>
            </td>
            <td class="notif-broadcast-row-details">${detailsCell}</td>
          </tr>
        `;
            })
            .join("");
    }

    function renderBroadcastContent(broadcastRows) {
        if (!draft.active()) return "";
        const roleCheckboxes = ACCESS_ROLES.map(
            (role) => `
          <label class="notif-checkbox-option">
            <input type="checkbox" name="broadcastRoles" value="${escapeHtml(role)}" />
            <span>${escapeHtml(getRoleLabel(i18n, role))}</span>
          </label>
        `,
        ).join("");

        return formatTemplate(templates.broadcast, {
            broadcast_title_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_title"),
            ),
            broadcast_message_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_message"),
            ),
            broadcast_mode_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_mode"),
            ),
            broadcast_mode_bar_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_mode_bar"),
            ),
            broadcast_mode_popup_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_mode_popup"),
            ),
            broadcast_start_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_start"),
            ),
            broadcast_end_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_end"),
            ),
            broadcast_redirect_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_redirect"),
            ),
            broadcast_roles_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_roles"),
            ),
            role_checkboxes: roleCheckboxes,
            broadcast_require_ack_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_require_ack"),
            ),
            broadcast_enable_immediately_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_enable_immediately"),
            ),
            broadcast_create_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_create"),
            ),
            broadcast_table_title_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_table_title"),
            ),
            broadcast_table_message_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_table_message"),
            ),
            broadcast_table_roles_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_table_roles"),
            ),
            broadcast_table_schedule_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_table_schedule"),
            ),
            broadcast_table_mode_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_table_mode"),
            ),
            broadcast_table_ack_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_table_ack"),
            ),
            broadcast_table_status_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_table_status"),
            ),
            actions_label: escapeHtml(i18n.t("ui.reuse.actions")),
            broadcast_table_details_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_table_details"),
            ),
            broadcast_rows: renderBroadcastRows(broadcastRows),
            refresh_label: escapeHtml(i18n.t("ui.reuse.refresh")),
        });
    }

    let templates;
    let userRows = [];
    let broadcastRows = [];
    const acknowledgementCache = new Map();

    const dataReady = Promise.all([
        stylesheetReady,
        loadUsers(),
        loadBroadcasts(),
        loadAdminTemplates(["broadcast", "acknowledgement"]),
    ]).then(([, loadedUserRows, loadedBroadcastRows, loadedTemplates]) => {
        if (!draft.active()) return;
        userRows = loadedUserRows;
        broadcastRows = loadedBroadcastRows;
        templates = loadedTemplates;
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

        return formatTemplate(templates.acknowledgement, {
            broadcast_ack_user_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_ack_user"),
            ),
            broadcast_ack_state_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_ack_state"),
            ),
            broadcast_ack_timestamp_label: escapeHtml(
                i18n.t("gateway.notify.admin.broadcast_ack_timestamp"),
            ),
            target_user_rows: targetUserRows,
        });
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
                row.removeAttribute("aria-busy");
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

    async function refreshBroadcastTable(operation) {
        let nextRows;
        try {
            nextRows = await loadBroadcasts(operation.signal);
        } catch {
            if (!draft.owns(operation)) return;
            draft.log("error", "refresh_failed");
            showToast(i18n.t("gateway.notify.admin.broadcast_refresh_failed"), {
                variant: "error",
            });
            return;
        }
        if (!draft.owns(operation)) return;
        const tableBody = operation.binding.panel.querySelector(
            ".notif-broadcast-table-body",
        );
        if (!(tableBody instanceof HTMLElement)) return;
        const content = renderBroadcastRows(nextRows);
        detailIntent = null;
        acknowledgementCache.clear();
        broadcastRows = nextRows;
        tableBody.innerHTML = content;
    }

    function ensureAcknowledgementStateRows(broadcastId, binding) {
        if (!acknowledgementCache.has(broadcastId)) {
            const request = loadBroadcastStates(
                broadcastId,
                binding.signal,
            ).catch((error) => {
                if (acknowledgementCache.get(broadcastId) === request)
                    acknowledgementCache.delete(broadcastId);
                throw error;
            });
            acknowledgementCache.set(broadcastId, request);
        }
        return acknowledgementCache.get(broadcastId);
    }

    async function toggleBroadcastDetailRow(root, broadcastRow, binding) {
        if (!draft.current(binding)) return;
        const broadcastId = String(
            broadcastRow.dataset.broadcastId ?? "",
        ).trim();
        if (!broadcastId) return;
        detailIntent = null;
        const isExpanded = broadcastRow.classList.contains(
            "notif-broadcast-row--expanded",
        );
        if (isExpanded) {
            removeAcknowledgementDetailRow(broadcastRow);
            setBroadcastRowExpandedState(broadcastRow, false);
            broadcastRow.removeAttribute("aria-busy");
            return;
        }
        const broadcast = findBroadcastById(broadcastId);
        if (!broadcast) return;
        const targetUsers = getTargetedUsersForBroadcast(broadcast, userRows);
        collapseExpandedBroadcastRows(root, broadcastId);
        setBroadcastRowExpandedState(broadcastRow, true);
        broadcastRow.setAttribute("aria-busy", "true");
        const intent = { broadcastRow, binding };
        detailIntent = intent;
        const isCurrent = () =>
            detailIntent === intent &&
            draft.current(binding) &&
            binding.panel.contains(broadcastRow) &&
            broadcastRow.getAttribute("aria-expanded") === "true";
        let stateRows;
        try {
            stateRows = await ensureAcknowledgementStateRows(
                broadcastId,
                binding,
            );
        } catch {
            if (!isCurrent()) return;
            detailIntent = null;
            setBroadcastRowExpandedState(broadcastRow, false);
            broadcastRow.removeAttribute("aria-busy");
            draft.log("error", "details_failed", { broadcastId });
            showToast(i18n.t("gateway.notify.admin.broadcast_details_failed"), {
                variant: "error",
            });
            return;
        }
        if (!isCurrent()) return;
        broadcastRow.removeAttribute("aria-busy");
        removeAcknowledgementDetailRow(broadcastRow);
        broadcastRow.insertAdjacentHTML(
            "afterend",
            `
            <tr class="notif-broadcast-ack-row" data-parent-id="${escapeHtml(broadcastId)}">
                <td colspan="9">${renderAcknowledgementStatusDetails(targetUsers, stateRows)}</td>
            </tr>
        `,
        );
    }

    function bindBroadcastSection(root) {
        const panel = root.querySelector(".notif-broadcast-panel");
        if (!(panel instanceof HTMLElement)) return;
        const binding = draft.bind(panel);
        if (!binding) return;
        detailIntent = null;
        acknowledgementCache.clear();

        panel.querySelector(".notif-broadcast-refresh")?.addEventListener(
            "click",
            async () => {
                const operation = draft.begin(binding);
                if (!operation) return;
                try {
                    await refreshBroadcastTable(operation);
                } finally {
                    draft.finish(operation);
                }
            },
            { signal: binding.signal },
        );

        const createButton = panel.querySelector(".notif-broadcast-create");
        createButton?.addEventListener(
            "click",
            async () => {
                const operation = draft.begin(binding);
                if (!operation) return;
                try {
                    const titleInput = panel.querySelector(
                        '[name="broadcastTitle"]',
                    );
                    const messageInput = panel.querySelector(
                        '[name="broadcastMessage"]',
                    );
                    const modeSelect = panel.querySelector(
                        '[name="broadcastMode"]',
                    );
                    const startInput = panel.querySelector(
                        '[name="broadcastStartAt"]',
                    );
                    const endInput = panel.querySelector(
                        '[name="broadcastEndAt"]',
                    );
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
                        panel.querySelectorAll(
                            '[name="broadcastRoles"]:checked',
                        ),
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
                        startInput instanceof HTMLInputElement
                            ? startInput.value
                            : "",
                    );
                    const endAtInput = parseDateTimeLocalInput(
                        endInput instanceof HTMLInputElement
                            ? endInput.value
                            : "",
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
                    let trustedDomains;
                    try {
                        trustedDomains = await loadTrustedDomains(apiFetch);
                    } catch {
                        if (!draft.owns(operation)) return;
                        draft.log("error", "create_validation_failed");
                        showToast(
                            i18n.t(
                                "gateway.notify.admin.broadcast_create_failed",
                            ),
                            { variant: "error" },
                        );
                        return;
                    }
                    if (!draft.owns(operation)) return;

                    const validationMessage = getBroadcastCreateValidationError(
                        {
                            titleValue,
                            messageValue,
                            targetRoles,
                            startAtInput,
                            endAtInput,
                            redirectUrlValue,
                            trustedDomains,
                        },
                    );
                    if (validationMessage) {
                        showToast(validationMessage, {
                            variant: "warning",
                        });
                        return;
                    }

                    let response;
                    let errorCode = "";
                    try {
                        draft.log("info", "create_started");
                        response = await apiFetch("/api/v1/notify/broadcasts", {
                            method: "POST",
                            signal: operation.signal,
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                                title: titleValue,
                                message: messageValue,
                                displayMode: modeValue,
                                targetRoles,
                                startAt: startAtInput.value,
                                endAt: endAtInput.value,
                                requireAcknowledgement:
                                    requireAcknowledgementValue,
                                redirectUrl: redirectUrlValue || null,
                                enabled: enabledValue,
                            }),
                        });
                        if (!response.ok) {
                            const payload = await response.json();
                            errorCode = String(
                                payload?.error?.code ?? "",
                            ).trim();
                        }
                    } catch {
                        if (!draft.owns(operation)) return;
                        draft.log("error", "create_failed");
                        showToast(
                            i18n.t(
                                "gateway.notify.admin.broadcast_create_failed",
                            ),
                            { variant: "error" },
                        );
                        return;
                    }
                    if (!draft.owns(operation)) return;
                    if (!response.ok) {
                        draft.log("error", "create_failed", {
                            status: response.status,
                        });
                        showToast(
                            resolveBroadcastCreateErrorMessage(errorCode),
                            { variant: "error" },
                        );
                        return;
                    }
                    draft.accept(operation);
                    draft.log("info", "created");
                    showToast(
                        i18n.t("gateway.notify.admin.broadcast_created"),
                        { variant: "success" },
                    );
                    await refreshBroadcastTable(operation);
                } finally {
                    draft.finish(operation);
                }
            },
            { signal: binding.signal },
        );

        panel.addEventListener(
            "click",
            async (event) => {
                const targetNode = event.target;
                if (!(targetNode instanceof Element)) return;

                const toggleButton = targetNode.closest(
                    ".notif-broadcast-toggle",
                );
                if (toggleButton instanceof HTMLButtonElement) {
                    const broadcastId = String(
                        toggleButton.dataset.broadcastId ?? "",
                    ).trim();
                    const toggleAction = String(
                        toggleButton.dataset.toggle ?? "",
                    ).trim();
                    if (!broadcastId || !toggleAction) return;

                    const operation = draft.begin(binding);
                    if (!operation) return;
                    try {
                        let response;
                        try {
                            draft.log("info", "toggle_started", {
                                broadcastId,
                            });
                            response = await apiFetch(
                                `/api/v1/notify/broadcasts/${encodeURIComponent(broadcastId)}/${encodeURIComponent(toggleAction)}`,
                                { method: "POST", signal: operation.signal },
                            );
                        } catch {
                            if (!draft.owns(operation)) return;
                            draft.log("error", "toggle_failed", {
                                broadcastId,
                            });
                            showToast(
                                i18n.t(
                                    "gateway.notify.admin.broadcast_toggle_failed",
                                ),
                                { variant: "error" },
                            );
                            return;
                        }
                        if (!draft.owns(operation)) return;
                        if (!response.ok) {
                            draft.log("error", "toggle_failed", {
                                broadcastId,
                                status: response.status,
                            });
                            showToast(
                                i18n.t(
                                    "gateway.notify.admin.broadcast_toggle_failed",
                                ),
                                { variant: "error" },
                            );
                            return;
                        }
                        draft.log("info", "toggled", { broadcastId });
                        await refreshBroadcastTable(operation);
                    } finally {
                        draft.finish(operation);
                    }
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
                await toggleBroadcastDetailRow(root, broadcastRow, binding);
            },
            { signal: binding.signal },
        );

        panel.addEventListener(
            "keydown",
            async (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                const targetNode = event.target;
                if (!(targetNode instanceof Element)) return;
                if (
                    targetNode.closest(
                        "button, a, input, label, select, textarea",
                    )
                )
                    return;
                const broadcastRow = targetNode.closest(
                    '.notif-broadcast-row[data-expandable="true"]',
                );
                if (!(broadcastRow instanceof HTMLTableRowElement)) return;
                event.preventDefault();
                await toggleBroadcastDetailRow(root, broadcastRow, binding);
            },
            { signal: binding.signal },
        );
    }

    return {
        id: "broadcasts",
        label: i18n.t("gateway.notify.admin.broadcast_label"),
        dataReady,
        isDirty: draft.isDirty,
        discard: draft.discard,
        subComposerOptions: {
            onUnmount() {
                detailIntent = null;
                acknowledgementCache.clear();
                draft.unmount();
            },
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
