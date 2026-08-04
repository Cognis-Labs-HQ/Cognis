import test from "node:test";
import assert from "node:assert/strict";
import { CoreCalendarGateway } from "../gateway/index.js";
import type { CalendarStore } from "../store.js";
import type { CalendarRecord } from "../gateway/utils.js";

test("calendar gateway supports multiple calendars per user", () => {
    const gateway = new CoreCalendarGateway();
    const defaultCalendar = gateway.ensureDefaultCalendar("alice");
    const first = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Personal",
    });
    const second = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Work",
        visibility: "public",
    });

    const calendars = gateway.listCalendars("alice");
    assert.equal(calendars.length, 3);
    assert.equal(calendars[0]?.id, defaultCalendar.id);
    assert.equal(calendars[0]?.isDefault, true);
    assert.equal(calendars[0]?.color, "#1f8ceb");
    assert.ok(calendars.some((calendar) => calendar.id === first.id));
    assert.ok(calendars.some((calendar) => calendar.id === second.id));
});

test("calendar gateway normalizes custom calendar colors", () => {
    const gateway = new CoreCalendarGateway();
    const custom = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Colorful",
        color: "#FF44AA",
    });
    const fallback = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Fallback",
        color: "invalid",
    });
    assert.equal(custom.color, "#ff44aa");
    assert.equal(fallback.color, "#1f8ceb");
});

test("calendar gateway applies calendar default reminders when event reminders are missing", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Default reminders",
        defaultReminderOffsetsMinutes: [10, 60],
    });
    const event = gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Standup",
        startAt: "2026-06-10T09:00:00.000Z",
        endAt: "2026-06-10T09:30:00.000Z",
        reminderOffsetsMinutes: [],
    });
    assert.deepEqual(event.reminderOffsetsMinutes, [10, 60]);
});

test("calendar gateway does not allow deleting the default calendar", () => {
    const gateway = new CoreCalendarGateway();
    const defaultCalendar = gateway.ensureDefaultCalendar("alice");
    assert.throws(
        () =>
            gateway.deleteCalendar({
                ownerAccountId: "alice",
                calendarId: defaultCalendar.id,
            }),
        /calendar_default_locked/,
    );
});

test("calendar gateway allows default calendar visibility updates", () => {
    const gateway = new CoreCalendarGateway();
    const defaultCalendar = gateway.ensureDefaultCalendar("alice");
    const updated = gateway.updateCalendar({
        ownerAccountId: "alice",
        calendarId: defaultCalendar.id,
        visibility: "public",
    });
    assert.equal(updated.visibility, "public");
});

test("calendar gateway exports ICS and parses ICS imports", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Schedule",
    });
    gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Existing Event",
        startAt: "2026-05-28T09:00:00.000Z",
        endAt: "2026-05-28T10:00:00.000Z",
    });

    const exported = gateway.exportCalendarAsIcs(calendar.id);
    assert.ok(exported.includes("BEGIN:VCALENDAR"));
    assert.ok(exported.includes("SUMMARY:Existing Event"));

    const imported = gateway.importIcs({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        ics: `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Imported\r\nDTSTART:20260530T080000Z\r\nDTEND:20260530T090000Z\r\nATTENDEE:mailto:bob\r\nEND:VEVENT\r\nEND:VCALENDAR`,
    });

    assert.equal(imported.importedCount, 1);
    assert.equal(gateway.listEvents(calendar.id).length, 2);
});

test("calendar gateway exports midnight day ranges as all-day ICS events", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Schedule",
    });
    gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "All Day Event",
        startAt: "2026-05-28T00:00:00.000Z",
        endAt: "2026-05-29T00:00:00.000Z",
    });

    const exported = gateway.exportCalendarAsIcs(calendar.id);

    assert.ok(exported.includes("DTSTART;VALUE=DATE:20260528"));
    assert.ok(exported.includes("DTEND;VALUE=DATE:20260529"));
});

test("calendar gateway exports local-midnight day ranges as all-day ICS events", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Schedule",
    });
    gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "All Day Event",
        startAt: "2026-05-28T04:00:00.000Z",
        endAt: "2026-05-29T04:00:00.000Z",
    });

    const exported = gateway.exportCalendarAsIcs(calendar.id);

    assert.ok(exported.includes("DTSTART;VALUE=DATE:20260528"));
    assert.ok(exported.includes("DTEND;VALUE=DATE:20260529"));
});

