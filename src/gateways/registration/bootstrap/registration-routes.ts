import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson, type GatewayBootstrapContext } from "../../shared.js";
import type { LocalAccountStore } from "@cognis/core";
import { matchesTrustedDomain } from "../../../api/reuse/security-settings.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { CoreRegistrationGateway } from "../gateway.js";
import {
    inviteBaseUrl,
    issueInviteErrorStatus,
    redeemInviteErrorStatus,
} from "./helpers.js";

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
            url.pathname === "/api/v1/registration/state" &&
            req.method === "GET"
        ) {
            const authenticatedClaims = ctx.requireAuth(req, res, "user");
            if (!authenticatedClaims) return true;
            log?.("debug", "Read registration state.", {
                ...logMeta,
                accountId: authenticatedClaims.sub,
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
            const authenticatedClaims = ctx.requireAuth(req, res, "user");
            if (!authenticatedClaims) return true;
            const isPrivilegedRole =
                authenticatedClaims.role === "admin" ||
                authenticatedClaims.role === "owner";
            const isFounder = await accountStore.isFounder(
                authenticatedClaims.sub,
            );
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
                      inviterAccountId: authenticatedClaims.sub,
                      includeClosed:
                          url.searchParams.get("includeClosed") === "true",
                  });
            log?.("debug", "Listed registration invites.", {
                ...logMeta,
                accountId: authenticatedClaims.sub,
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
            const authenticatedClaims = ctx.requireAuth(req, res, "user");
            if (!authenticatedClaims) return true;
            const isPrivilegedRole =
                authenticatedClaims.role === "admin" ||
                authenticatedClaims.role === "owner";
            const isFounder = await accountStore.isFounder(
                authenticatedClaims.sub,
            );
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
                (await accountStore.getDisplayName(authenticatedClaims.sub)) ??
                authenticatedClaims.sub;
            try {
                const created = await gateway.issueInvite({
                    inviterAccountId: authenticatedClaims.sub,
                    inviterDisplayName,
                    inviteeEmail,
                    inviterIsFounder: !isPrivilegedRole && isFounder,
                    inviteBaseUrl: inviteBaseUrl(),
                });
                log?.("info", "Issued registration invite.", {
                    ...logMeta,
                    accountId: authenticatedClaims.sub,
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
                    accountId: authenticatedClaims.sub,
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
            const authenticatedClaims = ctx.requireAuth(req, res, "user");
            if (!authenticatedClaims) return true;
            const tokenId = decodeURIComponent(revokeMatch[1]);
            const isPrivilegedRole =
                authenticatedClaims.role === "admin" ||
                authenticatedClaims.role === "owner";
            const isFounder = await accountStore.isFounder(
                authenticatedClaims.sub,
            );
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
                    inviterAccountId: authenticatedClaims.sub,
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
                revokedByAccountId: authenticatedClaims.sub,
            });
            if (!revoked) {
                log?.(
                    "warn",
                    "Registration invite revocation failed because token was not found.",
                    {
                        ...logMeta,
                        accountId: authenticatedClaims.sub,
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
                accountId: authenticatedClaims.sub,
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
