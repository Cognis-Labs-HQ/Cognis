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
        this.headers = {
            ...(options.token
                ? { authorization: "Bearer " + options.token }
                : {}),
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
        flow: createCtx().flow,
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

test("calendar calendars metadata resolves meetings availability via ctx capability", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const adminToken = issueAccessToken("calendar-admin", "admin", 60);
    const authContext = createAuthContext(
        new Map([[adminToken, { sub: "calendar-admin", role: "admin" }]]),
    );
    const systemCtx = createCtx();
    systemCtx.contributePublicCapability(
        "meetings:isProviderAvailable",
        (providerId: string) => providerId === "jitsi-meet",
    );
    capabilities.contribute("system:ctx", systemCtx);
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
    const calendarsResponse = await dispatchJson(
        "GET",
        adminToken,
        "/api/v1/calendar/calendars",
    );

    assert.equal(calendarsResponse.statusCode, 200);
    assert.equal(calendarsResponse.body.meta.jitsiAvailable, true);
});

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
            title: "Planning",
            startAt: "2026-06-02T09:00:00.000Z",
            endAt: "2026-06-02T10:00:00.000Z",
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

test("calendar share endpoint returns ICS and CalDAV links", async () => {
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
        flow: createCtx().flow,
    } as any);

    const dispatchJson = (
        method: string,
        pathname: string,
        body?: Record<string, unknown>,
    ) =>
        createJsonDispatcher(routeRegistry)(method, adminToken, pathname, body);

    const calendarsResponse = await dispatchJson(
        "GET",
        "/api/v1/calendar/calendars",
    );
    const defaultCalendar = calendarsResponse.body.data.find(
        (calendar: { isDefault?: boolean }) => calendar.isDefault === true,
    );
    assert.ok(defaultCalendar);
    const defaultCalendarId = defaultCalendar.id;
    const defaultCalendarName = defaultCalendar.name;

    const shareResponse = await dispatchJson(
        "POST",
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/share`,
        { permission: "read", expiresInHours: null },
    );
    assert.equal(shareResponse.statusCode, 200);
    assert.match(
        shareResponse.body.data.caldavUrl,
        /^\/api\/v1\/calendar\/caldav\/private\/[^/]+$/,
    );
    assert.match(
        shareResponse.body.data.icsUrl,
        /^\/api\/v1\/calendar\/ics\/private\/[^/]+$/,
    );
    assert.equal(
        shareResponse.body.data.shareUrl,
        shareResponse.body.data.caldavUrl,
    );

    const privateCaldavPath = shareResponse.body.data.caldavUrl;
    const privateIcsPath = shareResponse.body.data.icsUrl;
    const unauthenticatedRequest = new RequestRecorder({ method: "GET" });
    const unauthenticatedResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        unauthenticatedRequest,
        unauthenticatedResponse,
        new URL(`http://localhost${privateCaldavPath}`),
    );
    assert.equal(unauthenticatedResponse.statusCode, 401);

    const unauthenticatedIcsRequest = new RequestRecorder({ method: "GET" });
    const unauthenticatedIcsResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        unauthenticatedIcsRequest,
        unauthenticatedIcsResponse,
        new URL(`http://localhost${privateIcsPath}`),
    );
    assert.equal(unauthenticatedIcsResponse.statusCode, 401);

    const unauthenticatedPrivateCaldavProbeRequest = new RequestRecorder({
        method: "PROPFIND",
    });
    const unauthenticatedPrivateCaldavProbeResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        unauthenticatedPrivateCaldavProbeRequest,
        unauthenticatedPrivateCaldavProbeResponse,
        new URL(`http://localhost${privateCaldavPath}`),
    );
    assert.equal(unauthenticatedPrivateCaldavProbeResponse.statusCode, 401);

    const makePublicResponse = await dispatchJson(
        "PATCH",
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}`,
        { visibility: "public" },
    );
    assert.equal(makePublicResponse.statusCode, 200);
    assert.equal(makePublicResponse.body.data.visibility, "public");

    const publicShareResponse = await dispatchJson(
        "POST",
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/share`,
        { permission: "read", expiresInHours: null },
    );
    assert.equal(publicShareResponse.statusCode, 200);
    assert.match(
        publicShareResponse.body.data.caldavUrl,
        new RegExp(
            "^/api/v1/calendar/caldav/public/" +
                encodeURIComponent(defaultCalendarName).replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&",
                ) +
                "\\?calendarId=" +
                encodeURIComponent(defaultCalendarId).replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&",
                ) +
                "$",
        ),
    );
    assert.match(
        publicShareResponse.body.data.icsUrl,
        new RegExp(
            "^/api/v1/calendar/ics/public/" +
                encodeURIComponent(defaultCalendarName).replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&",
                ) +
                "\\?calendarId=" +
                encodeURIComponent(defaultCalendarId).replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&",
                ) +
                "$",
        ),
    );

    const publicCaldavRequest = new RequestRecorder({
        method: "GET",
        token: adminToken,
    });
    const publicCaldavResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        publicCaldavRequest,
        publicCaldavResponse,
        new URL(`http://localhost${publicShareResponse.body.data.caldavUrl}`),
    );
    assert.equal(publicCaldavResponse.statusCode, 200);
    assert.equal(
        publicCaldavResponse.headers["x-cognis-calendar-name"],
        defaultCalendarName,
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
            subject: "Calendar invite: Planning",
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
    const dispatched: Array<{ recipientUsername: string; subject: string }> =
        [];
    capabilities.contribute("notify:dispatch", async (envelope: any) => {
        dispatched.push({
            recipientUsername: String(envelope.recipientUsername ?? ""),
            subject: String(envelope.subject ?? ""),
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
                entry.subject === "Calendar response: Planning",
        ),
    );
});
