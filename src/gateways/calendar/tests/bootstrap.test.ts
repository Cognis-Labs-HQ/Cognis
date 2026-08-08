import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { GatewayRegistry, CapabilityStore, createCtx } from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import {
    createAuthContext,
    createJsonDispatcher,
    dispatchRoute,
    RequestRecorder,
    ResponseRecorder,
} from "../../../api/tests/reuse/route-test-helpers.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { VolatileUserPreferenceStore } from "../../../api/reuse/preference-store.js";
import { bootstrap } from "../bootstrap.js";

test("calendar bootstrap registers gateway, routes, and ui hooks", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const systemCtx = createCtx();
    const adminToken = issueAccessToken("calendar-admin", "admin", 60);
    const recipientToken = issueAccessToken("calendar-recipient", "user", 60);
    const authContext = createAuthContext(
        new Map([
            [adminToken, { sub: "calendar-admin", role: "admin" }],
            [recipientToken, { sub: "calendar-recipient", role: "user" }],
        ]),
    );
    capabilities.contribute("auth:routeContext", authContext);
    capabilities.contribute("system:ctx", systemCtx);

    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        flow: systemCtx.flow,
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
    const createCalendarResponse = await createJsonDispatcher(routeRegistry)(
        "POST",
        adminToken,
        "/api/v1/calendar/calendars",
        {
            name: "Live Team Calendar",
            visibility: "private",
        },
    );
    assert.equal(createCalendarResponse.statusCode, 201);
    const deliverLifecycleShare = capabilities.get<
        (delivery: {
            shareId: string;
            resourceType: string;
            resourceId: string;
            ownerAccountId: string;
            recipientAccountId: string;
            grantedCapabilities: string[];
            expiresAt: string;
        }) => Promise<{
            navigationUrl?: string;
            feedback?: { messageKey?: string } | null;
        } | null>
    >("share:deliverUserShare:calendar");
    const shareId = "central-share-token";
    const expiry = new Date(Date.now() + 3_600_000).toISOString();
    await deliverLifecycleShare?.({
        shareId,
        resourceType: "calendar",
        resourceId: createCalendarResponse.body.data.id,
        ownerAccountId: "calendar-admin",
        recipientAccountId: "calendar-recipient",
        grantedCapabilities: ["calendar:read", "calendar:write"],
        expiresAt: expiry,
    });
    systemCtx.flow.extend(
        "update-share-token",
        "update-token",
        { id: "test:update-calendar-share" },
        () => ({
            updated: true,
            updatedToken: {
                id: shareId,
                resourceType: "calendar",
                accessControls: {
                    recipients: [{ type: "user", id: "calendar-recipient" }],
                },
                grantedCapabilities: ["calendar:read"],
                expiresAt: expiry,
            },
        }),
    );
    await systemCtx.flow.run("update-share-token", {});
    const recipientCalendarsAfterDowngrade = await createJsonDispatcher(
        routeRegistry,
    )("GET", recipientToken, "/api/v1/calendar/calendars");
    assert.equal(
        recipientCalendarsAfterDowngrade.body.data.find(
            (calendar: { visibility?: string }) =>
                calendar.visibility === "shared",
        )?.sharedPermission,
        "read",
    );
    systemCtx.removeFlowStageHook(
        "update-share-token",
        "update-token",
        "test:update-calendar-share",
    );
    systemCtx.flow.extend(
        "update-share-token",
        "update-token",
        { id: "test:remove-calendar-recipient" },
        () => ({
            updated: true,
            updatedToken: {
                id: shareId,
                resourceType: "calendar",
                accessControls: { recipients: [] },
                grantedCapabilities: ["calendar:read"],
                expiresAt: expiry,
            },
        }),
    );
    await systemCtx.flow.run("update-share-token", {});
    const recipientCalendarsAfterRemoval = await createJsonDispatcher(
        routeRegistry,
    )("GET", recipientToken, "/api/v1/calendar/calendars");
    assert.equal(
        recipientCalendarsAfterRemoval.body.data.some(
            (calendar: { visibility?: string }) =>
                calendar.visibility === "shared",
        ),
        false,
    );
    const resolveVariants = capabilities.get<
        (input: {
            resourceType: string;
            resourceId: string;
            token: string;
            shareUrl: string;
            grantedCapabilities: string[];
            metadata: Record<string, string>;
        }) => Array<{ id: string; url: string; access?: string }>
    >("share:resolveVariants");
    const variants = resolveVariants?.({
        resourceType: "calendar",
        resourceId: createCalendarResponse.body.data.id,
        token: "protected-token",
        shareUrl: "/share/protected-token",
        grantedCapabilities: ["calendar:read"],
        metadata: { resourceName: "Stale Calendar Name" },
    });
    const caldavVariant = variants?.find((variant) => variant.id === "caldav");
    const icsVariant = variants?.find((variant) => variant.id === "ics");
    assert.match(caldavVariant?.url ?? "", /\/Live%20Team%20Calendar\/$/);
    assert.match(icsVariant?.url ?? "", /\/Live%20Team%20Calendar\.ics$/);
    assert.doesNotMatch(caldavVariant?.url ?? "", /passphrase=/);
    assert.equal(caldavVariant?.access, "read");

    const deliverUserShare = capabilities.get<
        (delivery: {
            shareId: string;
            resourceType: string;
            resourceId: string;
            ownerAccountId: string;
            recipientAccountId: string;
            grantedCapabilities: string[];
            expiresAt: string;
        }) => Promise<{ navigationUrl?: string } | null>
    >("share:deliverUserShare:calendar");
    const delivery = {
        shareId: "calendar-share-1",
        resourceType: "calendar",
        resourceId: createCalendarResponse.body.data.id,
        ownerAccountId: "calendar-admin",
        recipientAccountId: "calendar-recipient",
        grantedCapabilities: ["calendar:read"],
        expiresAt: "",
    };
    const delivered = await deliverUserShare?.(delivery);
    assert.match(delivered?.navigationUrl ?? "", /^\/calendar\?calendarId=/);
    assert.equal(
        delivered?.feedback?.messageKey,
        "gateway.calendar.share_import_success",
    );
    const deliveredCalendarId = new URL(
        delivered?.navigationUrl ?? "",
        "http://localhost",
    ).searchParams.get("calendarId");
    const recipientCalendars = await createJsonDispatcher(routeRegistry)(
        "GET",
        recipientToken,
        "/api/v1/calendar/calendars",
    );
    const deliveredCalendar = recipientCalendars.body.data.find(
        (calendar: { id?: string }) => calendar.id === deliveredCalendarId,
    );
    assert.equal(deliveredCalendar.sharedPermission, "read");
    const updatedDelivery = await deliverUserShare?.({
        ...delivery,
        grantedCapabilities: ["calendar:read", "calendar:write"],
    });
    assert.equal(updatedDelivery?.feedback, null);
    const updatedRecipientCalendars = await createJsonDispatcher(routeRegistry)(
        "GET",
        recipientToken,
        "/api/v1/calendar/calendars",
    );
    assert.equal(
        updatedRecipientCalendars.body.data.find(
            (calendar: { id?: string }) => calendar.id === deliveredCalendarId,
        ).sharedPermission,
        "write",
    );
    await deliverUserShare?.({
        ...delivery,
        expiresAt: new Date(Date.now() + 20).toISOString(),
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const calendarsAfterExpiry = await createJsonDispatcher(routeRegistry)(
        "GET",
        recipientToken,
        "/api/v1/calendar/calendars",
    );
    assert.equal(
        calendarsAfterExpiry.body.data.some(
            (calendar: { id?: string }) => calendar.id === deliveredCalendarId,
        ),
        false,
    );
    const writeAfterExpiry = await createJsonDispatcher(routeRegistry)(
        "POST",
        recipientToken,
        `/api/v1/calendar/calendars/${encodeURIComponent(deliveredCalendarId ?? "")}/events`,
        {
            title: "Too late",
            startAt: "2030-01-01T10:00:00.000Z",
            endAt: "2030-01-01T11:00:00.000Z",
        },
    );
    assert.equal(writeAfterExpiry.statusCode, 404);
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
    capabilities.contribute("social:getAvailabilityStatuses", () => [
        "free",
        "busy",
        "tentative",
    ]);

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
    assert.deepEqual(calendarsResponse.body.meta.availabilityStatuses, [
        "free",
        "busy",
        "tentative",
    ]);
});

test("current events drive availability unless the user prevents updates", async () => {
    const capabilities = new CapabilityStore();
    const preferences = new VolatileUserPreferenceStore();
    capabilities.contribute("preferences:store", preferences);
    await bootstrap({
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry: new RouteRegistry(),
        gatewayRegistry: new GatewayRegistry(),
        capabilities,
        uiRegistry: new UIRegistry(),
        flow: createCtx().flow,
    } as any);

    const createCalendar = capabilities.get<
        (accountId: string, name: string) => { id: string }
    >("calendar:createCalendar");
    const addEvent =
        capabilities.get<
            (input: {
                ownerAccountId: string;
                calendarId: string;
                title: string;
                startAt: string;
                endAt: string;
                status: "busy";
            }) => unknown
        >("calendar:addEvent");
    const getCurrentAvailability = capabilities.get<
        (accountId: string) => Promise<{ status: string } | null>
    >("calendar:getCurrentAvailability");
    assert.ok(createCalendar);
    assert.ok(addEvent);
    assert.ok(getCurrentAvailability);
    const calendarId = createCalendar("alice", "Primary").id;
    const now = Date.now();
    addEvent({
        ownerAccountId: "alice",
        calendarId,
        title: "Current focus",
        startAt: new Date(now - 60_000).toISOString(),
        endAt: new Date(now + 60_000).toISOString(),
        status: "busy",
    });
    assert.equal((await getCurrentAvailability("alice"))?.status, "busy");

    await preferences.set("alice", "calendar-prevent-status-updates", "true");
    assert.equal(await getCurrentAvailability("alice"), null);
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
            startAt: "2027-06-02T09:00:00.000Z",
            endAt: "2027-06-02T10:00:00.000Z",
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

test("calendar share endpoint returns multiple expiring ICS and CalDAV links", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const adminToken = issueAccessToken("calendar-admin", "admin", 60);
    const authContext = createAuthContext(
        new Map([[adminToken, { sub: "calendar-admin", role: "admin" }]]),
    );
    capabilities.contribute("auth:routeContext", authContext);
    let centralCalendarId = "";
    capabilities.contribute("share:resolveToken", ((
        token: string,
        password?: string | null,
    ) =>
        token === "user-share-token" && password === "share-secret"
            ? Promise.resolve({
                  resourceType: "calendar",
                  resourceId: centralCalendarId,
                  grantedCapabilities: ["calendar:read", "calendar:write"],
                  accessControls: {
                      recipients: [{ type: "user", id: "calendar-admin" }],
                  },
              })
            : Promise.resolve(null)) as never);
    capabilities.contribute("share:inspectToken", ((token: string) =>
        Promise.resolve(
            token === "user-share-token" ? { resourceType: "calendar" } : null,
        )) as never);

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
    centralCalendarId = defaultCalendarId;

    const writableShareBase = `/api/v1/calendar/caldav/share/user-share-token/${encodeURIComponent(defaultCalendarName)}/`;
    const writableSharePath = `${writableShareBase}?passphrase=share-secret`;
    const protectedProbeRequest = new RequestRecorder({
        method: "PROPFIND",
    });
    const protectedProbeResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        protectedProbeRequest,
        protectedProbeResponse,
        new URL(`http://localhost${writableShareBase}`),
    );
    assert.equal(protectedProbeResponse.statusCode, 401);
    assert.equal(
        protectedProbeResponse.headers["www-authenticate"],
        'Basic realm="Calendar Share"',
    );
    const writablePropfindRequest = new RequestRecorder({
        method: "PROPFIND",
        token: adminToken,
    });
    const writablePropfindResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        writablePropfindRequest,
        writablePropfindResponse,
        new URL(`http://localhost${writableSharePath}`),
    );
    assert.equal(writablePropfindResponse.statusCode, 207);
    assert.match(
        writablePropfindResponse.payload,
        new RegExp(`<d:displayname>${defaultCalendarName}</d:displayname>`),
    );
    assert.match(writablePropfindResponse.payload, /<d:write\/>/);
    assert.match(
        writablePropfindResponse.payload,
        new RegExp(
            `user-share-token/${encodeURIComponent(defaultCalendarName)}/\\?passphrase=share-secret`,
        ),
    );

    const writablePutRequest = new RequestRecorder({
        method: "PUT",
        token: adminToken,
        body: [
            "BEGIN:VCALENDAR",
            "BEGIN:VEVENT",
            "UID:client-event",
            "SUMMARY:Client Event",
            "DTSTART:20270602T110000Z",
            "DTEND:20270602T120000Z",
            "END:VEVENT",
            "END:VCALENDAR",
        ].join("\r\n"),
    });
    const writablePutResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        writablePutRequest,
        writablePutResponse,
        new URL(
            `http://localhost${writableShareBase}client-event.ics?passphrase=share-secret`,
        ),
    );
    assert.equal(writablePutResponse.statusCode, 201);
    assert.match(writablePutResponse.headers.location, /\.ics$/);

    const writableGetRequest = new RequestRecorder({
        method: "GET",
        token: adminToken,
    });
    const writableGetResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        writableGetRequest,
        writableGetResponse,
        new URL(`http://localhost${writableSharePath}`),
    );
    assert.equal(writableGetResponse.statusCode, 200);
    assert.match(
        writableGetResponse.payload,
        new RegExp(`X-WR-CALNAME:${defaultCalendarName}`),
    );
    assert.match(
        writableGetResponse.payload,
        /X-CALENDARSERVER-ACCESS:READ-WRITE/,
    );

    const writableReportRequest = new RequestRecorder({
        method: "REPORT",
        token: adminToken,
    });
    const writableReportResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        writableReportRequest,
        writableReportResponse,
        new URL(`http://localhost${writableSharePath}`),
    );
    assert.equal(writableReportResponse.statusCode, 207);
    assert.match(writableReportResponse.payload, /<c:calendar-data>/);
    assert.match(writableReportResponse.payload, /Client Event/);

    const savedEventPath = writablePutResponse.headers.location;
    const writableDeleteRequest = new RequestRecorder({
        method: "DELETE",
        token: adminToken,
    });
    const writableDeleteResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        writableDeleteRequest,
        writableDeleteResponse,
        new URL(`http://localhost${savedEventPath}?passphrase=share-secret`),
    );
    assert.equal(writableDeleteResponse.statusCode, 204);

    const initialShareResponse = await dispatchJson(
        "GET",
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/share`,
    );
    assert.equal(initialShareResponse.statusCode, 200);
    assert.deepEqual(initialShareResponse.body.data, []);

    const shareResponse = await dispatchJson(
        "POST",
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/share`,
        { name: "Kitchen Tablet", expiresInHours: 24 },
    );
    assert.equal(shareResponse.statusCode, 200);
    assert.equal(shareResponse.body.data.length, 1);
    assert.match(
        shareResponse.body.data[0].caldavUrl,
        new RegExp(
            `/api/v1/calendar/caldav/share/[^/]+/${encodeURIComponent(defaultCalendarName)}/$`,
        ),
    );
    assert.match(
        shareResponse.body.data[0].icsUrl,
        new RegExp(
            `/api/v1/calendar/ics/share/[^/]+/${encodeURIComponent(defaultCalendarName)}\\.ics$`,
        ),
    );
    assert.equal(
        shareResponse.body.data[0].shareUrl,
        shareResponse.body.data[0].caldavUrl,
    );
    assert.equal(shareResponse.body.data[0].name, "Kitchen Tablet");
    assert.equal(typeof shareResponse.body.data[0].passphrase, "string");
    assert.ok(shareResponse.body.data[0].passphrase.length >= 20);
    assert.match(
        shareResponse.body.data[0].passphrase,
        /^[a-z0-9_-]{4}(?:-[a-z0-9_-]{4}){4}$/,
    );
    assert.ok(Date.parse(shareResponse.body.data[0].expiresAt) > Date.now());

    const repeatedShareResponse = await dispatchJson(
        "POST",
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/share`,
        { name: "Office Laptop", expiresInHours: null },
    );
    assert.equal(repeatedShareResponse.statusCode, 200);
    assert.equal(repeatedShareResponse.body.data.length, 2);
    assert.notEqual(
        repeatedShareResponse.body.data[0].caldavUrl,
        repeatedShareResponse.body.data[1].caldavUrl,
    );
    assert.equal(repeatedShareResponse.body.data[0].name, "Office Laptop");
    assert.equal(repeatedShareResponse.body.data[0].expiresAt, "");
    const unnamedShareResponse = await dispatchJson(
        "POST",
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/share`,
        { name: "   ", expiresInHours: 1 },
    );
    assert.equal(unnamedShareResponse.statusCode, 200);
    assert.match(unnamedShareResponse.body.data[0].name, /^[a-z0-9_-]{8}$/);
    const getShareResponse = await dispatchJson(
        "GET",
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/share`,
    );
    assert.equal(getShareResponse.statusCode, 200);
    assert.equal(getShareResponse.body.data.length, 3);

    const privateCaldavPath = shareResponse.body.data[0].caldavUrl;
    const privateIcsPath = shareResponse.body.data[0].icsUrl;
    const privatePassphrase = shareResponse.body.data[0].passphrase;
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

    const privateCaldavRequest = new RequestRecorder({
        method: "GET",
        headers: {
            "x-cognis-calendar-passphrase": privatePassphrase,
        },
    });
    const privateCaldavResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        privateCaldavRequest,
        privateCaldavResponse,
        new URL(`http://localhost${privateCaldavPath}`),
    );
    assert.equal(privateCaldavResponse.statusCode, 200);
    assert.equal(
        privateCaldavResponse.headers["x-cognis-calendar-access"],
        "read",
    );
    assert.equal(
        privateCaldavResponse.headers["x-cognis-calendar-read-only"],
        "true",
    );

    const privateCaldavPropfindRequest = new RequestRecorder({
        method: "PROPFIND",
        headers: {
            "x-cognis-calendar-passphrase": privatePassphrase,
        },
    });
    const privateCaldavPropfindResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        privateCaldavPropfindRequest,
        privateCaldavPropfindResponse,
        new URL(`http://localhost${privateCaldavPath}`),
    );
    assert.equal(privateCaldavPropfindResponse.statusCode, 207);
    assert.match(privateCaldavPropfindResponse.payload, /<d:read\/>/);
    assert.doesNotMatch(privateCaldavPropfindResponse.payload, /<d:write\/>/);
    assert.match(
        privateCaldavPropfindResponse.payload,
        /<c:supported-calendar-component-set><c:comp name="VEVENT"\/><\/c:supported-calendar-component-set>/,
    );

    const privateCaldavMutationRequest = new RequestRecorder({
        method: "POST",
        headers: {
            "x-cognis-calendar-passphrase": privatePassphrase,
        },
    });
    const privateCaldavMutationResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        privateCaldavMutationRequest,
        privateCaldavMutationResponse,
        new URL(`http://localhost${privateCaldavPath}`),
    );
    assert.equal(privateCaldavMutationResponse.statusCode, 403);
    assert.match(privateCaldavMutationResponse.payload, /<d:need-privileges>/);

    const privateIcsRequest = new RequestRecorder({
        method: "GET",
        headers: {
            authorization:
                "Basic " +
                Buffer.from(`calendar:${privatePassphrase}`).toString("base64"),
        },
    });
    const privateIcsResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        privateIcsRequest,
        privateIcsResponse,
        new URL(`http://localhost${privateIcsPath}`),
    );
    assert.equal(privateIcsResponse.statusCode, 200);
    assert.equal(
        privateIcsResponse.headers["x-cognis-calendar-access"],
        "read",
    );

    const privateIcsPropfindRequest = new RequestRecorder({
        method: "PROPFIND",
        headers: {
            authorization:
                "Basic " +
                Buffer.from(`calendar:${privatePassphrase}`).toString("base64"),
        },
    });
    const privateIcsPropfindResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        privateIcsPropfindRequest,
        privateIcsPropfindResponse,
        new URL(`http://localhost${privateIcsPath}`),
    );
    assert.equal(privateIcsPropfindResponse.statusCode, 207);
    assert.match(privateIcsPropfindResponse.payload, /<d:read\/>/);
    assert.doesNotMatch(privateIcsPropfindResponse.payload, /<d:write\/>/);

    const privateIcsMutationRequest = new RequestRecorder({
        method: "PUT",
        headers: privateIcsRequest.headers,
    });
    const privateIcsMutationResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        privateIcsMutationRequest,
        privateIcsMutationResponse,
        new URL(`http://localhost${privateIcsPath}`),
    );
    assert.equal(privateIcsMutationResponse.statusCode, 403);
    assert.match(privateIcsMutationResponse.payload, /<d:need-privileges>/);

    const expiringShareResponse = await dispatchJson(
        "POST",
        `/api/v1/calendar/calendars/${encodeURIComponent(defaultCalendarId)}/share`,
        { name: "Short Lived", expiresInHours: 1 / 3600 },
    );
    assert.equal(expiringShareResponse.statusCode, 200);
    const expiringShare = expiringShareResponse.body.data.find(
        (shareLink: { name?: string }) => shareLink.name === "Short Lived",
    );
    assert.ok(expiringShare);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const expiredCaldavRequest = new RequestRecorder({
        method: "GET",
        headers: {
            "x-cognis-calendar-passphrase": expiringShare.passphrase,
        },
    });
    const expiredCaldavResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        expiredCaldavRequest,
        expiredCaldavResponse,
        new URL(`http://localhost${expiringShare.caldavUrl}`),
    );
    assert.equal(expiredCaldavResponse.statusCode, 404);

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
        { name: "Website Feed", expiresInHours: 24 },
    );
    assert.equal(publicShareResponse.statusCode, 200);
    const publicShare = publicShareResponse.body.data.find(
        (shareLink: { name?: string }) => shareLink.name === "Website Feed",
    );
    assert.ok(publicShare);
    assert.match(
        publicShare.caldavUrl,
        new RegExp(
            `/api/v1/calendar/caldav/share/[^/]+/${encodeURIComponent(defaultCalendarName)}/$`,
        ),
    );
    assert.match(
        publicShare.icsUrl,
        new RegExp(
            `/api/v1/calendar/ics/share/[^/]+/${encodeURIComponent(defaultCalendarName)}\\.ics$`,
        ),
    );
    assert.equal(publicShare.passphrase, null);

    const publicCaldavRequest = new RequestRecorder({
        method: "GET",
    });
    const publicCaldavResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        publicCaldavRequest,
        publicCaldavResponse,
        new URL(`http://localhost${publicShare.caldavUrl}`),
    );
    assert.equal(publicCaldavResponse.statusCode, 200);
    assert.equal(
        publicCaldavResponse.headers["x-cognis-calendar-name"],
        defaultCalendarName,
    );
    assert.equal(
        publicCaldavResponse.headers["x-cognis-calendar-id"],
        defaultCalendarId,
    );
    assert.match(
        String(publicCaldavResponse.headers["content-disposition"] ?? ""),
        /attachment;\s*filename=/,
    );
    assert.match(
        String(
            publicCaldavResponse.headers["access-control-expose-headers"] ?? "",
        ),
        /x-cognis-calendar-name/i,
    );
});
