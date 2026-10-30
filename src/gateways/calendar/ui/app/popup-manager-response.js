export function createCalendarResponseHandler({
    i18n,
    calendarUi,
    showToast,
    openPopup,
    escapeHtml,
    getCalendars,
    getSelectedCalendarId,
    setSelectedCalendarId,
    reloadState,
    syncRouteSelection,
    refreshComposer,
    openEventPopup,
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

    function resolveTargetCalendarId(eventData) {
        const availableCalendars = getCalendars();
        const selectedCalendarId = String(getSelectedCalendarId() ?? "").trim();
        if (
            selectedCalendarId &&
            availableCalendars.some(
                (calendar) => calendar.id === selectedCalendarId,
            )
        ) {
            return selectedCalendarId;
        }
        const sourceCalendarId = String(eventData.calendar?.id ?? "").trim();
        if (
            sourceCalendarId &&
            availableCalendars.some(
                (calendar) => calendar.id === sourceCalendarId,
            )
        ) {
            return sourceCalendarId;
        }
        const fallbackCalendarId = availableCalendars[0]?.id;
        return typeof fallbackCalendarId === "string" &&
            fallbackCalendarId.trim()
            ? fallbackCalendarId
            : null;
    }

    async function promptTargetCalendar(eventData) {
        const availableCalendars = getCalendars()
            .map((calendar) => ({
                id: String(calendar?.id ?? "").trim(),
                name: String(calendar?.name ?? "").trim(),
            }))
            .filter((calendar) => calendar.id);
        if (availableCalendars.length === 0) {
            return null;
        }
        let selectedCalendarId = resolveTargetCalendarId(eventData);
        if (!selectedCalendarId) {
            selectedCalendarId = availableCalendars[0].id;
        }
        const action = await openPopup({
            title: i18n.t("gateway.calendar.accept_calendar_title"),
            body: () => `
                <div class="calendar-response-calendar-picker">
                    <p>${escapeHtml(i18n.t("gateway.calendar.accept_calendar_prompt"))}</p>
                    <select id="calendar-response-target-calendar" aria-label="${escapeHtml(i18n.t("gateway.calendar.event_calendar"))}">
                        ${availableCalendars
                            .map(
                                (calendar) =>
                                    `<option value="${escapeHtml(calendar.id)}"${calendar.id === selectedCalendarId ? " selected" : ""}>${escapeHtml(calendar.name || calendar.id)}</option>`,
                            )
                            .join("")}
                    </select>
                </div>
            `,
            actions: [
                {
                    id: "save",
                    label: i18n.t("ui.reuse.save"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onAction: (actionId, overlay) => {
                if (actionId !== "save") return true;
                const chosenCalendarId = String(
                    overlay.querySelector("#calendar-response-target-calendar")
                        ?.value ?? "",
                ).trim();
                if (!chosenCalendarId) return false;
                selectedCalendarId = chosenCalendarId;
                return true;
            },
        });
        if (action !== "save") {
            return null;
        }
        return selectedCalendarId;
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
        const isSharedCalendarEvent =
            eventData.calendar?.visibility === "shared";
        if (
            !isSharedCalendarEvent &&
            eventData.meta?.responseUpdatesExistingEvent !== true &&
            (responseOption === "accepted" || responseOption === "tentative")
        ) {
            targetCalendarId = await promptTargetCalendar(eventData);
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
        let movedTo = null;
        try {
            const payload = await response.json();
            movedTo = payload?.data?.movedTo ?? null;
        } catch (err) {
            // response body may be absent in some test stubs
            console.warn("Failed to parse response body for movedTo:", err);
        }
        if (targetCalendarId) {
            setSelectedCalendarId(movedTo?.calendarId ?? targetCalendarId);
            syncRouteSelection();
        }
        await reloadState();
        refreshComposer();
        showToast(
            i18n.t("gateway.calendar.response_update_success"),
            "success",
        );
        if (movedTo?.calendarId && movedTo?.eventId && openEventPopup) {
            await openEventPopup(movedTo.calendarId, movedTo.eventId);
        }
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
        } catch (err) {
            console.warn("Failed to load event for response handler:", err);
            showToast(i18n.t("gateway.calendar.load_event_failed"), "error");
            return false;
        }
    }

    return {
        handleEventResponse,
        respondToEventSelection,
    };
}
