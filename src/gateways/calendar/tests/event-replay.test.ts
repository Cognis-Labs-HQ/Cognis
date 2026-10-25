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

test("calendar invitations endpoint returns pending invited events for attendee", async () => {
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
    let cancellationDispatchCount = 0;
    capabilities.contribute("auth:routeContext", authContext);
    capabilities.contribute("notify:dispatch", async () => {
        cancellationDispatchCount += 1;
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
    const defaultAliceCalendarId = aliceCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    ).id;

    const createEventResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/events`,
        {
            operationId: "188361e1-b10c-452b-82e4-6ac65d36cba1",
            title: "Planning",
            startAt: "2027-06-02T09:00:00.000Z",
            endAt: "2027-06-02T10:00:00.000Z",
            attendees: ["bob"],
            reminderOffsetsMinutes: [10, 60],
        },
    );
    assert.equal(createEventResponse.statusCode, 201);
    assert.deepEqual(
        createEventResponse.body.data.reminderOffsetsMinutes,
        [10, 60],
    );
    const sourceEventId = createEventResponse.body.data.id;
    const dispatches = cancellationDispatchCount;
    const retried = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/events`,
        {
            operationId: "188361e1-b10c-452b-82e4-6ac65d36cba1",
            title: "Planning",
            startAt: "2027-06-02T09:00:00.000Z",
            endAt: "2027-06-02T10:00:00.000Z",
            attendees: ["bob"],
            reminderOffsetsMinutes: [10, 60],
        },
    );
    assert.equal(retried.statusCode, 201);
    assert.equal(retried.body.replayed, true);
    assert.equal(retried.body.data.id, sourceEventId);
    assert.equal(cancellationDispatchCount, dispatches);

    // Bob should see the invitation via the invitations API
    const bobInvitationsResponse = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/invitations",
    );
    assert.equal(bobInvitationsResponse.statusCode, 200);
    assert.ok(Array.isArray(bobInvitationsResponse.body.data));
    assert.equal(bobInvitationsResponse.body.data.length, 1);
    assert.equal(bobInvitationsResponse.body.data[0].id, sourceEventId);
    assert.deepEqual(
        bobInvitationsResponse.body.data[0].reminderOffsetsMinutes,
        [10, 60],
    );

    // Bob should NOT have an "Invited" calendar any more
    const bobCalendars = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    assert.ok(
        !bobCalendars.body.data.some(
            (calendar: { name: string }) => calendar.name === "Invited",
        ),
    );

    // After organizer deletes the event, cancellation notifications fire
    const dispatchCountBeforeOrganizerDelete = cancellationDispatchCount;
    const organizerDeleteResponse = await dispatchJson(
        "DELETE",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/events/${encodeURIComponent(sourceEventId)}`,
    );
    assert.equal(organizerDeleteResponse.statusCode, 200);
    assert.ok(cancellationDispatchCount > dispatchCountBeforeOrganizerDelete);
});
