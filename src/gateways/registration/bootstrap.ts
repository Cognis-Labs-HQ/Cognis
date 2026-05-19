import path from "node:path";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
    readJson,
    type GatewayBootstrapContext,
    type GatewayRegistry,
} from "../shared.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { LocalAccountStore } from "../../api/reuse/account-store.js";
import type { UserPreferenceStore } from "../../api/reuse/preference-store.js";
import {
    matchesTrustedDomain,
    parseSecuritySettings,
    SECURITY_SETTINGS_KEY,
} from "../../api/reuse/security-settings.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../api/reuse/route-context.js";
import { CoreRegistrationGateway } from "./gateway.js";

const PUBLIC_ROOT = path.resolve(process.cwd(), "src", "ui", "public");

function inviteBaseUrl(): string {
    if (process.env.EXTERNAL_HOST) return process.env.EXTERNAL_HOST;
    if (process.env.HOST) return `http://${process.env.HOST}`;
    return "http://localhost:3000";
}

function issueInviteErrorStatus(code: string): number {
    if (code === "invite_disabled") return 404;
    if (code === "smtp_unavailable") return 503;
    if (code === "founder_token_limit_reached") return 429;
    if (code === "invitee_email_required") return 400;
    if (code === "email_taken") return 409;
    if (code === "email_domain_not_allowed") return 422;
    return 500;
}

