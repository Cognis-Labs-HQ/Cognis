import assert from "node:assert/strict";
import test from "node:test";
import {
    dispatchRoute,
    RequestRecorder,
    ResponseRecorder,
} from "../../../api/tests/reuse/route-test-helpers.js";
import { createGatewayHost } from "../../reuse/gateway-host.js";
import { bootstrap as bootstrapShare } from "../../../gateways/share/bootstrap.js";
import { bootstrap as bootstrapCalendar } from "../../../gateways/calendar/bootstrap.js";

async function host(testContext, { password } = {}) {
    const { root, capabilities, routes, dispatch } = await createGatewayHost(
        testContext,
        [
            ["share", bootstrapShare],
            ["calendar", bootstrapCalendar],
        ],
    );
    const calendar = await dispatch(
        "POST",
        "owner-token",
        "/api/v1/calendar/calendars",
        { name: "Source Calendar", visibility: "private" },
    );
    assert.equal(calendar.statusCode, 201);
    const ownerId = calendar.body.data.id;
    const event = await dispatch(
        "POST",
        "owner-token",
        `/api/v1/calendar/calendars/${ownerId}/events`,
        {
            title: "Private Event",
            startAt: "2026-12-01T10:00:00.000Z",
            endAt: "2026-12-01T11:00:00.000Z",
        },
    );
    assert.equal(event.statusCode, 201);
    const token = await capabilities.require("share:mintToken")({
        ownerAccountId: "owner",
        resourceType: "calendar",
        resourceId: ownerId,
        metadata: { adapterId: "user" },
        accessControls: { recipients: [{ type: "user", id: "recipient" }] },
        grantedCapabilities: ["calendar:read", "calendar:write"],
        expiresAt: "",
        password,
    });
    await capabilities.require("calendar:reconcileUserShares")("recipient");
    const received = await dispatch(
        "GET",
        "recipient-token",
        "/api/v1/calendar/calendars",
    );
    const delivered = received.body.data.find(
        (calendarEntry) => calendarEntry.visibility === "shared",
    );
    assert.ok(delivered);
    const raw = async (method, pathname, headers = {}, body) => {
        const response = new ResponseRecorder();
        await dispatchRoute(
            routes,
            new RequestRecorder({
                method,
                token: "recipient-token",
                headers,
                body: body ? JSON.stringify(body) : undefined,
            }),
            response,
            new URL(pathname, "http://localhost"),
        );
        return response;
    };
    return {
        root,
        capabilities,
        dispatch,
        raw,
        token,
        delivered,
        ownerId,
        eventId: event.body.data.id,
    };
}

test("clearing real Share grants removes delivered Calendar access and cannot recreate it on refresh", async (testContext) => {
    const shareHost = await host(testContext);
    const eventPath = `/api/v1/calendar/calendars/${shareHost.delivered.id}/events/${shareHost.eventId}`;
    assert.equal(
        (await shareHost.dispatch("GET", "recipient-token", eventPath))
            .statusCode,
        200,
    );
    const update = await shareHost.dispatch(
        "PATCH",
        "owner-token",
        `/api/v1/share/tokens/${shareHost.token.id}`,
        { grantedCapabilities: [] },
    );
    assert.equal(update.statusCode, 200);
    assert.ok(
        (await shareHost.dispatch("GET", "recipient-token", eventPath))
            .statusCode >= 400,
    );
    await shareHost.capabilities.require("calendar:reconcileUserShares")(
        "recipient",
    );
    const calendars = await shareHost.dispatch(
        "GET",
        "recipient-token",
        "/api/v1/calendar/calendars",
    );
    assert.equal(
        calendars.body.data.some(
            (calendar) => calendar.visibility === "shared",
        ),
        false,
    );
    assert.equal(
        (
            await shareHost.dispatch(
                "GET",
                "owner-token",
                `/api/v1/calendar/calendars/${shareHost.ownerId}/events/${shareHost.eventId}`,
            )
        ).statusCode,
        200,
    );
});

test("Calendar reads reauthorize Share grants even when delivery reconciliation has not completed", async (testContext) => {
    const shareHost = await host(testContext);
    // Delay only the Calendar projection; authorization must use the current Share grant.
    shareHost.root.removeFlowStageHook(
        "update-share-token",
        "reconcile-deliveries",
        "calendar-gateway:reconcile-share-deliveries",
    );
    const update = await shareHost.dispatch(
        "PATCH",
        "owner-token",
        `/api/v1/share/tokens/${shareHost.token.id}`,
        { grantedCapabilities: [] },
    );
    assert.equal(update.statusCode, 200);
    const denied = await shareHost.dispatch(
        "GET",
        "recipient-token",
        `/api/v1/calendar/calendars/${shareHost.delivered.id}/events/${shareHost.eventId}`,
    );
    assert.equal(denied.statusCode, 403);
});

test("protected Calendar delivery still requires its password and loses access when its grants are cleared", async (testContext) => {
    const shareHost = await host(testContext, { password: "fixture-password" });
    const eventPath = `/api/v1/calendar/calendars/${shareHost.delivered.id}/events/${shareHost.eventId}`;
    assert.equal((await shareHost.raw("GET", eventPath)).statusCode, 401);
    assert.equal(
        (
            await shareHost.raw("GET", eventPath, {
                "x-cognis-share-password": "fixture-password",
            })
        ).statusCode,
        200,
    );
    assert.equal((await shareHost.raw("GET", eventPath)).statusCode, 200);
    const result = await shareHost.dispatch(
        "PATCH",
        "owner-token",
        `/api/v1/share/tokens/${shareHost.token.id}`,
        { grantedCapabilities: [] },
    );
    assert.equal(result.statusCode, 200);
    assert.ok(
        (
            await shareHost.raw("GET", eventPath, {
                "x-cognis-share-password": "fixture-password",
            })
        ).statusCode >= 400,
    );
});

