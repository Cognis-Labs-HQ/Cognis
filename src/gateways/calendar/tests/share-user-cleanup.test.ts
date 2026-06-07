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

test("removing a user share removes the recipient shared calendar", async () => {
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
    const sharedCalendarId = String(
        shareUserResponse.body.data.calendarId ?? "",
    );
    const shareId = String(shareUserResponse.body.data.id ?? "");
    assert.ok(sharedCalendarId);
    assert.ok(shareId);

    const bobCalendars = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    assert.ok(
        bobCalendars.body.data.some(
            (calendar: { id: string }) => calendar.id === sharedCalendarId,
        ),
    );

    const unshareResponse = await dispatchJson(
        "DELETE",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users/${encodeURIComponent(shareId)}`,
    );
    assert.equal(unshareResponse.statusCode, 200);

    const bobCalendarsAfterUnshare = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    assert.ok(
        !bobCalendarsAfterUnshare.body.data.some(
            (calendar: { id: string }) => calendar.id === sharedCalendarId,
        ),
    );
});

test("expired share is removed from recipient calendar list on next refresh", async () => {
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

    const shareResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users`,
        {
            recipientAccountId: "bob",
            recipientHandle: "bob",
            recipientDisplayName: "Bob",
            expiresInHours: 0.00001,
        },
    );
    assert.equal(shareResponse.statusCode, 200);
    const sharedCalendarId = String(shareResponse.body.data.calendarId ?? "");
    assert.ok(sharedCalendarId);

    const bobCalendarsBeforeExpiry = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    assert.ok(
        bobCalendarsBeforeExpiry.body.data.some(
            (calendar: { id: string }) => calendar.id === sharedCalendarId,
        ),
        "shared calendar should appear before expiry",
    );

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const bobCalendarsAfterExpiry = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    assert.ok(
        !bobCalendarsAfterExpiry.body.data.some(
            (calendar: { id: string }) => calendar.id === sharedCalendarId,
        ),
        "expired shared calendar must be absent after refresh",
    );
});

test("shared calendar includes sharedPermission field in calendar list", async () => {
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

    const shareResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users`,
        {
            recipientAccountId: "bob",
            recipientHandle: "bob",
            recipientDisplayName: "Bob",
        },
    );
    assert.equal(shareResponse.statusCode, 200);
    const sharedCalendarId = String(shareResponse.body.data.calendarId ?? "");
    const shareId = String(shareResponse.body.data.id ?? "");

    await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users/${encodeURIComponent(shareId)}`,
        { permission: "write" },
    );

    const bobCalendars = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    const sharedEntry = bobCalendars.body.data.find(
        (calendar: { id: string }) => calendar.id === sharedCalendarId,
    );
    assert.ok(sharedEntry, "shared calendar must appear in list");
    assert.equal(
        sharedEntry.sharedPermission,
        "write",
        "sharedPermission must reflect current permission",
    );
});

test("PATCH share permission updates permission without removing shared calendar", async () => {
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

    const shareResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users`,
        {
            recipientAccountId: "bob",
            recipientHandle: "bob",
            recipientDisplayName: "Bob",
        },
    );
    assert.equal(shareResponse.statusCode, 200);
    const sharedCalendarId = String(shareResponse.body.data.calendarId ?? "");
    const shareId = String(shareResponse.body.data.id ?? "");

    const patchResponse = await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users/${encodeURIComponent(shareId)}`,
        { permission: "write" },
    );
    assert.equal(patchResponse.statusCode, 200);
    assert.equal(patchResponse.body.data.permission, "write");

    const bobCalendarsAfterPatch = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    assert.ok(
        bobCalendarsAfterPatch.body.data.some(
            (calendar: { id: string }) => calendar.id === sharedCalendarId,
        ),
        "shared calendar must still be present after permission update",
    );
});

test("re-adding a user via POST preserves the existing share permission", async () => {
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

    const shareResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users`,
        {
            recipientAccountId: "bob",
            recipientHandle: "bob",
            recipientDisplayName: "Bob",
        },
    );
    assert.equal(shareResponse.statusCode, 200);
    const shareId = String(shareResponse.body.data.id ?? "");

    await dispatchJson(
        "PATCH",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users/${encodeURIComponent(shareId)}`,
        { permission: "write" },
    );

    const reAddResponse = await dispatchJson(
        "POST",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/share/users`,
        {
            recipientAccountId: "bob",
            recipientHandle: "bob",
            recipientDisplayName: "Bob",
        },
    );
    assert.equal(reAddResponse.statusCode, 200);

    const bobCalendars = await dispatchJson(
        "GET",
        bobToken,
        "/api/v1/calendar/calendars",
    );
    const sharedCalendarId = String(reAddResponse.body.data.calendarId ?? "");
    const sharedEntry = bobCalendars.body.data.find(
        (calendar: { id: string }) => calendar.id === sharedCalendarId,
    );
    assert.ok(sharedEntry, "shared calendar must still be visible");
    assert.equal(
        sharedEntry.sharedPermission,
        "write",
        "re-adding via POST must not reset existing write permission",
    );
});
