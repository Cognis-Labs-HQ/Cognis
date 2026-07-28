import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { GatewayRegistry, CapabilityStore, createCtx } from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import {
    createAuthContext,
    createJsonDispatcher,
    dispatchRoute,
    RequestRecorder,
    ResponseRecorder,
} from "../../../api/tests/reuse/route-test-helpers.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { bootstrap } from "../bootstrap.js";

test("calendar shared write access appears in recipient list and supports event creation", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const bobToken = issueAccessToken("bob", "admin", 60);
    const authContext = createAuthContext(
        new Map([
            [aliceToken, { sub: "alice", role: "admin" }],
            [bobToken, { sub: "bob", role: "admin" }],
        ]),
    );
    capabilities.contribute("auth:routeContext", authContext);

    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        flow: createCtx().flow,
    } as any);

    const dispatchJson = createJsonDispatcher(routeRegistry);
    const aliceCalendars = await dispatchJson(
        "GET",
        aliceToken,
        "/api/v1/calendar/calendars",
    );
    const defaultAliceCalendarId = aliceCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    ).id;
    const ownerEventResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/events`,
        {
            title: "Owner shared event",
            startAt: "2026-06-14T09:00:00.000Z",
            endAt: "2026-06-14T09:30:00.000Z",
        },
    );
    assert.equal(ownerEventResponse.statusCode, 201);
    const ownerEventId = String(ownerEventResponse.body.data.id ?? "");
    assert.ok(ownerEventId);

    const shareUserResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users`,
        {
            recipientAccountId: "bob",
            recipientHandle: "bob",
            recipientDisplayName: "Bob",
        },
    );
    assert.equal(shareUserResponse.statusCode, 200);
    assert.equal(shareUserResponse.body.data.permission, "read");
    const sharedCalendarId = String(
        shareUserResponse.body.data.calendarId ?? "",
    );
    assert.ok(sharedCalendarId);
    const shareId = String(shareUserResponse.body.data.id ?? "");
    const elevateShareResponse = await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users/${encodeURIComponent(shareId)}`,
        { permission: "write" },
    );
    assert.equal(elevateShareResponse.statusCode, 200);
    assert.equal(elevateShareResponse.body.data.permission, "write");
    const elevateByAccountResponse = await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users/${encodeURIComponent("bob")}`,
        { permission: "write" },
    );
    assert.equal(elevateByAccountResponse.statusCode, 200);
    assert.equal(elevateByAccountResponse.body.data.permission, "write");
    const elevateByDisplayPermissionResponse = await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users/${encodeURIComponent(shareId)}`,
        { permission: "Read & Write" },
    );
    assert.equal(elevateByDisplayPermissionResponse.statusCode, 200);
    assert.equal(
        elevateByDisplayPermissionResponse.body.data.permission,
        "write",
    );

    const ownerEventAfterShare = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/events`,
        {
            title: "Owner event without recipient invite",
            startAt: "2026-06-14T10:00:00.000Z",
            endAt: "2026-06-14T10:30:00.000Z",
        },
    );
    assert.equal(ownerEventAfterShare.statusCode, 201);
    assert.deepEqual(ownerEventAfterShare.body.data.attendees, ["alice"]);

    const bobCalendars = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    const sharedCalendar = bobCalendars.body.data.find(
        (calendar: { id: string }) => calendar.id === sharedCalendarId,
    );
    assert.ok(sharedCalendar);
    assert.equal(sharedCalendar.visibility, "shared");
    const sharedEvents = await dispatchJson(
        "GET",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}/events`,
    );
    assert.equal(sharedEvents.statusCode, 200);
    const ownerSharedEvent = sharedEvents.body.data.events.find(
        (event: { id?: string }) => String(event.id ?? "") === ownerEventId,
    );
    assert.ok(ownerSharedEvent);
    assert.equal(ownerSharedEvent.calendarId, sharedCalendarId);
    const ownerSharedEventDetail = await dispatchJson(
        "GET",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerSharedEvent.calendarId)}/events/${encodeURIComponent(ownerEventId)}`,
    );
    assert.equal(ownerSharedEventDetail.statusCode, 200);
    assert.equal(ownerSharedEventDetail.body.data.event.id, ownerEventId);

    const createViaShared = await dispatchJson(
        "POST",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}/events`,
        {
            title: "Shared event",
            startAt: "2026-06-15T09:00:00.000Z",
            endAt: "2026-06-15T09:30:00.000Z",
        },
    );
    assert.equal(createViaShared.statusCode, 201);

    const ownerEvents = await dispatchJson(
        "GET",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/events`,
    );
    assert.ok(
        ownerEvents.body.data.events.some(
            (event: { title?: string }) => event.title === "Shared event",
        ),
    );
});

