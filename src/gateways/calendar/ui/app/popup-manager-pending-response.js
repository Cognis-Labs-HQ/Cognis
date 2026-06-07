export function handlePendingResponseClick(
    element,
    respondToEventSelection,
    reloadState,
) {
    const responseButton = element.closest("[data-calendar-pending-response]");
    if (!(responseButton instanceof HTMLElement)) return false;
    const responseOption = String(
        responseButton.getAttribute("data-calendar-pending-response") ?? "",
    ).trim();
    const calendarId = String(
        responseButton.getAttribute("data-calendar-id") ?? "",
    ).trim();
    const eventId = String(
        responseButton.getAttribute("data-calendar-event") ?? "",
    ).trim();
    if (calendarId && eventId && responseOption) {
        // Optimistic removal: the item is removed immediately for instant feedback.
        // If the API call fails, force a state reload to reconcile the pending list.
        responseButton.closest(".calendar-upcoming-item")?.remove();
        void respondToEventSelection(calendarId, eventId, responseOption)
            .then((success) => {
                if (!success) {
                    void reloadState?.();
                }
            })
            .catch(() => {
                void reloadState?.();
            });
    }
    return true;
}
