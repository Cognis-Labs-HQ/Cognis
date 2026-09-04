import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../api/reuse/read-json.js";
import { isTrustedHttpUrl } from "../../../api/reuse/security-settings.js";
import { isAccessRole } from "@cognis/core";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import type { CoreNotificationGateway } from "../gateway.js";
import type {
    NotificationBroadcastDisplayMode,
    NotificationBroadcastRole,
} from "../notification-store.js";

export interface NotificationPreferenceRouteStore {
    getUserNotifPrefs(
        accountId: string,
    ): Promise<Array<{ category: string; senderId: string }>>;
    saveUserNotifPrefs(
        accountId: string,
        prefs: Array<{ category: string; senderId: string; enabled: boolean }>,
    ): Promise<void>;
    createBroadcast?(input: {
        title: string;
        message: string;
        displayMode: NotificationBroadcastDisplayMode;
        targetRoles: NotificationBroadcastRole[];
        startAt: number | null;
        endAt: number | null;
        requireAcknowledgement: boolean;
        redirectUrl: string | null;
        enabled: boolean;
        createdBy: string;
    }): Promise<unknown>;
    listBroadcasts?(): Promise<unknown[]>;
    setBroadcastEnabled?(id: string, enabled: boolean): Promise<void>;
    getActiveBroadcastsForRole?(
        accountId: string,
        role: NotificationBroadcastRole,
    ): Promise<unknown[]>;
    markBroadcastDismissed?(
        accountId: string,
        broadcastId: string,
    ): Promise<void>;
    markBroadcastAcknowledged?(
        accountId: string,
        broadcastId: string,
    ): Promise<void>;
    listBroadcastStates?(broadcastId: string): Promise<unknown[]>;
}

const VALID_BROADCAST_MODES = new Set<NotificationBroadcastDisplayMode>([
    "bar",
    "popup",
]);

function parseTimestampInput(value: unknown): number | null | undefined {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsedDate = Date.parse(value);
        if (Number.isFinite(parsedDate)) return parsedDate;
    }
    return undefined;
}

function normalizeTargetRoles(
    value: unknown,
): NotificationBroadcastRole[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const normalizedRoles = value.reduce<NotificationBroadcastRole[]>(
        (roleList, roleValue) => {
            const normalizedRole = String(roleValue ?? "").trim();
            if (isAccessRole(normalizedRole)) {
                roleList.push(normalizedRole as NotificationBroadcastRole);
            }
            return roleList;
        },
        [],
    );
    return Array.from(new Set(normalizedRoles));
}

function resolveTrustedOrigin(requestOrigin: string): string {
    return (
        process.env.EXTERNAL_HOST ??
        (process.env.HOST ? `http://${process.env.HOST}` : requestOrigin)
    );
}

function isValidNotificationQueueId(value: string): boolean {
    if (!value || value.length > 128) return false;
    return !/[\s\x00-\x1f\x7f]/.test(value);
}

function validateBroadcastSchedule(
    startAt: number | null | undefined,
    endAt: number | null | undefined,
): string | null {
    if (startAt === undefined || endAt === undefined) {
        return "invalid_broadcast_timestamp";
    }
    const hasStartAt = startAt !== null;
    const hasEndAt = endAt !== null;
    if (hasStartAt !== hasEndAt) {
        return "partial_broadcast_window";
    }
    if (
        startAt !== null &&
        endAt !== null &&
        Number(startAt) >= Number(endAt)
    ) {
        return "invalid_broadcast_window_range";
    }
    return null;
}

