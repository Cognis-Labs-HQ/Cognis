import {
    getSelectedReminderOffsets,
    renderReminderField,
} from "./popup-manager-reminders.js";
import {
    buildParticipantCardHtml,
    buildParticipantOptionHtml,
    hydrateProfileAvatars,
} from "./popup-manager-participant-utils.js";

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
    const shareControls = overlay.querySelector(
        "#calendar-share-generate-controls",
    );
    const userSearchInput = overlay.querySelector(
        "#calendar-share-user-search",
    );
    const userOptions = overlay.querySelector("#calendar-share-user-options");
    const userChips = overlay.querySelector("#calendar-share-user-chips");
    const userPermissionInput = overlay.querySelector(
        "#calendar-share-user-permission",
    );
    if (!shareGenerateBtn || !shareResults) {
        console.warn(
            "[calendar] Missing share controls in calendar edit popup.",
        );
        return;
    }

    const participantKey = (entry) =>
        `user:${String(entry.accountId ?? "")
            .trim()
            .toLowerCase()}`;
    let shareUserOptions = [];
    let selectedShareUsers = [];
    let userSearchAbortController = null;

    const renderSelectedShareUsers = () => {
        if (!(userChips instanceof HTMLElement)) return;
        userChips.innerHTML = selectedShareUsers
            .map((entry) =>
                buildParticipantCardHtml(
                    {
                        type: "user",
                        value: String(entry.handle ?? entry.accountId ?? ""),
                        label:
                            String(entry.displayName ?? "").trim() ||
                            String(entry.handle ?? entry.accountId ?? ""),
                        avatarKey: String(entry.avatarKey ?? "").trim(),
                    },
                    {
                        escapeHtml,
                        i18n,
                        participantKey: () => participantKey(entry),
                        removable: false,
                    },
                ),
            )
            .join("");
        hydrateProfileAvatars(userChips);
    };

    const renderShareUserOptions = () => {
        if (!(userOptions instanceof HTMLElement)) return;
        userOptions.innerHTML = shareUserOptions
            .map(
                (entry, index) =>
                    `<button type="button" class="calendar-participant-option${index === 0 ? " is-active" : ""}" data-share-user-option="${String(index)}">${buildParticipantOptionHtml(
                        {
                            type: "user",
                            value: String(
                                entry.handle ?? entry.accountId ?? "",
                            ),
                            displayName: entry.displayName,
                            label:
                                String(entry.displayName ?? "").trim() ||
                                String(entry.handle ?? entry.accountId ?? ""),
                            avatarKey: entry.avatarKey,
                        },
                        { escapeHtml },
                    )}</button>`,
            )
            .join("");
        hydrateProfileAvatars(userOptions);
    };

    const loadExistingShares = async () => {
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/share/users`,
        );
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        const users = Array.isArray(payload?.data) ? payload.data : [];
        selectedShareUsers = users.filter((entry) => {
            const accountId = String(entry?.accountId ?? "").trim();
            return accountId !== "";
        });
        renderSelectedShareUsers();
    };

    const refreshShareUserOptions = async () => {
        if (!(userSearchInput instanceof HTMLInputElement)) return;
        const query = userSearchInput.value.trim();
        shareUserOptions = [];
        if (!query) {
            renderShareUserOptions();
            return;
        }
        userSearchAbortController?.abort();
        userSearchAbortController = new AbortController();
        try {
            const response = await apiFetch(
                `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/share/users?q=${encodeURIComponent(query)}`,
                { signal: userSearchAbortController.signal },
            );
            if (response.ok) {
                const payload = await response.json().catch(() => null);
                const users = Array.isArray(payload?.data) ? payload.data : [];
                shareUserOptions = users.filter((entry) => {
                    const accountId = String(entry?.accountId ?? "").trim();
                    if (!accountId) return false;
                    return !selectedShareUsers.some(
                        (selected) =>
                            String(selected.accountId ?? "").trim() ===
                            accountId,
                    );
                });
            }
        } catch {}
        renderShareUserOptions();
    };

    const selectShareUser = async (index) => {
        const selectedUser = shareUserOptions[index];
        if (!selectedUser) return;
        const permission =
            userPermissionInput instanceof HTMLSelectElement &&
            userPermissionInput.value === "write"
                ? "write"
                : "read";
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/share/users`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    recipientAccountId: selectedUser.accountId,
                    recipientHandle: selectedUser.handle ?? null,
                    recipientDisplayName: selectedUser.displayName ?? null,
                    recipientAvatarKey: selectedUser.avatarKey ?? null,
                    permission,
                }),
            },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.share_link_failed"), "error");
            return;
        }
        await loadExistingShares();
        if (userSearchInput instanceof HTMLInputElement) {
            userSearchInput.value = "";
        }
        shareUserOptions = [];
        renderShareUserOptions();
    };

    const renderShareResults = (shareData) => {
        shareResults.innerHTML = renderCalendarShareResults({
            i18n,
            escapeHtml,
            shareData,
        });
        shareResults.hidden = false;
        if (shareControls instanceof HTMLElement) {
            shareControls.hidden = true;
        }
    };

    const loadCalendarShareLinks = async () => {
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/share`,
            { method: "POST", headers: { "content-type": "application/json" } },
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
        renderShareResults(shareData);
    };
    const loadExistingShareLinks = async () => {
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/share`,
        );
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        const shareData = payload?.data;
        if (
            typeof shareData?.caldavUrl === "string" &&
            typeof shareData?.icsUrl === "string"
        ) {
            renderShareResults(shareData);
        }
    };
    shareGenerateBtn.addEventListener("click", () => {
        void loadCalendarShareLinks();
    });
    if (userSearchInput instanceof HTMLInputElement) {
        userSearchInput.addEventListener("input", () => {
            void refreshShareUserOptions();
        });
    }
    if (userOptions instanceof HTMLElement) {
        userOptions.addEventListener("click", (event) => {
            const button = event.target.closest("[data-share-user-option]");
            if (!(button instanceof HTMLElement)) return;
            const optionIndex = Number.parseInt(
                String(button.getAttribute("data-share-user-option") ?? "-1"),
                10,
            );
            void selectShareUser(optionIndex);
        });
    }
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
    void loadExistingShareLinks();
    void loadExistingShares();
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
              <input id="calendar-share-user-search" type="text" placeholder="${escapeHtml(i18n.t("gateway.calendar.attendees_placeholder"))}" autocomplete="off" />
              <select id="calendar-share-user-permission">
                <option value="read">${escapeHtml(i18n.t("gateway.calendar.share_link_permission_read"))}</option>
                <option value="write">${escapeHtml(i18n.t("gateway.calendar.share_link_permission_write"))}</option>
              </select>
            </div>
            <div id="calendar-share-user-options" class="calendar-participant-options"></div>
            <div id="calendar-share-user-chips" class="calendar-participant-list"></div>
            <div id="calendar-share-generate-controls" class="calendar-share-input-row">
              <button type="button" id="calendar-share-generate" class="btn-confirm btn-no-animation">${escapeHtml(i18n.t("gateway.calendar.share_link_generate"))}</button>
            </div>
            <div id="calendar-share-results" class="calendar-share-results" hidden></div>
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
