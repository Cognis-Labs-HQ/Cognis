import { readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { hasMinRole } from "@cognis/core";
import type { GatewayBootstrapContext } from "../shared.js";
import { readJson } from "../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../api/reuse/route-context.js";
import { buildGatewayAdapterAdminControls } from "../../api/reuse/adapter-admin-controls.js";
import { sanitizeFilenameBase } from "../../api/reuse/sanitize-filename.js";
import { CoreCalendarGateway, type CalendarVisibility } from "./gateway.js";
import { createGatewayUiRegistryHooks } from "../reuse/ui-registry-hooks.js";

const GATEWAY_ROOT = path.dirname(fileURLToPath(import.meta.url));

function normalizeVisibility(value: unknown): CalendarVisibility {
    return value === "public" ? "public" : "private";
}

function normalizeCalendarColor(value: unknown): string {
    const candidate = String(value ?? "").trim();
    return /^#([0-9a-fA-F]{6})$/.test(candidate)
        ? candidate.toLowerCase()
        : "#1f8ceb";
}

function normalizeStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return Array.from(
        new Set(
            value.map((entry) => String(entry ?? "").trim()).filter(Boolean),
        ),
    );
}

function buildIcsAttachmentFilename(eventTitle: string): string {
    return `${sanitizeFilenameBase(eventTitle, "event")}.ics`;
}

