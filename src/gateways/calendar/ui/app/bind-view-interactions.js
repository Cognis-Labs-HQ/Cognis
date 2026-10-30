export function bindViewInteractions({
    root,
    signal,
    handlePendingResponseClick,
    respondToEventSelection,
    reloadState,
    setSelectedCalendarId,
    openEventPopup,
}) {
    if (root.dataset.calendarInteractionsBound === "true") return;
    root.dataset.calendarInteractionsBound = "true";
    root.addEventListener(
        "click",
        (event) => {
            if (!(event.target instanceof Element)) return;
            if (
                handlePendingResponseClick(
                    event.target,
                    respondToEventSelection,
                    reloadState,
                )
            ) {
                return;
            }
            const eventButton = event.target.closest("[data-calendar-event]");
            if (!(eventButton instanceof HTMLElement)) return;
            const calendarId = String(
                eventButton.getAttribute("data-calendar-id") ?? "",
            );
            const eventId = String(
                eventButton.getAttribute("data-calendar-event") ?? "",
            );
            setSelectedCalendarId(calendarId);
            if (calendarId && eventId) openEventPopup(calendarId, eventId);
        },
        { signal },
    );
}
