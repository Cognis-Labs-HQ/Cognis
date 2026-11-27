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
    notificationStore: NotificationUserEmailStore,
    tfaService: TfaCodeService,
    verifyTokenService: VerifyTokenService,
    emailDelivery: {
        purpose: string;
        canSendVerificationEmail: () => boolean;
        sendEmail: (input: {
            purpose: string;
            recipientEmail: string;
            variables: Record<string, string>;
        }) => Promise<unknown>;
    },
    externalHost?: string,
    routeContext?: RouteContext,
    getVerificationCodeLength?: () => number | undefined,
) {
    const ctx = resolveRouteContext(routeContext);
    const issueVerificationCode = (key: string) =>
        tfaService.issueOrGet(
            key,
            15 * 60 * 1000,
            getVerificationCodeLength?.(),
        );
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/notify/verify-tokens/status" &&
            request.method === "GET"
        ) {
            const token = url.searchParams.get("token") ?? "";
            const pending = !!(token && verifyTokenService.isLive(token));
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { pending } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/notify/verify-email" &&
            request.method === "POST"
        ) {
            const body = await readJson(request);
            const token = String(body.token ?? "").trim();
            if (!token) {
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
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
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
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
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
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
            await notificationStore.verifyUserEmail(username, email);
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { verified: true } }));
            return true;
        }

        const emailsMatch = url.pathname.match(
            /^\/api\/v1\/notify\/users\/([^/]+)\/emails$/,
        );
        if (emailsMatch) {
            const username = decodeURIComponent(emailsMatch[1]);
            const claims = ctx.getAuthClaims(request);
            if (!claims) {
                response.writeHead(401, { "content-type": "application/json" });
                response.end(
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
                response.writeHead(403, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }

            if (request.method === "GET") {
                const emails = await notificationStore.getUserEmails(username);
                response.writeHead(200, { "content-type": "application/json" });
                response.end(JSON.stringify({ data: emails }));
                return true;
            }

            if (request.method === "POST") {
                const body = await readJson(request);
                const email = String(body.email ?? "")
                    .trim()
                    .toLowerCase();
                if (!email) {
                    response.writeHead(400, {
                        "content-type": "application/json",
                    });
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
                const existingEmails =
                    await notificationStore.getUserEmails(username);
                const existingEntry = existingEmails.find(
                    (emailEntry) => emailEntry.email === email,
                );
                if (existingEntry?.verified) {
                    response.writeHead(409, {
                        "content-type": "application/json",
                    });
                    response.end(
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
                    await notificationStore.isEmailRegisteredByOtherUser(
                        email,
                        username,
                    );
                if (takenByOther) {
                    response.writeHead(409, {
                        "content-type": "application/json",
                    });
                    response.end(
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
                if (!emailDelivery.canSendVerificationEmail()) {
                    response.writeHead(503, {
                        "content-type": "application/json",
                    });
                    response.end(
                        JSON.stringify({
                            error: {
                                code: "email_delivery_unavailable",
                                message:
                                    "Email verification is not available. Contact your administrator.",
                            },
                        }),
                    );
                    return true;
                }

                await notificationStore.addUserEmail(username, email);

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
                    response.writeHead(201, {
                        "content-type": "application/json",
                    });
                    response.end(
                        JSON.stringify({
                            data: {
                                added: true,
                                pendingVerification: true,
                                ...(watchToken && { watchToken }),
                            },
                        }),
                    );
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : String(error);
                    if (message === "email_rate_limited") {
                        response.writeHead(429, {
                            "content-type": "application/json",
                        });
                        response.end(
                            JSON.stringify({
                                error: {
                                    code: "rate_limited",
                                    message:
                                        "Verification email sent too recently. Please wait before requesting another.",
                                },
                            }),
                        );
                    } else {
                        response.writeHead(201, {
                            "content-type": "application/json",
                        });
                        response.end(
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

            if (request.method === "GET" && emailAction === "verify") {
                const token = url.searchParams.get("token") ?? "";
                if (token) {
                    response.writeHead(302, {
                        location: `/verify-email?token=${encodeURIComponent(token)}`,
                    });
                } else {
                    response.writeHead(302, { location: "/verify-email" });
                }
                response.end();
                return true;
            }

            const claims = ctx.getAuthClaims(request);
            if (!claims) {
                response.writeHead(401, { "content-type": "application/json" });
                response.end(
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
                response.writeHead(403, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }

            if (request.method === "DELETE" && !emailAction) {
                const forceUnverified =
                    url.searchParams.get("force") === "true";
                try {
                    if (forceUnverified) {
                        await notificationStore.removeUnverifiedEmail(
                            username,
                            email,
                        );
                    } else {
                        await notificationStore.removeUserEmail(
                            username,
                            email,
                        );
                    }
                    response.writeHead(200, {
                        "content-type": "application/json",
                    });
                    response.end(JSON.stringify({ data: { removed: true } }));
                } catch (error) {
                    const code =
                        error instanceof Error
                            ? error.message
                            : "remove_failed";
                    const status =
                        code === "cannot_remove_primary_email" ||
                        code === "cannot_remove_last_email"
                            ? 409
                            : 500;
                    response.writeHead(status, {
                        "content-type": "application/json",
                    });
                    response.end(
                        JSON.stringify({ error: { code, message: code } }),
                    );
                }
                return true;
            }

            if (request.method === "PUT" && emailAction === "primary") {
                await notificationStore.setPrimaryEmail(username, email);
                response.writeHead(200, { "content-type": "application/json" });
                response.end(JSON.stringify({ data: { updated: true } }));
                return true;
            }

            if (request.method === "POST" && emailAction === "verify") {
                const body = await readJson(request);
                const code = String(body.code ?? "").trim();
                const valid = tfaService.verify(
                    emailVerificationKey(username, email),
                    code,
                );
                if (!valid) {
                    response.writeHead(422, {
                        "content-type": "application/json",
                    });
                    response.end(
                        JSON.stringify({
                            error: {
                                code: "invalid_code",
                                message: "Invalid or expired verification code",
                            },
                        }),
                    );
                    return true;
                }
                await notificationStore.verifyUserEmail(username, email);
                response.writeHead(200, { "content-type": "application/json" });
                response.end(JSON.stringify({ data: { verified: true } }));
                return true;
            }

            if (request.method === "POST" && emailAction === "resend") {
                if (!emailDelivery.canSendVerificationEmail()) {
                    response.writeHead(503, {
                        "content-type": "application/json",
                    });
                    response.end(
                        JSON.stringify({
                            error: {
                                code: "email_delivery_unavailable",
                                message: "Email delivery is not configured",
                            },
                        }),
                    );
                    return true;
                }
                const emails = await notificationStore.getUserEmails(username);
                const resendTarget = emails.find(
                    (emailEntry) => emailEntry.email === email,
                );
                if (!resendTarget) {
                    response.writeHead(404, {
                        "content-type": "application/json",
                    });
                    response.end(
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
                    response.writeHead(409, {
                        "content-type": "application/json",
                    });
                    response.end(
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
                    response.writeHead(200, {
                        "content-type": "application/json",
                    });
                    response.end(
                        JSON.stringify({
                            data: {
                                pendingVerification: true,
                                ...(watchToken && { watchToken }),
                            },
                        }),
                    );
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : String(error);
                    if (message === "email_rate_limited") {
                        response.writeHead(429, {
                            "content-type": "application/json",
                        });
                        response.end(
                            JSON.stringify({
                                error: {
                                    code: "rate_limited",
                                    message:
                                        "Verification email sent too recently. Please wait before requesting another.",
                                },
                            }),
                        );
                    } else {
                        response.writeHead(500, {
                            "content-type": "application/json",
                        });
                        response.end(
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
