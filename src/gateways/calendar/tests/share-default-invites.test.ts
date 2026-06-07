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

test("shared calendar events auto-invite all users with calendar visibility", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const bobToken = issueAccessToken("bob", "admin", 60);
    const charlieToken = issueAccessToken("charlie", "admin", 60);
    const danaToken = issueAccessToken("dana", "admin", 60);
    const authContext = createAuthContext(
        new Map([
            [aliceToken, { sub: "alice", role: "admin" }],
            [bobToken, { sub: "bob", role: "admin" }],
            [charlieToken, { sub: "charlie", role: "admin" }],
            [danaToken, { sub: "dana", role: "admin" }],
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
    const ownerCalendarId = aliceCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    ).id;

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
    assert.equal(shareWithBob.statusCode, 200);
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
    assert.equal(shareWithCharlie.statusCode, 200);
    const shareWithDana = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users`,
        {
            recipientAccountId: "dana",
            recipientHandle: "dana",
            recipientDisplayName: "Dana",
        },
    );
    assert.equal(shareWithDana.statusCode, 200);

    const elevateBobResponse = await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users/${encodeURIComponent(String(shareWithBob.body.data.id ?? ""))}`,
        { permission: "write" },
    );
    assert.equal(elevateBobResponse.statusCode, 200);
    const elevateDanaResponse = await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users/${encodeURIComponent(String(shareWithDana.body.data.id ?? ""))}`,
        { permission: "write" },
    );
    assert.equal(elevateDanaResponse.statusCode, 200);

    const bobSharedCalendarId = String(shareWithBob.body.data.calendarId ?? "");
    const charlieSharedCalendarId = String(
        shareWithCharlie.body.data.calendarId ?? "",
    );
    const createViaBob = await dispatchJson(
        "POST",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(bobSharedCalendarId)}/events`,
        {
            title: "Team sync",
            startAt: "2026-06-16T09:00:00.000Z",
            endAt: "2026-06-16T09:30:00.000Z",
        },
    );
    assert.equal(createViaBob.statusCode, 201);
    const createdEventId = String(createViaBob.body.data.id ?? "");
    assert.ok(createdEventId);

    const ownerEvents = await dispatchJson(
        "GET",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/events`,
    );
    const createdOwnerEvent = ownerEvents.body.data.events.find(
        (event: { id?: string }) => String(event.id ?? "") === createdEventId,
    );
    assert.ok(createdOwnerEvent);
    assert.deepEqual(
        [...createdOwnerEvent.attendees].sort(),
        ["alice", "bob", "charlie", "dana"].sort(),
    );

    const charlieSharedEvents = await dispatchJson(
        "GET",
        charlieToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(charlieSharedCalendarId)}/events`,
    );
    assert.equal(charlieSharedEvents.statusCode, 200);
    assert.ok(
        charlieSharedEvents.body.data.events.some(
            (event: { id?: string }) =>
                String(event.id ?? "") === createdEventId,
        ),
    );

    const charlieInvitations = await dispatchJson(
        "GET",
        charlieToken,
        "/api/v1/calendar/invitations",
    );
    assert.equal(charlieInvitations.statusCode, 200);
    assert.ok(
        charlieInvitations.body.data.some(
            (event: { id?: string }) =>
                String(event.id ?? "") === createdEventId,
        ),
    );
});