test("calendar gateway imports all-day ICS date values", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Schedule",
    });

    const imported = gateway.importIcs({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        ics: `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Imported All Day\r\nDTSTART;VALUE=DATE:20260530\r\nDTEND;VALUE=DATE:20260531\r\nEND:VEVENT\r\nEND:VCALENDAR`,
    });

    const [event] = gateway.listEvents(calendar.id);
    assert.equal(imported.importedCount, 1);
    assert.equal(event.startAt, "2026-05-30T00:00:00.000Z");
    assert.equal(event.endAt, "2026-05-31T00:00:00.000Z");
});

test("calendar gateway private export tokens expire and validate", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Secure",
    });

    const token = gateway.issuePrivateExportToken({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        ttlSeconds: 3600,
    });

    const resolved = gateway.resolvePrivateExportToken(token.token);
    assert.ok(resolved);
    assert.equal(resolved?.calendarId, calendar.id);
});

test("calendar gateway supports non-expiring private export tokens", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Secure",
    });
    const token = gateway.issuePrivateExportToken({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        ttlSeconds: null,
    });
    const resolved = gateway.resolvePrivateExportToken(token.token);
    assert.ok(resolved);
    assert.equal(resolved?.expiresAt, "");
});

test("calendar gateway scoped meeting tokens are one-time and scoped", () => {
    const gateway = new CoreCalendarGateway();
    const token = gateway.issueScopedMeetingAccessToken({
        targetUrl: "https://meet.example.com/room-1",
        createdByAccountId: "alice",
        eventId: "event-1",
    });
    const firstRead = gateway.consumeScopedMeetingAccessToken(token.token);
    const secondRead = gateway.consumeScopedMeetingAccessToken(token.token);
    assert.equal(firstRead?.targetUrl, "https://meet.example.com/room-1");
    assert.equal(secondRead, null);
});

test("calendar gateway ensures special calendars are idempotent per owner", () => {
    const gateway = new CoreCalendarGateway();
    const specialCalendar = gateway.ensureSpecialCalendar(
        "bob",
        "Invited",
        "#8B5CF6",
    );
    const repeatedLookup = gateway.ensureSpecialCalendar(
        "bob",
        "Invited",
        "#111111",
    );

    assert.equal(specialCalendar.id, repeatedLookup.id);
    assert.equal(specialCalendar.color, "#8b5cf6");
    assert.equal(gateway.listCalendars("bob").length, 2);
});

test("calendar gateway updates events with recurrence and status", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Work",
    });
    const createdEvent = gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Planning",
        startAt: "2026-06-01T09:00:00.000Z",
        endAt: "2026-06-01T10:00:00.000Z",
        attendees: ["bob"],
        reminderOffsetsMinutes: [60],
    });

    const updatedEvent = gateway.updateEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        eventId: createdEvent.id,
        title: "Weekly Planning",
        status: "free",
        recurrence: "weekly",
        attendees: ["bob", "carol"],
        reminderOffsetsMinutes: [5, 10, 60],
    });

    assert.equal(updatedEvent.title, "Weekly Planning");
    assert.equal(updatedEvent.status, "free");
    assert.equal(updatedEvent.recurrence, "weekly");
    assert.deepEqual(updatedEvent.attendees, ["bob", "carol", "alice"]);
    assert.deepEqual(updatedEvent.reminderOffsetsMinutes, [5, 10, 60]);
    assert.equal(gateway.getEventResponse(createdEvent.id, "carol"), "pending");
});

test("calendar gateway defaults organizer response to accepted", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Team",
    });
    const event = gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Kickoff",
        startAt: "2026-06-04T09:00:00.000Z",
        endAt: "2026-06-04T10:00:00.000Z",
        attendees: ["bob"],
    });
    assert.equal(gateway.getEventResponse(event.id, "alice"), "accepted");
    assert.equal(gateway.getEventResponse(event.id, "bob"), "pending");
});

