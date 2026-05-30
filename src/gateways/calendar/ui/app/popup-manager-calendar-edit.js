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
    const DEFAULT_SHARE_EXPIRY_HOURS = "24";

    async function openCalendarEditPopup(calendar) {
        let generatedShareUrls = { caldav: "", ics: "" };
        await openPopup({
            title: i18n.t("gateway.calendar.edit_calendar"),
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
          <div class="calendar-share-section">
            <p class="calendar-share-label">${escapeHtml(i18n.t("gateway.calendar.share_calendar"))}</p>
            <div class="calendar-share-controls">
              <select id="calendar-share-permission">
                <option value="read">${escapeHtml(i18n.t("gateway.calendar.share_link_permission_read"))}</option>
                <option value="write">${escapeHtml(i18n.t("gateway.calendar.share_link_permission_write"))}</option>
              </select>
              <select id="calendar-share-expiry">
                <option value="1">${escapeHtml(i18n.t("gateway.calendar.share_link_expiry_1h"))}</option>
                <option value="${DEFAULT_SHARE_EXPIRY_HOURS}" selected>${escapeHtml(i18n.t("gateway.calendar.share_link_expiry_24h"))}</option>
                <option value="168">${escapeHtml(i18n.t("gateway.calendar.share_link_expiry_7d"))}</option>
                <option value="720">${escapeHtml(i18n.t("gateway.calendar.share_link_expiry_30d"))}</option>
                <option value="never">${escapeHtml(i18n.t("gateway.calendar.share_link_expiry_never"))}</option>
              </select>
              <button type="button" id="calendar-share-generate" class="btn-confirm btn-no-animation">${escapeHtml(i18n.t("gateway.calendar.share_link_generate"))}</button>
            </div>
            <div id="calendar-share-result" class="calendar-share-result" style="display:none">
              <details class="calendar-share-details">
                <summary>${escapeHtml(i18n.t("gateway.calendar.share_links_details"))}</summary>
                <div class="calendar-share-result-row">
                  <label for="calendar-share-caldav-url">CalDAV</label>
                  <input id="calendar-share-caldav-url" type="text" readonly class="calendar-share-url-field" value="" />
                  <button type="button" data-share-copy="caldav" class="popup-action-btn btn-no-animation" data-popup-action="copy">${escapeHtml(i18n.t("gateway.calendar.share_link_copy"))}</button>
                </div>
                <div class="calendar-share-result-row">
                  <label for="calendar-share-ics-url">ICS</label>
                  <input id="calendar-share-ics-url" type="text" readonly class="calendar-share-url-field" value="" />
                  <button type="button" data-share-copy="ics" class="popup-action-btn btn-no-animation" data-popup-action="copy">${escapeHtml(i18n.t("gateway.calendar.share_link_copy"))}</button>
                </div>
              </details>
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
                const generateBtn = overlay.querySelector(
                    "#calendar-share-generate",
                );
                if (generateBtn) {
                    generateBtn.addEventListener("click", async () => {
                        const permission = String(
                            overlay.querySelector("#calendar-share-permission")
                                ?.value ?? "read",
                        );
                        const expiryValue = String(
                            overlay.querySelector("#calendar-share-expiry")
                                ?.value ?? DEFAULT_SHARE_EXPIRY_HOURS,
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
                        generatedShareUrls = {
                            caldav: String(
                                data?.data?.caldavUrl ??
                                    data?.data?.shareUrl ??
                                    "",
                            ),
                            ics: String(data?.data?.icsUrl ?? ""),
                        };
                        const resultEl = overlay.querySelector(
                            "#calendar-share-result",
                        );
                        const caldavField = overlay.querySelector(
                            "#calendar-share-caldav-url",
                        );
                        const icsField = overlay.querySelector(
                            "#calendar-share-ics-url",
                        );
                        if (resultEl) resultEl.style.display = "";
                        if (caldavField)
                            caldavField.value = generatedShareUrls.caldav;
                        if (icsField) icsField.value = generatedShareUrls.ics;
                    });
                }
                overlay
                    .querySelectorAll("[data-share-copy]")
                    .forEach((button) => {
                        button.addEventListener("click", async () => {
                            const target = String(
                                button.getAttribute("data-share-copy") ?? "",
                            );
                            const shareLink =
                                target === "ics"
                                    ? generatedShareUrls.ics
                                    : generatedShareUrls.caldav;
                            if (!shareLink) return;
                            await navigator.clipboard.writeText(shareLink);
                            button.classList.add("popup-action-btn--copied");
                            window.setTimeout(() => {
                                button.classList.remove(
                                    "popup-action-btn--copied",
                                );
                            }, 1500);
                            showToast(
                                i18n.t("gateway.calendar.share_link_copied"),
                                "success",
                            );
                        });
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
                const res = await apiFetch(
                    `/api/v1/calendar/calendars/${encodeURIComponent(calendar.id)}`,
                    {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ name, color, visibility }),
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
