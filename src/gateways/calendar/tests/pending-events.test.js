import test from "node:test";
import assert from "node:assert/strict";
import { collectPendingEvents } from "../ui/calendar-ui-helpers.js";

test("collectPendingEvents deduplicates mirrored shared-calendar invitations", () => {
    const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const endAt = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
    const sharedEvent = {
        id: "event-1",
        sourceEventId: "event-1",
        title: "Shared planning",
        startAt,
        endAt,
        createdBy: "alice",
        attendees: ["bob"],
        responses: { bob: "pending" },
    };
    const pending = collectPendingEvents(
        { "shared-cal": [sharedEvent] },
        [{ id: "shared-cal", name: "Shared", color: "#123456" }],
        "",
        "bob",
        [
            {
                ...sharedEvent,
                calendarId: "owner-cal",
            },
        ],
    );
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, "event-1");
    assert.equal(pending[0].calendarId, "shared-cal");
});

test("collectPendingEvents keeps separate recurring instances", () => {
    const firstStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const firstEnd = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
    const secondStart = new Date(
        Date.now() + 48 * 60 * 60 * 1000,
    ).toISOString();
    const secondEnd = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString();
    const pending = collectPendingEvents(
        {
            "shared-cal": [
                {
                    id: "event-a",
                    sourceEventId: "series-1",
                    title: "Standup",
                    startAt: firstStart,
                    endAt: firstEnd,
                    createdBy: "alice",
                    attendees: ["bob"],
                    responses: { bob: "pending" },
                },
                {
                    id: "event-b",
                    sourceEventId: "series-1",
                    title: "Standup",
                    startAt: secondStart,
                    endAt: secondEnd,
                    createdBy: "alice",
                    attendees: ["bob"],
                    responses: { bob: "pending" },
                },
            ],
        },
        [{ id: "shared-cal", name: "Shared", color: "#123456" }],
        "",
        "bob",
        [],
    );
    assert.equal(pending.length, 2);
});