function redeemInviteErrorStatus(code: string): number {
    if (code === "invite_disabled") return 404;
    if (code === "invalid_token") return 400;
    if (code === "inviter_not_found") return 409;
    if (
        code === "username_taken" ||
        code === "username_and_password_required"
    ) {
        return 400;
    }
    return 500;
}

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const dbExecutor =
        ctx.capabilities.get<DbExecutor>("db:executor") ?? ctx.dbExecutor;
    if (!dbExecutor) {
        throw new Error("db_executor_unavailable");
    }
    const accountStore =
        ctx.capabilities.get<LocalAccountStore>("auth:accountStore");
    if (!accountStore) return;

    const canSendInviteEmail = ctx.capabilities.get<() => boolean>(
        "notify:canSendRegistrationInviteEmail",
    );
    const sendInviteEmail = ctx.capabilities.get<
        (
            to: string,
            inviterDisplayName: string,
            inviteUrl: string,
            theme?: string,
        ) => Promise<void>
    >("notify:sendRegistrationInviteEmail");

    const createProfile = ctx.capabilities.get<
        (
            accountId: string,
            handle: string,
            role?: string,
            displayName?: string,
        ) => Promise<void>
    >("profile:createProfile");
    const isEmailRegistered = ctx.capabilities.get<
        (email: string) => Promise<boolean>
    >("notify:isEmailRegistered");
    const upsertVerifiedPrimaryEmail = ctx.capabilities.get<
        (accountId: string, email: string) => Promise<void>
    >("notify:upsertVerifiedPrimaryEmail");
    const gateway = new CoreRegistrationGateway(dbExecutor);
    await gateway.ensureSchema();
    ctx.log?.("info", "Registration gateway schema ready.", {
        component: "registration-gateway",
    });
    const registrationAdaptersRoot = path.join(
        ctx.adaptersRoot,
        "registration",
    );
    await gateway.discoverAdapters(registrationAdaptersRoot, {
        dbExecutor,
        accountStore,
        log: ctx.log,
        canSendInviteEmail: canSendInviteEmail ?? (() => false),
        sendInviteEmail:
            sendInviteEmail ??
            (async () => {
                throw new Error("smtp_unavailable");
            }),
        createProfile,
        isEmailRegistered: isEmailRegistered ?? (async () => false),
        upsertVerifiedPrimaryEmail:
            upsertVerifiedPrimaryEmail ??
            (async () => {
                throw new Error("smtp_unavailable");
            }),
    });
    await gateway.loadPersistedConfigs();
    ctx.log?.("info", "Registration adapters discovered and configured.", {
        component: "registration-gateway",
        adaptersRoot: registrationAdaptersRoot,
        adapterCount: gateway.listAdapters().length,
    });

    const preferenceStore =
        ctx.capabilities.get<UserPreferenceStore>("preferences:store");

    async function getTrustedDomains(): Promise<string[]> {
        if (!preferenceStore) return [];
        const raw = await preferenceStore
            .get("__system__", SECURITY_SETTINGS_KEY)
            .catch(() => null);
        return parseSecuritySettings(raw)?.trustedDomains ?? [];
    }

    function isGatewayEnabled(): boolean {
        return ctx.gatewayRegistry.get("registration")?.status !== "disabled";
    }

    ctx.routeRegistry.register(
        createRegistrationRoutes(
            gateway,
            accountStore,
            getTrustedDomains,
            isGatewayEnabled,
            ctx.log,
            routeContext,
        ),
        "registration",
    );
    ctx.routeRegistry.register(
        createRegistrationPageRoutes(routeContext),
        "registration",
    );
    ctx.log?.("info", "Registration gateway routes registered.", {
        component: "registration-gateway",
    });
    const uiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "registration",
        "ui",
    );
    ctx.uiRegistry?.registerAdminSection({
        id: "registration",
        label: "Registration",
        scriptUrl: "/static/gateways/registration/admin-section.js",
        stringsBaseUrl: "/static/gateways/registration/languages",
    });
    ctx.uiRegistry?.registerStaticDir("registration", uiDir);
    ctx.uiRegistry?.registerNavbarPlugin({
        scriptUrl: "/static/gateways/registration/navbar.js",
    });
    ctx.uiRegistry?.registerAuthTypingMessage({
        id: "registration-register-today",
        textKey: "ui.app.login.typing.sample.7",
        ownerType: "adapter",
        ownerId: "public",
        isEnabled: () => isGatewayEnabled() && gateway.isPublicEnabled(),
    });

    /**
     * registration:public:isEnabled — reports whether public self-registration
     * is currently available.
     */
    ctx.capabilities.contribute(
        "registration:public:isEnabled",
        () => isGatewayEnabled() && gateway.isPublicEnabled(),
    );
    /**
     * registration:public:register — public self-registration entry point
     * exported for auth/UI consumers.
     */
    ctx.capabilities.contribute(
        "registration:public:register",
        async (input: {
            username: string;
            password: string;
            email?: string;
            displayName?: string;
        }) => {
            if (!isGatewayEnabled()) throw new Error("gateway_disabled");
            return gateway.registerPublic(input);
        },
    );

    ctx.routeRegistry.register(
        createGatewayAdapterRoutes(
            "registration",
            gateway,
            ctx.gatewayRegistry,
            routeContext,
        ),
        "registration",
    );

    ctx.gatewayRegistry.register({
        id: "registration",
        name: "Registration Gateway",
        version: "1.1.7",
        description:
            "Registration workflows via pluggable invite/public adapters.",
        publisher: "Cognis Labs",
        hasAdapters: true,
    });
    ctx.log?.("info", "Registration gateway initialized.", {
        component: "registration-gateway",
        adapterCount: gateway.listAdapters().length,
    });
}

export function createRegistrationPageRoutes(routeContext?: RouteContext) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname !== "/register" || req.method !== "GET") return false;

        try {
            const file = await readFile(
                path.join(PUBLIC_ROOT, "pages", "register.html"),
            );
            ctx.setPageSecurityHeaders(res);
            res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            });
            res.end(file);
            return true;
        } catch {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "not_found", message: "Asset not found." },
                }),
            );
            return true;
        }
    };
}

