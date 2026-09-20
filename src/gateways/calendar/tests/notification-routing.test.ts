import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { GatewayRegistry, CapabilityStore, createCtx } from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import {
    createAuthContext,
    createJsonDispatcher,
} from "../../../api/tests/reuse/route-test-helpers.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { bootstrap } from "../bootstrap.js";

async function bootstrapCalendarTest(input: {
    claimsByToken: Map<string, { sub: string; role: string }>;
    dispatchNotification?: (envelope: {
        recipientUsername: string;
        subject: string;
        actionUrl?: string;
        senderName?: string;
    }) => Promise<{ dispatched: string[] }>;
}) {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const ctx = createCtx();
    capabilities.contribute(
        "auth:routeContext",
        createAuthContext(input.claimsByToken),
    );
    if (input.dispatchNotification) {
        capabilities.contribute("notify:dispatch", input.dispatchNotification);
    }
    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        flow: ctx.flow,
    } as any);
    return createJsonDispatcher(routeRegistry);
}

test("shared-calendar invite notifications use each recipient shared calendar route immediately", async () => {
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const bobToken = issueAccessToken("bob", "admin", 60);
    const charlieToken = issueAccessToken("charlie", "admin", 60);
    const dispatched: Array<{
        recipientUsername: string;
        subject: string;
        actionUrl?: string;
        senderName?: string;
    }> = [];
    const dispatchJson = await bootstrapCalendarTest({
        claimsByToken: new Map([
            [aliceToken, { sub: "alice", role: "admin" }],
            [bobToken, { sub: "bob", role: "admin" }],
            [charlieToken, { sub: "charlie", role: "admin" }],
        ]),
        dispatchNotification: async (envelope) => {
            dispatched.push(envelope);
            return { dispatched: [envelope.recipientUsername] };
        },
    });

    const aliceCalendars = await dispatchJson(
        "GET",
        aliceToken,
        "/api/v1/calendar/calendars",
    );
    const ownerCalendar = aliceCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    );
    const ownerCalendarId = ownerCalendar.id;

    const shareWithBob = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users`,
        {
            recipientAccountId: "bob",
            recipientHandle: "bob",
            recipientDisplayName: "Bob",
        },
    );
    const bobSharedCalendarId = String(shareWithBob.body.data.calendarId ?? "");
    assert.ok(bobSharedCalendarId);
    const bobShareId = String(shareWithBob.body.data.id ?? "");
    assert.ok(bobShareId);

    const shareWithCharlie = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users`,
        {
            recipientAccountId: "charlie",
            recipientHandle: "charlie",
            recipientDisplayName: "Charlie",
        },
    );
    const charlieSharedCalendarId = String(
        shareWithCharlie.body.data.calendarId ?? "",
    );
    assert.ok(charlieSharedCalendarId);
    const elevateBobShare = await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users/${encodeURIComponent(bobShareId)}`,
        { permission: "write" },
    );
    assert.equal(elevateBobShare.statusCode, 200);

    const createViaBob = await dispatchJson(
        "POST",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(bobSharedCalendarId)}/events`,
        {
            title: "Shared review",
            startAt: "2026-06-20T09:00:00.000Z",
            endAt: "2026-06-20T10:00:00.000Z",
        },
    );
    assert.equal(createViaBob.statusCode, 201);
    const createdEventId = String(createViaBob.body.data.id ?? "");
    assert.ok(createdEventId);

    const charlieNotification = dispatched.find(
        (entry) =>
            entry.recipientUsername === "charlie" &&
            entry.subject === "bob invited you to Shared review",
    );
    assert.ok(charlieNotification);
    assert.equal(charlieNotification.senderName, "bob");
    assert.equal(
        charlieNotification.actionUrl,
        `/calendar?calendarId=${encodeURIComponent(charlieSharedCalendarId)}&eventId=${encodeURIComponent(createdEventId)}`,
    );

    const openFromNotification = await dispatchJson(
        "GET",
        charlieToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(charlieSharedCalendarId)}/events/${encodeURIComponent(createdEventId)}`,
    );
    assert.equal(openFromNotification.statusCode, 200);
    assert.equal(
        openFromNotification.body.data.calendar.id,
        charlieSharedCalendarId,
    );
    assert.equal(openFromNotification.body.data.event.id, createdEventId);
});

test("shared-calendar responses update the original event without creating a copy", async () => {
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const bobToken = issueAccessToken("bob", "admin", 60);
    const dispatchJson = await bootstrapCalendarTest({
        claimsByToken: new Map([
            [aliceToken, { sub: "alice", role: "admin" }],
            [bobToken, { sub: "bob", role: "admin" }],
        ]),
    });

    const aliceCalendars = await dispatchJson(
        "GET",
        aliceToken,
        "/api/v1/calendar/calendars",
    );
    const ownerCalendar = aliceCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    );
    const ownerCalendarId = ownerCalendar.id;

    const shareWithBob = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users`,
        {
            recipientAccountId: "bob",
            recipientHandle: "bob",
            recipientDisplayName: "Bob",
        },
    );
    const bobSharedCalendarId = String(shareWithBob.body.data.calendarId ?? "");
    assert.ok(bobSharedCalendarId);

    const createdEvent = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/events`,
        {
            title: "Shared standup",
            startAt: "2026-06-21T09:00:00.000Z",
            endAt: "2026-06-21T09:30:00.000Z",
            attendees: ["bob"],
        },
    );
    assert.equal(createdEvent.statusCode, 201);
    const createdEventId = String(createdEvent.body.data.id ?? "");
    assert.ok(createdEventId);

    const bobCalendars = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    const bobDefaultCalendarId = bobCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    ).id;

    const respondFromSharedCalendar = await dispatchJson(
        "POST",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(bobSharedCalendarId)}/events/${encodeURIComponent(createdEventId)}/respond`,
        {
            response: "accepted",
        },
    );
    assert.equal(respondFromSharedCalendar.statusCode, 200);
    assert.equal(respondFromSharedCalendar.body.data.response, "accepted");
    assert.equal(respondFromSharedCalendar.body.data.movedTo, undefined);

    const bobDefaultEvents = await dispatchJson(
        "GET",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(bobDefaultCalendarId)}/events`,
    );
    assert.equal(bobDefaultEvents.statusCode, 200);
    assert.equal(bobDefaultEvents.body.data.events.length, 0);

    const bobSharedEvent = await dispatchJson(
        "GET",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(bobSharedCalendarId)}/events/${encodeURIComponent(createdEventId)}`,
    );
    assert.equal(bobSharedEvent.statusCode, 200);
    assert.equal(bobSharedEvent.body.data.event.responses.bob, "accepted");
    assert.equal(bobSharedEvent.body.data.calendar.visibility, "shared");

    const bobInvitations = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/invitations",
    );
    assert.equal(bobInvitations.statusCode, 200);
    assert.equal(bobInvitations.body.data.length, 0);
});

