import {
    bindReminderFieldBehavior,
    getSelectedReminderOffsets,
    normalizeReminderOffsets,
    renderReminderField,
} from "./popup-manager-reminders.js";
async function openCalendarSharePopup({ calendarId, i18n }) {
    const { openSharePopup } =
        await import("/static/gateways/share/ui/reuse/share-links-popup.js");
    await openSharePopup({
        resourceType: "calendar",
        resourceId: calendarId,
        grantedCapabilities: ["calendar:read", "calendar:write"],
        title: i18n.t("gateway.calendar.share_calendar"),
        labels: {
            empty: i18n.t("gateway.calendar.share_links_details"),
            untitled: i18n.t("gateway.calendar.share_link_name_fallback"),
            copyLink: i18n.t("gateway.calendar.share_link_copy"),
            revoke: i18n.t("ui.reuse.remove"),
            shareOptions: i18n.t("gateway.calendar.share_links_heading"),
            mail: i18n.t("ui.reuse.mail"),
            send: i18n.t("gateway.calendar.share_email_send"),
            cancel: i18n.t("ui.reuse.cancel"),
            emailSent: i18n.t("gateway.calendar.share_email_sent"),
            emailFailed: i18n.t("gateway.calendar.share_email_failed"),
            emailRecipientsRequired: i18n.t(
                "gateway.calendar.share_email_recipients_required",
            ),
            label: i18n.t("gateway.calendar.share_link_name_placeholder"),
            labelPlaceholder: i18n.t(
                "gateway.calendar.share_link_name_placeholder",
            ),
            expiryLabel: i18n.t(
                "gateway.calendar.share_expiry_datetime_optional",
            ),
            generateLink: i18n.t("gateway.calendar.share_link_generate"),
            createLinkShare: i18n.t("gateway.calendar.share_link_generate"),
            updateLinkShare: i18n.t("gateway.calendar.share_link_update"),
            updateUserShare: i18n.t("gateway.calendar.share_user_update"),
            shareWithPrefix: i18n.t("gateway.calendar.share_with_prefix"),
            usersCountLabel: i18n.t("gateway.calendar.share_users_count"),
            done: i18n.t("ui.reuse.done"),
            createFailed: i18n.t("gateway.calendar.share_link_failed"),
            copySuccess: i18n.t("gateway.calendar.share_link_copied"),
            copyFailed: i18n.t("gateway.calendar.share_link_failed"),
            deleteFailed: i18n.t("gateway.calendar.share_link_failed"),
            statusActive: i18n.t("gateway.calendar.visibility_shared"),
            statusExpired: i18n.t("gateway.calendar.share_link_expiry_never"),
            expiresAtLabel: i18n.t("gateway.calendar.share_links_heading"),
            expiredAtLabel: i18n.t("gateway.calendar.share_links_heading"),
            users: i18n.t("gateway.calendar.share_users_heading"),
            userEmpty: i18n.t("gateway.calendar.share_users_empty"),
            emailRecipients: i18n.t("gateway.calendar.share_email_recipients"),
            emailRecipientsPlaceholder: i18n.t(
                "gateway.calendar.share_email_recipients_placeholder",
            ),
            userSearchPlaceholder: i18n.t(
                "gateway.calendar.attendees_placeholder",
            ),
            removeUser: i18n.t(
                "gateway.calendar.share_user_delete_confirm_title",
            ),
            permission: i18n.t("gateway.calendar.share_link_permission"),
            readPermission: i18n.t(
                "gateway.calendar.share_link_permission_read",
            ),
            writePermission: i18n.t(
                "gateway.calendar.share_link_permission_write",
            ),
            accessMode: i18n.t("gateway.calendar.share_link_permission"),
            password: i18n.t("gateway.calendar.share_password_optional"),
            passwordPlaceholder: i18n.t(
                "gateway.calendar.share_password_placeholder",
            ),
            webVariant: i18n.t("gateway.calendar.share_link_web"),
            icsVariant: i18n.t("gateway.calendar.share_link_ics"),
            caldavVariant: i18n.t("gateway.calendar.share_link_caldav"),
        },
        linkAccessOptions: [
            {
                id: "read",
                label: i18n.t("gateway.calendar.share_link_permission_read"),
                permissions: ["read"],
                grantedCapabilities: ["calendar:read"],
            },
            {
                id: "write",
                label: i18n.t("gateway.calendar.share_link_permission_write"),
                permissions: ["read", "write"],
                grantedCapabilities: ["calendar:read", "calendar:write"],
            },
        ],
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
                const isShared = calendar.visibility === "shared";
                const isPrivate = calendar.visibility !== "public";
                const shareControlsMarkup = isShared
                    ? ""
                    : `<div class="calendar-share-controls"><button type="button" id="calendar-open-share-popup" class="btn-confirm btn-no-animation">${escapeHtml(i18n.t("gateway.calendar.share_calendar"))}</button></div>`;
                return `<div class="calendar-edit-popup">
          <div class="calendar-create-row">
            <input id="calendar-edit-color" type="color" value="${escapeHtml(calendarUi.normalizeHexColor(calendar.color))}" class="calendar-color-picker-bare" />
            <input id="calendar-edit-name" type="text" value="${escapeHtml(calendar.name)}" placeholder="${escapeHtml(i18n.t("gateway.calendar.calendar_name_placeholder"))}" required${nameFieldDisabledAttr} />
          </div>
          <div class="calendar-visibility-row">
            <p class="calendar-share-label">${escapeHtml(i18n.t("gateway.calendar.visibility_heading"))}</p>
            <select id="calendar-edit-visibility"${isShared ? " disabled" : ""}>
              <option value="private"${isPrivate ? " selected" : ""}>${escapeHtml(i18n.t("gateway.calendar.visibility_private"))}</option>
              <option value="public"${!isPrivate ? " selected" : ""}>${escapeHtml(i18n.t("gateway.calendar.visibility_public"))}</option>
              ${isShared ? `<option value="shared" selected>${escapeHtml(i18n.t("gateway.calendar.visibility_shared"))}</option>` : ""}
            </select>
          </div>
          ${shareControlsMarkup}
          ${renderReminderField({
              i18n,
              escapeHtml,
              selectedOffsets: calendar.defaultReminderOffsetsMinutes ?? [],
              showDefaultTooltip: true,
          })}
          ${!calendar.isDefault && !isShared ? `<div class="calendar-delete-zone"><button type="button" id="calendar-edit-delete" class="btn-cancel btn-no-animation">${escapeHtml(i18n.t("gateway.calendar.delete_calendar"))}</button></div>` : ""}
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
                if (calendar.visibility !== "shared") {
                    overlay
                        .querySelector("#calendar-open-share-popup")
                        ?.addEventListener("click", () => {
                            closePopup();
                            void openCalendarSharePopup({
                                calendarId: calendar.id,
                                i18n,
                            });
                        });
                }
                bindReminderFieldBehavior({ overlay, i18n });
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
                const normalizedCurrentReminderOffsets =
                    normalizeReminderOffsets(defaultReminderOffsetsMinutes);
                const hasCalendarChanges =
                    (name !== undefined && name !== calendar.name) ||
                    color !== calendarUi.normalizeHexColor(calendar.color) ||
                    visibility !== calendar.visibility ||
                    !areNumericListsEqual(
                        normalizedCurrentReminderOffsets,
                        normalizeReminderOffsets(
                            calendar.defaultReminderOffsetsMinutes ?? [],
                        ),
                    );
                if (!hasCalendarChanges) return true;
                const updatePayload = {
                    ...(name !== undefined ? { name } : {}),
                    color,
                    visibility,
                    defaultReminderOffsetsMinutes:
                        normalizedCurrentReminderOffsets,
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
