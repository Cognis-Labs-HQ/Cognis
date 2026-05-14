import {
    requireAuth,
    getAuthClaims,
    canAccessUserData,
    isAccessRole,
} from "../../auth/guard.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../api/reuse/read-json.js";
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
    const normalizedRoles = value
        .map((roleValue) => String(roleValue ?? "").trim())
        .filter((roleValue) => isAccessRole(roleValue))
        .map((roleValue) => roleValue as NotificationBroadcastRole);
    return Array.from(new Set(normalizedRoles));
}

function isSafeRedirectUrl(urlValue: string): boolean {
    if (!urlValue) return true;
    try {
        const trustedOrigin = "https://cognis.local";
        const parsedUrl = new URL(urlValue, trustedOrigin);
        const hasSafeProtocol =
            parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
        return hasSafeProtocol && parsedUrl.origin === trustedOrigin;
    } catch {
        return false;
    }
}

function validateBroadcastSchedule(
    startAt: number | null | undefined,
    endAt: number | null | undefined,
): string | null {
    if (startAt === undefined || endAt === undefined) {
        return "invalid_timestamp";
    }
    const hasStartAt = startAt !== null;
    const hasEndAt = endAt !== null;
    if (hasStartAt !== hasEndAt) {
        return "partial_window_not_allowed";
    }
    if (
        startAt !== null &&
        endAt !== null &&
        Number(startAt) >= Number(endAt)
    ) {
        return "invalid_window_range";
    }
    return null;
}

export function createNotificationRoutes(
    gateway: CoreNotificationGateway,
    notifStore?: NotificationPreferenceRouteStore,
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/notifications/send" &&
            req.method === "POST"
        ) {
            if (!requireAuth(req, res, "admin")) return true;

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
            url.pathname === "/api/v1/notifications/providers" &&
            req.method === "GET"
        ) {
            if (!requireAuth(req, res, "user")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: gateway.listSenders() }));
            return true;
        }

        if (
            url.pathname === "/api/v1/notifications/categories" &&
            req.method === "GET"
        ) {
            const claims = getAuthClaims(req);
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
            url.pathname === "/api/v1/notifications/broadcasts" &&
            req.method === "GET"
        ) {
            if (!requireAuth(req, res, "admin")) return true;
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
            url.pathname === "/api/v1/notifications/broadcasts" &&
            req.method === "POST"
        ) {
            const claims = requireAuth(req, res, "admin");
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
            // Keep accepting legacy snake_case payload keys for backwards
            // compatibility with older admin clients that still submit them.
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
            const scheduleValidationError = validateBroadcastSchedule(
                startAt,
                endAt,
            );

            if (
                !title ||
                !message ||
                !VALID_BROADCAST_MODES.has(displayMode) ||
                !targetRoles ||
                targetRoles.length === 0 ||
                scheduleValidationError !== null ||
                (redirectUrl !== null && !isSafeRedirectUrl(redirectUrl))
            ) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_broadcast_payload",
                            message:
                                "title, message, displayMode, targetRoles, and valid schedule/redirect fields are required",
                        },
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
            /^\/api\/v1\/notifications\/broadcasts\/([^/]+)\/(enable|disable)$/,
        );
        if (setBroadcastEnabledMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
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
            /^\/api\/v1\/notifications\/broadcasts\/([^/]+)\/states$/,
        );
        if (broadcastStatesMatch && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
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
            url.pathname === "/api/v1/notifications/broadcasts/active" &&
            req.method === "GET"
        ) {
            const claims = getAuthClaims(req);
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
            /^\/api\/v1\/notifications\/broadcasts\/([^/]+)\/acknowledge$/,
        );
        if (acknowledgeBroadcastMatch && req.method === "POST") {
            const claims = getAuthClaims(req);
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
            /^\/api\/v1\/notifications\/broadcasts\/([^/]+)\/dismiss$/,
        );
        if (dismissBroadcastMatch && req.method === "POST") {
            const claims = getAuthClaims(req);
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
            /^\/api\/v1\/notifications\/providers\/([^/]+)\/config$/,
        );
        if (providerConfigMatch) {
            const senderId = decodeURIComponent(providerConfigMatch[1]);

            if (req.method === "GET") {
                if (!requireAuth(req, res, "admin")) return true;
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
                if (!requireAuth(req, res, "admin")) return true;
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
            /^\/api\/v1\/notifications\/providers\/([^/]+)\/test$/,
        );
        if (providerTestMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const senderId = decodeURIComponent(providerTestMatch[1]);
            const body = await readJson(req);
            const to = String(body.to ?? "");
            const overrideConfig =
                body.config != null &&
                typeof body.config === "object" &&
                !Array.isArray(body.config)
                    ? (body.config as Record<string, unknown>)
                    : undefined;
            const sender = gateway.getSender(senderId);
            if (!sender || typeof sender.sendTestEmail !== "function") {
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
            await sender.sendTestEmail(to, overrideConfig);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { sent: true } }));
            return true;
        }

        const userPrefsMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/notification-prefs$/,
        );
        if (userPrefsMatch) {
            const username = decodeURIComponent(userPrefsMatch[1]);

            const claims = getAuthClaims(req);
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
            if (!canAccessUserData(claims, username)) {
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
