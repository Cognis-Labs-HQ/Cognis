import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { EventEmitter } from "node:events";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../api/route-registry.js";
import { UIRegistry } from "../../../api/ui-registry.js";
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

    writeHead(code: number) {
        this.statusCode = code;
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

    constructor(options: { method: string; token: string; body?: string }) {
        this.method = options.method;
        this.body = options.body ?? "";
        this.headers = {
            authorization: "Bearer " + options.token,
        };
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

test("calendar bootstrap registers gateway, routes, and ui hooks", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const adminToken = issueAccessToken("calendar-admin", "admin", 60);
    const authContext = createAuthContext(
        new Map([[adminToken, { sub: "calendar-admin", role: "admin" }]]),
    );
    capabilities.contribute("auth:routeContext", authContext);

    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
    } as any);

    const gateway = gatewayRegistry.get("calendar");
    assert.ok(gateway);
    assert.equal(gateway?.id, "calendar");
    assert.equal(gateway?.hasAdapters, true);

    const plugins = uiRegistry.listNavbarPlugins();
    assert.ok(
        plugins.some(
            (plugin) =>
                plugin.scriptUrl === "/static/gateways/calendar/ui/navbar.js",
        ),
    );

    const routes = routeRegistry.getHandlers();
    assert.ok(routes.length > 0);
});

test("calendar event update/delete endpoints forbid editing mirrored invite copies", async () => {
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
    } as any);

    const dispatchJson = async (
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
            title: "Planning",
            startAt: "2026-06-02T09:00:00.000Z",
            endAt: "2026-06-02T10:00:00.000Z",
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
    const invitedCalendarId = bobCalendars.body.data.find(
        (calendar: { name: string }) => calendar.name === "Invited",
    ).id;

    const invitedEventsResponse = await dispatchJson(
        "GET",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(invitedCalendarId)}/events`,
    );
    const mirroredEventId = invitedEventsResponse.body.data.events[0].id;

    const updateResponse = await dispatchJson(
        "PATCH",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(invitedCalendarId)}/events/${encodeURIComponent(mirroredEventId)}`,
        {
            title: "Compromised update",
        },
    );
    assert.equal(updateResponse.statusCode, 403);

    const dispatchCountBeforeDelete = cancellationDispatchCount;
    const deleteResponse = await dispatchJson(
        "DELETE",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(invitedCalendarId)}/events/${encodeURIComponent(mirroredEventId)}`,
    );
    assert.equal(deleteResponse.statusCode, 403);
    assert.equal(cancellationDispatchCount, dispatchCountBeforeDelete);

    const invitedEventsAfter = await dispatchJson(
        "GET",
        bobToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(invitedCalendarId)}/events`,
    );
    assert.equal(invitedEventsAfter.body.data.events.length, 1);

    const dispatchCountBeforeOrganizerDelete = cancellationDispatchCount;
    const organizerDeleteResponse = await dispatchJson(
        "DELETE",
        aliceToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultAliceCalendarId)}/events/${encodeURIComponent(sourceEventId)}`,
    );
    assert.equal(organizerDeleteResponse.statusCode, 200);
    assert.ok(cancellationDispatchCount > dispatchCountBeforeOrganizerDelete);
});

test("calendar share endpoint returns CalDAV links and supports never-expiring private links", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const adminToken = issueAccessToken("calendar-admin", "admin", 60);
    const authContext = createAuthContext(
        new Map([[adminToken, { sub: "calendar-admin", role: "admin" }]]),
    );
    capabilities.contribute("auth:routeContext", authContext);

    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
    } as any);

    const dispatchJson = async (
        method: string,
        pathname: string,
        body?: Record<string, unknown>,
    ) => {
        const request = new RequestRecorder({
            method,
            token: adminToken,
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

    const calendarsResponse = await dispatchJson(
        "GET",
        "/api/v1/calendar/calendars",
    );
    const defaultCalendar = calendarsResponse.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    );
    assert.ok(defaultCalendar);
    const defaultCalendarId = defaultCalendar.id;

    const shareResponse = await dispatchJson(
        "POST",
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/share`,
        { permission: "read", expiresInHours: null },
    );
    assert.equal(shareResponse.statusCode, 200);
    assert.match(
        shareResponse.body.data.shareUrl,
        /^\/api\/v1\/calendar\/caldav\/private\/[^/]+$/,
    );
});
