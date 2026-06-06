import { formatDateTime } from "/static/reuse/timestamp.js";
import { toggleSecretVisibility } from "/static/reuse/secret-visibility-toggle.js";
import {
    bindReminderFieldBehavior,
    getSelectedReminderOffsets,
    normalizeReminderOffsets,
    renderReminderField,
} from "./popup-manager-reminders.js";
import {
    buildParticipantCardHtml,
    buildParticipantOptionHtml,
    hydrateProfileAvatars,
    normalizeUserIdentifier,
} from "./popup-manager-participant-utils.js";

const SHARE_EXPIRY_OPTIONS = [
    {
        value: "1",
        labelKey: "gateway.calendar.share_link_expiry_1h",
    },
    {
        value: "24",
        labelKey: "gateway.calendar.share_link_expiry_24h",
    },
    {
        value: "168",
        labelKey: "gateway.calendar.share_link_expiry_7d",
    },
    {
        value: "720",
        labelKey: "gateway.calendar.share_link_expiry_30d",
    },
    {
        value: "never",
        labelKey: "gateway.calendar.share_link_expiry_never",
    },
];

function resolveExpiryValueFromIso(expiresAt) {
    const normalizedExpiresAt = String(expiresAt ?? "").trim();
    if (!normalizedExpiresAt) return "never";
    const expiresAtMs = Date.parse(normalizedExpiresAt);
    if (!Number.isFinite(expiresAtMs)) return "never";
    const remainingHours = (expiresAtMs - Date.now()) / 3_600_000;
    if (remainingHours <= 1.5) return "1";
    if (remainingHours <= 36) return "24";
    if (remainingHours <= 240) return "168";
    if (remainingHours <= 1080) return "720";
    return "720";
}

/**
 * Compare two ordered numeric lists for exact equality.
 *
 * @param {number[]} left
 * @param {number[]} right
 * @returns {boolean}
 */
function areNumericListsEqual(left, right) {
    if (left.length !== right.length) return false;
    return left.every((value, index) => value === right[index]);
}

function mapSearchResultToShareUser(entry) {
    const username = normalizeUserIdentifier(entry);
    const handle = String(entry?.handle ?? entry?.meta ?? entry?.id ?? "")
        .trim()
        .replace(/^@/, "")
        .toLowerCase();
    const accountId = String(entry?.accountId ?? username ?? "")
        .trim()
        .toLowerCase();
    const userIdentifier = username || handle;
    if (!accountId || !userIdentifier) return null;
    const displayName = String(entry?.displayName ?? entry?.label ?? "").trim();
    const avatarKey = String(entry?.avatarKey ?? entry?.avatar ?? "").trim();
    return {
        accountId,
        handle: userIdentifier,
        displayName,
        avatarKey,
    };
}

function renderCalendarShareCopyField({
    i18n,
    escapeHtml,
    label,
    value,
    concealed = false,
}) {
    const valueInputType = concealed ? "password" : "text";
    const copyKind = concealed ? "passphrase" : "link";
    const visibilityToggle = concealed
        ? `<button type="button" class="btn-no-animation calendar-share-secret-toggle" data-calendar-share-toggle-secret="${escapeHtml(value)}" aria-pressed="false" aria-label="${escapeHtml(i18n.t("gateway.calendar.share_link_passphrase"))}"><span aria-hidden="true">👁</span></button>`
        : "";
    return `<div class="calendar-share-copy-field">
      <span class="calendar-share-copy-label">${escapeHtml(label)}</span>
      <div class="calendar-share-result-row">
        <input type="${valueInputType}" readonly value="${escapeHtml(value)}" data-calendar-share-secret-value="${concealed ? escapeHtml(value) : ""}" />
        ${visibilityToggle}
        <button type="button" class="btn-no-animation calendar-share-copy-btn" data-calendar-share-copy="${escapeHtml(value)}" data-calendar-share-copy-kind="${copyKind}" aria-label="${escapeHtml(i18n.t("gateway.calendar.share_link_copy"))}" title="${escapeHtml(i18n.t("gateway.calendar.share_link_copy"))}"></button>
      </div>
    </div>`;
}