function getBroadcastCreateValidationError(input: {
    title: string;
    message: string;
    displayMode: string;
    targetRoles: NotificationBroadcastRole[] | undefined;
    startAt: number | null | undefined;
    endAt: number | null | undefined;
    redirectUrl: string | null;
    trustedBaseUrl: string;
    trustedDomains: string[];
}): { code: string; message: string } | null {
    if (!input.title) {
        return {
            code: "missing_broadcast_title",
            message: "Broadcast title is required",
        };
    }
    if (!input.message) {
        return {
            code: "missing_broadcast_message",
            message: "Broadcast message is required",
        };
    }
    if (
        !VALID_BROADCAST_MODES.has(
            input.displayMode as NotificationBroadcastDisplayMode,
        )
    ) {
        return {
            code: "invalid_broadcast_display_mode",
            message: "Broadcast displayMode must be either 'bar' or 'popup'",
        };
    }
    if (!input.targetRoles || input.targetRoles.length === 0) {
        return {
            code: "missing_broadcast_roles",
            message: "At least one target role is required",
        };
    }

    const scheduleValidationError = validateBroadcastSchedule(
        input.startAt,
        input.endAt,
    );
    if (scheduleValidationError === "invalid_broadcast_timestamp") {
        return {
            code: "invalid_broadcast_timestamp",
            message: "Broadcast startAt and endAt must be valid timestamps",
        };
    }
    if (scheduleValidationError === "partial_broadcast_window") {
        return {
            code: "partial_broadcast_window",
            message: "Broadcast startAt and endAt must both be provided",
        };
    }
    if (scheduleValidationError === "invalid_broadcast_window_range") {
        return {
            code: "invalid_broadcast_window_range",
            message: "Broadcast startAt must be earlier than endAt",
        };
    }
    if (
        input.redirectUrl !== null &&
        !isTrustedHttpUrl(input.redirectUrl, {
            baseUrl: input.trustedBaseUrl,
            trustedDomains: input.trustedDomains,
        })
    ) {
        return {
            code: "invalid_broadcast_redirect",
            message:
                "Broadcast redirectUrl must stay on the current origin or trusted domains",
        };
    }
    return null;
}

