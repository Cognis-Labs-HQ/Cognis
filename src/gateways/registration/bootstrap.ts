import path from "node:path";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
    getCookieSession,
    readJson,
    requireAuth,
    setPageSecurityHeaders,
    type GatewayBootstrapContext,
} from "../shared.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";
import type { LocalAccountStore } from "../../api/reuse/account-store.js";
import { createAdapter } from "../../adapters/registration/token/index.js";
import { CoreRegistrationGateway } from "./gateway.js";

const PUBLIC_ROOT = path.resolve(process.cwd(), "src", "ui", "public");

function inviteBaseUrl(): string {
    if (process.env.EXTERNAL_HOST) return process.env.EXTERNAL_HOST;
    if (process.env.HOST) return `http://${process.env.HOST}`;
    return "http://localhost:3000";
}

function issueInviteErrorStatus(code: string): number {
    if (code === "smtp_unavailable") return 503;
    if (code === "founder_token_limit_reached") return 429;
    if (code === "invitee_email_required") return 400;
    if (code === "email_taken") return 409;
    return 500;
}

function redeemInviteErrorStatus(code: string): number {
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
    if (!canSendInviteEmail || !sendInviteEmail) return;

    const createProfile = ctx.capabilities.get<
        (accountId: string, handle: string, role?: string) => Promise<void>
    >("profile:createProfile");
    const isEmailRegistered = ctx.capabilities.get<
        (email: string) => Promise<boolean>
    >("notify:isEmailRegistered");
    const upsertVerifiedPrimaryEmail = ctx.capabilities.get<
        (accountId: string, email: string) => Promise<void>
    >("notify:upsertVerifiedPrimaryEmail");
    if (!isEmailRegistered || !upsertVerifiedPrimaryEmail) return;
    const adapter = createAdapter({
        dbExecutor,
        dbType,
        accountStore,
        canSendInviteEmail,
        sendInviteEmail,
        createProfile,
        isEmailRegistered,
        upsertVerifiedPrimaryEmail,
    });
    const gateway = new CoreRegistrationGateway(adapter);

    ctx.routeRegistry.register(
        createRegistrationRoutes(gateway, accountStore),
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

    ctx.gatewayRegistry.register({
        id: "registration",
        name: "Registration Gateway",
        version: "1.0.2",
        description: "Invitation-token account registration workflow.",
        publisher: "Cognis Labs",
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
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/registration/invite" &&
            req.method === "GET"
        ) {
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