function createCalendarCoreRoutes(
    gateway: CoreCalendarGateway,
    dispatchNotification:
        | ((envelope: {
              category: string;
              recipientUsername: string;
              recipientEmail?: string;
              subject: string;
              body: string;
              actionUrl?: string;
              senderName?: string;
              metadata?: Record<string, unknown>;
              attachments?: Array<{
                  filename: string;
                  contentType?: string;
                  content: string;
              }>;
          }) => Promise<{ dispatched: string[] }>)
        | null,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    const externalHost =
        process.env.EXTERNAL_HOST ??
        (process.env.HOST ? `http://${process.env.HOST}` : "");

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/calendar/calendars" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            gateway.ensureDefaultCalendar(claims.sub);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: gateway.listCalendars(claims.sub),
                    meta: {
                        canInviteExternal: hasMinRole(claims.role, "owner"),
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/calendar/calendars" &&
            req.method === "POST"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const body = (await readJson(req)) as {
                name?: unknown;
                visibility?: unknown;
                color?: unknown;
            };
            const name = String(body?.name ?? "").trim();
            if (!name) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "Calendar name is required.",
                        },
                    }),
                );
                return true;
            }
            const created = gateway.createCalendar({
                ownerAccountId: claims.sub,
                name,
                visibility: normalizeVisibility(body?.visibility),
                color: normalizeCalendarColor(body?.color),
            });
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: created }));
            return true;
        }

        const deleteCalendarMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)$/,
        );
        if (deleteCalendarMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(deleteCalendarMatch[1]);
            try {
                gateway.deleteCalendar({
                    ownerAccountId: claims.sub,
                    calendarId,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { deleted: true } }));
                return true;
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "calendar_error";
                if (message === "calendar_not_found") {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Calendar not found.",
                            },
                        }),
                    );
                    return true;
                }
                if (message === "calendar_default_locked") {
                    res.writeHead(409, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "conflict",
                                message: "Default calendar cannot be deleted.",
                            },
                        }),
                    );
                    return true;
                }
                res.writeHead(500, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "internal_error",
                            message: "Failed to delete calendar.",
                        },
                    }),
                );
                return true;
            }
        }

        const eventsMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)\/events$/,
        );
        if (eventsMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventsMatch[1]);
            const calendar = gateway.getOwnedCalendar(claims.sub, calendarId);
            if (!calendar) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Calendar not found.",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        calendar,
                        events: gateway.listEvents(calendarId),
                    },
                }),
            );
            return true;
        }

        if (eventsMatch && req.method === "POST") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventsMatch[1]);
            const body = (await readJson(req)) as {
                title?: unknown;
                description?: unknown;
                startAt?: unknown;
                endAt?: unknown;
                attendees?: unknown;
                inviteEmails?: unknown;
                meetingUrl?: unknown;
            };
            const title = String(body?.title ?? "").trim();
            const startAt = String(body?.startAt ?? "").trim();
            const endAt = String(body?.endAt ?? "").trim();
            const inviteEmails = normalizeStringList(body.inviteEmails);
            const canInviteByEmail = hasMinRole(claims.role, "owner");
            if (!title || !startAt || !endAt) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "title, startAt, and endAt are required.",
                        },
                    }),
                );
                return true;
            }
            if (inviteEmails.length > 0 && !canInviteByEmail) {
                res.writeHead(403, {
                    "content-type": "application/json",
                });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message:
                                "Only founder users can send email invites.",
                        },
                    }),
                );
                return true;
            }
            try {
                const createdEvent = gateway.addEvent({
                    ownerAccountId: claims.sub,
                    calendarId,
                    title,
                    description:
                        typeof body.description === "string"
                            ? body.description
                            : null,
                    startAt,
                    endAt,
                    attendees: normalizeStringList(body.attendees),
                    inviteEmails,
                    meetingUrl:
                        typeof body.meetingUrl === "string"
                            ? body.meetingUrl
                            : null,
                });

                if (dispatchNotification) {
                    const actionUrl = `/calendar?calendarId=${encodeURIComponent(calendarId)}`;
                    await Promise.all(
                        createdEvent.attendees.map((attendee) =>
                            dispatchNotification({
                                category: "calendar",
                                recipientUsername: attendee,
                                subject: `Calendar invite: ${createdEvent.title}`,
                                body: `You were invited to ${createdEvent.title}`,
                                actionUrl,
                                metadata: {
                                    eventId: createdEvent.id,
                                    calendarId,
                                },
                            }).catch(() => ({ dispatched: [] })),
                        ),
                    );
                    if (canInviteByEmail && createdEvent.inviteEmails.length) {
                        const eventIcs =
                            gateway.exportCalendarAsIcs(calendarId);
                        await Promise.all(
                            createdEvent.inviteEmails.map((email) => {
                                const scopedAccessToken =
                                    createdEvent.meetingUrl
                                        ? gateway.issueScopedMeetingAccessToken(
                                              {
                                                  targetUrl:
                                                      createdEvent.meetingUrl,
                                                  createdByAccountId:
                                                      claims.sub,
                                                  eventId: createdEvent.id,
                                              },
                                          )
                                        : null;
                                const meetingAccessUrl = scopedAccessToken
                                    ? `${externalHost}/api/v1/calendar/meeting-access/${encodeURIComponent(scopedAccessToken.token)}`
                                    : null;
                                return dispatchNotification({
                                    category: "calendar",
                                    recipientUsername: email,
                                    recipientEmail: email,
                                    subject: `Calendar invite: ${createdEvent.title}`,
                                    body: `${claims.sub} invited you to ${createdEvent.title}.\n\nStarts: ${createdEvent.startAt}\nEnds: ${createdEvent.endAt}${
                                        createdEvent.description
                                            ? `\nDescription: ${createdEvent.description}`
                                            : ""
                                    }${
                                        meetingAccessUrl
                                            ? `\nMeeting link: ${meetingAccessUrl}`
                                            : ""
                                    }`,
                                    actionUrl: meetingAccessUrl ?? actionUrl,
                                    attachments: [
                                        {
                                            filename:
                                                buildIcsAttachmentFilename(
                                                    createdEvent.title,
                                                ),
                                            contentType:
                                                "text/calendar; charset=UTF-8",
                                            content: eventIcs,
                                        },
                                    ],
                                    metadata: {
                                        eventId: createdEvent.id,
                                        calendarId,
                                    },
                                }).catch(() => ({ dispatched: [] }));
                            }),
                        );
                    }
                }

                res.writeHead(201, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: createdEvent }));
                return true;
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "calendar_error";
                if (message === "calendar_not_found") {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Calendar not found.",
                            },
                        }),
                    );
                    return true;
                }
                if (message === "calendar_invalid_range") {
                    res.writeHead(400, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "bad_request",
                                message:
                                    "Event end time must be after start time.",
                            },
                        }),
                    );
                    return true;
                }
                res.writeHead(500, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "internal_error",
                            message: "Failed to create event.",
                        },
                    }),
                );
                return true;
            }
        }

        const meetingAccessMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/meeting-access\/([^/]+)$/,
        );
        if (meetingAccessMatch && req.method === "GET") {
            const token = decodeURIComponent(meetingAccessMatch[1]);
            const scopedToken = gateway.consumeScopedMeetingAccessToken(token);
            if (!scopedToken) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message:
                                "Meeting access link is invalid or expired.",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(302, { location: scopedToken.targetUrl });
            res.end();
            return true;
        }

        return false;
    };
}

