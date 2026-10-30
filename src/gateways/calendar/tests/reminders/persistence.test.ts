import test from "node:test";
import assert from "node:assert/strict";
import { CoreCalendarGateway } from "../../gateway/index.js";

test("reminders preserve explicit selection, clearing and unchanged edits over calendar defaults", () => {
    const gateway = new CoreCalendarGateway();
    const calendar = gateway.createCalendar({
        ownerAccountId: "alice",
        name: "Reminders",
        defaultReminderOffsetsMinutes: [10, 60],
    });
    const event = gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "Selection",
        startAt: "2026-11-01T09:00:00Z",
        endAt: "2026-11-01T10:00:00Z",
        reminderOffsetsMinutes: [5, 30, 90],
    });
    const identity = {
        ownerAccountId: "alice",
        calendarId: calendar.id,
        eventId: event.id,
    };
    assert.deepEqual(event.reminderOffsetsMinutes, [5, 30, 90]);
    gateway.updateEvent({ ...identity, title: "Unchanged reminders" });
    assert.deepEqual(event.reminderOffsetsMinutes, [5, 30, 90]);
    gateway.updateEvent({ ...identity, reminderOffsetsMinutes: [30, 90] });
    assert.deepEqual(event.reminderOffsetsMinutes, [30, 90]);
    gateway.updateEvent({ ...identity, reminderOffsetsMinutes: [] });
    assert.deepEqual(event.reminderOffsetsMinutes, []);
    gateway.updateEvent({ ...identity, title: "Still cleared" });
    assert.deepEqual(event.reminderOffsetsMinutes, []);
    const cleared = gateway.addEvent({
        ownerAccountId: "alice",
        calendarId: calendar.id,
        title: "No reminders",
        startAt: "2026-11-02T09:00:00Z",
        endAt: "2026-11-02T10:00:00Z",
        reminderOffsetsMinutes: [],
    });
    assert.deepEqual(cleared.reminderOffsetsMinutes, []);
});
