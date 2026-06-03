import {
    getSelectedReminderOffsets,
    renderReminderField,
} from "./popup-manager-reminders.js";

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
            maxWidth: "560px",
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
                const name = calendar.isDefault
                    ? calendar.name
                    : String(
                          overlay.querySelector("#calendar-edit-name")?.value ??
                              "",
                      ).trim();
                if (!name) return false;
                const color = calendarUi.normalizeHexColor(
                    overlay.querySelector("#calendar-edit-color")?.value,
                );
                const visibility = String(
                    overlay.querySelector("#calendar-edit-visibility")?.value ??
                        "private",
                );
                const defaultReminderOffsetsMinutes =
                    getSelectedReminderOffsets(overlay);
                const res = await apiFetch(
                    `/api/v1/calendar/calendars/${encodeURIComponent(calendar.id)}`,
                    {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                            name,
                            color,
                            visibility,
                            defaultReminderOffsetsMinutes,
                        }),
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
