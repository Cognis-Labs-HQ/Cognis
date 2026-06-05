import {
    getSelectedReminderOffsets,
    renderReminderField,
} from "./popup-manager-reminders.js";

function renderCalendarShareResults({ i18n, escapeHtml, shareData }) {
    return `<p class="calendar-share-links-details">${escapeHtml(i18n.t("gateway.calendar.share_links_details"))}</p>
      <label class="calendar-share-result">
        <span>CalDAV</span>
        <div class="calendar-share-result-row">
          <input type="text" readonly value="${escapeHtml(shareData.caldavUrl)}" />
          <button type="button" class="btn-no-animation" data-calendar-share-copy="${escapeHtml(shareData.caldavUrl)}">${escapeHtml(i18n.t("gateway.calendar.share_link_copy"))}</button>
        </div>
      </label>
      <label class="calendar-share-result">
        <span>ICS</span>
        <div class="calendar-share-result-row">
          <input type="text" readonly value="${escapeHtml(shareData.icsUrl)}" />
          <button type="button" class="btn-no-animation" data-calendar-share-copy="${escapeHtml(shareData.icsUrl)}">${escapeHtml(i18n.t("gateway.calendar.share_link_copy"))}</button>
        </div>
      </label>`;
}

function bindCalendarShareControls({
    overlay,
    calendarId,
    i18n,
    apiFetch,
    escapeHtml,
    showToast,
}) {
    const shareGenerateBtn = overlay.querySelector("#calendar-share-generate");
    const shareResults = overlay.querySelector("#calendar-share-results");
    if (!shareGenerateBtn || !shareResults) {
        console.warn(
            "[calendar] Missing share controls in calendar edit popup.",
        );
        return;
    }
    const loadCalendarShareLinks = async () => {
        const permission = String(
            overlay.querySelector("#calendar-share-permission")?.value ??
                "read",
        );
        const expiresInHoursRaw = String(
            overlay.querySelector("#calendar-share-expiry")?.value ?? "24",
        );
        const shareName = String(
            overlay.querySelector("#calendar-share-name")?.value ?? "",
        ).trim();
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/share`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    permission: permission === "write" ? "write" : "read",
                    expiresInHours:
                        expiresInHoursRaw === "never"
                            ? null
                            : Number(expiresInHoursRaw),
                    name: shareName || undefined,
                }),
            },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.share_link_failed"), "error");
            shareResults.hidden = true;
            return;
        }
        const payload = await response.json().catch(() => null);
        const shareData = payload?.data;
        if (
            typeof shareData?.caldavUrl !== "string" ||
            typeof shareData?.icsUrl !== "string"
        ) {
            showToast(i18n.t("gateway.calendar.share_link_failed"), "error");
            shareResults.hidden = true;
            return;
        }
        shareResults.innerHTML = renderCalendarShareResults({
            i18n,
            escapeHtml,
            shareData,
        });
        shareResults.hidden = false;
    };
    shareGenerateBtn.addEventListener("click", () => {
        void loadCalendarShareLinks();
    });
    void loadCalendarShareLinks();
    shareResults.addEventListener("click", async (event) => {
        const copyButton = event.target.closest("[data-calendar-share-copy]");
        if (!(copyButton instanceof HTMLElement)) return;
        const link = String(
            copyButton.getAttribute("data-calendar-share-copy") ?? "",
        );
        if (
            !link ||
            typeof navigator === "undefined" ||
            !navigator.clipboard?.writeText
        ) {
            return;
        }
        await navigator.clipboard.writeText(link);
        showToast(i18n.t("gateway.calendar.share_link_copied"), "success");
    });
}

export function createCalendarEditPopupHandler({
    i18n,
    apiFetch,
    showToast,
    openPopup,
    escapeHtml,
    calendarUi,
    reloadState,
    refreshComposer,
}) {
    async function openCalendarEditPopup(calendar) {
        await openPopup({
            title: i18n.t("gateway.calendar.edit_calendar"),
            maxWidth: "460px",
            body: () => {
                const nameFieldDisabledAttr = calendar.isDefault
                    ? " disabled"
                    : "";
                const isPrivate = calendar.visibility !== "public";
                return `<div class="calendar-edit-popup">
          <div class="calendar-create-row">
            <input id="calendar-edit-color" type="color" value="${escapeHtml(calendarUi.normalizeHexColor(calendar.color))}" class="calendar-color-picker-bare" />
            <input id="calendar-edit-name" type="text" value="${escapeHtml(calendar.name)}" placeholder="${escapeHtml(i18n.t("gateway.calendar.calendar_name_placeholder"))}" required${nameFieldDisabledAttr} />
          </div>
          <div class="calendar-visibility-row">
            <p class="calendar-share-label">${escapeHtml(i18n.t("gateway.calendar.visibility_heading"))}</p>
            <select id="calendar-edit-visibility">
              <option value="private"${isPrivate ? " selected" : ""}>${escapeHtml(i18n.t("gateway.calendar.visibility_private"))}</option>
              <option value="public"${!isPrivate ? " selected" : ""}>${escapeHtml(i18n.t("gateway.calendar.visibility_public"))}</option>
            </select>
          </div>
          <div class="calendar-share-controls">
            <p class="calendar-share-label">${escapeHtml(i18n.t("gateway.calendar.share_calendar"))}</p>
            <div class="calendar-share-input-row">
              <select id="calendar-share-permission">
                <option value="read">${escapeHtml(i18n.t("gateway.calendar.share_link_permission_read"))}</option>
                <option value="write">${escapeHtml(i18n.t("gateway.calendar.share_link_permission_write"))}</option>
              </select>
              <select id="calendar-share-expiry">
                <option value="1">${escapeHtml(i18n.t("gateway.calendar.share_link_expiry_1h"))}</option>
                <option value="24" selected>${escapeHtml(i18n.t("gateway.calendar.share_link_expiry_24h"))}</option>
                <option value="168">${escapeHtml(i18n.t("gateway.calendar.share_link_expiry_7d"))}</option>
                <option value="720">${escapeHtml(i18n.t("gateway.calendar.share_link_expiry_30d"))}</option>
                <option value="never">${escapeHtml(i18n.t("gateway.calendar.share_link_expiry_never"))}</option>
              </select>
            </div>
            <div class="calendar-share-input-row">
              <input id="calendar-share-name" type="text" placeholder="${escapeHtml(i18n.t("gateway.calendar.share_link_name_placeholder"))}" />
              <button type="button" id="calendar-share-generate" class="btn-confirm btn-no-animation">${escapeHtml(i18n.t("gateway.calendar.share_link_generate"))}</button>
            </div>
            <div id="calendar-share-results" class="calendar-share-results"></div>
          </div>
          ${renderReminderField({
              i18n,
              escapeHtml,
              selectedOffsets: calendar.defaultReminderOffsetsMinutes ?? [],
          })}
          ${!calendar.isDefault ? `<div class="calendar-delete-zone"><button type="button" id="calendar-edit-delete" class="btn-cancel btn-no-animation">${escapeHtml(i18n.t("gateway.calendar.delete_calendar"))}</button></div>` : ""}
        </div>`;
            },
            closeProtection: false,
            actions: [
                {
                    id: "save",
                    label: i18n.t("gateway.calendar.update_calendar"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen: (overlay, closePopup) => {
                bindCalendarShareControls({
                    overlay,
                    calendarId: calendar.id,
                    i18n,
                    apiFetch,
                    escapeHtml,
                    showToast,
                });
                const deleteBtn = overlay.querySelector(
                    "#calendar-edit-delete",
                );
                if (deleteBtn) {
                    deleteBtn.addEventListener("click", async () => {
                        const res = await apiFetch(
                            `/api/v1/calendar/calendars/${encodeURIComponent(calendar.id)}`,
                            { method: "DELETE" },
                        );
                        if (!res.ok) {
                            showToast(
                                i18n.t(
                                    "gateway.calendar.delete_calendar_failed",
                                ),
                                "error",
                            );
                            return;
                        }
                        await reloadState();
                        showToast(
                            i18n.t("gateway.calendar.delete_calendar_success"),
                            "success",
                        );
                        refreshComposer();
                        closePopup();
                    });
                }
            },
            onAction: async (actionId, overlay) => {
                if (actionId !== "save") return true;
                const editedName = String(
                    overlay.querySelector("#calendar-edit-name")?.value ?? "",
                ).trim();
                const name = calendar.isDefault ? undefined : editedName;
                if (!calendar.isDefault && !name) return false;
                const color = calendarUi.normalizeHexColor(
                    overlay.querySelector("#calendar-edit-color")?.value,
                );
                const visibility = String(
                    overlay.querySelector("#calendar-edit-visibility")?.value ??
                        "private",
                );
                const defaultReminderOffsetsMinutes =
                    getSelectedReminderOffsets(overlay);
                const updatePayload = {
                    ...(name !== undefined ? { name } : {}),
                    color,
                    visibility,
                    defaultReminderOffsetsMinutes,
                };
                const res = await apiFetch(
                    `/api/v1/calendar/calendars/${encodeURIComponent(calendar.id)}`,
                    {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(updatePayload),
                    },
                );
                if (!res.ok) {
                    showToast(
                        i18n.t("gateway.calendar.update_calendar_failed"),
                        "error",
                    );
                    return false;
                }
                await reloadState();
                showToast(
                    i18n.t("gateway.calendar.update_calendar_success"),
                    "success",
                );
                refreshComposer();
                return true;
            },
        });
    }

    return { openCalendarEditPopup };
}
