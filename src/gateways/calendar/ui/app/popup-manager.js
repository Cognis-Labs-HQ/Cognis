import { createCalendarEditPopupHandler } from "./popup-manager-calendar-edit.js";

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
    function findOverlappingEvents({
        calendarId,
        startAt,
        endAt,
        excludedEventId = null,
    }) {
        return (getEventsByCalendar()[calendarId] ?? []).filter((event) => {
            if (excludedEventId && event.id === excludedEventId) {
                return false;
            }
            const existingStart = new Date(event.startAt).getTime();
            const existingEnd = new Date(event.endAt).getTime();
            const nextStart = new Date(startAt).getTime();
            const nextEnd = new Date(endAt).getTime();
            return existingStart < nextEnd && existingEnd > nextStart;
        });
    }

    function buildParticipantLabel(value) {
        return value;
    }

    function normalizeUserIdentifier(entry) {
        const accountId = String(entry?.accountId ?? "").trim();
        const username = String(entry?.username ?? accountId ?? "").trim();
        const id = String(entry?.id ?? "").trim();
        return String(username || accountId || id)
            .trim()
            .replace(/^@/, "")
            .toLowerCase();
    }

    function isUserMatchByIdentifier(user, identifier) {
        const normalizedIdentifier = String(identifier ?? "")
            .trim()
            .replace(/^@/, "")
            .toLowerCase();
        if (!normalizedIdentifier) return false;
        const normalizedUserIdentifier = normalizeUserIdentifier(user);
        const normalizedHandle = String(user?.handle ?? "")
            .trim()
            .replace(/^@/, "")
            .toLowerCase();
        return (
            normalizedUserIdentifier === normalizedIdentifier ||
            normalizedHandle === normalizedIdentifier
        );
    }

    function getEventParticipants(event, participantDirectory = null) {
        const resolveUserLabel = (identifier) => {
            if (!participantDirectory) return buildParticipantLabel(identifier);
            const profile = participantDirectory.get(identifier);
            if (!profile) return buildParticipantLabel(identifier);
            return profile.displayName || profile.username || identifier;
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
                      label: buildParticipantLabel(entry),
                  }))
                : []),
        ];
    }

    async function createParticipantDirectory(identifiers) {
        const normalizedIdentifiers = Array.from(
            new Set(
                (Array.isArray(identifiers) ? identifiers : [])
                    .map((entry) => String(entry ?? "").trim())
                    .filter(Boolean),
            ),
        );
        const participantDirectory = new Map();
        await Promise.all(
            normalizedIdentifiers.map(async (identifier) => {
                try {
                    const response = await apiFetch(
                        `/api/v1/search?type=users&q=${encodeURIComponent(identifier)}`,
                    );
                    if (!response.ok) return;
                    const payload = await response.json();
                    const users = Array.isArray(payload?.data)
                        ? payload.data
                        : [];
                    const matchedUser = users.find((entry) =>
                        isUserMatchByIdentifier(entry, identifier),
                    );
                    if (!matchedUser) return;
                    const username =
                        normalizeUserIdentifier(matchedUser) || identifier;
                    const displayName = String(
                        matchedUser?.displayName ?? matchedUser?.label ?? "",
                    ).trim();
                    participantDirectory.set(identifier, {
                        username,
                        displayName,
                    });
                } catch {
                    // best-effort participant enrichment
                }
            }),
        );
        return participantDirectory;
    }

    async function submitEvent({
        calendarId,
        title,
        description,
        startAt,
        endAt,
        attendees,
        inviteEmails,
        createMeeting,
        status,
        recurrence,
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
        const overlaps = findOverlappingEvents({
            calendarId: targetCalendarId,
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
        });
        if (overlaps.length > 0) {
            showToast(i18n.t("gateway.calendar.overlap_warning"), "warning");
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
        status,
        recurrence,
        meetingUrl,
        updateAll,
    }) {
        const targetCalendarId = String(calendarId ?? "").trim();
        const overlaps = findOverlappingEvents({
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
            const participantDirectory =
                await createParticipantDirectory(participantIds);
            const renderParticipantName = (identifier) => {
                const profile = participantDirectory.get(identifier);
                return (
                    profile?.displayName ||
                    profile?.username ||
                    String(identifier)
                );
            };
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
                    ...(eventData.meta?.canRespond
                        ? calendarUi.EVENT_RESPONSE_OPTIONS.map(
                              (responseOption) => ({
                                  id: `respond:${responseOption}`,
                                  label: i18n.t(
                                      calendarUi.getResponseLabelKey(
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
                    {
                        id: "close",
                        label: i18n.t("ui.reuse.close"),
                        variant: "cancel",
                    },
                ],
                onAction: async (actionId) => {
                    if (actionId === "close") {
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
            },
        });
        let participantOptions = [];
        const eventParticipantDirectory = eventData
            ? await createParticipantDirectory(eventData.event.attendees ?? [])
            : new Map();
        let selectedParticipants = eventData
            ? getEventParticipants(eventData.event, eventParticipantDirectory)
            : [];
        let popupSearchAbortController = null;
        let popupController = null;

        function participantKey(entry) {
            return JSON.stringify([entry.type, entry.value]);
        }

        function renderParticipants(overlay) {
            const chips = overlay.querySelector(
                "#calendar-popup-participant-chips",
            );
            if (!(chips instanceof HTMLElement)) return;
            chips.innerHTML = selectedParticipants
                .map(
                    (entry) =>
                        `<span class="calendar-participant-chip">${escapeHtml(entry.label)}<button type="button" data-participant-remove="${escapeHtml(participantKey(entry))}" aria-label="${escapeHtml(i18n.t("gateway.calendar.remove_participant"))}">×</button></span>`,
                )
                .join("");
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

        await openPopup({
            title: i18n.t(
                eventData
                    ? "gateway.calendar.edit_event"
                    : "gateway.calendar.event_composer",
            ),
            body: () => `
        ${popupBuilder.render()}
        <label class="calendar-participants-row">
          <span>${escapeHtml(i18n.t("gateway.calendar.attendees_label"))}</span>
          <div id="calendar-popup-participant-chips" class="calendar-participant-chips"></div>
          <input id="calendar-popup-participant-search" type="text" placeholder="${escapeHtml(i18n.t("gateway.calendar.attendees_placeholder"))}" autocomplete="off" />
          <div id="calendar-popup-participant-options" class="calendar-participant-options"></div>
        </label>
        ${getJitsiAvailable() && !eventData?.event?.meetingUrl ? `<label class="calendar-checkbox-row calendar-checkbox-row--styled"><input id="calendar-popup-create-meeting" type="checkbox" /> <span>${escapeHtml(i18n.t("gateway.calendar.create_meeting"))}</span></label>` : ""}
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
                }
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
                        calendarId: values.calendarId,
                        title: values.title,
                        description: values.description,
                        startAt: values.startAt,
                        endAt: values.endAt,
                        attendees,
                        inviteEmails,
                        status: values.status,
                        recurrence: values.recurrence,
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
                    calendarId: values.calendarId,
                    title: values.title,
                    description: values.description,
                    startAt: values.startAt,
                    endAt: values.endAt,
                    attendees,
                    inviteEmails,
                    createMeeting,
                    status: values.status,
                    recurrence: values.recurrence,
                });
                if (!created) return false;
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
