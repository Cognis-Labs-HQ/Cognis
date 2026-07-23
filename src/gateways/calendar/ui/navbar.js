import { createI18n } from "/static/reuse/i18n.js";
import { registerSearchIndex } from "/static/reuse/search-bar.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { fetchCalendarState, fetchEvents } from "./calendar-api.js";

const i18n = await createI18n({
    componentStringBaseUrls: ["/static/gateways/calendar/ui/languages"],
});

function ensureCalendarNavbarLink() {
    const topnav = document.querySelector(".topnav");
    if (!topnav) return;
    if (topnav.querySelector('a[href="/calendar"]')) return;

    const link = document.createElement("a");
    link.href = "/calendar";
    link.textContent = i18n.t("ui.reuse.calendar");
    topnav.appendChild(link);
}

async function collectCalendarSearchGroups() {
    const calendarState = await fetchCalendarState();
    const eventResults = await Promise.allSettled(
        calendarState.calendars.map(async (calendar) => ({
            calendar,
            events: await fetchEvents(calendar.id),
        })),
    );
    const items = eventResults
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => {
            const { calendar, events } = result.value;
            return events.map((event) => {
                const timeLabel = `${formatDateTime(event.startAt)} - ${formatDateTime(event.endAt)}`;
                return {
                    id: `calendar-event:${calendar.id}:${event.id}`,
                    label: event.title,
                    description: [timeLabel, calendar.name]
                        .filter(Boolean)
                        .join(" · "),
                    url: `/calendar?calendarId=${encodeURIComponent(calendar.id)}&eventId=${encodeURIComponent(event.id)}`,
                    resultClass: "event",
                    searchText: [
                        event.title,
                        timeLabel,
                        calendar.name,
                        event.location,
                        event.description,
                        event.startAt,
                        event.endAt,
                    ]
                        .filter(Boolean)
                        .join(" "),
                };
            });
        });
    return items.length ? [{ category: "Calendar Events", items }] : [];
}

ensureCalendarNavbarLink();
registerSearchIndex("calendar-events", collectCalendarSearchGroups);