test("calendar gateway deletes mirrored event copies when source event is deleted", () => {
    const gateway = new CoreCalendarGateway();
    const ownerCalendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Work",
    });
    const mirrorCalendar = gateway.ensureSpecialCalendar(
        "bob",
        "Accepted",
        "#22c55e",
    );
    const sourceEvent = gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: ownerCalendar.id,
        title: "Review",
        startAt: "2026-06-02T09:00:00.000Z",
        endAt: "2026-06-02T10:00:00.000Z",
        attendees: ["bob"],
    });
    const copyEvent = gateway.addEventToCalendar({
        calendarId: mirrorCalendar.id,
        sourceEventId: sourceEvent.id,
        title: sourceEvent.title,
        startAt: sourceEvent.startAt,
        endAt: sourceEvent.endAt,
        createdBy: sourceEvent.createdBy,
        attendees: sourceEvent.attendees,
        recurrence: sourceEvent.recurrence,
    });

    gateway.deleteEvent({
        ownerAccountId: "alice",
        calendarId: ownerCalendar.id,
        eventId: sourceEvent.id,
    });

    assert.equal(gateway.getEvent(ownerCalendar.id, sourceEvent.id), null);
    assert.equal(gateway.getEvent(mirrorCalendar.id, copyEvent.id), null);
});

test("calendar gateway always keeps organizer in attendees", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Work",
    });
    const event = gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Owner Check-in",
        startAt: "2026-06-03T09:00:00.000Z",
        endAt: "2026-06-03T10:00:00.000Z",
        attendees: ["bob"],
    });
    assert.deepEqual(event.attendees, ["bob", "alice"]);

    const updated = gateway.updateEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        eventId: event.id,
        attendees: ["bob"],
    });
    assert.deepEqual(updated.attendees, ["bob", "alice"]);
});

test("calendar gateway deletes recurring events from selected event forward", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Work",
    });
    gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Standup",
        startAt: "2026-06-01T09:00:00.000Z",
        endAt: "2026-06-01T09:30:00.000Z",
        recurrence: "daily",
    });
    const series = gateway
        .listEvents(calendar.id)
        .filter((event) => event.recurrence === "daily");
    const thirdOccurrence = series[2];
    assert.ok(thirdOccurrence);

    gateway.deleteEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        eventId: thirdOccurrence.id,
        deleteAll: true,
    });
    const remaining = gateway
        .listEvents(calendar.id)
        .filter((event) => event.recurrence === "daily");
    assert.equal(remaining.length, 2);
    assert.ok(
        remaining.every((event) => event.startAt < thirdOccurrence.startAt),
    );
});

test("calendar gateway can apply attendee response to entire recurrence series", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Work",
    });
    gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Review",
        startAt: "2026-06-10T09:00:00.000Z",
        endAt: "2026-06-10T10:00:00.000Z",
        attendees: ["bob"],
        recurrence: "weekly",
    });
    const weeklyEvents = gateway
        .listEvents(calendar.id)
        .filter((event) => event.recurrence === "weekly");
    assert.ok(weeklyEvents.length > 1);

    gateway.setEventResponse({
        eventId: weeklyEvents[0].id,
        accountId: "bob",
        response: "accepted",
        respondAll: true,
    });
    assert.ok(
        weeklyEvents.every(
            (event) => gateway.getEventResponse(event.id, "bob") === "accepted",
        ),
    );
});

test("calendar gateway preserves shared visibility when loading calendars from store", async () => {
    const sharedCalendar: CalendarRecord = {
        id: "shared-cal-1",
        ownerAccountId: "bob",
        name: "Alice's shared calendar",
        visibility: "shared",
        color: "#1f8ceb",
        isDefault: false,
        defaultReminderOffsetsMinutes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    const mockStore: CalendarStore = {
        ensureSchema: async () => {},
        listCalendars: async () => [sharedCalendar],
        saveCalendar: async () => {},
        deleteCalendar: async () => {},
        listEvents: async () => [],
        saveEvent: async () => {},
        deleteEvent: async () => {},
        listResponses: async () => [],
        saveResponse: async () => {},
        deleteResponse: async () => {},
        deleteResponsesForRootEvent: async () => {},
        deleteAccountActivity: async () => {},
    };
    const gateway = new CoreCalendarGateway();
    await gateway.attachStore(mockStore);
    const loaded = gateway.getCalendar(sharedCalendar.id);
    assert.equal(loaded?.visibility, "shared");
});

test("calendar gateway deletes account calendars and events from memory and storage", async () => {
    const deletedAccounts: string[] = [];
    const mockStore: CalendarStore = {
        ensureSchema: async () => {},
        listCalendars: async () => [],
        saveCalendar: async () => {},
        deleteCalendar: async () => {},
        listEvents: async () => [],
        saveEvent: async () => {},
        deleteEvent: async () => {},
        listResponses: async () => [],
        saveResponse: async () => {},
        deleteResponse: async () => {},
        deleteResponsesForRootEvent: async () => {},
        deleteAccountActivity: async (accountId) => {
            deletedAccounts.push(accountId);
        },
    };
    const gateway = new CoreCalendarGateway();
    await gateway.attachStore(mockStore);
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Alice",
        color: "#1f8ceb",
        isDefault: true,
    });
    gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Private event",
        startAt: "2026-07-26T09:00:00.000Z",
        endAt: "2026-07-26T10:00:00.000Z",
    });

    await gateway.deleteAccountActivity("alice");

    assert.deepEqual(deletedAccounts, ["alice"]);
    assert.equal(gateway.getCalendar(calendar.id), null);
    assert.deepEqual(gateway.listEvents(calendar.id), []);
});

