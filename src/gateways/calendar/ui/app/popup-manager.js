import { createCalendarEditPopupHandler } from "./popup-manager-calendar-edit.js";
import {
    bindAllDayComposerControls,
    buildAllDayDateRangeValues,
    isAllDayRange,
} from "./popup-manager-all-day.js";
import {
    buildParticipantCardHtml,
    buildParticipantOptionHtml,
    createParticipantDirectory,
    hydrateProfileAvatars,
    isUserMatchByIdentifier,
    normalizeUserIdentifier,
} from "./popup-manager-participant-utils.js";
import { getEventParticipants } from "./popup-manager-participant-mappers.js";
import {
    getSelectedReminderOffsets,
    renderReminderField,
} from "./popup-manager-reminders.js";
import { renderReadOnlyEventPopupBody } from "./popup-manager-read-only-render.js";
import {
    buildConflictCreateKey,
    buildParticipantEntryKey,
    resolveReminderOffsetsForCalendar,
} from "./popup-manager-composer-helpers.js";
import {
    findOverlappingEvents,
    isSafeHttpUrl,
} from "./popup-manager-event-utils.js";
import { createCalendarResponseHandler } from "./popup-manager-response.js";
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
    getCurrentAccountId,
    getJitsiAvailable,
    reloadState,
    syncRouteSelection,
    refreshComposer,
}) {
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
        const payload = await response.json().catch(() => ({}));
        const createdEventId = String(payload?.data?.id ?? "");
        await reloadState();
        setSelectedCalendarId(targetCalendarId);
        syncRouteSelection();
        showToast(i18n.t("gateway.calendar.create_event_success"), "success");
        return createdEventId !== "" ? createdEventId : true;
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
            className: "calendar-delete-event-popup",
            body: () =>
                `<p>${escapeHtml(i18n.t(isRecurring ? "gateway.calendar.delete_event_prompt_recurring" : "gateway.calendar.delete_event_prompt"))}</p>`,
            actions: isRecurring
                ? [
                      {
                          id: "cancel",
                          label: i18n.t("ui.reuse.cancel"),
                          variant: "neutral",
                      },
                      {
                          id: "delete-selected",
                          label: i18n.t("gateway.calendar.delete_this_event"),
                          variant: "danger",
                      },
                      {
                          id: "delete-future",
                          label: i18n.t(
                              "gateway.calendar.delete_future_events",
                          ),
                          variant: "danger",
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
    const { handleEventResponse, respondToEventSelection } =
        createCalendarResponseHandler({
            i18n,
            calendarUi,
            showToast,
            openPopup,
            escapeHtml,
            getCalendars,
            setSelectedCalendarId,
            reloadState,
            syncRouteSelection,
            refreshComposer,
        });

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
            const isAllDay = isAllDayRange(
                eventData.event.startAt,
                eventData.event.endAt,
            );
            await openPopup({
                title: eventData.event.title,
                body: () =>
                    renderReadOnlyEventPopupBody({
                        eventData,
                        i18n,
                        escapeHtml,
                        calendarUi,
                        participantDirectory,
                        renderParticipantName,
                        buildParticipantCardHtml,
                        isAllDay,
                    }),
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
                onOpen: (overlay) => {
                    bindProfilePreviews(i18n);
                    const attendeeList = overlay.querySelector(
                        ".calendar-participant-list",
                    );
                    if (attendeeList instanceof HTMLElement) {
                        hydrateProfileAvatars(attendeeList);
                    }
                },
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
                        return handleEventResponse(eventData, responseOption);
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
        const currentUserIdentifier = String(getCurrentAccountId?.() ?? "")
            .trim()
            .replace(/^@/, "")
            .toLowerCase();
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
        if (currentUserIdentifier) {
            selectedParticipants = selectedParticipants.filter((entry) => {
                if (entry.type !== "user") return true;
                return (
                    String(entry.value ?? "")
                        .trim()
                        .replace(/^@/, "")
                        .toLowerCase() !== currentUserIdentifier
                );
            });
        }
        let popupSearchAbortController = null;
        let popupController = null;
        let confirmedConflictCreateKey = "";
        let pendingCreatedEventId = null;
        let pendingCreatedCalendarId = null;

        const participantKey = buildParticipantEntryKey;

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
                        `<button type="button" class="calendar-participant-option${index === 0 ? " is-active" : ""}" data-participant-option="${String(index)}">${buildParticipantOptionHtml(option, { escapeHtml })}</button>`,
                )
                .join("");
            hydrateProfileAvatars(optionsElement);
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
                        if (
                            currentUserIdentifier &&
                            userIdentifier === currentUserIdentifier
                        ) {
                            return;
                        }
                        const displayName = String(
                            entry?.displayName ?? entry?.label ?? "",
                        ).trim();
                        const avatarKey = String(
                            entry?.avatarKey ?? entry?.avatar ?? "",
                        ).trim();
                        participantOptions.push({
                            type: "user",
                            value: userIdentifier,
                            avatarKey,
                            displayName,
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
            selectedOffsets:
                eventData?.event?.reminderOffsetsMinutes ??
                getCalendars().find(
                    (calendar) =>
                        calendar.id ===
                        (eventData?.calendar?.id ?? getSelectedCalendarId()),
                )?.defaultReminderOffsetsMinutes ??
                [],
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
                const resolvedReminderOffsets =
                    resolveReminderOffsetsForCalendar(
                        reminderOffsetsMinutes,
                        getCalendars(),
                        normalizedValues.calendarId,
                    );
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
                        reminderOffsetsMinutes: resolvedReminderOffsets,
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
                    reminderOffsetsMinutes: resolvedReminderOffsets,
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
                pendingCreatedEventId =
                    typeof created === "string" ? created : null;
                pendingCreatedCalendarId = pendingCreatedEventId
                    ? normalizedValues.calendarId
                    : null;
                confirmedConflictCreateKey = "";
                refreshComposer();
                return true;
            },
        });
        if (pendingCreatedEventId && pendingCreatedCalendarId) {
            void openEventPopup(
                pendingCreatedCalendarId,
                pendingCreatedEventId,
            );
        }
    }

    function bindViewInteractions() {
        if (root.dataset.calendarInteractionsBound === "true") return;
        root.dataset.calendarInteractionsBound = "true";
        root.addEventListener(
            "click",
            (event) => {
                if (!(event.target instanceof Element)) {
                    return;
                }
                const responseButton = event.target.closest(
                    "[data-calendar-pending-response]",
                );
                if (responseButton instanceof HTMLElement) {
                    const responseOption = String(
                        responseButton.getAttribute(
                            "data-calendar-pending-response",
                        ) ?? "",
                    ).trim();
                    const calendarId = String(
                        responseButton.getAttribute("data-calendar-id") ?? "",
                    ).trim();
                    const eventId = String(
                        responseButton.getAttribute("data-calendar-event") ??
                            "",
                    ).trim();
                    if (calendarId && eventId && responseOption) {
                        void respondToEventSelection(
                            calendarId,
                            eventId,
                            responseOption,
                        );
                    }
                    return;
                }
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
        respondToEventSelection,
    };
}
