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

    constructor(options: {
        method: string;
        token?: string;
        body?: string;
        headers?: Record<string, string>;
    }) {
        this.method = options.method;
        this.body = options.body ?? "";
        this.headers = {
            ...(options.token
                ? { authorization: "Bearer " + options.token }
                : {}),
            ...(options.headers ?? {}),
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