test("calendar invite dispatch resolves notify capability after bootstrap", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const authContext = createAuthContext(
        new Map([[aliceToken, { sub: "alice", role: "admin" }]]),
    );
    capabilities.contribute("auth:routeContext", authContext);

    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        flow: createCtx().flow,
    } as any);

    const dispatched: Array<{
        recipientUsername: string;
        subject: string;
        senderName: string;
    }> = [];
    capabilities.contribute("notify:dispatch", async (envelope: any) => {
        dispatched.push({
            recipientUsername: String(envelope.recipientUsername ?? ""),
            subject: String(envelope.subject ?? ""),
            senderName: String(envelope.senderName ?? ""),
        });
        return { dispatched: ["internal"] };
    });

    const calendarsRequest = new RequestRecorder({
        method: "GET",
        token: aliceToken,
    });
    const calendarsResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        calendarsRequest,
        calendarsResponse,
        new URL("http://localhost/api/v1/calendar/calendars"),
    );
    const defaultCalendarId = JSON.parse(calendarsResponse.payload).data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    ).id;

    const createRequest = new RequestRecorder({
        method: "POST",
        token: aliceToken,
        body: JSON.stringify({
            title: "Planning",
            startAt: "2026-06-02T09:00:00.000Z",
            endAt: "2026-06-02T10:00:00.000Z",
            attendees: ["bob"],
        }),
    });
    const createResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        createRequest,
        createResponse,
        new URL(
            `http://localhost/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/events`,
        ),
    );
    assert.equal(createResponse.statusCode, 201);
    assert.deepEqual(dispatched, [
        {
            recipientUsername: "bob",
            subject: "alice invited you to Planning",
            senderName: "alice",
        },
    ]);
});

test("calendar reminders are scheduled instead of dispatched immediately", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const authContext = createAuthContext(
        new Map([[aliceToken, { sub: "alice", role: "admin" }]]),
    );
    capabilities.contribute("auth:routeContext", authContext);

    const dispatchedSubjects: string[] = [];
    capabilities.contribute("notify:dispatch", async (envelope: any) => {
        dispatchedSubjects.push(String(envelope.subject ?? ""));
        return { dispatched: ["internal"] };
    });

    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        flow: createCtx().flow,
    } as any);

    const dispatchJson = createJsonDispatcher(routeRegistry);
    const calendars = await dispatchJson(
        "GET",
        aliceToken,
        "/api/v1/calendar/calendars",
    );
    const defaultCalendarId = calendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    ).id;

    const updateCalendarResponse = await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}`,
        { defaultReminderOffsetsMinutes: [10] },
    );
    assert.equal(updateCalendarResponse.statusCode, 200);

    const eventUsingDefaultReminders = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/events`,
        {
            title: "Default reminder event",
            startAt: "2026-06-02T09:00:00.000Z",
            endAt: "2026-06-02T10:00:00.000Z",
            attendees: ["alice"],
        },
    );
    assert.equal(eventUsingDefaultReminders.statusCode, 201);
    assert.deepEqual(
        eventUsingDefaultReminders.body.data.reminderOffsetsMinutes,
        [10],
    );

    const eventWithExplicitReminders = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/events`,
        {
            title: "Explicit reminder event",
            startAt: "2026-06-03T09:00:00.000Z",
            endAt: "2026-06-03T10:00:00.000Z",
            attendees: ["alice"],
            reminderOffsetsMinutes: [5, 30],
        },
    );
    assert.equal(eventWithExplicitReminders.statusCode, 201);
    assert.deepEqual(
        eventWithExplicitReminders.body.data.reminderOffsetsMinutes,
        [5, 30],
    );

    const reminderSubjects = dispatchedSubjects.filter((subject) =>
        subject.startsWith("Calendar reminder: "),
    );
    assert.equal(reminderSubjects.length, 0);
});

test("calendar accept response via invitations API saves copy into chosen calendar and returns movedTo", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const bobToken = issueAccessToken("bob", "admin", 60);
    const authContext = createAuthContext(
        new Map([
            [aliceToken, { sub: "alice", role: "admin" }],
            [bobToken, { sub: "bob", role: "admin" }],
        ]),
    );
    capabilities.contribute("auth:routeContext", authContext);
    capabilities.contribute("social:profileStore", {
        async getProfile(accountId: string) {
            if (accountId !== "bob") return null;
            return { displayName: "Bob Builder", handle: "bob" };
        },
        async searchProfiles() {
            return [];
        },
        async isFollowing() {
            return false;
        },
    });
    const dispatched: Array<{
        recipientUsername: string;
        subject: string;
        body: string;
        senderName: string;
    }> = [];
    capabilities.contribute("notify:dispatch", async (envelope: any) => {
        dispatched.push({
            recipientUsername: String(envelope.recipientUsername ?? ""),
            subject: String(envelope.subject ?? ""),
            body: String(envelope.body ?? ""),
            senderName: String(envelope.senderName ?? ""),
        });
        return { dispatched: ["internal"] };
    });

    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        flow: createCtx().flow,
    } as any);

    const dispatchJson = createJsonDispatcher(routeRegistry);

    const aliceCalendars = await dispatchJson(
        "GET",
        aliceToken,
        "/api/v1/calendar/calendars",
    );
    const aliceCalendarId = aliceCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    ).id;
    const createEventResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(aliceCalendarId)}/events`,
        {
            title: "Planning",
            startAt: "2027-06-02T09:00:00.000Z",
            endAt: "2027-06-02T10:00:00.000Z",
            attendees: ["bob"],
        },
    );
    assert.equal(createEventResponse.statusCode, 201);
    const sourceEventId = createEventResponse.body.data.id;

    const bobCalendars = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    const bobDefaultCalendarId = bobCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    ).id;

    // Bob sees the invitation via the invitations API
    const bobInvitations = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/invitations",
    );
    assert.equal(bobInvitations.statusCode, 200);
    assert.equal(bobInvitations.body.data.length, 1);
    assert.equal(bobInvitations.body.data[0].id, sourceEventId);

    // Bob responds (accepted) using the original calendarId and eventId
    const respondResponse = await dispatchJson(
        "POST",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(aliceCalendarId)}/events/${encodeURIComponent(sourceEventId)}/respond`,
        {
            response: "accepted",
            targetCalendarId: bobDefaultCalendarId,
        },
    );
    assert.equal(respondResponse.statusCode, 200);
    assert.ok(respondResponse.body.data.movedTo?.calendarId);
    assert.ok(respondResponse.body.data.movedTo?.eventId);

    const movedCalendarId = respondResponse.body.data.movedTo.calendarId;
    const movedEventId = respondResponse.body.data.movedTo.eventId;
    assert.equal(movedCalendarId, bobDefaultCalendarId);

    // Bob's default calendar now has a copy
    const bobDefaultEvents = await dispatchJson(
        "GET",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(bobDefaultCalendarId)}/events`,
    );
    assert.equal(bobDefaultEvents.body.data.events.length, 1);
    assert.equal(bobDefaultEvents.body.data.events[0].id, movedEventId);
    assert.equal(
        bobDefaultEvents.body.data.events[0].responses.bob,
        "accepted",
    );
    assert.equal(
        bobDefaultEvents.body.data.events[0].sourceEventId,
        sourceEventId,
    );

    // Invitation no longer appears in pending invitations after accepting
    const bobInvitationsAfter = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/invitations",
    );
    assert.equal(bobInvitationsAfter.body.data.length, 0);

    assert.ok(
        dispatched.some(
            (entry) =>
                entry.recipientUsername === "alice" &&
                entry.subject === "Event invite accepted" &&
                entry.body ===
                    "Bob Builder has accepted the invite to Planning." &&
                entry.senderName === "Bob Builder",
        ),
    );
});

