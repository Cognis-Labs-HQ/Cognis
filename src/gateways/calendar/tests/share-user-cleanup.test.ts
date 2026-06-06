import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { EventEmitter } from "node:events";
import { GatewayRegistry, CapabilityStore, createCtx } from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { bootstrap } from "../bootstrap.js";

function createAuthContext(
    claimsByToken: Map<string, { sub: string; role: string }>,
) {
    return {
        requireAuth(req: { headers?: Record<string, string> }, res: any) {
            const auth = req.headers?.authorization ?? "";
            const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
            const claims = claimsByToken.get(token);
            if (!auth || !auth.startsWith("Bearer ") || !claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unauthorized",
                            message: "Unauthorized",
                        },
                    }),
                );
                return null;
            }
            return claims;
        },
        getCookieSession() {
            const firstClaims = claimsByToken.values().next().value;
            return firstClaims ?? { sub: "calendar-admin", role: "admin" };
        },
        setPageSecurityHeaders() {},
    };
}

class ResponseRecorder extends EventEmitter {
    statusCode = 0;
    payload = "";
    headers: Record<string, string> = {};

    writeHead(code: number, headers?: Record<string, string>) {
        this.statusCode = code;
        this.headers = {
            ...this.headers,
            ...(headers ?? {}),
        };
    }

    end(chunk?: string | Buffer) {
        if (chunk) {
            this.payload += String(chunk);
        }
        this.emit("close");
    }
}

class RequestRecorder {
    method: string;
    headers: Record<string, string>;
    private readonly body: string;

    constructor(options: { method: string; token?: string; body?: string }) {
        this.method = options.method;
        this.body = options.body ?? "";
        this.headers = options.token
            ? { authorization: "Bearer " + options.token }
            : {};
    }

    async *[Symbol.asyncIterator]() {
        if (this.body.length > 0) {
            yield Buffer.from(this.body);
        }
    }
}

async function dispatchRoute(
    routeRegistry: RouteRegistry,
    request: RequestRecorder,
    response: ResponseRecorder,
    url: URL,
) {
    for (const routeEntry of routeRegistry.getEntries()) {
        const handled = await routeEntry.handler(
            request as any,
            response as any,
            url,
        );
        if (handled) return true;
    }
    response.writeHead(404);
    response.end(JSON.stringify({ error: { code: "not_found" } }));
    return false;
}

function createJsonDispatcher(routeRegistry: RouteRegistry) {
    return async (
        method: string,
        token: string,
        pathname: string,
        body?: Record<string, unknown>,
    ) => {
        const request = new RequestRecorder({
            method,
            token,
            body: body ? JSON.stringify(body) : undefined,
        });
        const response = new ResponseRecorder();
        await dispatchRoute(
            routeRegistry,
            request,
            response,
            new URL(`http://localhost${pathname}`),
        );
        return {
            statusCode: response.statusCode,
            body:
                response.payload.length > 0
                    ? JSON.parse(response.payload)
                    : null,
        };
    };
}

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