function createCalendarAdapterRoutes(
    gatewayId: string,
    gateway: CoreCalendarGateway,
    gatewayRegistry: GatewayBootstrapContext["gatewayRegistry"],
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    const base = `/api/v1/gateways/${gatewayId}/adapters`;

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === base && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: gateway.listAdapters().map((adapter) => ({
                        ...adapter,
                        controls: buildGatewayAdapterAdminControls(
                            base,
                            adapter.id,
                        ),
                    })),
                }),
            );
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);

            if (req.method === "GET") {
                const config = gateway.getAdapterConfig(adapterId);
                if (config === null) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Adapter not found.",
                            },
                        }),
                    );
                    return true;
                }
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: config,
                        envValues: {},
                        requiredFields: [],
                        supportsTest: false,
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                if (!gateway.getAdapter(adapterId)) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Adapter not found.",
                            },
                        }),
                    );
                    return true;
                }
                const body = await readJson(req);
                await gateway.saveAdapterConfig(
                    adapterId,
                    body as Record<string, unknown>,
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }

            return false;
        }

        const toggleMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (toggleMatch && req.method === "POST") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(toggleMatch[1]);
            const action = toggleMatch[2] as "enable" | "disable";
            if (!gateway.getAdapter(adapterId)) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Adapter not found.",
                        },
                    }),
                );
                return true;
            }
            if (action === "enable") {
                const gatewayEntry = gatewayRegistry.get(gatewayId);
                if (gatewayEntry?.status === "disabled") {
                    res.writeHead(409, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "gateway_disabled",
                                message:
                                    "Cannot enable an adapter while its gateway is disabled",
                            },
                        }),
                    );
                    return true;
                }
                await gateway.enableAdapter(adapterId);
            } else {
                await gateway.disableAdapter(adapterId);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { enabled: action === "enable" } }));
            return true;
        }

        return false;
    };
}

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const routeHelpers = resolveRouteContext(routeContext);
    const gateway = new CoreCalendarGateway();
    const adaptersRoot = path.join(ctx.adaptersRoot, "calendar");

    await gateway.discoverAdapters(adaptersRoot);

    const registerNotificationCategory = ctx.capabilities.get<
        (id: string, label: string) => void
    >("notify:registerCategory");
    registerNotificationCategory?.("calendar", "Calendar Events");

    const dispatchNotification = ctx.capabilities.get<
        (envelope: {
            category: string;
            recipientUsername: string;
            recipientEmail?: string;
            subject: string;
            body: string;
            actionUrl?: string;
            senderName?: string;
            metadata?: Record<string, unknown>;
            attachments?: Array<{
                filename: string;
                contentType?: string;
                content: string;
            }>;
        }) => Promise<{ dispatched: string[] }>
    >("notify:dispatch");

    ctx.capabilities.contribute(
        "calendar:createCalendar",
        (
            ownerAccountId: string,
            name: string,
            visibility?: CalendarVisibility,
            color?: string,
        ) =>
            gateway.createCalendar({
                ownerAccountId,
                name,
                visibility,
                color: normalizeCalendarColor(color),
            }),
    );
    ctx.capabilities.contribute(
        "calendar:listCalendars",
        (ownerAccountId: string) => gateway.listCalendars(ownerAccountId),
    );
    ctx.capabilities.contribute(
        "calendar:addEvent",
        (input: {
            ownerAccountId: string;
            calendarId: string;
            title: string;
            description?: string | null;
            startAt: string;
            endAt: string;
            attendees?: string[];
            inviteEmails?: string[];
            meetingUrl?: string | null;
        }) => gateway.addEvent(input),
    );
    ctx.capabilities.contribute("calendar:listEvents", (calendarId: string) =>
        gateway.listEvents(calendarId),
    );
    ctx.capabilities.contribute("calendar:exportIcs", (calendarId: string) =>
        gateway.exportCalendarAsIcs(calendarId),
    );
    ctx.capabilities.contribute(
        "calendar:importIcs",
        (input: { ownerAccountId: string; calendarId: string; ics: string }) =>
            gateway.importIcs(input),
    );

    await gateway.bootstrapAdapters(adaptersRoot, {
        gateway,
        capabilities: ctx.capabilities,
        gatewayRegistry: ctx.gatewayRegistry,
        registerRoute: (handler, gatewayId) =>
            ctx.routeRegistry.register(handler, gatewayId ?? "calendar"),
        log: ctx.log,
        isGatewayEnabled: () =>
            ctx.gatewayRegistry.get("calendar")?.status !== "disabled",
    });

    ctx.routeRegistry.register(
        createCalendarCoreRoutes(
            gateway,
            dispatchNotification ?? null,
            routeContext,
        ),
        "calendar",
    );

    const serveCalendarHtml = async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method !== "GET" || url.pathname !== "/calendar") return false;
        if (!routeHelpers.getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        routeHelpers.setPageSecurityHeaders(res);
        const html = await readFile(
            path.join(GATEWAY_ROOT, "ui", "index.html"),
            "utf8",
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };

    ctx.routeRegistry.register(serveCalendarHtml, "calendar");
    ctx.routeRegistry.register(
        createCalendarAdapterRoutes(
            "calendar",
            gateway,
            ctx.gatewayRegistry,
            routeContext,
        ),
        "calendar",
    );

    const uiHooks = createGatewayUiRegistryHooks(ctx.uiRegistry, "calendar");
    uiHooks.registerStaticDir("calendar", GATEWAY_ROOT);
    uiHooks.registerNavbarPlugin(
        "/static/gateways/calendar/ui/navbar.js",
        () => ctx.gatewayRegistry.get("calendar")?.status !== "disabled",
    );
    uiHooks.registerSpaRoute({
        id: "calendar-page",
        pattern: "^/calendar$",
        base: "/calendar",
        scriptUrl: "/static/gateways/calendar/ui/app.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/calendar/ui/calendar.css",
        ],
        isEnabled: () =>
            ctx.gatewayRegistry.get("calendar")?.status !== "disabled",
    });

    ctx.gatewayRegistry.register({
        id: "calendar",
        name: "Calendar Gateway",
        version: "1.0.0",
        description:
            "Internal calendar management with pluggable CalDAV and ICS adapters.",
        publisher: "Cognis Labs HQ",
        hasAdapters: true,
    });
}
