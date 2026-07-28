import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { CapabilityStore, createCtx, GatewayRegistry } from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import {
    createAuthContext,
    createJsonDispatcher,
} from "../../../api/tests/reuse/route-test-helpers.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { bootstrap } from "../bootstrap.js";

async function createDispatchJson(claimsByToken: Map<string, any>) {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    capabilities.contribute(
        "auth:routeContext",
        createAuthContext(claimsByToken),
    );
    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        flow: createCtx().flow,
    } as any);
    return createJsonDispatcher(routeRegistry);
}

test("share route returns 404 for missing owned calendar", async () => {
    const adminToken = issueAccessToken("calendar-admin", "admin", 60);
    const dispatchJson = await createDispatchJson(
        new Map([[adminToken, { sub: "calendar-admin", role: "admin" }]]),
    );
    const response = await dispatchJson(
        "GET",
        adminToken,
        `/api/v1/calendar/calendars/${encodeURIComponent("missing-calendar")}/share`,
    );
    assert.equal(response.statusCode, 404);
});

test("shared recipients control local color while writable shares control events", async () => {
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const bobToken = issueAccessToken("bob", "admin", 60);
    const dispatchJson = await createDispatchJson(
        new Map([
            [aliceToken, { sub: "alice", role: "admin" }],
            [bobToken, { sub: "bob", role: "admin" }],
        ]),
    );
    const aliceCalendars = await dispatchJson(
        "GET",
        aliceToken,
        "/api/v1/calendar/calendars",
    );
    const ownerCalendarId = aliceCalendars.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    ).id;
    const shareUserResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users`,
        {
            recipientAccountId: "bob",
            recipientHandle: "bob",
            recipientDisplayName: "Bob",
            permission: "read",
        },
    );
    assert.equal(shareUserResponse.statusCode, 200);
    const shareId = String(shareUserResponse.body.data.id ?? "");
    assert.ok(shareId);
    const sharedCalendarId = String(
        shareUserResponse.body.data.calendarId ?? "",
    );
    assert.ok(sharedCalendarId);
    const updateSharedColor = await dispatchJson(
        "PATCH",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}`,
        { color: "#123456" },
    );
    assert.equal(updateSharedColor.statusCode, 200);
    assert.equal(updateSharedColor.body.data.color, "#123456");
    const renameSharedCalendar = await dispatchJson(
        "PATCH",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}`,
        { name: "Renamed by recipient" },
    );
    assert.equal(renameSharedCalendar.statusCode, 200);
    assert.match(
        renameSharedCalendar.body.data.name,
        /^Renamed by recipient \(Shared by /,
    );
    const deleteSharedCalendar = await dispatchJson(
        "DELETE",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}`,
    );
    assert.equal(deleteSharedCalendar.statusCode, 403);
    const ownerCalendarsAfterColorChange = await dispatchJson(
        "GET",
        aliceToken,
        "/api/v1/calendar/calendars",
    );
    assert.notEqual(
        ownerCalendarsAfterColorChange.body.data.find(
            (calendar: { id: string }) => calendar.id === ownerCalendarId,
        ).color,
        "#123456",
    );
    const elevateShareResponse = await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users/${encodeURIComponent(shareId)}`,
        { permission: "write" },
    );
    assert.equal(elevateShareResponse.statusCode, 200);

    const ownerEvent = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/events`,
        {
            title: "Owner event",
            startAt: "2026-06-14T09:00:00.000Z",
            endAt: "2026-06-14T09:30:00.000Z",
            attendees: ["bob"],
        },
    );
    assert.equal(ownerEvent.statusCode, 201);
    const ownerEventId = String(ownerEvent.body.data.id ?? "");
    const sharedEventDetails = await dispatchJson(
        "GET",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}/events/${encodeURIComponent(ownerEventId)}`,
    );
    assert.equal(sharedEventDetails.body.data.meta.canEdit, true);
    assert.equal(sharedEventDetails.body.data.meta.canRespond, false);
    const respondToSharedEvent = await dispatchJson(
        "POST",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}/events/${encodeURIComponent(ownerEventId)}/respond`,
        { response: "accepted" },
    );
    assert.equal(respondToSharedEvent.statusCode, 403);
    const editSharedParticipants = await dispatchJson(
        "PATCH",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}/events/${encodeURIComponent(ownerEventId)}`,
        { attendees: [] },
    );
    assert.equal(editSharedParticipants.statusCode, 403);
    const editOwnerEvent = await dispatchJson(
        "PATCH",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}/events/${encodeURIComponent(ownerEventId)}`,
        { title: "Owner event updated by recipient" },
    );
    assert.equal(editOwnerEvent.statusCode, 200);
    const deleteOwnerEvent = await dispatchJson(
        "DELETE",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}/events/${encodeURIComponent(ownerEventId)}`,
    );
    assert.equal(deleteOwnerEvent.statusCode, 200);
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
    const sharedEventId = String(createViaShared.body.data.id ?? "");
    assert.ok(sharedEventId);
    const updateViaShared = await dispatchJson(
        "PATCH",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}/events/${encodeURIComponent(sharedEventId)}`,
        {
            title: "Shared event updated",
            startAt: "2026-06-15T09:15:00.000Z",
            endAt: "2026-06-15T09:45:00.000Z",
        },
    );
    assert.equal(updateViaShared.statusCode, 200);
    assert.equal(updateViaShared.body.data.title, "Shared event updated");
    const deleteViaShared = await dispatchJson(
        "DELETE",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(sharedCalendarId)}/events/${encodeURIComponent(sharedEventId)}`,
    );
    assert.equal(deleteViaShared.statusCode, 200);
});
