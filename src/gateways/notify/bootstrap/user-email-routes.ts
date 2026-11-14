import {
    createEmailVerification,
    EmailVerificationError,
    type EmailVerificationDelivery,
    type EmailVerification,
} from "./email-verification.js";
import {
    emailVerificationKey,
    parseEmailVerificationKey,
} from "./email-verification-key.js";
import { readJson } from "../../shared.js";
import { TfaCodeService } from "../../reuse/tfa-code.js";
import { VerifyTokenService } from "../../../api/reuse/verify-token.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { NotificationUserEmailStore } from "./stores.js";

/**
 * Creates route handlers for all user email management endpoints. These routes
 * are owned by the notification gateway because they depend on the notification
 * store and verification email sender — concepts the core knows nothing about.
 *
 *   GET    /api/v1/notify/users/:id/emails
 *   POST   /api/v1/notify/users/:id/emails
 *   DELETE /api/v1/notify/users/:id/emails/:addr
 *   PUT    /api/v1/notify/users/:id/emails/:addr/primary
 *   POST   /api/v1/notify/users/:id/emails/:addr/verify
 *   POST   /api/v1/notify/users/:id/emails/:addr/resend
 *   GET    /api/v1/notify/users/:id/emails/:addr/verify  (redirect)
 *   GET    /api/v1/notify/verify-tokens/status
 *   POST   /api/v1/notify/verify-email
 */
export function createUserEmailRoutes(
    notifStore: NotificationUserEmailStore,
    tfaService: TfaCodeService,
    verifyTokenService: VerifyTokenService,
    emailDelivery: EmailVerificationDelivery,
    externalHost?: string,
    routeContext?: RouteContext,
    getVerificationCodeLength?: () => number | undefined,
    verification?: EmailVerification,
) {
    const ctx = resolveRouteContext(routeContext);
    const emailVerification =
        verification ??
        createEmailVerification(
            notifStore,
            tfaService,
            verifyTokenService,
            emailDelivery,
            externalHost,
            getVerificationCodeLength,
        );
    const respondVerification = async (
        res: ServerResponse,
        status: number,
        operation: () => Promise<unknown>,
    ) => {
        try {
            const data = await operation();
            res.writeHead(status, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
        } catch (error) {
            if (!(error instanceof EmailVerificationError)) throw error;
            res.writeHead(error.status, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: error.code, message: error.message },
                }),
            );
        }
    };
    const issueVerificationCode = (key: string) =>
        tfaService.issueOrGet(
            key,
            15 * 60 * 1000,
            getVerificationCodeLength?.(),
        );
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/notify/verify-tokens/status" &&
            req.method === "GET"
        ) {
            const token = url.searchParams.get("token") ?? "";
            const pending = !!(token && verifyTokenService.isLive(token));
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { pending } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/notify/verify-email" &&
            req.method === "POST"
        ) {
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
            const identity = parseEmailVerificationKey(userEmailPair);
            if (!identity) {
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
            const [username, email] = identity;
            await notifStore.verifyUserEmail(username, email);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { verified: true } }));
            return true;
        }

        const emailsMatch = url.pathname.match(
            /^\/api\/v1\/notify\/users\/([^/]+)\/emails$/,
        );
        if (emailsMatch) {
            const username = decodeURIComponent(emailsMatch[1]);
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
                const emails = await notifStore.getUserEmails(username);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: emails }));
                return true;
            }

            if (req.method === "POST") {
                const body = await readJson(req);
                await respondVerification(res, 201, () =>
                    emailVerification.add(username, String(body.email ?? "")),
                );
                return true;
            }

            return false;
        }

        const emailActionsMatch = url.pathname.match(
            /^\/api\/v1\/notify\/users\/([^/]+)\/emails\/([^/]+)(?:\/(primary|verify|resend))?$/,
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
                await respondVerification(res, 200, () =>
                    emailVerification.verify(
                        username,
                        email,
                        String(body.code ?? ""),
                    ),
                );
                return true;
            }

            if (req.method === "POST" && emailAction === "resend") {
                if (!emailDelivery.canSendVerificationEmail()) {
                    res.writeHead(503, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "email_delivery_unavailable",
                                message: "Email delivery is not configured",
                            },
                        }),
                    );
                    return true;
                }
                const emails = await notifStore.getUserEmails(username);
                const resendTarget = emails.find(
                    (emailEntry) => emailEntry.email === email,
                );
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
                    const key = emailVerificationKey(username, email);
                    const code = issueVerificationCode(key);
                    const watchToken = verifyTokenService.issueOrGet(key);
                    const verifyUrl = externalHost
                        ? `${externalHost}/verify-email?token=${watchToken}`
                        : undefined;
                    await emailDelivery.sendEmail({
                        purpose: emailDelivery.purpose,
                        recipientEmail: email,
                        variables: { code, verifyUrl: verifyUrl ?? "" },
                    });
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
                    if (msg === "email_rate_limited") {
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
