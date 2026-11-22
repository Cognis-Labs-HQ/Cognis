import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import {
    CapabilityStore,
    createCtx,
    GatewayRegistry,
    runBootstrapScope,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import {
    createAuthContext,
    createJsonDispatcher,
    dispatchRoute,
    RequestRecorder,
    ResponseRecorder,
} from "../../../api/tests/reuse/route-test-helpers.js";
import { bootstrap as bootstrapShare } from "../../../gateways/share/bootstrap.js";
import { bootstrap as bootstrapCalendar } from "../../../gateways/calendar/bootstrap.js";
import { MemoryDatabase } from "../../reuse/memory-database.js";

async function host(t, { password } = {}) {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    const routes = new RouteRegistry();
    const context = {
        capabilities,
        flow: root.flow,
        routeRegistry: routes,
        gatewayRegistry: new GatewayRegistry(),
        uiRegistry: new UIRegistry(),
        adaptersRoot: path.resolve("src/adapters"),
    };
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("db:executor", new MemoryDatabase());
    capabilities.contribute(
        "auth:routeContext",
        createAuthContext(
            new Map([
                ["owner-token", { sub: "owner", role: "admin" }],
                ["recipient-token", { sub: "recipient", role: "user" }],
            ]),
        ),
    );
    const disposers = [];
    t.after(async () => {
        for (const dispose of disposers.reverse()) await dispose();
    });
    await runBootstrapScope(
        root,
        "gateway:share",
        () => bootstrapShare(context),
        (dispose) => disposers.push(dispose),
    );
    await runBootstrapScope(
        root,
        "gateway:calendar",
        () => bootstrapCalendar(context),
        (dispose) => disposers.push(dispose),
    );
    const dispatch = createJsonDispatcher(routes);
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
    const delivered = received.body.data.find((c) => c.visibility === "shared");
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

test("clearing real Share grants removes delivered Calendar access and cannot recreate it on refresh", async (t) => {
    const h = await host(t);
    const eventPath = `/api/v1/calendar/calendars/${h.delivered.id}/events/${h.eventId}`;
    assert.equal(
        (await h.dispatch("GET", "recipient-token", eventPath)).statusCode,
        200,
    );
    const update = await h.dispatch(
        "PATCH",
        "owner-token",
        `/api/v1/share/tokens/${h.token.id}`,
        { grantedCapabilities: [] },
    );
    assert.equal(update.statusCode, 200);
    assert.ok(
        (await h.dispatch("GET", "recipient-token", eventPath)).statusCode >=
            400,
    );
    await h.capabilities.require("calendar:reconcileUserShares")("recipient");
    const calendars = await h.dispatch(
        "GET",
        "recipient-token",
        "/api/v1/calendar/calendars",
    );
    assert.equal(
        calendars.body.data.some((c) => c.visibility === "shared"),
        false,
    );
    assert.equal(
        (
            await h.dispatch(
                "GET",
                "owner-token",
                `/api/v1/calendar/calendars/${h.ownerId}/events/${h.eventId}`,
            )
        ).statusCode,
        200,
    );
});

test("Calendar reads reauthorize Share grants even when delivery reconciliation has not completed", async (t) => {
    const h = await host(t);
    // Delay only the Calendar projection; authorization must use the current Share grant.
    h.root.removeFlowStageHook(
        "update-share-token",
        "reconcile-deliveries",
        "calendar-gateway:reconcile-share-deliveries",
    );
    const update = await h.dispatch(
        "PATCH",
        "owner-token",
        `/api/v1/share/tokens/${h.token.id}`,
        { grantedCapabilities: [] },
    );
    assert.equal(update.statusCode, 200);
    const denied = await h.dispatch(
        "GET",
        "recipient-token",
        `/api/v1/calendar/calendars/${h.delivered.id}/events/${h.eventId}`,
    );
    assert.equal(denied.statusCode, 403);
});

test("protected Calendar delivery still requires its password and loses access when its grants are cleared", async (t) => {
    const h = await host(t, { password: "fixture-password" });
    const eventPath = `/api/v1/calendar/calendars/${h.delivered.id}/events/${h.eventId}`;
    assert.equal((await h.raw("GET", eventPath)).statusCode, 401);
    assert.equal(
        (
            await h.raw("GET", eventPath, {
                "x-cognis-share-password": "fixture-password",
            })
        ).statusCode,
        200,
    );
    assert.equal((await h.raw("GET", eventPath)).statusCode, 200);
    const result = await h.dispatch(
        "PATCH",
        "owner-token",
        `/api/v1/share/tokens/${h.token.id}`,
        { grantedCapabilities: [] },
    );
    assert.equal(result.statusCode, 200);
    assert.ok(
        (
            await h.raw("GET", eventPath, {
                "x-cognis-share-password": "fixture-password",
            })
        ).statusCode >= 400,
    );
});

test("a stale delivered write permission cannot override a current read-only Share grant", async (t) => {
    const h = await host(t);
    h.root.removeFlowStageHook(
        "update-share-token",
        "reconcile-deliveries",
        "calendar-gateway:reconcile-share-deliveries",
    );
    assert.equal(
        (
            await h.dispatch(
                "PATCH",
                "owner-token",
                `/api/v1/share/tokens/${h.token.id}`,
                { grantedCapabilities: ["calendar:read"] },
            )
        ).statusCode,
        200,
    );
    const eventPath = `/api/v1/calendar/calendars/${h.delivered.id}/events/${h.eventId}`;
    assert.equal((await h.raw("GET", eventPath)).statusCode, 200);
    assert.equal(
        (await h.raw("PATCH", eventPath, {}, { title: "Unauthorized change" }))
            .statusCode,
        403,
    );
    assert.equal((await h.raw("DELETE", eventPath)).statusCode, 403);
    assert.equal(
        (
            await h.raw(
                "POST",
                `/api/v1/calendar/calendars/${h.delivered.id}/events`,
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

test("Calendar exports reject revoked Share grants through both real adapters", async (t) => {
    const h = await host(t);
    const record = await h.capabilities.require("share:getTokenById")(
        h.token.id,
    );
    const paths = [
        `/api/v1/calendar/ics/share/${record.tokenValue}/Source.ics`,
        `/api/v1/calendar/caldav/share/${record.tokenValue}/Source`,
    ];
    for (const path of paths) {
        const result = await h.raw("GET", path);
        assert.equal(result.statusCode, 200);
        assert.match(result.payload, /Private Event/);
    }
    assert.equal(
        (
            await h.dispatch(
                "PATCH",
                "owner-token",
                `/api/v1/share/tokens/${h.token.id}`,
                { grantedCapabilities: [] },
            )
        ).statusCode,
        200,
    );
    for (const path of paths) {
        const result = await h.raw("GET", path);
        assert.equal(result.statusCode, 401);
        assert.doesNotMatch(result.payload, /Private Event/);
    }
});

test("revoked Calendar delivery is recreated only after an explicit read grant is restored", async (t) => {
    const h = await host(t);
    const tokenPath = `/api/v1/share/tokens/${h.token.id}`;
    for (const grants of [[], ["unrelated:read"], ["calendar:write"]]) {
        assert.equal(
            (
                await h.dispatch("PATCH", "owner-token", tokenPath, {
                    grantedCapabilities: grants,
                })
            ).statusCode,
            200,
        );
        await h.capabilities.require("calendar:reconcileUserShares")(
            "recipient",
        );
        const received = await h.dispatch(
            "GET",
            "recipient-token",
            "/api/v1/calendar/calendars",
        );
        assert.equal(
            received.body.data.some((c) => c.visibility === "shared"),
            false,
        );
    }
    assert.equal(
        (
            await h.dispatch("PATCH", "owner-token", tokenPath, {
                grantedCapabilities: ["calendar:read"],
            })
        ).statusCode,
        200,
    );
    await h.capabilities.require("calendar:reconcileUserShares")("recipient");
    const received = await h.dispatch(
        "GET",
        "recipient-token",
        "/api/v1/calendar/calendars",
    );
    const restored = received.body.data.find((c) => c.visibility === "shared");
    assert.ok(restored);
    assert.equal(
        (
            await h.raw(
                "GET",
                `/api/v1/calendar/calendars/${restored.id}/events/${h.eventId}`,
            )
        ).statusCode,
        200,
    );
});

test("retained Calendar delivery cannot outlive its authoritative Share expiry", async (t) => {
    const h = await host(t);
    const now = Date.now();
    t.mock.timers.enable({ apis: ["Date"], now });
    assert.equal(
        (
            await h.dispatch(
                "PATCH",
                "owner-token",
                `/api/v1/share/tokens/${h.token.id}`,
                { expiresAt: new Date(now + 60_000).toISOString() },
            )
        ).statusCode,
        200,
    );
    const eventPath = `/api/v1/calendar/calendars/${h.delivered.id}/events/${h.eventId}`;
    assert.equal((await h.raw("GET", eventPath)).statusCode, 200);
    t.mock.timers.tick(60_001);
    assert.equal((await h.raw("GET", eventPath)).statusCode, 410);
});
