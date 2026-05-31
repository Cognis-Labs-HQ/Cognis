import { createCalendarEditPopupHandler } from "./popup-manager-calendar-edit.js";
import {
    bindAllDayComposerControls,
    buildAllDayDateRangeValues,
    isAllDayRange,
} from "./popup-manager-all-day.js";
import {
    buildParticipantCardHtml,
    createParticipantDirectory,
    hydrateProfileAvatars,
    isUserMatchByIdentifier,
    normalizeUserIdentifier,
} from "./popup-manager-participant-utils.js";
import {
    getSelectedReminderOffsets,
    renderReminderField,
} from "./popup-manager-reminders.js";
import {
    findOverlappingEvents,
    isSafeHttpUrl,
} from "./popup-manager-event-utils.js";
import { bindProfilePreviews } from "/static/reuse/profile-preview.js";

export function createCalendarPopupManager({
    root,
    signal,
    i18n,
    calendarUi,
    apiFetch,
    showToast,
    openPopup,
    escapeHtml,
    normalizeDateTimeInputValue,
    getCalendars,
    getSelectedCalendarId,
    setSelectedCalendarId,
    setSelectedEventId,
    getEventsByCalendar,
    getCanInviteExternal,
    getJitsiAvailable,
    reloadState,
    syncRouteSelection,
    refreshComposer,
}) {
    function getEventParticipants(event, participantDirectory = null) {
        const resolveUserLabel = (identifier) => {
            const fallbackIdentifier = identifier;
            if (!participantDirectory) return fallbackIdentifier;
            const profile = participantDirectory.get(identifier);
            if (!profile) return fallbackIdentifier;
            return (
                profile.displayName || profile.username || fallbackIdentifier
            );
        };
        return [
            ...(Array.isArray(event.attendees)
                ? event.attendees.map((entry) => ({
                      type: "user",
                      value: entry,
                      label: resolveUserLabel(entry),
                  }))
                : []),
            ...(Array.isArray(event.inviteEmails)
                ? event.inviteEmails.map((entry) => ({
                      type: "email",
                      value: entry,
                      label: entry,
                  }))
                : []),
        ];
    }

    async function submitEvent({
        calendarId,
        title,
        description,
        startAt,
        endAt,
        attendees,
        inviteEmails,
        reminderOffsetsMinutes,
        createMeeting,
        status,
        recurrence,
        allowConflict = false,
    }) {
        const targetCalendarId = String(calendarId ?? "").trim();
        if (!targetCalendarId) return false;
        let meetingUrl = null;
        if (createMeeting && getJitsiAvailable()) {
            try {
                meetingUrl = await calendarUi.createJitsiMeeting(attendees);
            } catch {
                showToast(
                    i18n.t("gateway.calendar.create_meeting_failed"),
                    "error",
                );
                return false;
            }
        }
        const overlaps = findOverlappingEvents(getEventsByCalendar(), {
            calendarId: targetCalendarId,
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
        });
        if (overlaps.length > 0 && !allowConflict) {
            showToast(
                i18n.t("gateway.calendar.overlap_warning_confirm"),
                "warning",
            );
            return "conflict";
        }
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(targetCalendarId)}/events`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    description,
                    startAt: new Date(startAt).toISOString(),
                    endAt: new Date(endAt).toISOString(),
                    attendees,
                    inviteEmails,
                    reminderOffsetsMinutes,
                    meetingUrl,
                    status,
                    recurrence,
                }),
            },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.create_event_failed"), "error");
            return false;
        }
        await reloadState();
        setSelectedCalendarId(targetCalendarId);
        syncRouteSelection();
        showToast(i18n.t("gateway.calendar.create_event_success"), "success");
        return true;
    }

    async function updateExistingEvent({
        sourceCalendarId,
        sourceEventId,
        calendarId,
        title,
        description,
        startAt,
        endAt,
        attendees,
        inviteEmails,
        reminderOffsetsMinutes,
        status,
        recurrence,
        meetingUrl,
        updateAll,
    }) {
        const targetCalendarId = String(calendarId ?? "").trim();
        const overlaps = findOverlappingEvents(getEventsByCalendar(), {
            calendarId: targetCalendarId,
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
            excludedEventId: sourceEventId,
        });
        if (overlaps.length > 0) {
            showToast(i18n.t("gateway.calendar.overlap_warning"), "warning");
        }
        const response = await calendarUi.updateEvent(
            sourceCalendarId,
            sourceEventId,
            {
                title,
                description,
                startAt: new Date(startAt).toISOString(),
                endAt: new Date(endAt).toISOString(),
                attendees,
                inviteEmails,
                reminderOffsetsMinutes,
                meetingUrl,
                status,
                recurrence,
                calendarId: targetCalendarId,
                updateAll,
            },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.update_event_failed"), "error");
            return false;
        }
        await reloadState();
        setSelectedCalendarId(targetCalendarId);
        showToast(i18n.t("gateway.calendar.update_event_success"), "success");
        return true;
    }

    async function openDeleteEventPopup(eventData) {
        const isRecurring = eventData.event.recurrence !== "none";
        await openPopup({
            title: i18n.t("gateway.calendar.delete_event"),
            body: () =>
                `<p>${escapeHtml(i18n.t(isRecurring ? "gateway.calendar.delete_event_prompt_recurring" : "gateway.calendar.delete_event_prompt"))}</p>`,
            actions: isRecurring
                ? [
                      {
                          id: "delete-selected",
                          label: i18n.t("gateway.calendar.delete_this_event"),
                          variant: "cancel",
                      },
                      {
                          id: "delete-future",
                          label: i18n.t(
                              "gateway.calendar.delete_future_events",
                          ),
                          variant: "cancel",
                      },
                      {
                          id: "cancel",
                          label: i18n.t("ui.reuse.cancel"),
                          variant: "neutral",
                      },
                  ]
                : [
                      {
                          id: "delete-selected",
                          label: i18n.t("gateway.calendar.delete_event"),
                          variant: "danger",
                      },
                      {
                          id: "cancel",
                          label: i18n.t("ui.reuse.cancel"),
                          variant: "cancel",
                      },
                  ],
            onAction: async (actionId) => {
                if (
                    actionId !== "delete-selected" &&
                    actionId !== "delete-future"
                ) {
                    return true;
                }
                const deleteResponse = await calendarUi.deleteEvent(
                    eventData.calendar.id,
                    eventData.event.id,
                    {
                        deleteAll: actionId === "delete-future",
                    },
                );
                if (!deleteResponse.ok) {
                    showToast(
                        i18n.t("gateway.calendar.delete_event_failed"),
                        "error",
                    );
                    return false;
                }
                setSelectedEventId("");
                await reloadState();
                syncRouteSelection();
                refreshComposer();
                showToast(
                    i18n.t("gateway.calendar.delete_event_success"),
                    "success",
                );
                return true;
            },
        });
    }

    async function openEventPopup(calendarId, eventId) {
        try {
            const eventData = await calendarUi.fetchEvent(calendarId, eventId);
            if (!eventData?.event) {
                showToast(
                    i18n.t("gateway.calendar.load_event_failed"),
                    "error",
                );
                return;
            }
            setSelectedCalendarId(eventData.calendar.id);
            setSelectedEventId(eventData.event.id);
            syncRouteSelection();
            const participantIds = Array.from(
                new Set([
                    ...(Array.isArray(eventData.event.attendees)
                        ? eventData.event.attendees
                        : []),
                    ...Object.keys(eventData.event.responses ?? {}),
                ]),
            );
            const participantDirectory = await createParticipantDirectory(
                apiFetch,
                participantIds,
            );
            const renderParticipantName = (identifier) => {
                const profile = participantDirectory.get(identifier);
                return (
                    profile?.displayName ||
                    profile?.username ||
                    String(identifier)
                );
            };
            const canRespond = eventData.meta?.canRespond === true;
            await openPopup({
                title: eventData.event.title,
                body: () => `
          <div class="calendar-event-details">
            <dl class="calendar-event-detail-list">
              <dt>${escapeHtml(i18n.t("gateway.calendar.event_calendar"))}</dt>
              <dd>${escapeHtml(eventData.calendar.name)}</dd>
              <dt>${escapeHtml(i18n.t("gateway.calendar.event_start"))}</dt>
              <dd>${escapeHtml(new Date(eventData.event.startAt).toLocaleString())}</dd>
              <dt>${escapeHtml(i18n.t("gateway.calendar.event_end"))}</dt>
              <dd>${escapeHtml(new Date(eventData.event.endAt).toLocaleString())}</dd>
              <dt>${escapeHtml(i18n.t("gateway.calendar.event_status"))}</dt>
              <dd>${escapeHtml(i18n.t(calendarUi.getStatusLabelKey(eventData.event.status)))}</dd>
              <dt>${escapeHtml(i18n.t("gateway.calendar.event_recurrence"))}</dt>
              <dd>${escapeHtml(i18n.t(calendarUi.getRecurrenceLabelKey(eventData.event.recurrence)))}</dd>
            </dl>
            <div class="calendar-event-detail-badges">${calendarUi.renderEventBadges(eventData.event, i18n)}</div>
            ${eventData.event.description ? `<p class="calendar-event-detail-description">${escapeHtml(eventData.event.description)}</p>` : `<p class="calendar-empty">${escapeHtml(i18n.t("gateway.calendar.no_description"))}</p>`}
            ${eventData.event.meetingUrl ? `<p><a href="${escapeHtml(eventData.event.meetingUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(i18n.t("gateway.calendar.event_meeting_link"))}</a></p>` : ""}
            <section class="calendar-event-detail-section">
              <h4>${escapeHtml(i18n.t("gateway.calendar.attendees_label"))}</h4>
              ${eventData.event.attendees?.length ? `<ul class="calendar-inline-list">${eventData.event.attendees.map((attendee) => `<li>${escapeHtml(renderParticipantName(attendee))}</li>`).join("")}</ul>` : `<p class="calendar-empty">${escapeHtml(i18n.t("gateway.calendar.no_attendees"))}</p>`}
            </section>
            <section class="calendar-event-detail-section">
              <h4>${escapeHtml(i18n.t("gateway.calendar.responses_title"))}</h4>
              ${calendarUi.renderResponseSummary(eventData.event, i18n, participantDirectory) || `<p class="calendar-empty">${escapeHtml(i18n.t("gateway.calendar.no_responses"))}</p>`}
            </section>
          </div>
        `,
                actions: [
                    ...(canRespond
                        ? calendarUi.EVENT_RESPONSE_OPTIONS.map(
                              (responseOption) => ({
                                  id: `respond:${responseOption}`,
                                  label: i18n.t(
                                      calendarUi.getResponseActionLabelKey(
                                          responseOption,
                                      ),
                                  ),
                                  variant:
                                      responseOption === "accepted"
                                          ? "confirm"
                                          : responseOption === "declined"
                                            ? "cancel"
                                            : "neutral",
                              }),
                          )
                        : []),
                    ...(eventData.meta?.canEdit
                        ? [
                              {
                                  id: "edit",
                                  label: i18n.t("gateway.calendar.edit_event"),
                                  variant: "secondary",
                              },
                              {
                                  id: "delete",
                                  label: i18n.t(
                                      "gateway.calendar.delete_event",
                                  ),
                                  variant: "danger",
                              },
                          ]
                        : []),
                    ...(eventData.event.meetingUrl
                        ? [
                              {
                                  id: "join-meeting",
                                  label: i18n.t(
                                      "gateway.calendar.go_to_meeting",
                                  ),
                                  variant: "confirm",
                              },
                          ]
                        : []),
                    {
                        id: "close",
                        label: i18n.t("ui.reuse.close"),
                        variant: "cancel",
                    },
                ],
                onAction: async (actionId) => {
                    if (actionId === null) {
                        setSelectedEventId("");
                        syncRouteSelection();
                        return true;
                    }
                    if (actionId === "edit") {
                        window.setTimeout(() => {
                            openEventComposerPopup({ eventData });
                        }, 0);
                        return true;
                    }
                    if (actionId === "delete") {
                        window.setTimeout(() => {
                            openDeleteEventPopup(eventData);
                        }, 0);
                        return true;
                    }
                    if (actionId === "join-meeting") {
                        const meetingUrl = String(
                            eventData.event.meetingUrl ?? "",
                        ).trim();
                        if (meetingUrl && isSafeHttpUrl(meetingUrl)) {
                            window.open(
                                meetingUrl,
                                "_blank",
                                "noopener,noreferrer",
                            );
                        } else {
                            showToast(
                                i18n.t("gateway.calendar.load_event_failed"),
                                "error",
                            );
                        }
                        return false;
                    }
                    if (actionId.startsWith("respond:")) {
                        const responseOption = actionId.split(":")[1] ?? "";
                        let respondAll = false;
                        if (eventData.event.recurrence !== "none") {
                            const scopeAction = await openPopup({
                                title: i18n.t(
                                    "gateway.calendar.response_scope_title",
                                ),
                                body: () =>
                                    `<p>${escapeHtml(i18n.t("gateway.calendar.response_scope_prompt"))}</p>`,
                                actions: [
                                    {
                                        id: "single",
                                        label: i18n.t(
                                            "gateway.calendar.respond_this_event",
                                        ),
                                        variant: "neutral",
                                    },
                                    {
                                        id: "series",
                                        label: i18n.t(
                                            "gateway.calendar.respond_all_events",
                                        ),
                                        variant: "confirm",
                                    },
                                    {
                                        id: "cancel",
                                        label: i18n.t("ui.reuse.cancel"),
                                        variant: "cancel",
                                    },
                                ],
                            });
                            if (!scopeAction || scopeAction === "cancel") {
                                return true;
                            }
                            respondAll = scopeAction === "series";
                        }
                        const response = await calendarUi.respondToEvent(
                            eventData.calendar.id,
                            eventData.event.id,
                            responseOption,
                            { respondAll },
                        );
                        if (!response.ok) {
                            showToast(
                                i18n.t(
                                    "gateway.calendar.response_update_failed",
                                ),
                                "error",
                            );
                            return false;
                        }
                        await reloadState();
                        refreshComposer();
                        showToast(
                            i18n.t("gateway.calendar.response_update_success"),
                            "success",
                        );
                        return true;
                    }
                    return true;
                },
            });
        } catch {
            showToast(i18n.t("gateway.calendar.load_event_failed"), "error");
        } finally {
            setSelectedEventId("");
            syncRouteSelection();
        }
    }

    async function openEventComposerPopup({
        startAt = "",
        endAt = "",
        eventData = null,
    } = {}) {
        const popupBuilder = calendarUi.createEventComposerBuilder({
            i18n,
            calendars: getCalendars(),
            selectedCalendarId: getSelectedCalendarId(),
            defaultValues: {
                title: eventData?.event?.title ?? "",
                description: eventData?.event?.description ?? "",
                startAt: normalizeDateTimeInputValue(
                    eventData?.event?.startAt ?? startAt,
                ),
                endAt: normalizeDateTimeInputValue(
                    eventData?.event?.endAt ?? endAt,
                ),
                status: eventData?.event?.status ?? "busy",
                recurrence: eventData?.event?.recurrence ?? "none",
                calendarId: eventData?.calendar?.id ?? getSelectedCalendarId(),
                reminderOffsetsMinutes:
                    eventData?.event?.reminderOffsetsMinutes ?? [],
            },
        });
        let participantOptions = [];
        const eventParticipantDirectory = eventData
            ? await createParticipantDirectory(
                  apiFetch,
                  eventData.event.attendees ?? [],
              )
            : new Map();
        const startsAsAllDay = isAllDayRange(
            eventData?.event?.startAt ?? startAt,
            eventData?.event?.endAt ?? endAt,
        );
        let selectedParticipants = eventData
            ? getEventParticipants(eventData.event, eventParticipantDirectory)
            : [];
        let popupSearchAbortController = null;
        let popupController = null;
        let confirmedConflictCreateKey = "";

        function participantKey(entry) {
            return JSON.stringify([entry.type, entry.value]);
        }

        /**
         * Tracks whether the composer values still match the last conflict warning.
         *
         * @param {{ calendarId: string, startAt: string, endAt: string }} values
         * @returns {string}
         */
        function buildConflictCreateKey(values) {
            return JSON.stringify([
                String(values.calendarId ?? "").trim(),
                String(values.startAt ?? "").trim(),
                String(values.endAt ?? "").trim(),
            ]);
        }

        function renderParticipants(overlay) {
            const list = overlay.querySelector(
                "#calendar-popup-participant-chips",
            );
            if (!(list instanceof HTMLElement)) return;
            list.innerHTML = selectedParticipants
                .map((entry) =>
                    buildParticipantCardHtml(entry, {
                        escapeHtml,
                        i18n,
                        participantKey,
                    }),
                )
                .join("");
            hydrateProfileAvatars(list);
        }

        function renderParticipantOptions(overlay) {
            const optionsElement = overlay.querySelector(
                "#calendar-popup-participant-options",
            );
            if (!(optionsElement instanceof HTMLElement)) return;
            optionsElement.innerHTML = participantOptions
                .map(
                    (option, index) =>
                        `<button type="button" class="calendar-participant-option${index === 0 ? " is-active" : ""}" data-participant-option="${String(index)}">${escapeHtml(option.label)}</button>`,
                )
                .join("");
        }

        async function refreshParticipantOptions(overlay) {
            const searchInput = overlay.querySelector(
                "#calendar-popup-participant-search",
            );
            if (!(searchInput instanceof HTMLInputElement)) return;
            const query = searchInput.value.trim();
            participantOptions = [];
            if (!query) {
                renderParticipantOptions(overlay);
                return;
            }
            if (
                calendarUi.matchesEmailPattern(query) &&
                getCanInviteExternal()
            ) {
                const email = query.toLowerCase();
                participantOptions.push({
                    type: "email",
                    value: email,
                    label: `${i18n.t("gateway.calendar.send_to_email_prefix")} ${email}`,
                });
            }
            popupSearchAbortController?.abort();
            popupSearchAbortController = new AbortController();
            try {
                const response = await apiFetch(
                    `/api/v1/search?type=users&q=${encodeURIComponent(query)}`,
                    { signal: popupSearchAbortController.signal },
                );
                if (response.ok) {
                    const payload = await response.json();
                    const users = Array.isArray(payload?.data)
                        ? payload.data
                        : [];
                    users.forEach((entry) => {
                        const username = normalizeUserIdentifier(entry);
                        const handle = String(
                            entry?.handle ?? entry?.meta ?? entry?.id ?? "",
                        )
                            .trim()
                            .replace(/^@/, "")
                            .toLowerCase();
                        const userIdentifier = username || handle;
                        if (!userIdentifier) return;
                        const displayName = String(
                            entry?.displayName ?? entry?.label ?? "",
                        ).trim();
                        participantOptions.push({
                            type: "user",
                            value: userIdentifier,
                            label:
                                displayName &&
                                displayName.toLowerCase() !==
                                    userIdentifier.toLowerCase()
                                    ? `${displayName} (${userIdentifier})`
                                    : userIdentifier,
                        });
                    });
                }
            } catch {
                participantOptions = participantOptions.slice();
            }
            const existing = new Set(
                selectedParticipants.map((entry) => participantKey(entry)),
            );
            const seen = new Set();
            participantOptions = participantOptions.filter((entry) => {
                const key = participantKey(entry);
                if (existing.has(key) || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            renderParticipantOptions(overlay);
        }

        function selectParticipant(overlay, index) {
            const option = participantOptions[index];
            if (!option) return;
            selectedParticipants = [
                ...selectedParticipants.filter(
                    (entry) => participantKey(entry) !== participantKey(option),
                ),
                option,
            ];
            const searchInput = overlay.querySelector(
                "#calendar-popup-participant-search",
            );
            if (searchInput instanceof HTMLInputElement) searchInput.value = "";
            participantOptions = [];
            renderParticipants(overlay);
            renderParticipantOptions(overlay);
        }

        // Meeting creation toggle is create-only and intentionally hidden for edits.
        const showMeetingToggle = getJitsiAvailable() && !eventData;

        await openPopup({
            title: i18n.t(
                eventData
                    ? "gateway.calendar.edit_event"
                    : "gateway.calendar.event_composer",
            ),
            body: () => `
        ${popupBuilder.render()}
        <label class="calendar-checkbox-row calendar-checkbox-row--styled calendar-all-day-toggle">
          <input id="calendar-popup-all-day" type="checkbox"${startsAsAllDay ? " checked" : ""} />
          <span>${escapeHtml(i18n.t("gateway.calendar.all_day"))}</span>
        </label>
        <label class="calendar-participants-row">
          <span>${escapeHtml(i18n.t("gateway.calendar.attendees_label"))}</span>
          <input id="calendar-popup-participant-search" type="text" placeholder="${escapeHtml(i18n.t("gateway.calendar.attendees_placeholder"))}" autocomplete="off" />
          <div id="calendar-popup-participant-options" class="calendar-participant-options"></div>
          <div id="calendar-popup-participant-chips" class="calendar-participant-list"></div>
        </label>
        ${showMeetingToggle ? `<label class="calendar-checkbox-row calendar-checkbox-row--styled"><input id="calendar-popup-create-meeting" type="checkbox" /> <span>${escapeHtml(i18n.t("gateway.calendar.create_meeting"))}</span></label>` : ""}
        ${renderReminderField({
            i18n,
            escapeHtml,
            selectedOffsets: eventData?.event?.reminderOffsetsMinutes ?? [],
        })}
        ${eventData?.event?.recurrence && eventData.event.recurrence !== "none" ? `<label class="calendar-checkbox-row calendar-checkbox-row--styled"><input id="calendar-popup-update-all" type="checkbox" /> <span>${escapeHtml(i18n.t("gateway.calendar.update_series"))}</span></label>` : ""}
      `,
            closeProtection: true,
            actions: [
                {
                    id: "save",
                    label: i18n.t(
                        eventData
                            ? "gateway.calendar.save_event"
                            : "gateway.calendar.create_event",
                    ),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen: (overlay) => {
                const formElement = overlay.querySelector(
                    "#calendar-event-form",
                );
                if (formElement instanceof HTMLFormElement) {
                    popupController = popupBuilder.attach(formElement, {
                        signal,
                    });
                    formElement.addEventListener(
                        "input",
                        () => {
                            confirmedConflictCreateKey = "";
                        },
                        { signal },
                    );
                    formElement.addEventListener(
                        "change",
                        () => {
                            confirmedConflictCreateKey = "";
                        },
                        { signal },
                    );
                }
                bindAllDayComposerControls({ overlay, signal });
                bindProfilePreviews(i18n);
                renderParticipants(overlay);
                renderParticipantOptions(overlay);
                const participantSearch = overlay.querySelector(
                    "#calendar-popup-participant-search",
                );
                const participantOptionsElement = overlay.querySelector(
                    "#calendar-popup-participant-options",
                );
                const participantChips = overlay.querySelector(
                    "#calendar-popup-participant-chips",
                );
                if (participantSearch instanceof HTMLInputElement) {
                    participantSearch.addEventListener(
                        "input",
                        () => refreshParticipantOptions(overlay),
                        { signal },
                    );
                    participantSearch.addEventListener(
                        "keydown",
                        (event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                selectParticipant(overlay, 0);
                            }
                            if (
                                event.key === "Backspace" &&
                                !participantSearch.value.trim() &&
                                selectedParticipants.length > 0
                            ) {
                                selectedParticipants =
                                    selectedParticipants.slice(0, -1);
                                renderParticipants(overlay);
                            }
                        },
                        { signal },
                    );
                }
                if (participantOptionsElement instanceof HTMLElement) {
                    participantOptionsElement.addEventListener(
                        "click",
                        (event) => {
                            const button = event.target.closest(
                                "[data-participant-option]",
                            );
                            if (!(button instanceof HTMLElement)) return;
                            const optionIndex = Number.parseInt(
                                String(
                                    button.getAttribute(
                                        "data-participant-option",
                                    ) ?? "-1",
                                ),
                                10,
                            );
                            selectParticipant(overlay, optionIndex);
                        },
                        { signal },
                    );
                }
                if (participantChips instanceof HTMLElement) {
                    participantChips.addEventListener(
                        "click",
                        (event) => {
                            const button = event.target.closest(
                                "[data-participant-remove]",
                            );
                            if (!(button instanceof HTMLElement)) return;
                            const key = String(
                                button.getAttribute(
                                    "data-participant-remove",
                                ) ?? "",
                            );
                            selectedParticipants = selectedParticipants.filter(
                                (entry) => participantKey(entry) !== key,
                            );
                            renderParticipants(overlay);
                            refreshParticipantOptions(overlay);
                        },
                        { signal },
                    );
                }
            },
            onAction: async (actionId, overlay) => {
                if (actionId !== "save") return true;
                if (!popupController?.validateAll(true)) return false;
                const values = popupController.getValues();
                const allDayToggle = overlay.querySelector(
                    "#calendar-popup-all-day",
                );
                const isAllDay =
                    allDayToggle instanceof HTMLInputElement &&
                    allDayToggle.checked;
                const dateRangeValues = isAllDay
                    ? buildAllDayDateRangeValues(values.startAt, values.endAt)
                    : null;
                if (isAllDay && !dateRangeValues) return false;
                const normalizedValues = dateRangeValues
                    ? {
                          ...values,
                          startAt: dateRangeValues.startAt,
                          endAt: dateRangeValues.endAt,
                      }
                    : values;
                const participantSearch = overlay.querySelector(
                    "#calendar-popup-participant-search",
                );
                if (
                    participantSearch instanceof HTMLInputElement &&
                    participantSearch.value.trim()
                ) {
                    showToast(
                        i18n.t("gateway.calendar.participant_select_required"),
                        "error",
                    );
                    return false;
                }
                const createMeeting = Boolean(
                    overlay.querySelector("#calendar-popup-create-meeting")
                        ?.checked,
                );
                const updateAll = Boolean(
                    overlay.querySelector("#calendar-popup-update-all")
                        ?.checked,
                );
                const attendees = selectedParticipants
                    .filter((entry) => entry.type === "user")
                    .map((entry) => entry.value);
                const inviteEmails = getCanInviteExternal()
                    ? selectedParticipants
                          .filter((entry) => entry.type === "email")
                          .map((entry) => entry.value)
                    : [];
                const reminderOffsetsMinutes =
                    getSelectedReminderOffsets(overlay);
                if (eventData) {
                    let meetingUrl = eventData.event.meetingUrl ?? null;
                    if (!meetingUrl && createMeeting && getJitsiAvailable()) {
                        try {
                            meetingUrl =
                                await calendarUi.createJitsiMeeting(attendees);
                        } catch {
                            showToast(
                                i18n.t(
                                    "gateway.calendar.create_meeting_failed",
                                ),
                                "error",
                            );
                            return false;
                        }
                    }
                    const updated = await updateExistingEvent({
                        sourceCalendarId: eventData.calendar.id,
                        sourceEventId: eventData.event.id,
                        calendarId: normalizedValues.calendarId,
                        title: normalizedValues.title,
                        description: normalizedValues.description,
                        startAt: normalizedValues.startAt,
                        endAt: normalizedValues.endAt,
                        attendees,
                        inviteEmails,
                        reminderOffsetsMinutes,
                        status: normalizedValues.status,
                        recurrence: normalizedValues.recurrence,
                        meetingUrl,
                        updateAll,
                    });
                    if (!updated) return false;
                    setSelectedEventId("");
                    syncRouteSelection();
                    refreshComposer();
                    return true;
                }
                const created = await submitEvent({
                    calendarId: normalizedValues.calendarId,
                    title: normalizedValues.title,
                    description: normalizedValues.description,
                    startAt: normalizedValues.startAt,
                    endAt: normalizedValues.endAt,
                    attendees,
                    inviteEmails,
                    reminderOffsetsMinutes,
                    createMeeting,
                    status: normalizedValues.status,
                    recurrence: normalizedValues.recurrence,
                    allowConflict:
                        confirmedConflictCreateKey ===
                        buildConflictCreateKey(normalizedValues),
                });
                if (created === "conflict") {
                    confirmedConflictCreateKey =
                        buildConflictCreateKey(normalizedValues);
                    return false;
                }
                if (!created) return false;
                confirmedConflictCreateKey = "";
                refreshComposer();
                return true;
            },
        });
    }

    function bindViewInteractions() {
        if (root.dataset.calendarInteractionsBound === "true") return;
        root.dataset.calendarInteractionsBound = "true";
        root.addEventListener(
            "click",
            (event) => {
                const eventButton = event.target.closest(
                    "[data-calendar-event]",
                );
                if (eventButton instanceof HTMLElement) {
                    setSelectedCalendarId(
                        String(
                            eventButton.getAttribute("data-calendar-id") ?? "",
                        ),
                    );
                    const eventId = String(
                        eventButton.getAttribute("data-calendar-event") ?? "",
                    );
                    const calendarId = String(
                        eventButton.getAttribute("data-calendar-id") ?? "",
                    );
                    if (calendarId && eventId) {
                        openEventPopup(calendarId, eventId);
                    }
                }
            },
            { signal },
        );
    }

    const { openCalendarEditPopup } = createCalendarEditPopupHandler({
        i18n,
        apiFetch,
        showToast,
        openPopup,
        escapeHtml,
        calendarUi,
        reloadState,
        refreshComposer,
    });

    return {
        bindViewInteractions,
        openDeleteEventPopup,
        openEventComposerPopup,
        openEventPopup,
        openCalendarEditPopup,
    };
}
