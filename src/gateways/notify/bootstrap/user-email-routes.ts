import { readJson } from "../../shared.js";
import { TfaCodeService } from "../../../api/reuse/tfa-code.js";
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
    emailDelivery: {
        canSendVerificationEmail: () => boolean;
        sendEmail: (input: {
            recipientEmail: string;
            templateId: string;
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
                    (emailEntry) => emailEntry.email === email,
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
                if (!emailDelivery.canSendVerificationEmail()) {
                    res.writeHead(503, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "smtp_unavailable",
                                message:
                                    "Email verification is not available. Contact your administrator.",
                            },
                        }),
                    );
                    return true;
                }

                await notifStore.addUserEmail(username, email);

                try {
                    const key = `${username}:${email}`;
                    const code = issueVerificationCode(key);
                    const watchToken = verifyTokenService.issueOrGet(key);
                    const verifyUrl = externalHost
                        ? `${externalHost}/verify-email?token=${watchToken}`
                        : undefined;
                    await emailDelivery.sendEmail({
                        recipientEmail: email,
                        templateId: "notify-verification",
                        variables: { code, verifyUrl: verifyUrl ?? "" },
                    });
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
                    const key = `${username}:${email}`;
                    const code = issueVerificationCode(key);
                    const watchToken = verifyTokenService.issueOrGet(key);
                    const verifyUrl = externalHost
                        ? `${externalHost}/verify-email?token=${watchToken}`
                        : undefined;
                    await emailDelivery.sendEmail({
                        recipientEmail: email,
                        templateId: "notify-verification",
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
