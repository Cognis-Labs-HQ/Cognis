export function handlePendingResponseClick(element, respondToEventSelection) {
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
        // If the API call fails, respondToEventSelection triggers a full state
        // reload (via reloadState), which will re-render the pending list and
        // restore any items that should still be present.
        responseButton.closest(".calendar-upcoming-item")?.remove();
        void respondToEventSelection(calendarId, eventId, responseOption);
    }
    return true;
}