test("declining a shared-calendar event removes the decliner from the attendee list", async () => {
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const bobToken = issueAccessToken("bob", "admin", 60);
    const dispatchJson = await bootstrapCalendarTest({
        claimsByToken: new Map([
            [aliceToken, { sub: "alice", role: "admin" }],
            [bobToken, { sub: "bob", role: "admin" }],
        ]),
    });

    const aliceCalendars = await dispatchJson(
        "GET",
        aliceToken,
        "/api/v1/calendar/calendars",
    );
    const ownerCalendar = aliceCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    );
    const ownerCalendarId = ownerCalendar.id;

    const shareWithBob = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users`,
        {
            recipientAccountId: "bob",
            recipientHandle: "bob",
            recipientDisplayName: "Bob",
        },
    );
    const bobSharedCalendarId = String(shareWithBob.body.data.calendarId ?? "");
    assert.ok(bobSharedCalendarId);

    const createdEvent = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/events`,
        {
            title: "Declined meeting",
            startAt: "2026-07-01T10:00:00.000Z",
            endAt: "2026-07-01T10:30:00.000Z",
            attendees: ["bob"],
        },
    );
    assert.equal(createdEvent.statusCode, 201);
    const createdEventId = String(createdEvent.body.data.id ?? "");
    assert.ok(createdEventId);

    const declineResponse = await dispatchJson(
        "POST",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(bobSharedCalendarId)}/events/${encodeURIComponent(createdEventId)}/respond`,
        { response: "declined" },
    );
    assert.equal(declineResponse.statusCode, 200);
    assert.equal(declineResponse.body.data.response, "declined");

    const eventAfterDecline = await dispatchJson(
        "GET",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/events/${encodeURIComponent(createdEventId)}`,
    );
    assert.equal(eventAfterDecline.statusCode, 200);
    assert.ok(!eventAfterDecline.body.data.event.attendees.includes("bob"));
});