test("calendar recurring invitation acceptance copies all occurrences into target calendar", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const bobToken = issueAccessToken("bob", "admin", 60);
    const authContext = createAuthContext(
        new Map([
            [aliceToken, { sub: "alice", role: "admin" }],
            [bobToken, { sub: "bob", role: "admin" }],
        ]),
    );
    capabilities.contribute("auth:routeContext", authContext);

    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        flow: createCtx().flow,
    } as any);

    const dispatchJson = createJsonDispatcher(routeRegistry);

    const aliceCalendars = await dispatchJson(
        "GET",
        aliceToken,
        "/api/v1/calendar/calendars",
    );
    const aliceCalendarId = aliceCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    ).id;
    const createEventResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(aliceCalendarId)}/events`,
        {
            title: "Series planning",
            startAt: "2026-06-02T09:00:00.000Z",
            endAt: "2026-06-02T10:00:00.000Z",
            attendees: ["bob"],
            recurrence: "weekly",
        },
    );
    assert.equal(createEventResponse.statusCode, 201);
    const sourceEventId = String(createEventResponse.body.data.id ?? "");
    assert.ok(sourceEventId);
    const recurrenceId = String(
        createEventResponse.body.data.recurrenceId ?? "",
    );
    assert.ok(recurrenceId);

    const aliceEventsResponse = await dispatchJson(
        "GET",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(aliceCalendarId)}/events`,
    );
    assert.equal(aliceEventsResponse.statusCode, 200);
    const sourceSeries = aliceEventsResponse.body.data.events.filter(
        (event: { recurrenceId?: string | null }) =>
            event.recurrenceId === recurrenceId,
    );
    assert.ok(sourceSeries.length > 1);

    const bobCalendars = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    const bobDefaultCalendarId = bobCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    ).id;

    const respondResponse = await dispatchJson(
        "POST",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(aliceCalendarId)}/events/${encodeURIComponent(sourceEventId)}/respond?series=1`,
        {
            response: "accepted",
            targetCalendarId: bobDefaultCalendarId,
        },
    );
    assert.equal(respondResponse.statusCode, 200);
    assert.equal(
        String(respondResponse.body.data.movedTo?.calendarId ?? ""),
        bobDefaultCalendarId,
    );

    const bobEventsResponse = await dispatchJson(
        "GET",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(bobDefaultCalendarId)}/events`,
    );
    assert.equal(bobEventsResponse.statusCode, 200);
    const copiedSeries = bobEventsResponse.body.data.events.filter(
        (event: { recurrenceId?: string | null }) =>
            event.recurrenceId === recurrenceId,
    );
    assert.equal(copiedSeries.length, sourceSeries.length);
    assert.ok(
        copiedSeries.every(
            (event: { sourceEventId?: string | null }) =>
                typeof event.sourceEventId === "string" &&
                event.sourceEventId.length > 0,
        ),
    );
});