export function createRegistrationRoutes(
    gateway: CoreRegistrationGateway,
    accountStore: LocalAccountStore,
    getTrustedDomains: () => Promise<string[]> = async () => [],
    isGatewayEnabled: () => boolean = () => true,
    log?: GatewayBootstrapContext["log"],
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const claims = ctx.getAuthClaims(req);
        const logMeta = {
            component: "registration-gateway",
            method: req.method ?? "GET",
            path: url.pathname,
            accountId: claims?.sub,
        };
        if (
            url.pathname === "/api/v1/auth/registration-config" &&
            req.method === "GET"
        ) {
            log?.("debug", "Read public registration config.", {
                ...logMeta,
                registrationsEnabled: gateway.isPublicEnabled(),
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        registrationsEnabled: gateway.isPublicEnabled(),
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/state" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            log?.("debug", "Read registration state.", {
                ...logMeta,
                accountId: claims.sub,
                gatewayEnabled: isGatewayEnabled(),
                inviteEnabled: gateway.isInviteEnabled(),
                publicEnabled: gateway.isPublicEnabled(),
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        gatewayEnabled: isGatewayEnabled(),
                        inviteEnabled: gateway.isInviteEnabled(),
                        publicEnabled: gateway.isPublicEnabled(),
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/invite" &&
            req.method === "GET"
        ) {
            if (!gateway.isInviteEnabled()) {
                res.writeHead(409, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invite_disabled",
                            message: "Invite registration is disabled",
                        },
                    }),
                );
                return true;
            }
            const token = String(url.searchParams.get("token") ?? "");
            if (!token) {
                log?.(
                    "warn",
                    "Invite lookup failed because token was missing.",
                    logMeta,
                );
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "token is required",
                        },
                    }),
                );
                return true;
            }
            const invite = await gateway.resolveInvite(token);
            if (!invite) {
                log?.(
                    "warn",
                    "Invite lookup failed because token was invalid.",
                    logMeta,
                );
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Invalid or expired registration token",
                        },
                    }),
                );
                return true;
            }
            log?.("debug", "Resolved registration invite.", {
                ...logMeta,
                inviterAccountId: invite.inviterAccountId,
                inviteeEmail: invite.inviteeEmail,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        inviterDisplayName: invite.inviterDisplayName,
                        inviteeEmail: invite.inviteeEmail,
                        expiresAt: invite.expiresAt,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/redeem" &&
            req.method === "POST"
        ) {
            if (!gateway.isInviteEnabled()) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Route not found",
                        },
                    }),
                );
                return true;
            }
            const body = await readJson(req);
            const token = String(body.token ?? "").trim();
            const username = String(body.username ?? "").trim();
            const password = String(body.password ?? "");
            const displayName = String(body.displayName ?? "").trim();
            try {
                const result = await gateway.redeemInvite({
                    token,
                    username,
                    password,
                    displayName,
                });
                log?.("info", "Redeemed registration invite.", {
                    ...logMeta,
                    createdAccountId: result.createdAccountId,
                    inviterAccountId: result.inviterAccountId,
                });
                res.writeHead(201, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: result }));
            } catch (error) {
                const code =
                    error instanceof Error ? error.message : "redeem_failed";
                log?.("warn", "Invite redemption failed.", {
                    ...logMeta,
                    code,
                    username,
                });
                const status = redeemInviteErrorStatus(code);
                res.writeHead(status, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: { code, message: code } }));
            }
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/tokens" &&
            req.method === "GET"
        ) {
            if (!gateway.isInviteEnabled()) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Route not found",
                        },
                    }),
                );
                return true;
            }
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const isPrivilegedRole =
                claims.role === "admin" || claims.role === "owner";
            const isFounder = await accountStore.isFounder(claims.sub);
            if (!isPrivilegedRole && !isFounder) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }
            const invites = isPrivilegedRole
                ? await gateway.listInvites({
                      includeClosed:
                          url.searchParams.get("includeClosed") === "true",
                  })
                : await gateway.listInvites({
                      inviterAccountId: claims.sub,
                      includeClosed:
                          url.searchParams.get("includeClosed") === "true",
                  });
            log?.("debug", "Listed registration invites.", {
                ...logMeta,
                accountId: claims.sub,
                count: invites.length,
                includeClosed: url.searchParams.get("includeClosed") === "true",
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: invites }));
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/tokens" &&
            req.method === "POST"
        ) {
            if (!gateway.isInviteEnabled()) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Route not found",
                        },
                    }),
                );
                return true;
            }
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const isPrivilegedRole =
                claims.role === "admin" || claims.role === "owner";
            const isFounder = await accountStore.isFounder(claims.sub);
            if (!isPrivilegedRole && !isFounder) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }
            const body = await readJson(req);
            const inviteeEmail = String(body.email ?? "")
                .trim()
                .toLowerCase();
            if (!inviteeEmail) {
                res.writeHead(400, { "content-type": "application/json" });
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
            const trustedDomains = await getTrustedDomains();
            if (trustedDomains.length > 0) {
                const emailDomain = inviteeEmail.split("@")[1] ?? "";
                const allowed = matchesTrustedDomain(
                    emailDomain,
                    trustedDomains,
                );
                if (!allowed) {
                    res.writeHead(422, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "email_domain_not_allowed",
                                message: "email_domain_not_allowed",
                            },
                        }),
                    );
                    return true;
                }
            }
            const inviterDisplayName =
                (await accountStore.getDisplayName(claims.sub)) ?? claims.sub;
            try {
                const created = await gateway.issueInvite({
                    inviterAccountId: claims.sub,
                    inviterDisplayName,
                    inviteeEmail,
                    inviterIsFounder: !isPrivilegedRole && isFounder,
                    inviteBaseUrl: inviteBaseUrl(),
                });
                log?.("info", "Issued registration invite.", {
                    ...logMeta,
                    accountId: claims.sub,
                    inviteeEmail,
                    tokenId: created.tokenId,
                });
                res.writeHead(201, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: created }));
            } catch (error) {
                const code =
                    error instanceof Error ? error.message : "invite_failed";
                log?.("warn", "Registration invite issuance failed.", {
                    ...logMeta,
                    accountId: claims.sub,
                    inviteeEmail,
                    code,
                });
                const status = issueInviteErrorStatus(code);
                res.writeHead(status, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: { code, message: code } }));
            }
            return true;
        }

        const revokeMatch = url.pathname.match(
            /^\/api\/v1\/registration\/tokens\/([^/]+)\/revoke$/,
        );
        if (revokeMatch && req.method === "POST") {
            if (!gateway.isInviteEnabled()) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Route not found",
                        },
                    }),
                );
                return true;
            }
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const tokenId = decodeURIComponent(revokeMatch[1]);
            const isPrivilegedRole =
                claims.role === "admin" || claims.role === "owner";
            const isFounder = await accountStore.isFounder(claims.sub);
            if (!isPrivilegedRole && !isFounder) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }
            if (!isPrivilegedRole) {
                const myInvites = await gateway.listInvites({
                    inviterAccountId: claims.sub,
                });
                if (!myInvites.some((invite) => invite.id === tokenId)) {
                    res.writeHead(403, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "forbidden",
                                message: "Access denied",
                            },
                        }),
                    );
                    return true;
                }
            }
            const revoked = await gateway.revokeInvite({
                tokenId,
                revokedByAccountId: claims.sub,
            });
            if (!revoked) {
                log?.(
                    "warn",
                    "Registration invite revocation failed because token was not found.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                        tokenId,
                    },
                );
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Token not found",
                        },
                    }),
                );
                return true;
            }
            log?.("info", "Revoked registration invite.", {
                ...logMeta,
                accountId: claims.sub,
                tokenId,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { revoked: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/token-manager" &&
            req.method === "GET"
        ) {
            if (!gateway.isInviteEnabled()) {
                res.writeHead(302, { location: "/dashboard" });
                res.end();
                return true;
            }
            const session = ctx.getCookieSession(req);
            if (!session) {
                res.writeHead(302, { location: "/login" });
                res.end();
                return true;
            }
            res.writeHead(302, { location: "/administration" });
            res.end();
            return true;
        }

        return false;
    };
}

function createGatewayAdapterRoutes(
    gatewayId: string,
    gateway: CoreRegistrationGateway,
    gatewayRegistry: GatewayRegistry,
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
            res.end(JSON.stringify({ data: gateway.listAdapters() }));
            return true;
        }

        const toggleMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (toggleMatch && req.method === "POST") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(toggleMatch[1]);
            const action = toggleMatch[2] as "enable" | "disable";
            const known = gateway
                .listAdapters()
                .some((a) => a.id === adapterId);
            if (!known) {
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
                const gwEntry = gatewayRegistry.get(gatewayId);
                if (gwEntry?.status === "disabled") {
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
            res.end(
                JSON.stringify({
                    data: { enabled: action === "enable" },
                }),
            );
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);
            const adapter = gateway
                .listAdapters()
                .find((a) => a.id === adapterId);
            if (!adapter) {
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
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: { enabled: adapter.enabled },
                    requiredFields: [],
                    schema: [],
                    supportsTest: false,
                }),
            );
            return true;
        }

        return false;
    };
}
