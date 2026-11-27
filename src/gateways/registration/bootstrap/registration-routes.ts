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
    issueAccessToken?: (
        subject: string,
        role: "user",
        ttlSeconds: number,
    ) => string,
) {
    const ctx = resolveRouteContext(routeContext);
    const getInvitationPolicy = () =>
        typeof gateway.getInvitationPolicy === "function"
            ? gateway.getInvitationPolicy()
            : Promise.resolve({
                  founderInvitesEnabled: true,
                  adminInvitesEnabled: true,
              });
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const claims = ctx.getAuthClaims(request);
        const logMetadata = {
            component: "registration-gateway",
            method: request.method ?? "GET",
            path: url.pathname,
            accountId: claims?.sub,
        };
        if (
            url.pathname === "/api/v1/registration/state" &&
            request.method === "GET"
        ) {
            const authenticatedClaims = ctx.requireAuth(
                request,
                response,
                "user",
            );
            if (!authenticatedClaims) return true;
            const invitationPolicy = await getInvitationPolicy();
            const isFounder = await accountStore.isFounder(
                authenticatedClaims.sub,
            );
            const canInvite =
                authenticatedClaims.role === "owner" ||
                (authenticatedClaims.role === "admin" &&
                    invitationPolicy.adminInvitesEnabled) ||
                (isFounder && invitationPolicy.founderInvitesEnabled);
            const canGenerateToken =
                authenticatedClaims.role === "admin" ||
                authenticatedClaims.role === "owner";
            log?.("debug", "Read registration state.", {
                ...logMetadata,
                accountId: authenticatedClaims.sub,
                gatewayEnabled: isGatewayEnabled(),
                inviteEnabled: gateway.isInviteEnabled(),
                publicEnabled: gateway.isPublicEnabled(),
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    data: {
                        gatewayEnabled: isGatewayEnabled(),
                        inviteEnabled: gateway.isInviteEnabled(),
                        publicEnabled: gateway.isPublicEnabled(),
                        canInvite,
                        canGenerateToken,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/policy" &&
            request.method === "GET"
        ) {
            const authenticatedClaims = ctx.requireAuth(
                request,
                response,
                "admin",
            );
            if (!authenticatedClaims) return true;
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    data: await getInvitationPolicy(),
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/policy" &&
            request.method === "PUT"
        ) {
            const authenticatedClaims = ctx.requireAuth(
                request,
                response,
                "owner",
            );
            if (!authenticatedClaims) return true;
            const body = await readJson(request);
            await gateway.setInvitationPolicy({
                publicRegistrationEnabled:
                    body.publicRegistrationEnabled === true,
                founderInvitesEnabled: body.founderInvitesEnabled !== false,
                adminInvitesEnabled: body.adminInvitesEnabled !== false,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/invite" &&
            request.method === "GET"
        ) {
            if (!gateway.isInviteEnabled()) {
                response.writeHead(409, { "content-type": "application/json" });
                response.end(
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
                    logMetadata,
                );
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
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
                    logMetadata,
                );
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
                ...logMetadata,
                inviterAccountId: invite.inviterAccountId,
                inviteeEmail: invite.inviteeEmail,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
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
            request.method === "POST"
        ) {
            if (!gateway.isInviteEnabled()) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Route not found",
                        },
                    }),
                );
                return true;
            }
            const body = await readJson(request);
            const token = String(body.token ?? "").trim();
            const username = String(body.username ?? "").trim();
            const password = String(body.password ?? "");
            const displayName = String(body.displayName ?? "").trim();
            const email = String(body.email ?? "").trim();
            try {
                const result = await gateway.redeemInvite({
                    token,
                    username,
                    password,
                    displayName,
                    email,
                });
                const verifyToken = issueAccessToken?.(
                    result.createdAccountId,
                    "user",
                    1800,
                );
                log?.("info", "Redeemed registration invite.", {
                    ...logMetadata,
                    createdAccountId: result.createdAccountId,
                    inviterAccountId: result.inviterAccountId,
                });
                response.writeHead(201, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({ data: { ...result, verifyToken } }),
                );
            } catch (error) {
                const code =
                    error instanceof Error ? error.message : "redeem_failed";
                log?.("warn", "Invite redemption failed.", {
                    ...logMetadata,
                    code,
                    username,
                });
                const status = redeemInviteErrorStatus(code);
                response.writeHead(status, {
                    "content-type": "application/json",
                });
                response.end(
                    JSON.stringify({ error: { code, message: code } }),
                );
            }
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/tokens" &&
            request.method === "GET"
        ) {
            if (!gateway.isInviteEnabled()) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Route not found",
                        },
                    }),
                );
                return true;
            }
            const authenticatedClaims = ctx.requireAuth(
                request,
                response,
                "user",
            );
            if (!authenticatedClaims) return true;
            const isFounder = await accountStore.isFounder(
                authenticatedClaims.sub,
            );
            const invitationPolicy = await getInvitationPolicy();
            const canInvite =
                authenticatedClaims.role === "owner" ||
                (authenticatedClaims.role === "admin" &&
                    invitationPolicy.adminInvitesEnabled) ||
                (isFounder && invitationPolicy.founderInvitesEnabled);
            if (!canInvite) {
                response.writeHead(403, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }
            const invites = await gateway.listInvites({
                inviterAccountId: authenticatedClaims.sub,
                includeClosed: url.searchParams.get("includeClosed") === "true",
            });
            log?.("debug", "Listed registration invites.", {
                ...logMetadata,
                accountId: authenticatedClaims.sub,
                count: invites.length,
                includeClosed: url.searchParams.get("includeClosed") === "true",
            });
            response.writeHead(200, {
                "content-type": "application/json",
                "cache-control": "no-store",
            });
            response.end(JSON.stringify({ data: invites }));
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/tokens" &&
            request.method === "POST"
        ) {
            if (!gateway.isInviteEnabled()) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Route not found",
                        },
                    }),
                );
                return true;
            }
            const authenticatedClaims = ctx.requireAuth(
                request,
                response,
                "user",
            );
            if (!authenticatedClaims) return true;
            const isPrivilegedRole =
                authenticatedClaims.role === "admin" ||
                authenticatedClaims.role === "owner";
            const isFounder = await accountStore.isFounder(
                authenticatedClaims.sub,
            );
            const invitationPolicy = await getInvitationPolicy();
            const canInvite =
                authenticatedClaims.role === "owner" ||
                (authenticatedClaims.role === "admin" &&
                    invitationPolicy.adminInvitesEnabled) ||
                (isFounder && invitationPolicy.founderInvitesEnabled);
            if (!canInvite) {
                response.writeHead(403, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }
            const body = await readJson(request);
            const deliverEmail = body.delivery !== "manual";
            if (!deliverEmail && !isPrivilegedRole) {
                response.writeHead(403, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }
            const inviteeEmail = String(body.email ?? "")
                .trim()
                .toLowerCase();
            if (deliverEmail && !inviteeEmail) {
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
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
            if (inviteeEmail && trustedDomains.length > 0) {
                const emailDomain = inviteeEmail.split("@")[1] ?? "";
                const allowed = matchesTrustedDomain(
                    emailDomain,
                    trustedDomains,
                );
                if (!allowed) {
                    response.writeHead(422, {
                        "content-type": "application/json",
                    });
                    response.end(
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
                    deliverEmail,
                });
                log?.("info", "Issued registration invite.", {
                    ...logMetadata,
                    accountId: authenticatedClaims.sub,
                    inviteeEmail,
                    tokenId: created.tokenId,
                });
                response.writeHead(201, { "content-type": "application/json" });
                response.end(JSON.stringify({ data: created }));
            } catch (error) {
                const code =
                    error instanceof Error ? error.message : "invite_failed";
                log?.("warn", "Registration invite issuance failed.", {
                    ...logMetadata,
                    accountId: authenticatedClaims.sub,
                    inviteeEmail,
                    code,
                });
                const status = issueInviteErrorStatus(code);
                response.writeHead(status, {
                    "content-type": "application/json",
                });
                response.end(
                    JSON.stringify({ error: { code, message: code } }),
                );
            }
            return true;
        }

        const founderResetMatch = url.pathname.match(
            /^\/api\/v1\/registration\/founders\/([^/]+)\/reset-invite-limit$/,
        );
        if (founderResetMatch && request.method === "POST") {
            const authenticatedClaims = ctx.requireAuth(
                request,
                response,
                "admin",
            );
            if (!authenticatedClaims) return true;
            const accountId = decodeURIComponent(founderResetMatch[1]);
            await gateway.resetFounderInviteLimit(accountId);
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { reset: true } }));
            return true;
        }

        const revokeMatch = url.pathname.match(
            /^\/api\/v1\/registration\/tokens\/([^/]+)\/revoke$/,
        );
        if (revokeMatch && request.method === "POST") {
            if (!gateway.isInviteEnabled()) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Route not found",
                        },
                    }),
                );
                return true;
            }
            const authenticatedClaims = ctx.requireAuth(
                request,
                response,
                "user",
            );
            if (!authenticatedClaims) return true;
            const tokenId = decodeURIComponent(revokeMatch[1]);
            const isPrivilegedRole =
                authenticatedClaims.role === "admin" ||
                authenticatedClaims.role === "owner";
            const isFounder = await accountStore.isFounder(
                authenticatedClaims.sub,
            );
            if (!isPrivilegedRole && !isFounder) {
                response.writeHead(403, { "content-type": "application/json" });
                response.end(
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
                    response.writeHead(403, {
                        "content-type": "application/json",
                    });
                    response.end(
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
                        ...logMetadata,
                        accountId: authenticatedClaims.sub,
                        tokenId,
                    },
                );
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
                ...logMetadata,
                accountId: authenticatedClaims.sub,
                tokenId,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { revoked: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/registration/token-manager" &&
            request.method === "GET"
        ) {
            if (!gateway.isInviteEnabled()) {
                response.writeHead(302, { location: "/dashboard" });
                response.end();
                return true;
            }
            const session = ctx.getCookieSession(request);
            if (!session) {
                response.writeHead(302, { location: "/login" });
                response.end();
                return true;
            }
            response.writeHead(302, { location: "/administration" });
            response.end();
            return true;
        }

        return false;
    };
}