test("calendar gateway removes a deleted attendee from retained events", async () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Alice",
        color: "#1f8ceb",
        isDefault: true,
    });
    const event = gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Private event",
        startAt: "2026-07-26T09:00:00.000Z",
        endAt: "2026-07-26T10:00:00.000Z",
        attendees: ["bob", "carol"],
    });

    await gateway.deleteAccountActivity("bob");

    assert.deepEqual(gateway.getEvent(calendar.id, event.id)?.attendees, [
        "carol",
        "alice",
    ]);
    assert.equal(gateway.getEventResponse(event.id, "bob"), null);
});

test("calendar gateway removeDeclinedAttendee removes attendee from event", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Alice",
        color: "#1f8ceb",
        isDefault: true,
    });
    const event = gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Stand-up",
        startAt: "2026-06-10T09:00:00.000Z",
        endAt: "2026-06-10T09:30:00.000Z",
        attendees: ["bob"],
    });
    gateway.removeDeclinedAttendee({
        eventId: event.id,
        accountId: "bob",
        removeAll: false,
    });
    const updated = gateway
        .listEvents(calendar.id)
        .find((e) => e.id === event.id);
    assert.ok(!updated?.attendees.includes("bob"));
});

test("calendar gateway removeDeclinedAttendee does not remove event creator", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Alice",
        color: "#1f8ceb",
        isDefault: true,
    });
    const event = gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Stand-up",
        startAt: "2026-06-10T09:00:00.000Z",
        endAt: "2026-06-10T09:30:00.000Z",
        attendees: ["bob"],
    });
    gateway.removeDeclinedAttendee({
        eventId: event.id,
        accountId: "alice",
        removeAll: false,
    });
    const updated = gateway
        .listEvents(calendar.id)
        .find((e) => e.id === event.id);
    assert.ok(updated?.attendees.includes("alice"));
});

test("calendar gateway removeDeclinedAttendee with removeAll removes attendee from recurring series", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Alice",
        color: "#1f8ceb",
        isDefault: true,
    });
    gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Weekly",
        startAt: "2026-06-10T09:00:00.000Z",
        endAt: "2026-06-10T09:30:00.000Z",
        attendees: ["bob"],
        recurrence: "weekly",
    });
    const seriesEvents = gateway
        .listEvents(calendar.id)
        .filter((e) => e.recurrence === "weekly");
    assert.ok(seriesEvents.length > 1);
    gateway.removeDeclinedAttendee({
        eventId: seriesEvents[0].id,
        accountId: "bob",
        removeAll: true,
    });
    assert.ok(
        seriesEvents.every(
            (e) =>
                !gateway
                    .listEvents(calendar.id)
                    .find((ev) => ev.id === e.id)
                    ?.attendees.includes("bob"),
        ),
    );
});

test("upcoming event projection returns every match unless caller supplies a limit", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Alice",
        color: "#1f8ceb",
        isDefault: true,
    });
    for (const day of [10, 11, 12]) {
        gateway.addEvent({
            ownerAccountId: "alice",
            calendarId: calendar.id,
            title: `Event ${day}`,
            startAt: `2099-06-${day}T09:00:00.000Z`,
            endAt: `2099-06-${day}T09:30:00.000Z`,
        });
    }

    assert.equal(gateway.listUpcomingEvents("alice").length, 3);
    assert.equal(gateway.listUpcomingEvents("alice", 2).length, 2);
});
