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
        const generatedShareLinks = [];
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
          <div class="calendar-share-section">
            <p class="calendar-share-label">${escapeHtml(i18n.t("gateway.calendar.share_calendar"))}</p>
            <div class="calendar-share-controls">
              <input type="text" id="calendar-share-link-name" class="calendar-share-name-input" placeholder="${escapeHtml(i18n.t("gateway.calendar.share_link_name_placeholder"))}" />
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
              <button type="button" id="calendar-share-generate" class="btn-confirm btn-no-animation">${escapeHtml(i18n.t("gateway.calendar.share_link_generate"))}</button>
            </div>
            <div id="calendar-share-result" class="calendar-share-result" style="display:none">
              <div id="calendar-share-links-list" class="calendar-share-links-list"></div>
            </div>
          </div>
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
            onOpen: (overlay) => {
                const resultEl = overlay.querySelector(
                    "#calendar-share-result",
                );
                const linksList = overlay.querySelector(
                    "#calendar-share-links-list",
                );

                function renderShareLink(entry) {
                    const index = generatedShareLinks.indexOf(entry);
                    const summary = escapeHtml(entry.label);
                    const caldavId = `calendar-share-caldav-url-${index}`;
                    const icsId = `calendar-share-ics-url-${index}`;
                    return `<details class="calendar-share-details">
                      <summary>${summary}</summary>
                      <div class="calendar-share-result-row">
                        <label for="${caldavId}">CalDAV</label>
                        <input id="${caldavId}" type="text" readonly class="calendar-share-url-field" value="${escapeHtml(entry.caldav)}" />
                        <button type="button" class="popup-action-btn btn-no-animation" data-share-copy-url="${escapeHtml(entry.caldav)}">${escapeHtml(i18n.t("gateway.calendar.share_link_copy"))}</button>
                      </div>
                      <div class="calendar-share-result-row">
                        <label for="${icsId}">ICS</label>
                        <input id="${icsId}" type="text" readonly class="calendar-share-url-field" value="${escapeHtml(entry.ics)}" />
                        <button type="button" class="popup-action-btn btn-no-animation" data-share-copy-url="${escapeHtml(entry.ics)}">${escapeHtml(i18n.t("gateway.calendar.share_link_copy"))}</button>
                      </div>
                    </details>`;
                }

                if (resultEl) {
                    resultEl.addEventListener("click", async (event) => {
                        const button = event.target.closest(
                            "[data-share-copy-url]",
                        );
                        if (!button) return;
                        const url = String(
                            button.getAttribute("data-share-copy-url") ?? "",
                        );
                        if (!url) return;
                        await navigator.clipboard.writeText(url);
                        button.classList.add("popup-action-btn--copied");
                        window.setTimeout(() => {
                            button.classList.remove("popup-action-btn--copied");
                        }, 1500);
                        showToast(
                            i18n.t("gateway.calendar.share_link_copied"),
                            "success",
                        );
                    });
                }

                const generateBtn = overlay.querySelector(
                    "#calendar-share-generate",
                );
                if (generateBtn) {
                    generateBtn.addEventListener("click", async () => {
                        const name = String(
                            overlay.querySelector("#calendar-share-link-name")
                                ?.value ?? "",
                        ).trim();
                        const permission = String(
                            overlay.querySelector("#calendar-share-permission")
                                ?.value ?? "read",
                        );
                        const expiryValue = String(
                            overlay.querySelector("#calendar-share-expiry")
                                ?.value ?? "24",
                        ).trim();
                        const expiresInHours =
                            expiryValue === "never"
                                ? null
                                : Number(expiryValue);
                        const res = await apiFetch(
                            `/api/v1/calendar/calendars/${encodeURIComponent(calendar.id)}/share`,
                            {
                                method: "POST",
                                headers: {
                                    "content-type": "application/json",
                                },
                                body: JSON.stringify({
                                    permission,
                                    expiresInHours,
                                    ...(name ? { name } : {}),
                                }),
                            },
                        );
                        if (!res.ok) {
                            showToast(
                                i18n.t("gateway.calendar.share_link_failed"),
                                "error",
                            );
                            return;
                        }
                        const data = await res.json();
                        const entry = {
                            label:
                                name ||
                                escapeHtml(
                                    i18n.t(
                                        "gateway.calendar.share_links_details",
                                    ),
                                ),
                            caldav: String(
                                data?.data?.caldavUrl ??
                                    data?.data?.shareUrl ??
                                    "",
                            ),
                            ics: String(data?.data?.icsUrl ?? ""),
                        };
                        generatedShareLinks.push(entry);
                        if (resultEl) resultEl.style.display = "";
                        if (linksList)
                            linksList.insertAdjacentHTML(
                                "beforeend",
                                renderShareLink(entry),
                            );
                    });
                }
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
                        overlay.closest("[data-popup]")?.remove();
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