test("a stale delivered write permission cannot override a current read-only Share grant", async (testContext) => {
    const shareHost = await host(testContext);
    shareHost.root.removeFlowStageHook(
        "update-share-token",
        "reconcile-deliveries",
        "calendar-gateway:reconcile-share-deliveries",
    );
    assert.equal(
        (
            await shareHost.dispatch(
                "PATCH",
                "owner-token",
                `/api/v1/share/tokens/${shareHost.token.id}`,
                { grantedCapabilities: ["calendar:read"] },
            )
        ).statusCode,
        200,
    );
    const eventPath = `/api/v1/calendar/calendars/${shareHost.delivered.id}/events/${shareHost.eventId}`;
    assert.equal((await shareHost.raw("GET", eventPath)).statusCode, 200);
    assert.equal(
        (
            await shareHost.raw(
                "PATCH",
                eventPath,
                {},
                { title: "Unauthorized change" },
            )
        ).statusCode,
        403,
    );
    assert.equal((await shareHost.raw("DELETE", eventPath)).statusCode, 403);
    assert.equal(
        (
            await shareHost.raw(
                "POST",
                `/api/v1/calendar/calendars/${shareHost.delivered.id}/events`,
                {},
                {
                    title: "Unauthorized creation",
                    startAt: "2026-12-02T10:00:00.000Z",
                    endAt: "2026-12-02T11:00:00.000Z",
                },
            )
        ).statusCode,
        403,
    );
});

test("Calendar exports reject revoked Share grants through both real adapters", async (testContext) => {
    const shareHost = await host(testContext);
    const record = await shareHost.capabilities.require("share:getTokenById")(
        shareHost.token.id,
    );
    const paths = [
        `/api/v1/calendar/ics/share/${record.tokenValue}/Source.ics`,
        `/api/v1/calendar/caldav/share/${record.tokenValue}/Source`,
    ];
    for (const path of paths) {
        const result = await shareHost.raw("GET", path);
        assert.equal(result.statusCode, 200);
        assert.match(result.payload, /Private Event/);
    }
    assert.equal(
        (
            await shareHost.dispatch(
                "PATCH",
                "owner-token",
                `/api/v1/share/tokens/${shareHost.token.id}`,
                { grantedCapabilities: [] },
            )
        ).statusCode,
        200,
    );
    for (const path of paths) {
        const result = await shareHost.raw("GET", path);
        assert.equal(result.statusCode, 401);
        assert.doesNotMatch(result.payload, /Private Event/);
    }
});

test("revoked Calendar delivery is recreated only after an explicit read grant is restored", async (testContext) => {
    const shareHost = await host(testContext);
    const tokenPath = `/api/v1/share/tokens/${shareHost.token.id}`;
    for (const grants of [[], ["unrelated:read"], ["calendar:write"]]) {
        assert.equal(
            (
                await shareHost.dispatch("PATCH", "owner-token", tokenPath, {
                    grantedCapabilities: grants,
                })
            ).statusCode,
            200,
        );
        await shareHost.capabilities.require("calendar:reconcileUserShares")(
            "recipient",
        );
        const received = await shareHost.dispatch(
            "GET",
            "recipient-token",
            "/api/v1/calendar/calendars",
        );
        assert.equal(
            received.body.data.some(
                (calendar) => calendar.visibility === "shared",
            ),
            false,
        );
    }
    assert.equal(
        (
            await shareHost.dispatch("PATCH", "owner-token", tokenPath, {
                grantedCapabilities: ["calendar:read"],
            })
        ).statusCode,
        200,
    );
    await shareHost.capabilities.require("calendar:reconcileUserShares")(
        "recipient",
    );
    const received = await shareHost.dispatch(
        "GET",
        "recipient-token",
        "/api/v1/calendar/calendars",
    );
    const restored = received.body.data.find(
        (calendar) => calendar.visibility === "shared",
    );
    assert.ok(restored);
    assert.equal(
        (
            await shareHost.raw(
                "GET",
                `/api/v1/calendar/calendars/${restored.id}/events/${shareHost.eventId}`,
            )
        ).statusCode,
        200,
    );
});

test("retained Calendar delivery cannot outlive its authoritative Share expiry", async (testContext) => {
    const shareHost = await host(testContext);
    const now = Date.now();
    testContext.mock.timers.enable({ apis: ["Date"], now });
    assert.equal(
        (
            await shareHost.dispatch(
                "PATCH",
                "owner-token",
                `/api/v1/share/tokens/${shareHost.token.id}`,
                { expiresAt: new Date(now + 60_000).toISOString() },
            )
        ).statusCode,
        200,
    );
    const eventPath = `/api/v1/calendar/calendars/${shareHost.delivered.id}/events/${shareHost.eventId}`;
    assert.equal((await shareHost.raw("GET", eventPath)).statusCode, 200);
    testContext.mock.timers.tick(60_001);
    assert.equal((await shareHost.raw("GET", eventPath)).statusCode, 410);
});
