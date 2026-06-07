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
        responseButton.closest(".calendar-upcoming-item")?.remove();
        void respondToEventSelection(calendarId, eventId, responseOption);
    }
    return true;
}
