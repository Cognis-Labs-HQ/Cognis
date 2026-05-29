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

async function fetchCalendarState() {
    const response = await apiFetch("/api/v1/calendar/calendars");
    if (!response.ok) throw new Error("calendar_load_failed");
    const payload = await response.json();
    return {
        calendars: Array.isArray(payload?.data) ? payload.data : [],
        meta:
            payload && typeof payload.meta === "object" && payload.meta
                ? payload.meta
                : {},
    };
}

async function fetchEvents(calendarId) {
    const response = await apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    if (!response.ok) throw new Error("calendar_events_failed");
    const payload = await response.json();
    return Array.isArray(payload?.data?.events) ? payload.data.events : [];
}

async function lookupMessageParticipants(query) {
    const response = await apiFetch(
        `/api/v1/messages/users/lookup?q=${encodeURIComponent(query)}`,
    );
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}

async function probeJitsiAvailability() {
    const response = await apiFetch("/api/v1/modules/jitsi-meet/ping");
    if (!response.ok) return false;
    const payload = await response.json();
    return Boolean(payload?.data?.ready) && Boolean(payload?.data?.configComplete);
}

async function createJitsiMeeting(attendees) {
    const response = await apiFetch("/api/v1/modules/jitsi-meet/meetings/create", {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ participants: attendees }),
    });
    if (!response.ok) throw new Error("meeting_create_failed");
    const payload = await response.json();
    return payload?.data?.meetingUrl ? String(payload.data.meetingUrl) : null;
}