export function createNotificationRoutes(
    gateway: CoreNotificationGateway,
    notifStore?: NotificationPreferenceRouteStore,
    options?: {
        getTrustedDomains?: () => Promise<string[]>;
        routeContext?: RouteContext;
        sendEmail?: (input: {
            recipientEmail: string;
            templateId: string;
            variables: Record<string, string>;
            config?: Record<string, unknown>;
        }) => Promise<unknown>;
    },
) {
    const ctx = resolveRouteContext(options?.routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === "/api/v1/notify/send" && req.method === "POST") {
            if (!ctx.requireAuth(req, res, "admin")) return true;

            const body = await readJson(req);
            const category = String(body.category ?? "");
            const recipientUsername = String(body.recipientUsername ?? "");
            const subject = String(body.subject ?? "");
            const notifBody = String(body.body ?? "");
            const recipientEmail =
                body.recipientEmail != null
                    ? String(body.recipientEmail)
                    : undefined;

            if (!category || !recipientUsername || !subject || !notifBody) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "missing_fields",
                            message:
                                "category, recipientUsername, subject, and body are required",
                        },
                    }),
                );
                return true;
            }

            const result = await gateway.dispatch({
                category,
                recipientUsername,
                recipientEmail,
                subject,
                body: notifBody,
                metadata: body.metadata as Record<string, unknown> | undefined,
            });

            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: result }));
            return true;
        }

        if (
            url.pathname === "/api/v1/notify/providers" &&
            req.method === "GET"
        ) {
            if (!ctx.requireAuth(req, res, "user")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: gateway.listSenders() }));
            return true;
        }

        if (url.pathname === "/api/v1/notify/queue" && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: gateway.listNotificationQueue() }));
            return true;
        }

        const queueItemMatch = url.pathname.match(
            /^\/api\/v1\/notify\/queue\/([^/]+)$/,
        );
        if (queueItemMatch && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const notificationId = decodeURIComponent(queueItemMatch[1]);
            if (!isValidNotificationQueueId(notificationId)) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_notification_id",
                            message: "Notification ID is invalid",
                        },
                    }),
                );
                return true;
            }
            const queueItem = gateway.getNotificationQueueItem(notificationId);
            if (!queueItem) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Notification queue item not found",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: queueItem }));
            return true;
        }

        if (
            url.pathname === "/api/v1/notify/categories" &&
            req.method === "GET"
        ) {
            const claims = ctx.getAuthClaims(req);
            if (!claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unauthorized",
                            message: "Login required",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: gateway.listCategories() }));
            return true;
        }

        if (
            url.pathname === "/api/v1/notify/broadcasts" &&
            req.method === "GET"
        ) {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            if (!notifStore?.listBroadcasts) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: [] }));
                return true;
            }
            const broadcasts = await notifStore.listBroadcasts();
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: broadcasts }));
            return true;
        }

        if (
            url.pathname === "/api/v1/notify/broadcasts" &&
            req.method === "POST"
        ) {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            if (!notifStore?.createBroadcast) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_supported",
                            message: "Broadcast store unavailable",
                        },
                    }),
                );
                return true;
            }
            const body = await readJson(req);
            const title = String(body.title ?? "").trim();
            const message = String(body.message ?? "").trim();
            // This endpoint existed before the current admin UI rewrite, so we
            // still accept legacy snake_case payload keys from older clients.
            const displayMode = String(
                body.displayMode ?? body.display_mode ?? "",
            ).trim() as NotificationBroadcastDisplayMode;
            const targetRoles = normalizeTargetRoles(body.targetRoles);
            const startAt = parseTimestampInput(body.startAt ?? body.start_at);
            const endAt = parseTimestampInput(body.endAt ?? body.end_at);
            const requireAcknowledgement = Boolean(
                body.requireAcknowledgement ?? body.require_acknowledgement,
            );
            const redirectUrlRaw = String(
                body.redirectUrl ?? body.redirect_url ?? "",
            ).trim();
            const redirectUrl = redirectUrlRaw || null;
            const enabled = body.enabled == null ? true : Boolean(body.enabled);
            const trustedDomains = options?.getTrustedDomains
                ? await options.getTrustedDomains().catch(() => [])
                : [];
            const validationError = getBroadcastCreateValidationError({
                title,
                message,
                displayMode,
                targetRoles,
                startAt,
                endAt,
                redirectUrl,
                trustedBaseUrl: resolveTrustedOrigin(url.origin),
                trustedDomains,
            });

            if (validationError !== null) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: validationError,
                    }),
                );
                return true;
            }

            const createdBroadcast = await notifStore.createBroadcast({
                title,
                message,
                displayMode,
                targetRoles,
                startAt,
                endAt,
                requireAcknowledgement,
                redirectUrl,
                enabled,
                createdBy: claims.sub,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: createdBroadcast }));
            return true;
        }

        const setBroadcastEnabledMatch = url.pathname.match(
            /^\/api\/v1\/notify\/broadcasts\/([^/]+)\/(enable|disable)$/,
        );
        if (setBroadcastEnabledMatch && req.method === "POST") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            if (!notifStore?.setBroadcastEnabled) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_supported",
                            message: "Broadcast store unavailable",
                        },
                    }),
                );
                return true;
            }
            const broadcastId = decodeURIComponent(setBroadcastEnabledMatch[1]);
            const action = setBroadcastEnabledMatch[2];
            await notifStore.setBroadcastEnabled(
                broadcastId,
                action === "enable",
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        saved: true,
                        id: broadcastId,
                        enabled: action === "enable",
                    },
                }),
            );
            return true;
        }

        const broadcastStatesMatch = url.pathname.match(
            /^\/api\/v1\/notify\/broadcasts\/([^/]+)\/states$/,
        );
        if (broadcastStatesMatch && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            if (!notifStore?.listBroadcastStates) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: [] }));
                return true;
            }
            const broadcastStates = await notifStore.listBroadcastStates(
                decodeURIComponent(broadcastStatesMatch[1]),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: broadcastStates }));
            return true;
        }

        if (
            url.pathname === "/api/v1/notify/broadcasts/active" &&
            req.method === "GET"
        ) {
            const claims = ctx.getAuthClaims(req);
            if (!claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unauthorized",
                            message: "Login required",
                        },
                    }),
                );
                return true;
            }
            if (!notifStore?.getActiveBroadcastsForRole) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: [] }));
                return true;
            }
            const activeBroadcasts =
                await notifStore.getActiveBroadcastsForRole(
                    claims.sub,
                    claims.role as NotificationBroadcastRole,
                );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: activeBroadcasts }));
            return true;
        }

        const acknowledgeBroadcastMatch = url.pathname.match(
            /^\/api\/v1\/notify\/broadcasts\/([^/]+)\/acknowledge$/,
        );
        if (acknowledgeBroadcastMatch && req.method === "POST") {
            const claims = ctx.getAuthClaims(req);
            if (!claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unauthorized",
                            message: "Login required",
                        },
                    }),
                );
                return true;
            }
            if (!notifStore?.markBroadcastAcknowledged) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }
            await notifStore.markBroadcastAcknowledged(
                claims.sub,
                decodeURIComponent(acknowledgeBroadcastMatch[1]),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        const dismissBroadcastMatch = url.pathname.match(
            /^\/api\/v1\/notify\/broadcasts\/([^/]+)\/dismiss$/,
        );
        if (dismissBroadcastMatch && req.method === "POST") {
            const claims = ctx.getAuthClaims(req);
            if (!claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unauthorized",
                            message: "Login required",
                        },
                    }),
                );
                return true;
            }
            if (!notifStore?.markBroadcastDismissed) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }
            await notifStore.markBroadcastDismissed(
                claims.sub,
                decodeURIComponent(dismissBroadcastMatch[1]),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        const providerConfigMatch = url.pathname.match(
            /^\/api\/v1\/notify\/providers\/([^/]+)\/config$/,
        );
        if (providerConfigMatch) {
            const senderId = decodeURIComponent(providerConfigMatch[1]);

            if (req.method === "GET") {
                if (!ctx.requireAuth(req, res, "admin")) return true;
                const config = gateway.getProviderConfig(senderId);
                if (config === null) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Provider not found or has no config",
                            },
                        }),
                    );
                    return true;
                }
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: config,
                        envValues: gateway.getProviderEnvValues(senderId) ?? {},
                        requiredFields:
                            gateway.getProviderRequiredFields(senderId) ?? [],
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                if (!ctx.requireAuth(req, res, "admin")) return true;
                const body = await readJson(req);
                await gateway.saveProviderConfig(
                    senderId,
                    body as Record<string, unknown>,
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }

            return false;
        }

        const providerTestMatch = url.pathname.match(
            /^\/api\/v1\/notify\/providers\/([^/]+)\/test$/,
        );
        if (providerTestMatch && req.method === "POST") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const senderId = decodeURIComponent(providerTestMatch[1]);
            const body = await readJson(req);
            const to = String(body.to ?? "");
            const overrideConfig =
                body.config != null &&
                typeof body.config === "object" &&
                !Array.isArray(body.config)
                    ? (body.config as Record<string, unknown>)
                    : undefined;
            if (senderId !== "smtp" || !options?.sendEmail) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_supported",
                            message: "Provider does not support test emails",
                        },
                    }),
                );
                return true;
            }
            await options.sendEmail({
                recipientEmail: to,
                templateId: "notify-test",
                variables: {},
                config: overrideConfig,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { sent: true } }));
            return true;
        }

        const userPrefsMatch = url.pathname.match(
            /^\/api\/v1\/notify\/users\/([^/]+)\/notification-prefs$/,
        );
        if (userPrefsMatch) {
            const username = decodeURIComponent(userPrefsMatch[1]);

            const claims = ctx.getAuthClaims(req);
            if (!claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unauthorized",
                            message: "Login required",
                        },
                    }),
                );
                return true;
            }
            if (!ctx.canAccessUserData(claims, username)) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }

            if (req.method === "GET") {
                if (!notifStore) {
                    res.writeHead(200, { "content-type": "application/json" });
                    res.end(JSON.stringify({ data: [] }));
                    return true;
                }
                const prefs = await notifStore.getUserNotifPrefs(username);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: prefs }));
                return true;
            }

            if (req.method === "PUT") {
                if (!notifStore) {
                    res.writeHead(200, { "content-type": "application/json" });
                    res.end(JSON.stringify({ data: { saved: true } }));
                    return true;
                }
                const body = await readJson(req);
                const prefsArray = Array.isArray(body) ? body : [];
                const filtered = (
                    prefsArray as Array<{
                        category: string;
                        senderId: string;
                        enabled: boolean;
                    }>
                ).filter(
                    (p) => !(gateway.isAlwaysOn(p.senderId) && !p.enabled),
                );
                await notifStore.saveUserNotifPrefs(username, filtered);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }

            return false;
        }

        return false;
    };
}
