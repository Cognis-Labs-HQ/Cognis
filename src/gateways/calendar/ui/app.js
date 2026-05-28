import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/init.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

function parseCalendarSelection() {
    const query = new URLSearchParams(window.location.search);
    return query.get("calendarId");
}

async function fetchCalendars() {
    const response = await apiFetch("/api/v1/calendar/calendars");
    if (!response.ok) throw new Error("calendar_load_failed");
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}

async function fetchEvents(calendarId) {
    const response = await apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    if (!response.ok) throw new Error("calendar_events_failed");
    const payload = await response.json();
    return Array.isArray(payload?.data?.events) ? payload.data.events : [];
}

function renderCalendarList(calendars, selectedId, i18n) {
    if (calendars.length === 0) {
        return `<p class="calendar-empty">${i18n.t("gateway.calendar.no_calendars")}</p>`;
    }
    return `<ul class="calendar-calendars-list">${calendars
        .map(
            (calendar) => `<li>
                <a href="/calendar?calendarId=${encodeURIComponent(calendar.id)}"${
                    selectedId === calendar.id ? ' aria-current="page"' : ""
                }>${escapeHtml(calendar.name)}</a>
                <div>${i18n.t(
                    calendar.visibility === "public"
                        ? "gateway.calendar.visibility_public"
                        : "gateway.calendar.visibility_private",
                )}</div>
            </li>`,
        )
        .join("")}</ul>`;
}

function renderEventsList(events, i18n) {
    if (!events.length) {
        return `<p class="calendar-empty">${i18n.t("gateway.calendar.no_events")}</p>`;
    }
    return `<ul class="calendar-events-list">${events
        .map(
            (event) => `<li>
                <strong>${escapeHtml(event.title)}</strong>
                <div>${formatDateTime(event.startAt)} - ${formatDateTime(event.endAt)}</div>
                ${event.description ? `<div>${escapeHtml(event.description)}</div>` : ""}
                ${event.attendees?.length ? `<div>${escapeHtml(event.attendees.join(", "))}</div>` : ""}
            </li>`,
        )
        .join("")}</ul>`;
}

export async function mount(root) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/calendar/ui/languages"],
    });
    applyDocumentTitle(i18n, "gateway.calendar.page_title");

    let calendars = [];
    let selectedCalendarId = parseCalendarSelection();
    let events = [];

    try {
        calendars = await fetchCalendars();
        if (!selectedCalendarId && calendars[0]) {
            selectedCalendarId = calendars[0].id;
        }
        if (selectedCalendarId) {
            events = await fetchEvents(selectedCalendarId);
        }
    } catch {
        showToast(i18n.t("gateway.calendar.load_failed"), "error");
    }

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [
            {
                id: "calendar-hub",
                label: i18n.t("gateway.calendar.page_title"),
                pinned: true,
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () => `
                    <div class="calendar-grid">
                        <section class="calendar-section">
                            <h3>${i18n.t("gateway.calendar.my_calendars")}</h3>
                            <form class="calendar-inline-form" id="calendar-create-form">
                                <input id="calendar-name" type="text" placeholder="${i18n.t("gateway.calendar.calendar_name_placeholder")}" required />
                                <select id="calendar-visibility">
                                    <option value="private">${i18n.t("gateway.calendar.visibility_private")}</option>
                                    <option value="public">${i18n.t("gateway.calendar.visibility_public")}</option>
                                </select>
                                <button type="submit" class="btn-confirm">${i18n.t("gateway.calendar.create_calendar")}</button>
                            </form>
                            ${renderCalendarList(calendars, selectedCalendarId, i18n)}
                        </section>
                        <section class="calendar-section">
                            <h3>${i18n.t("gateway.calendar.events")}</h3>
                            <form class="calendar-inline-form" id="calendar-event-form">
                                <input id="calendar-event-title" type="text" placeholder="${i18n.t("gateway.calendar.event_title_placeholder")}" required />
                                <input id="calendar-event-start" type="datetime-local" required />
                                <input id="calendar-event-end" type="datetime-local" required />
                                <input id="calendar-event-attendees" type="text" placeholder="${i18n.t("gateway.calendar.attendees_placeholder")}" />
                                <button type="submit" class="btn-confirm" ${selectedCalendarId ? "" : "disabled"}>${i18n.t("gateway.calendar.create_event")}</button>
                            </form>
                            ${renderEventsList(events, i18n)}
                        </section>
                    </div>
                `,
                onRender: () => {
                    const createForm = root.querySelector(
                        "#calendar-create-form",
                    );
                    createForm?.addEventListener("submit", async (event) => {
                        event.preventDefault();
                        const name = String(
                            root.querySelector("#calendar-name")?.value ?? "",
                        ).trim();
                        const visibility = String(
                            root.querySelector("#calendar-visibility")?.value ??
                                "private",
                        );
                        if (!name) return;
                        const response = await apiFetch(
                            "/api/v1/calendar/calendars",
                            {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ name, visibility }),
                            },
                        );
                        if (!response.ok) {
                            showToast(
                                i18n.t(
                                    "gateway.calendar.create_calendar_failed",
                                ),
                                "error",
                            );
                            return;
                        }
                        showToast(
                            i18n.t("gateway.calendar.create_calendar_success"),
                            "success",
                        );
                        navigateTo("/calendar");
                    });

                    const eventForm = root.querySelector(
                        "#calendar-event-form",
                    );
                    eventForm?.addEventListener("submit", async (event) => {
                        event.preventDefault();
                        if (!selectedCalendarId) return;
                        const title = String(
                            root.querySelector("#calendar-event-title")
                                ?.value ?? "",
                        ).trim();
                        const startAt = String(
                            root.querySelector("#calendar-event-start")
                                ?.value ?? "",
                        ).trim();
                        const endAt = String(
                            root.querySelector("#calendar-event-end")?.value ??
                                "",
                        ).trim();
                        const attendeesRaw = String(
                            root.querySelector("#calendar-event-attendees")
                                ?.value ?? "",
                        ).trim();
                        const attendees = attendeesRaw
                            ? attendeesRaw
                                  .split(",")
                                  .map((entry) => entry.trim())
                                  .filter(Boolean)
                            : [];
                        const response = await apiFetch(
                            `/api/v1/calendar/calendars/${encodeURIComponent(selectedCalendarId)}/events`,
                            {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({
                                    title,
                                    startAt: new Date(startAt).toISOString(),
                                    endAt: new Date(endAt).toISOString(),
                                    attendees,
                                }),
                            },
                        );
                        if (!response.ok) {
                            showToast(
                                i18n.t("gateway.calendar.create_event_failed"),
                                "error",
                            );
                            return;
                        }
                        showToast(
                            i18n.t("gateway.calendar.create_event_success"),
                            "success",
                        );
                        navigateTo(
                            `/calendar?calendarId=${encodeURIComponent(selectedCalendarId)}`,
                        );
                    });
                },
            },
        ],
        preferenceKey: "calendar-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.calendar.page_title"),
            subtitle: i18n.t("gateway.calendar.page_subtitle"),
        },
    });

    await composer.init();
}

await mountWhenDirect(mount);
