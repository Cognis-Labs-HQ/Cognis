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

test("shared-write recipient can edit and delete events they created", async () => {
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
            permission: "write",
        },
    );
    assert.equal(shareUserResponse.statusCode, 200);
    const shareId = String(shareUserResponse.body.data.id ?? "");
    assert.ok(shareId);
    const elevateShareResponse = await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(ownerCalendarId)}/share/users/${encodeURIComponent(shareId)}`,
        { permission: "write" },
    );
    assert.equal(elevateShareResponse.statusCode, 200);
    const sharedCalendarId = String(
        shareUserResponse.body.data.calendarId ?? "",
    );
    assert.ok(sharedCalendarId);
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
