import type { IncomingMessage, ServerResponse } from "node:http";
import type { LocalAccountStore } from "../../adapters/local-auth-gateway.js";
import { getAuthClaims, requireAuth } from "../../auth/guard.js";
import type { UserPreferenceStore } from "../preferences/index.js";
import type { ProfileCreateStore } from "../../adapters/db/profile-store.js";
import { readJson } from "../read-json.js";
import type { DbNotificationStore } from "../../adapters/db/notification-store.js";
import type { TfaCodeService } from "../../utils/tfa-code.js";
import type { VerifyTokenService } from "../../utils/verify-token.js";
import type { VerificationEmailSender } from "../../gateways/notification.js";

const VALID_ROLES = new Set(["user", "teacher", "moderator", "admin"]);

export function createUserRoutes(
    accountStore: LocalAccountStore,
    preferenceStore: UserPreferenceStore,
    profileStore?: ProfileCreateStore,
    notifStore?: DbNotificationStore,
    tfaService?: TfaCodeService,
    verificationEmailSender?: VerificationEmailSender,
    verifyTokenService?: VerifyTokenService,
    externalHost?: string,
) {
    const adminRoutes = async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === "/api/v1/users" && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: await accountStore.list() }));
            return true;
        }

        const infoMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/info$/,
        );
        if (infoMatch && req.method === "GET") {
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
            const target = decodeURIComponent(infoMatch[1]);
            if (claims.sub !== target && claims.role !== "admin") {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }
            const info = await accountStore.getInfo(target);
            if (!info) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: info }));
            return true;
        }

        const match = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)(?:\/(role|password|enable|disable|preferences\/clear))?$/,
        );
        if (!match) return false;
        if (!requireAuth(req, res, "admin")) return true;

        const username = decodeURIComponent(match[1]);
        const action = match[2];

        if (req.method === "POST" && !action) {
            const body = await readJson(req);
            const role = String(body.role ?? "user");
            if (!VALID_ROLES.has(role)) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: `Invalid role: ${role}`,
                        },
                    }),
                );
                return true;
            }
            const created = await accountStore.register(
                username,
                String(body.password ?? "changeme"),
                role === "admin",
            );
            await profileStore?.createProfile(username, username, role as any);
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: created }));
            return true;
        }

        if (req.method === "POST" && action === "role") {
            const body = await readJson(req);
            const role = String(body.role ?? "user");
            if (!VALID_ROLES.has(role)) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: `Invalid role: ${role}`,
                        },
                    }),
                );
                return true;
            }
            await accountStore.setRole(username, role as any);
            await profileStore?.setRoleByHandle(username, role as any);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "password") {
            const body = await readJson(req);
            await accountStore.setPassword(
                username,
                String(body.password ?? "changeme"),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "enable") {
            await accountStore.setEnabled(username, true);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "disable") {
            await accountStore.setEnabled(username, false);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "preferences/clear") {
            await preferenceStore.clearUser(username);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { cleared: true } }));
            return true;
        }

        if (req.method === "DELETE" && !action) {
            await accountStore.delete(username);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { deleted: true } }));
            return true;
        }

        return false;
    };

    async function handleEmailRoutes(
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> {
        if (!notifStore) return false;

        if (
            url.pathname === "/api/v1/verify-tokens/status" &&
            req.method === "GET"
        ) {
            const token = url.searchParams.get("token") ?? "";
            const pending = !!(token && verifyTokenService?.isLive(token));
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { pending } }));
            return true;
        }

        if (url.pathname === "/api/v1/verify-email" && req.method === "POST") {
            if (!verifyTokenService || !notifStore) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "verification_unavailable",
                            message: "Verification service is not configured",
                        },
                    }),
                );
                return true;
            }
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
            const key = verifyTokenService.verify(token);
            if (!key) {
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
            const colonIndex = key.indexOf(":");
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
            const username = key.slice(0, colonIndex);
            const email = key.slice(colonIndex + 1);
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
                const existingEmails = await notifStore.getUserEmails(username);
                const existingEntry = existingEmails.find(
                    (e) => e.email === email,
                );
                if (existingEntry?.verified) {
                    res.writeHead(409, { "content-type": "application/json" });
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
                    res.writeHead(409, { "content-type": "application/json" });
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

                if (
                    tfaService &&
                    verificationEmailSender?.canSendVerificationEmail()
                ) {
                    try {
                        const key = `${username}:${email}`;
                        const code = tfaService.issueOrGet(key);
                        let verifyUrl: string | undefined;
                        let watchToken: string | undefined;
                        if (verifyTokenService) {
                            watchToken = verifyTokenService.issueOrGet(key);
                            if (externalHost) {
                                verifyUrl = `${externalHost}/verify-email?token=${watchToken}`;
                            }
                        }
                        await verificationEmailSender.sendVerificationEmail(
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
                    res.writeHead(201, { "content-type": "application/json" });
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
                    res.writeHead(200, { "content-type": "application/json" });
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
                if (!tfaService) {
                    res.writeHead(503, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "verification_unavailable",
                                message:
                                    "Verification service is not configured",
                            },
                        }),
                    );
                    return true;
                }
                const body = await readJson(req);
                const code = String(body.code ?? "").trim();
                const valid = tfaService.verify(`${username}:${email}`, code);
                if (!valid) {
                    res.writeHead(422, { "content-type": "application/json" });
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
                if (!tfaService) {
                    res.writeHead(503, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "verification_unavailable",
                                message:
                                    "Verification service is not configured",
                            },
                        }),
                    );
                    return true;
                }
                if (!verificationEmailSender?.canSendVerificationEmail()) {
                    res.writeHead(503, { "content-type": "application/json" });
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
                    res.writeHead(404, { "content-type": "application/json" });
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
                    res.writeHead(409, { "content-type": "application/json" });
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
                    let verifyUrl: string | undefined;
                    let watchToken: string | undefined;
                    if (verifyTokenService) {
                        watchToken = verifyTokenService.issueOrGet(key);
                        if (externalHost) {
                            verifyUrl = `${externalHost}/verify-email?token=${watchToken}`;
                        }
                    }
                    await verificationEmailSender.sendVerificationEmail(
                        email,
                        code,
                        verifyUrl,
                    );
                    res.writeHead(200, { "content-type": "application/json" });
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
    }

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const emailResult = await handleEmailRoutes(req, res, url);
        if (emailResult) return true;
        return adminRoutes(req, res, url);
    };
}