function renderCalendarShareResults({ i18n, escapeHtml, shareLinks }) {
    if (!Array.isArray(shareLinks) || shareLinks.length === 0) {
        return "";
    }
    const activeShareLinks = shareLinks.filter((shareLink) => {
        const expiresAt = Date.parse(String(shareLink?.expiresAt ?? "").trim());
        return !Number.isFinite(expiresAt) || expiresAt > Date.now();
    });
    if (activeShareLinks.length === 0) return "";
    return `<p class="calendar-share-links-details">${escapeHtml(i18n.t("gateway.calendar.share_links_details"))}</p>
      ${activeShareLinks
          .map((shareLink) => {
              const name =
                  String(shareLink.name ?? "").trim() ||
                  i18n.t("gateway.calendar.share_link_name_fallback");
              const expiresAt = String(shareLink.expiresAt ?? "").trim();
              const expiryLabel = expiresAt
                  ? formatDateTime(expiresAt)
                  : i18n.t("gateway.calendar.share_link_expiry_never");
              const passphraseMarkup =
                  typeof shareLink.passphrase === "string" &&
                  shareLink.passphrase
                      ? renderCalendarShareCopyField({
                            i18n,
                            escapeHtml,
                            label: i18n.t(
                                "gateway.calendar.share_link_passphrase",
                            ),
                            value: shareLink.passphrase,
                            concealed: true,
                        })
                      : "";
              const openAttr = activeShareLinks.length === 1 ? " open" : "";
              return `<details class="calendar-share-entry"${openAttr}>
                <summary class="calendar-share-entry-summary">
                 <span class="calendar-share-entry-title">${escapeHtml(name)}</span>
                 <span class="calendar-share-entry-meta"><span>${escapeHtml(expiryLabel)}</span> <a href="#" class="btn-no-animation btn-cancel" data-calendar-share-delete="${escapeHtml(String(shareLink.id ?? ""))}" aria-label="${escapeHtml(i18n.t("ui.reuse.remove"))}">🗑</a></span>
                </summary>
                <div class="calendar-share-entry-body">
                  ${renderCalendarShareCopyField({
                      i18n,
                      escapeHtml,
                      label: "CalDAV",
                      value: shareLink.caldavUrl,
                  })}
                  ${renderCalendarShareCopyField({
                      i18n,
                      escapeHtml,
                      label: "ICS",
                      value: shareLink.icsUrl,
                  })}
                  ${passphraseMarkup}
                </div>
              </details>`;
          })
          .join("")}`;
}

