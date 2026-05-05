import path from "node:path";
import { requireAuth, getAuthClaims } from "../../auth/guard.js";
import { readJson } from "../../routes/read-json.js";
import { CoreNotificationGateway } from "./gateway.js";
import {
    DbNotificationStore,
    DbNotificationPreferenceStore,
} from "../../adapters/db/notification-store.js";
import { TfaCodeService, InMemoryTfaStore } from "../../utils/tfa-code.js";
import {
    VerifyTokenService,
    InMemoryVerifyTokenStore,
} from "../../utils/verify-token.js";
import type { GatewayBootstrapContext } from "../../gateway-bootstrap.js";
import { createNotificationRoutes } from "../../routes/notifications/index.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DbNotificationStore as IDbNotificationStore } from "../../adapters/db/notification-store.js";

/**
 * Standard gateway bootstrap entry point. Discovers notification adapters,
 * wires all notification and user-email routes into the route registry, and
 * registers this gateway in the gateway registry. Core never calls anything
 * inside this module directly.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const notifStore = new DbNotificationStore(ctx.dbExecutor, ctx.dbType);
    await notifStore.ensureSchema();

    const notificationPrefStore = new DbNotificationPreferenceStore(notifStore);
    const gateway = new CoreNotificationGateway(
        notificationPrefStore,
        notifStore,
        notifStore,
    );

    const notifyAdaptersRoot = path.join(ctx.adaptersRoot, "notify");
    await gateway.discoverSenders(notifyAdaptersRoot);
    await gateway.loadPersistedConfigs();
    gateway.registerCategory("system", "System Notifications");

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const externalHost =
        process.env.EXTERNAL_HOST ??
        (process.env.HOST ? `http://${process.env.HOST}` : undefined);

    ctx.routeRegistry.register(createNotificationRoutes(gateway, notifStore));
    ctx.routeRegistry.register(
        createUserEmailRoutes(
            notifStore,
            tfaService,
            verifyTokenService,
            gateway,
            externalHost,
        ),
    );
    ctx.routeRegistry.register(createGatewayAdapterRoutes("notify", gateway));

    ctx.gatewayRegistry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
        description: "Dispatches notifications via pluggable adapter senders.",
        publisher: "Cognis Labs",
        hasAdapters: true,
    });

    const uiDir = path.resolve(
        process.cwd(),
        "src",
        "api",
        "gateways",
        "notify",
        "ui",
    );
    ctx.uiRegistry?.registerAdminSection({
        id: "notifications",
        label: "Notifications",
        scriptUrl: "/static/gateways/notify/admin-section.js",
    });
    ctx.uiRegistry?.registerStaticDir("notify", uiDir);
}

/**
 * Creates route handlers for all user email management endpoints. These routes
 * are owned by the notification gateway because they depend on the notification
 * store and verification email sender — concepts the core knows nothing about.
 *
 *   GET    /api/v1/users/:id/emails
 *   POST   /api/v1/users/:id/emails
 *   DELETE /api/v1/users/:id/emails/:addr
 *   PUT    /api/v1/users/:id/emails/:addr/primary
 *   POST   /api/v1/users/:id/emails/:addr/verify
 *   POST   /api/v1/users/:id/emails/:addr/resend
 *   GET    /api/v1/users/:id/emails/:addr/verify  (redirect)
 *   GET    /api/v1/verify-tokens/status
 *   POST   /api/v1/verify-email
 */
