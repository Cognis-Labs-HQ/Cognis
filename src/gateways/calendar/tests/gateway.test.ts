import test from "node:test";
import assert from "node:assert/strict";
import { CoreCalendarGateway } from "../gateway.js";

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
    assert.ok(calendars.some((calendar) => calendar.id === first.id));
    assert.ok(calendars.some((calendar) => calendar.id === second.id));
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