function renderCalendarList(calendars, selectedId, i18n) {
    if (calendars.length === 0) {
        return `<p class="calendar-empty">${i18n.t("gateway.calendar.no_calendars")}</p>`;
    }
    return `<ul class="calendar-calendars-list">${calendars
        .map(
            (calendar) => `<li>
                <a class="calendar-select-link" href="/calendar?calendarId=${encodeURIComponent(calendar.id)}"${
                    selectedId === calendar.id ? ' aria-current="page"' : ""
                }>
                    <span class="calendar-select-dot" aria-hidden="true">${
                        selectedId === calendar.id ? "✓" : ""
                    }</span>
                    <span class="calendar-select-label">${escapeHtml(calendar.name)}</span>
                </a>
                <div class="calendar-visibility">${i18n.t(
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
                ${event.meetingUrl ? `<div><a href="${escapeHtml(event.meetingUrl)}" target="_blank" rel="noreferrer noopener">${i18n.t("gateway.calendar.event_meeting_link")}</a></div>` : ""}
            </li>`,
        )
        .join("")}</ul>`;
}

function splitInviteEmails(value) {
    return Array.from(
        new Set(
            String(value ?? "")
                .split(/[\n,]+/)
                .map((entry) => entry.trim().toLowerCase())
                .filter((entry) => entry.includes("@")),
        ),
    );
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/calendar/ui/languages"],
    });
    applyDocumentTitle(i18n, "gateway.calendar.page_title");

    let calendars = [];
    let selectedCalendarId = parseCalendarSelection();
    let events = [];
    let canInviteExternal = false;
    let jitsiAvailable = false;

    try {
        const calendarState = await fetchCalendarState();
        calendars = calendarState.calendars;
        canInviteExternal = Boolean(calendarState.meta?.canInviteExternal);
        if (!selectedCalendarId && calendars[0]) {
            selectedCalendarId = calendars[0].id;
        }
        if (selectedCalendarId) {
            events = await fetchEvents(selectedCalendarId);
        }
        jitsiAvailable = await probeJitsiAvailability();
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
                            <form class="calendar-inline-form calendar-event-form" id="calendar-event-form">
                                <input id="calendar-event-title" type="text" placeholder="${i18n.t("gateway.calendar.event_title_placeholder")}" required />
                                <textarea id="calendar-event-description" rows="3" placeholder="${i18n.t("gateway.calendar.event_description_placeholder")}"></textarea>
                                <input id="calendar-event-start" type="datetime-local" required />
                                <input id="calendar-event-end" type="datetime-local" required />
                                <div class="calendar-attendee-picker">
                                    <label for="calendar-event-attendee-search">${i18n.t("gateway.calendar.attendees_label")}</label>
                                    <div class="calendar-attendee-selected" id="calendar-selected-attendees"></div>
                                    <input id="calendar-event-attendee-search" type="text" placeholder="${i18n.t("gateway.calendar.attendees_placeholder")}" autocomplete="off" />
                                    <div class="calendar-attendee-suggestions" id="calendar-attendee-suggestions"></div>
                                </div>
                                ${canInviteExternal ? `<textarea id="calendar-event-invite-emails" rows="2" placeholder="${i18n.t("gateway.calendar.invite_emails_placeholder")}"></textarea>` : ""}
                                ${jitsiAvailable ? `<label class="calendar-checkbox-row"><input id="calendar-event-create-meeting" type="checkbox" /> ${i18n.t("gateway.calendar.create_meeting")}</label>` : ""}
                                <button type="submit" class="btn-confirm" ${selectedCalendarId ? "" : "disabled"}>${i18n.t("gateway.calendar.create_event")}</button>
                            </form>
                            ${renderEventsList(events, i18n)}
                        </section>
                    </div>
                `,
                onRender: () => {
                    const selectedAttendees = new Set();
                    const selectedHost = root.querySelector(
                        "#calendar-selected-attendees",
                    );
                    const suggestionsHost = root.querySelector(
                        "#calendar-attendee-suggestions",
                    );
                    const attendeeSearchInput = root.querySelector(
                        "#calendar-event-attendee-search",
                    );

                    function renderSelectedAttendees() {
                        if (!selectedHost) return;
                        selectedHost.innerHTML = Array.from(selectedAttendees)
                            .map(
                                (handle) => `<button type="button" class="calendar-attendee-chip" data-remove-attendee="${escapeHtml(handle)}">@${escapeHtml(handle)} ×</button>`,
                            )
                            .join("");
                    }

                    async function renderAttendeeSuggestions() {
                        if (!attendeeSearchInput || !suggestionsHost) return;
                        const query = String(attendeeSearchInput.value ?? "").trim();
                        if (query.length < 2) {
                            suggestionsHost.innerHTML = "";
                            return;
                        }
                        const matches = await lookupMessageParticipants(query);
                        const visibleMatches = matches
                            .filter((entry) => entry?.handle)
                            .filter((entry) => !selectedAttendees.has(entry.handle))
                            .slice(0, 6);
                        suggestionsHost.innerHTML = visibleMatches
                            .map(
                                (entry) => `<button type="button" class="calendar-attendee-suggestion" data-attendee-handle="${escapeHtml(entry.handle)}">${escapeHtml(entry.displayName ?? entry.handle)} (@${escapeHtml(entry.handle)})</button>`,
                            )
                            .join("");
                    }

                    attendeeSearchInput?.addEventListener(
                        "input",
                        () => {
                            void renderAttendeeSuggestions();
                        },
                        { signal },
                    );

                    suggestionsHost?.addEventListener(
                        "click",
                        (event) => {
                            const button = event.target.closest(
                                "[data-attendee-handle]",
                            );
                            if (!button) return;
                            const handle = String(
                                button.getAttribute("data-attendee-handle") ?? "",
                            )
                                .trim()
                                .toLowerCase();
                            if (!handle) return;
                            selectedAttendees.add(handle);
                            if (attendeeSearchInput) attendeeSearchInput.value = "";
                            suggestionsHost.innerHTML = "";
                            renderSelectedAttendees();
                        },
                        { signal },
                    );

                    selectedHost?.addEventListener(
                        "click",
                        (event) => {
                            const button = event.target.closest(
                                "[data-remove-attendee]",
                            );
                            if (!button) return;
                            const handle = String(
                                button.getAttribute("data-remove-attendee") ?? "",
                            )
                                .trim()
                                .toLowerCase();
                            selectedAttendees.delete(handle);
                            renderSelectedAttendees();
                        },
                        { signal },
                    );

                    const createForm = root.querySelector(
                        "#calendar-create-form",
                    );
                    createForm?.addEventListener(
                        "submit",
                        async (event) => {
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
                                    headers: {
                                        "content-type": "application/json",
                                    },
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
                                i18n.t(
                                    "gateway.calendar.create_calendar_success",
                                ),
                                "success",
                            );
                            navigateTo("/calendar");
                        },
                        { signal },
                    );

                    const eventForm = root.querySelector(
                        "#calendar-event-form",
                    );
                    eventForm?.addEventListener(
                        "submit",
                        async (event) => {
                            event.preventDefault();
                            if (!selectedCalendarId) return;
                            const title = String(
                                root.querySelector("#calendar-event-title")?.value ??
                                    "",
                            ).trim();
                            const description = String(
                                root.querySelector(
                                    "#calendar-event-description",
                                )?.value ?? "",
                            ).trim();
                            const startAt = String(
                                root.querySelector("#calendar-event-start")?.value ??
                                    "",
                            ).trim();
                            const endAt = String(
                                root.querySelector("#calendar-event-end")?.value ?? "",
                            ).trim();
                            const inviteEmails = canInviteExternal
                                ? splitInviteEmails(
                                      root.querySelector(
                                          "#calendar-event-invite-emails",
                                      )?.value ?? "",
                                  )
                                : [];
                            const createMeeting = Boolean(
                                root.querySelector("#calendar-event-create-meeting")
                                    ?.checked,
                            );
                            let meetingUrl = null;
                            if (createMeeting && jitsiAvailable) {
                                try {
                                    meetingUrl = await createJitsiMeeting(
                                        Array.from(selectedAttendees),
                                    );
                                } catch {
                                    showToast(
                                        i18n.t(
                                            "gateway.calendar.create_meeting_failed",
                                        ),
                                        "error",
                                    );
                                    return;
                                }
                            }
                            const response = await apiFetch(
                                `/api/v1/calendar/calendars/${encodeURIComponent(selectedCalendarId)}/events`,
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
                                        attendees: Array.from(selectedAttendees),
                                        inviteEmails,
                                        meetingUrl,
                                    }),
                                },
                            );
                            if (!response.ok) {
                                showToast(
                                    i18n.t(
                                        "gateway.calendar.create_event_failed",
                                    ),
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
                        },
                        { signal },
                    );
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