export function createUserEmailRoutes(
    notifStore: IDbNotificationStore,
    tfaService: TfaCodeService,
    verifyTokenService: VerifyTokenService,
    gateway: CoreNotificationGateway,
    externalHost?: string,
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/verify-tokens/status" &&
            req.method === "GET"
        ) {
            const token = url.searchParams.get("token") ?? "";
            const pending = !!(token && verifyTokenService.isLive(token));
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { pending } }));
            return true;
        }

        if (url.pathname === "/api/v1/verify-email" && req.method === "POST") {
            const body = await readJson(req);
            const token = String(body.token ?? "").trim();
            if (!token) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Token is required",
                        },
                    }),
                );
                return true;
            }
            const userEmailPair = verifyTokenService.verify(token);
            if (!userEmailPair) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Invalid or expired verification token",
                        },
                    }),
                );
                return true;
            }
            const colonIndex = userEmailPair.indexOf(":");
            if (colonIndex === -1) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Malformed token key",
                        },
                    }),
                );
                return true;
            }
            const username = userEmailPair.slice(0, colonIndex);
            const email = userEmailPair.slice(colonIndex + 1);
            await notifStore.verifyUserEmail(username, email);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { verified: true } }));
            return true;
        }

        const emailsMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/emails$/,
        );
        if (emailsMatch) {
            const username = decodeURIComponent(emailsMatch[1]);
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
            if (claims.sub !== username && claims.role !== "admin") {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }

            if (req.method === "GET") {
                const emails = await notifStore.getUserEmails(username);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: emails }));
                return true;
            }

            if (req.method === "POST") {
                const body = await readJson(req);
                const email = String(body.email ?? "")
                    .trim()
                    .toLowerCase();
                if (!email) {
                    res.writeHead(400, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "bad_request",
                                message: "email is required",
                            },
                        }),
                    );
                    return true;
                }
                const existingEmails = await notifStore.getUserEmails(username);
                const existingEntry = existingEmails.find(
                    (e) => e.email === email,
                );
                if (existingEntry?.verified) {
                    res.writeHead(409, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "already_verified",
                                message:
                                    "This email address is already verified.",
                            },
                        }),
                    );
                    return true;
                }
                const takenByOther =
                    await notifStore.isEmailRegisteredByOtherUser(
                        email,
                        username,
                    );
                if (takenByOther) {
                    res.writeHead(409, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "email_taken",
                                message:
                                    "This email address is already registered by another user.",
                            },
                        }),
                    );
                    return true;
                }
                await notifStore.addUserEmail(username, email);

                if (gateway.canSendVerificationEmail()) {
                    try {
                        const key = `${username}:${email}`;
                        const code = tfaService.issueOrGet(key);
                        const watchToken = verifyTokenService.issueOrGet(key);
                        const verifyUrl = externalHost
                            ? `${externalHost}/verify-email?token=${watchToken}`
                            : undefined;
                        await gateway.sendVerificationEmail(
                            email,
                            code,
                            verifyUrl,
                        );
                        res.writeHead(201, {
                            "content-type": "application/json",
                        });
                        res.end(
                            JSON.stringify({
                                data: {
                                    added: true,
                                    pendingVerification: true,
                                    ...(watchToken && { watchToken }),
                                },
                            }),
                        );
                    } catch (err) {
                        const msg =
                            err instanceof Error ? err.message : String(err);
                        if (msg === "smtp_rate_limited") {
                            res.writeHead(429, {
                                "content-type": "application/json",
                            });
                            res.end(
                                JSON.stringify({
                                    error: {
                                        code: "rate_limited",
                                        message:
                                            "Verification email sent too recently. Please wait before requesting another.",
                                    },
                                }),
                            );
                        } else {
                            res.writeHead(201, {
                                "content-type": "application/json",
                            });
                            res.end(
                                JSON.stringify({
                                    data: {
                                        added: true,
                                        pendingVerification: true,
                                        verificationEmailFailed: true,
                                    },
                                }),
                            );
                        }
                    }
                } else {
                    await notifStore.verifyUserEmail(username, email);
                    res.writeHead(201, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            data: { added: true, pendingVerification: false },
                        }),
                    );
                }
                return true;
            }

            return false;
        }

        const emailActionsMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/emails\/([^/]+)(?:\/(primary|verify|resend))?$/,
        );
        if (emailActionsMatch) {
            const username = decodeURIComponent(emailActionsMatch[1]);
            const email = decodeURIComponent(
                emailActionsMatch[2],
            ).toLowerCase();
            const emailAction = emailActionsMatch[3];

            if (req.method === "GET" && emailAction === "verify") {
                const token = url.searchParams.get("token") ?? "";
                if (token) {
                    res.writeHead(302, {
                        location: `/verify-email?token=${encodeURIComponent(token)}`,
                    });
                } else {
                    res.writeHead(302, { location: "/verify-email" });
                }
                res.end();
                return true;
            }

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
            if (claims.sub !== username && claims.role !== "admin") {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }

            if (req.method === "DELETE" && !emailAction) {
                const forceUnverified =
                    url.searchParams.get("force") === "true";
                try {
                    if (forceUnverified) {
                        await notifStore.removeUnverifiedEmail(username, email);
                    } else {
                        await notifStore.removeUserEmail(username, email);
                    }
                    res.writeHead(200, {
                        "content-type": "application/json",
                    });
                    res.end(JSON.stringify({ data: { removed: true } }));
                } catch (err) {
                    const code =
                        err instanceof Error ? err.message : "remove_failed";
                    const status =
                        code === "cannot_remove_primary_email" ||
                        code === "cannot_remove_last_email"
                            ? 409
                            : 500;
                    res.writeHead(status, {
                        "content-type": "application/json",
                    });
                    res.end(JSON.stringify({ error: { code, message: code } }));
                }
                return true;
            }

            if (req.method === "PUT" && emailAction === "primary") {
                await notifStore.setPrimaryEmail(username, email);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { updated: true } }));
                return true;
            }

            if (req.method === "POST" && emailAction === "verify") {
                const body = await readJson(req);
                const code = String(body.code ?? "").trim();
                const valid = tfaService.verify(`${username}:${email}`, code);
                if (!valid) {
                    res.writeHead(422, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "invalid_code",
                                message: "Invalid or expired verification code",
                            },
                        }),
                    );
                    return true;
                }
                await notifStore.verifyUserEmail(username, email);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { verified: true } }));
                return true;
            }

            if (req.method === "POST" && emailAction === "resend") {
                if (!gateway.canSendVerificationEmail()) {
                    res.writeHead(503, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "smtp_unavailable",
                                message: "Email delivery is not configured",
                            },
                        }),
                    );
                    return true;
                }
                const emails = await notifStore.getUserEmails(username);
                const resendTarget = emails.find((e) => e.email === email);
                if (!resendTarget) {
                    res.writeHead(404, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Email address not found",
                            },
                        }),
                    );
                    return true;
                }
                if (resendTarget.verified) {
                    res.writeHead(409, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "already_verified",
                                message: "Email address is already verified",
                            },
                        }),
                    );
                    return true;
                }
                try {
                    const key = `${username}:${email}`;
                    const code = tfaService.issueOrGet(key);
                    const watchToken = verifyTokenService.issueOrGet(key);
                    const verifyUrl = externalHost
                        ? `${externalHost}/verify-email?token=${watchToken}`
                        : undefined;
                    await gateway.sendVerificationEmail(email, code, verifyUrl);
                    res.writeHead(200, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            data: {
                                pendingVerification: true,
                                ...(watchToken && { watchToken }),
                            },
                        }),
                    );
                } catch (err) {
                    const msg =
                        err instanceof Error ? err.message : String(err);
                    if (msg === "smtp_rate_limited") {
                        res.writeHead(429, {
                            "content-type": "application/json",
                        });
                        res.end(
                            JSON.stringify({
                                error: {
                                    code: "rate_limited",
                                    message:
                                        "Verification email sent too recently. Please wait before requesting another.",
                                },
                            }),
                        );
                    } else {
                        res.writeHead(500, {
                            "content-type": "application/json",
                        });
                        res.end(
                            JSON.stringify({
                                error: {
                                    code: "send_failed",
                                    message:
                                        "Failed to send verification email",
                                },
                            }),
                        );
                    }
                }
                return true;
            }

            return false;
        }

        return false;
    };
}