test("recurring invite dispatches one internal notification per recipient", async () => {
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const bobToken = issueAccessToken("bob", "admin", 60);
    const dispatched: Array<{
        recipientUsername: string;
        subject: string;
        actionUrl?: string;
        senderName?: string;
    }> = [];
    const dispatchJson = await bootstrapCalendarTest({
        claimsByToken: new Map([
            [aliceToken, { sub: "alice", role: "admin" }],
            [bobToken, { sub: "bob", role: "admin" }],
        ]),
        dispatchNotification: async (envelope) => {
            dispatched.push(envelope);
            return { dispatched: [envelope.recipientUsername] };
        },
    });

    const aliceCalendars = await dispatchJson(
        "GET",
        aliceToken,
        "/api/v1/calendar/calendars",
    );
    const ownerCalendar = aliceCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    );
    const ownerCalendarId = ownerCalendar.id;

    const createRecurringEvent = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/events`,
        {
            title: "Recurring sync",
            startAt: "2026-07-01T09:00:00.000Z",
            endAt: "2026-07-01T10:00:00.000Z",
            attendees: ["bob"],
            recurrence: "weekly",
        },
    );
    assert.equal(createRecurringEvent.statusCode, 201);

    const inviteNotifications = dispatched.filter(
        (entry) =>
            entry.recipientUsername === "bob" &&
            entry.subject === "alice invited you to Recurring sync",
    );
    assert.equal(inviteNotifications.length, 1);
});

test("sharing a calendar with a user dispatches a calendar notification", async () => {
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const bobToken = issueAccessToken("bob", "admin", 60);
    const dispatched: Array<{
        recipientUsername: string;
        subject: string;
        actionUrl?: string;
        senderName?: string;
    }> = [];
    const dispatchJson = await bootstrapCalendarTest({
        claimsByToken: new Map([
            [aliceToken, { sub: "alice", role: "admin" }],
            [bobToken, { sub: "bob", role: "admin" }],
        ]),
        dispatchNotification: async (envelope) => {
            dispatched.push(envelope);
            return { dispatched: [envelope.recipientUsername] };
        },
    });

    const aliceCalendars = await dispatchJson(
        "GET",
        aliceToken,
        "/api/v1/calendar/calendars",
    );
    const ownerCalendar = aliceCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    );
    const ownerCalendarId = ownerCalendar.id;

    const shareResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users`,
        {
            recipientAccountId: "bob",
            recipientHandle: "bob",
            recipientDisplayName: "Bob",
        },
    );
    assert.equal(shareResponse.statusCode, 200);
    const recipientCalendarId = String(
        shareResponse.body.data.calendarId ?? "",
    );
    assert.ok(recipientCalendarId);

    const shareNotification = dispatched.find(
        (entry) =>
            entry.recipientUsername === "bob" &&
            entry.subject === `Calendar shared: ${ownerCalendar.name}`,
    );
    assert.ok(shareNotification);
    assert.equal(
        shareNotification.actionUrl,
        `/calendar?calendarId=${encodeURIComponent(recipientCalendarId)}`,
    );
});