function bindCalendarShareControls({
    overlay,
    calendarId,
    i18n,
    apiFetch,
    escapeHtml,
    showToast,
    openPopup,
}) {
    const shareGenerateBtn = overlay.querySelector("#calendar-share-generate");
    const shareResults = overlay.querySelector("#calendar-share-results");
    const shareNameInput = overlay.querySelector("#calendar-share-name");
    const shareExpiryInput = overlay.querySelector("#calendar-share-expiry");
    const userSearchInput = overlay.querySelector(
        "#calendar-share-user-search",
    );
    const userOptions = overlay.querySelector("#calendar-share-user-options");
    const userChips = overlay.querySelector("#calendar-share-user-chips");
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

    const normalizeShareLinks = (payload) =>
        Array.isArray(payload?.data)
            ? payload.data.filter(
                  (shareLink) =>
                      typeof shareLink?.caldavUrl === "string" &&
                      typeof shareLink?.icsUrl === "string",
              )
            : [];

    const renderSelectedShareUsers = () => {
        if (!(userChips instanceof HTMLElement)) return;
        userChips.innerHTML = selectedShareUsers
            .map((entry) => {
                const identityCard = buildParticipantCardHtml(
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
                );
                const expiryValue = resolveExpiryValueFromIso(entry.expiresAt);
                return `<div class="calendar-user-share-entry" data-calendar-user-share-id="${escapeHtml(String(entry.shareId ?? ""))}">
                  <button type="button" class="calendar-user-share-entry-remove btn-no-animation btn-cancel" data-calendar-user-share-delete="${escapeHtml(String(entry.shareId ?? ""))}" aria-label="${escapeHtml(i18n.t("ui.reuse.remove"))}">×</button>
                  <div class="calendar-user-share-entry-profile">${identityCard}</div>
                  <div class="calendar-user-share-entry-controls">
                    <label><span>${escapeHtml(i18n.t("gateway.calendar.share_link_permission"))}</span>
                      <select data-calendar-user-share-permission>
                        <option value="read"${entry.permission === "write" ? "" : " selected"}>${escapeHtml(i18n.t("gateway.calendar.share_link_permission_read"))}</option>
                        <option value="write"${entry.permission === "write" ? " selected" : ""}>${escapeHtml(i18n.t("gateway.calendar.share_link_permission_write"))}</option>
                      </select>
                    </label>
                    <label><span>${escapeHtml(i18n.t("gateway.calendar.share_link_expiry"))}</span>
                      <select data-calendar-user-share-expiry>${SHARE_EXPIRY_OPTIONS.map(
                          (option) =>
                              `<option value="${escapeHtml(option.value)}"${option.value === expiryValue ? " selected" : ""}>${escapeHtml(i18n.t(option.labelKey))}</option>`,
                      ).join("")}</select>
                    </label>
                  </div>
                </div>`;
            })
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
                `/api/v1/search?type=users&q=${encodeURIComponent(query)}`,
                { signal: userSearchAbortController.signal },
            );
            if (response.ok) {
                const payload = await response.json().catch(() => null);
                const users = Array.isArray(payload?.data) ? payload.data : [];
                const mappedUsers = users.map(mapSearchResultToShareUser);
                const selectedUserIds = new Set(
                    selectedShareUsers.map((entry) =>
                        String(entry.accountId ?? "")
                            .trim()
                            .toLowerCase(),
                    ),
                );
                const seen = new Set();
                shareUserOptions = mappedUsers.filter((entry) => {
                    if (!entry) return false;
                    if (
                        selectedUserIds.has(entry.accountId) ||
                        seen.has(entry.accountId)
                    ) {
                        return false;
                    }
                    seen.add(entry.accountId);
                    return true;
                });
            }
        } catch {}
        renderShareUserOptions();
    };

    const selectShareUser = async (index) => {
        const selectedUser = shareUserOptions[index];
        if (!selectedUser) return;
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
                    permission: "read",
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

    const updateUserShare = async (shareId, { permission, expiresInHours }) => {
        const body = {};
        if (permission !== undefined) {
            body.permission = permission;
        }
        if (expiresInHours !== undefined) {
            body.expiresInHours = expiresInHours;
        }
        if (Object.keys(body).length === 0) return;
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/share/users/${encodeURIComponent(shareId)}`,
            {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.share_link_failed"), "error");
            return;
        }
        await loadExistingShares();
        showToast(i18n.t("gateway.calendar.share_user_updated"), "success");
    };
    /**
     * Ask the user to confirm deleting either a share link or shared user.
     *
     * @param {"user" | "link"} scope
     * @returns {Promise<boolean>}
     */
    const confirmShareRemoval = async (scope) => {
        const confirmMessage = i18n.t(
            scope === "user"
                ? "gateway.calendar.share_user_delete_confirm"
                : "gateway.calendar.share_link_delete_confirm",
        );
        if (typeof openPopup !== "function") {
            if (
                typeof window !== "undefined" &&
                typeof window.confirm === "function"
            ) {
                return window.confirm(confirmMessage);
            }
            return false;
        }
        const action = await openPopup({
            title: i18n.t(
                scope === "user"
                    ? "gateway.calendar.share_user_delete_confirm_title"
                    : "gateway.calendar.share_link_delete_confirm_title",
            ),
            body: () => `<p>${escapeHtml(confirmMessage)}</p>`,
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
                {
                    id: "delete",
                    label: i18n.t("ui.reuse.remove"),
                    variant: "cancel",
                },
            ],
        });
        return action === "delete";
    };

    const deleteUserShare = async (shareId) => {
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/share/users/${encodeURIComponent(shareId)}`,
            { method: "DELETE" },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.share_link_failed"), "error");
            return;
        }
        await loadExistingShares();
    };

    const renderShareResults = (shareLinks) => {
        const markup = renderCalendarShareResults({
            i18n,
            escapeHtml,
            shareLinks,
        });
        shareResults.innerHTML = markup;
        shareResults.hidden = !markup;
    };

    const loadCalendarShareLinks = async () => {
        const expiresInHours =
            shareExpiryInput instanceof HTMLSelectElement &&
            shareExpiryInput.value === "never"
                ? null
                : Number.parseFloat(
                      String(
                          shareExpiryInput instanceof HTMLSelectElement
                              ? shareExpiryInput.value
                              : "24",
                      ),
                  );
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/share`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    name:
                        shareNameInput instanceof HTMLInputElement
                            ? shareNameInput.value
                            : "",
                    expiresInHours,
                }),
            },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.share_link_failed"), "error");
            shareResults.hidden = true;
            return;
        }
        const payload = await response.json().catch(() => null);
        const shareLinks = normalizeShareLinks(payload);
        if (shareLinks.length === 0) {
            showToast(i18n.t("gateway.calendar.share_link_failed"), "error");
            shareResults.hidden = true;
            return;
        }
        renderShareResults(shareLinks);
        if (shareNameInput instanceof HTMLInputElement) {
            shareNameInput.value = "";
        }
    };
    const loadExistingShareLinks = async () => {
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/share`,
        );
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        renderShareResults(normalizeShareLinks(payload));
    };
    shareGenerateBtn.addEventListener("click", () => {
        void loadCalendarShareLinks();
    });
    if (userSearchInput instanceof HTMLInputElement) {
        userSearchInput.addEventListener("input", () => {
            void refreshShareUserOptions();
        });
        userSearchInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void selectShareUser(0);
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
    if (userChips instanceof HTMLElement) {
        userChips.addEventListener("change", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const container = target.closest("[data-calendar-user-share-id]");
            if (!(container instanceof HTMLElement)) return;
            const shareId = String(
                container.getAttribute("data-calendar-user-share-id") ?? "",
            ).trim();
            if (!shareId) return;
            const permissionSelect = container.querySelector(
                "[data-calendar-user-share-permission]",
            );
            const expirySelect = container.querySelector(
                "[data-calendar-user-share-expiry]",
            );
            const permission =
                permissionSelect instanceof HTMLSelectElement &&
                permissionSelect.value === "write"
                    ? "write"
                    : "read";
            const expiresInHours =
                expirySelect instanceof HTMLSelectElement &&
                expirySelect.value !== "never"
                    ? Number.parseFloat(expirySelect.value)
                    : null;
            const update = {};
            if (target === permissionSelect) {
                update.permission = permission;
            }
            if (target === expirySelect) {
                update.expiresInHours = expiresInHours;
            }
            void updateUserShare(shareId, update);
        });
        userChips.addEventListener("click", (event) => {
            const button = event.target.closest(
                "[data-calendar-user-share-delete]",
            );
            if (!(button instanceof HTMLElement)) return;
            event.preventDefault();
            const shareId = String(
                button.getAttribute("data-calendar-user-share-delete") ?? "",
            ).trim();
            if (!shareId) return;
            void (async () => {
                const confirmed = await confirmShareRemoval("user");
                if (!confirmed) return;
                await deleteUserShare(shareId);
            })();
        });
    }
    shareResults.addEventListener("click", async (event) => {
        const copyButton = event.target.closest("[data-calendar-share-copy]");
        if (copyButton instanceof HTMLElement) {
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
            const copyKind = String(
                copyButton.getAttribute("data-calendar-share-copy-kind") ??
                    "link",
            );
            copyButton.classList.add("calendar-share-copy-btn--copied");
            setTimeout(() => {
                copyButton.classList.remove("calendar-share-copy-btn--copied");
            }, 1500);
            showToast(
                i18n.t(
                    copyKind === "passphrase"
                        ? "gateway.calendar.share_link_passphrase_copied"
                        : "gateway.calendar.share_link_copied",
                ),
                "success",
            );
            return;
        }
        const toggleButton = event.target.closest(
            "[data-calendar-share-toggle-secret]",
        );
        if (toggleButton instanceof HTMLElement) {
            const row = toggleButton.closest(".calendar-share-result-row");
            const input = row?.querySelector("input");
            if (!(input instanceof HTMLInputElement)) return;
            toggleSecretVisibility({ input, toggleControl: toggleButton });
            return;
        }
        const deleteButton = event.target.closest(
            "[data-calendar-share-delete]",
        );
        if (!(deleteButton instanceof HTMLElement)) return;
        event.preventDefault();
        event.stopPropagation();
        const shareId = String(
            deleteButton.getAttribute("data-calendar-share-delete") ?? "",
        ).trim();
        if (!shareId) return;
        const confirmed = await confirmShareRemoval("link");
        if (!confirmed) return;
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/share/${encodeURIComponent(shareId)}`,
            { method: "DELETE" },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.share_link_failed"), "error");
            return;
        }
        const payload = await response.json().catch(() => null);
        renderShareResults(normalizeShareLinks(payload));
        showToast(i18n.t("gateway.calendar.share_link_deleted"), "success");
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
                const isShared = calendar.visibility === "shared";
                const isPrivate = calendar.visibility !== "public";
                const shareControlsMarkup = isShared
                    ? ""
                    : `<div class="calendar-share-controls">
             <p class="calendar-share-label">${escapeHtml(i18n.t("gateway.calendar.share_calendar"))}</p>
             <div class="calendar-share-input-row">
               <input id="calendar-share-user-search" type="text" placeholder="${escapeHtml(i18n.t("gateway.calendar.attendees_placeholder"))}" autocomplete="off" />
             </div>
             <div id="calendar-share-user-options" class="calendar-participant-options"></div>
             <div id="calendar-share-user-chips" class="calendar-user-share-list"></div>
             <div id="calendar-share-generate-controls" class="calendar-share-input-row">
               <input id="calendar-share-name" type="text" placeholder="${escapeHtml(i18n.t("gateway.calendar.share_link_name_placeholder"))}" />
               <select id="calendar-share-expiry">${SHARE_EXPIRY_OPTIONS.map(
                   (option) =>
                       `<option value="${escapeHtml(option.value)}"${option.value === "24" ? " selected" : ""}>${escapeHtml(i18n.t(option.labelKey))}</option>`,
               ).join("")}</select>
               <button type="button" id="calendar-share-generate" class="btn-confirm btn-no-animation">${escapeHtml(i18n.t("gateway.calendar.share_link_generate"))}</button>
             </div>
             <div id="calendar-share-results" class="calendar-share-results" hidden></div>
           </div>`;
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
                    bindCalendarShareControls({
                        overlay,
                        calendarId: calendar.id,
                        i18n,
                        apiFetch,
                        escapeHtml,
                        showToast,
                        openPopup,
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