function createGatewayAdapterRoutes(
    gatewayId: string,
    gateway: CoreNotificationGateway,
) {
    const base = `/api/v1/gateways/${gatewayId}/adapters`;

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === base && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: gateway.listSenders() }));
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            const adapterId = decodeURIComponent(configMatch[1]);

            if (req.method === "GET") {
                if (!requireAuth(req, res, "admin")) return true;
                const config = gateway.getProviderConfig(adapterId);
                if (config === null) {
                    res.writeHead(404, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Adapter not found or has no config",
                            },
                        }),
                    );
                    return true;
                }
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: config,
                        envValues:
                            gateway.getProviderEnvValues(adapterId) ?? {},
                        requiredFields:
                            gateway.getProviderRequiredFields(adapterId) ?? [],
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                if (!requireAuth(req, res, "admin")) return true;
                const body = await readJson(req);
                await gateway.saveProviderConfig(
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
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(toggleMatch[1]);
            const action = toggleMatch[2] as "enable" | "disable";
            const sender = gateway.getSender(adapterId);
            if (!sender) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Adapter not found",
                        },
                    }),
                );
                return true;
            }
            if (action === "enable") {
                await gateway.enableSender(adapterId);
            } else {
                await gateway.disableSender(adapterId);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: { enabled: action === "enable" },
                }),
            );
            return true;
        }

        const testMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/test$`),
        );
        if (testMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(testMatch[1]);
            const body = await readJson(req);
            const to = String(body.to ?? "");
            const overrideConfig =
                body.config != null &&
                typeof body.config === "object" &&
                !Array.isArray(body.config)
                    ? (body.config as Record<string, unknown>)
                    : undefined;
            const sender = gateway.getSender(adapterId);
            if (!sender || typeof sender.sendTestEmail !== "function") {
                res.writeHead(400, {
                    "content-type": "application/json",
                });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_supported",
                            message: "Adapter does not support test emails",
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

        return false;
    };
}
