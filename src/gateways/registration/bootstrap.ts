import path from "node:path";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
    getCookieSession,
    readJson,
    requireAuth,
    setPageSecurityHeaders,
    type GatewayBootstrapContext,
    type GatewayRegistry,
} from "../shared.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";
import type { LocalAccountStore } from "../../api/reuse/account-store.js";
import type { UserPreferenceStore } from "../../api/reuse/preference-store.js";
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
    const dbExecutor = (ctx.capabilities.get<DbExecutor>("db:executor") ??
        ctx.dbExecutor)!;
    const dbType =
        ctx.capabilities.get<SupportedDbType>("db:type") ??
        ctx.dbType ??
        "sqlite";
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
    const gateway = new CoreRegistrationGateway(dbExecutor, dbType);
    await gateway.ensureSchema();
    const registrationAdaptersRoot = path.join(
        ctx.adaptersRoot,
        "registration",
    );
    await gateway.discoverAdapters(registrationAdaptersRoot, {
        dbExecutor,
        dbType,
        accountStore,
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

    const preferenceStore =
        ctx.capabilities.get<UserPreferenceStore>("preferences:store");

    const SECURITY_SETTINGS_KEY = "security-settings";

    async function getTrustedDomains(): Promise<string[]> {
        if (!preferenceStore) return [];
        const raw = await preferenceStore
            .get("__system__", SECURITY_SETTINGS_KEY)
            .catch(() => null);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw) as { trustedDomains?: unknown };
            if (!Array.isArray(parsed.trustedDomains)) return [];
            return parsed.trustedDomains
                .filter((d: unknown) => typeof d === "string")
                .map((d: string) => d.trim().toLowerCase())
                .filter(Boolean);
        } catch {
            return [];
        }
    }

    ctx.routeRegistry.register(
        createRegistrationRoutes(gateway, accountStore, getTrustedDomains),
        "registration",
    );
    ctx.routeRegistry.register(createRegistrationPageRoutes(), "registration");
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
    });
    ctx.uiRegistry?.registerStaticDir("registration", uiDir);
    ctx.uiRegistry?.registerNavbarPlugin({
        scriptUrl: "/static/gateways/registration/navbar.js",
    });
    ctx.uiRegistry?.registerAuthTypingMessage({
        id: "registration-register-today",
        textKey: "ui.app.login.typing.sample.7",
        ownerType: "gateway",
        ownerId: "registration",
    });

    ctx.capabilities.contribute("registration:public:isEnabled", () =>
        gateway.isPublicEnabled(),
    );
    ctx.capabilities.contribute(
        "registration:public:register",
        async (input: {
            username: string;
            password: string;
            email?: string;
            displayName?: string;
        }) => gateway.registerPublic(input),
    );

    ctx.routeRegistry.register(
        createGatewayAdapterRoutes(
            "registration",
            gateway,
            ctx.gatewayRegistry,
        ),
        "registration",
    );

    ctx.gatewayRegistry.register({
        id: "registration",
        name: "Registration Gateway",
        version: "1.1.0",
        description:
            "Registration workflows via pluggable invite/public adapters.",
        publisher: "Cognis Labs",
        hasAdapters: true,
    });
}

export function createRegistrationPageRoutes() {
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
            setPageSecurityHeaders(res);
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
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/auth/registration-config" &&
            req.method === "GET"
        ) {
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
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
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
            const token = String(url.searchParams.get("token") ?? "");
            if (!token) {
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
                res.writeHead(201, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: result }));
            } catch (error) {
                const code =
                    error instanceof Error ? error.message : "redeem_failed";
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
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const isAdmin = claims.role === "admin";
            const isFounder = await accountStore.isFounder(claims.sub);
            if (!isAdmin && !isFounder) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }
            const invites = isAdmin
                ? await gateway.listInvites({
                      includeClosed:
                          url.searchParams.get("includeClosed") === "true",
                  })
                : await gateway.listInvites({
                      inviterAccountId: claims.sub,
                      includeClosed:
                          url.searchParams.get("includeClosed") === "true",
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
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const isAdmin = claims.role === "admin";
            const isFounder = await accountStore.isFounder(claims.sub);
            if (!isAdmin && !isFounder) {
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
                const allowed = trustedDomains.some(
                    (d) => d === emailDomain || emailDomain.endsWith(`.${d}`),
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
                    inviterIsFounder: !isAdmin && isFounder,
                    inviteBaseUrl: inviteBaseUrl(),
                });
                res.writeHead(201, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: created }));
            } catch (error) {
                const code =
                    error instanceof Error ? error.message : "invite_failed";
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
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const tokenId = decodeURIComponent(revokeMatch[1]);
            const isAdmin = claims.role === "admin";
            const isFounder = await accountStore.isFounder(claims.sub);
            if (!isAdmin && !isFounder) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }
            if (!isAdmin) {
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
            const session = getCookieSession(req);
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
            res.end(JSON.stringify({ data: gateway.listAdapters() }));
            return true;
        }

        const toggleMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (toggleMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
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
            if (!requireAuth(req, res, "admin")) return true;
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
                }),
            );
            return true;
        }

        return false;
    };
}
