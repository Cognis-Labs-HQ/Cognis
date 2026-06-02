export function createCalendarResponseHandler({
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
}) {
    async function promptResponseScope(eventData) {
        if (eventData.event.recurrence === "none") {
            return false;
        }
        const scopeAction = await openPopup({
            title: i18n.t("gateway.calendar.response_scope_title"),
            body: () =>
                `<p>${escapeHtml(i18n.t("gateway.calendar.response_scope_prompt"))}</p>`,
            actions: [
                {
                    id: "single",
                    label: i18n.t("gateway.calendar.respond_this_event"),
                    variant: "neutral",
                },
                {
                    id: "series",
                    label: i18n.t("gateway.calendar.respond_all_events"),
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
            return null;
        }
        return scopeAction === "series";
    }

    async function promptAcceptedCalendar(eventData) {
        const availableCalendars = getCalendars().filter(
            (calendar) => calendar.id !== eventData.calendar.id,
        );
        if (!availableCalendars.length) {
            return eventData.calendar.id;
        }
        let targetCalendarId = null;
        let confirmed = false;
        await openPopup({
            title: i18n.t("gateway.calendar.accept_calendar_title"),
            body: () => `
        <div class="calendar-response-calendar-picker">
          <p>${escapeHtml(i18n.t("gateway.calendar.accept_calendar_prompt"))}</p>
          <label for="calendar-response-calendar-select">${escapeHtml(i18n.t("gateway.calendar.event_calendar"))}</label>
          <select id="calendar-response-calendar-select">
            ${availableCalendars
                .map(
                    (calendar) =>
                        `<option value="${escapeHtml(calendar.id)}">${escapeHtml(calendar.name)}</option>`,
                )
                .join("")}
          </select>
        </div>
      `,
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("gateway.calendar.response_action_accepted"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onAction: async (actionId, overlay) => {
                if (actionId !== "confirm") {
                    return true;
                }
                const selectedCalendarId = String(
                    overlay.querySelector("#calendar-response-calendar-select")
                        ?.value ?? "",
                ).trim();
                if (!selectedCalendarId) {
                    return false;
                }
                targetCalendarId = selectedCalendarId;
                confirmed = true;
                return true;
            },
        });
        return confirmed ? targetCalendarId : null;
    }

    async function handleEventResponse(eventData, responseOption) {
        if (!calendarUi.EVENT_RESPONSE_OPTIONS.includes(responseOption)) {
            return false;
        }
        const respondAll = await promptResponseScope(eventData);
        if (respondAll === null) {
            return false;
        }
        let targetCalendarId = null;
        if (responseOption === "accepted") {
            targetCalendarId = await promptAcceptedCalendar(eventData);
            if (!targetCalendarId) {
                return false;
            }
        }
        const response = await calendarUi.respondToEvent(
            eventData.calendar.id,
            eventData.event.id,
            responseOption,
            {
                respondAll,
                targetCalendarId,
            },
        );
        if (!response.ok) {
            showToast(
                i18n.t("gateway.calendar.response_update_failed"),
                "error",
            );
            return false;
        }
        if (targetCalendarId) {
            setSelectedCalendarId(targetCalendarId);
            syncRouteSelection();
        }
        await reloadState();
        refreshComposer();
        showToast(
            i18n.t("gateway.calendar.response_update_success"),
            "success",
        );
        return true;
    }

    async function respondToEventSelection(
        calendarId,
        eventId,
        responseOption,
    ) {
        try {
            const eventData = await calendarUi.fetchEvent(calendarId, eventId);
            if (!eventData?.event) {
                showToast(
                    i18n.t("gateway.calendar.load_event_failed"),
                    "error",
                );
                return false;
            }
            return await handleEventResponse(eventData, responseOption);
        } catch {
            showToast(i18n.t("gateway.calendar.load_event_failed"), "error");
            return false;
        }
    }

    return {
        handleEventResponse,
        respondToEventSelection,
    };
}
