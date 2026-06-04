import type { IncomingMessage, ServerResponse } from "node:http";
import type { BootstrapLog, Ctx } from "@cognis/core";
import type { LocalAccountStore } from "../../reuse/account-store.js";
import type { UserPreferenceStore } from "../../reuse/preference-store.js";
import { readJson } from "../../reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../reuse/route-context.js";

const VALID_ROLES = new Set(["user", "teacher", "moderator", "admin", "owner"]);

/**
 * Normalizes persisted account role data into the effective role seen by API consumers.
 * Founder admins are elevated to owner for response consistency across UI surfaces.
 */
function resolveEffectiveRole(
    role: unknown,
    isFounder: boolean,
): "user" | "teacher" | "moderator" | "admin" | "owner" {
    const normalizedRole = String(role ?? "").trim();
    if (
        isFounder &&
        (normalizedRole === "owner" || normalizedRole === "admin")
    ) {
        return "owner";
    }
    if (
        normalizedRole === "user" ||
        normalizedRole === "teacher" ||
        normalizedRole === "moderator" ||
        normalizedRole === "admin" ||
        normalizedRole === "owner"
    ) {
        return normalizedRole;
    }
    return "user";
}

export function createUserRoutes(
    accountStore: LocalAccountStore,
    preferenceStore: UserPreferenceStore | undefined,
    setProfileRole?: (handle: string, role: string) => Promise<void>,
    log?: BootstrapLog,
    getProfileVisibility?: (
        accountId: string,
    ) => Promise<string | null | undefined>,
    setProfileVisibility?: (
        accountId: string,
        visibility: "friends",
    ) => Promise<void>,
    routeContext?: RouteContext,
    getCapability?: <T>(capabilityId: string) => T | undefined,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const logMeta = {
            component: "api-users",
            method: req.method ?? "GET",
            path: url.pathname,
        };
        if (url.pathname === "/api/v1/users" && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const isSecondFactorEnabled = getCapability?.<
                (accountId: string) => Promise<boolean>
            >("tfa:isSecondFactorEnabled");
            const users = await Promise.all(
                (await accountStore.list()).map(async (user) => ({
                    ...user,
                    role: resolveEffectiveRole(
                        user.role,
                        Boolean(user.isFounder),
                    ),
                    hasTfaConfigured: isSecondFactorEnabled
                        ? await isSecondFactorEnabled(user.username).catch(
                              () => false,
                          )
                        : false,
                })),
            );
            log?.("debug", "Listed users.", {
                ...logMeta,
                accountId: claims.sub,
                count: users.length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: users }));
            return true;
        }

        const infoMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/info$/,
        );
        if (infoMatch && req.method === "GET") {
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
            const target = decodeURIComponent(infoMatch[1]);
            if (!ctx.canAccessUserData(claims, target)) {
                log?.("warn", "Blocked unauthorized user info lookup.", {
                    ...logMeta,
                    accountId: claims.sub,
                    targetAccountId: target,
                });
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
                log?.(
                    "warn",
                    "User info lookup failed because user was not found.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                        targetAccountId: target,
                    },
                );
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            log?.("debug", "Read user info.", {
                ...logMeta,
                accountId: claims.sub,
                targetAccountId: target,
            });
            const normalizedInfo = {
                ...info,
                role: resolveEffectiveRole(info.role, Boolean(info.isFounder)),
            };
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: normalizedInfo }));
            return true;
        }

        const match = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)(?:\/(role|password|enable|disable|isfounder|preferences\/clear))?$/,
        );
        if (!match) return false;
        const adminClaims = ctx.requireAuth(req, res, "admin");
        if (!adminClaims) return true;

        const username = decodeURIComponent(match[1]);
        const action = match[2];
        const callerClaims = ctx.getAuthClaims(req);
        const callerIsOwner = callerClaims?.role === "owner";
        const callerIsAdmin = callerClaims?.role === "admin";
        let targetInfoCache:
            | Awaited<ReturnType<LocalAccountStore["getInfo"]>>
            | undefined;

        async function getTargetInfo() {
            if (targetInfoCache !== undefined) return targetInfoCache;
            targetInfoCache = await accountStore.getInfo(username);
            return targetInfoCache;
        }

        const ADMIN_PROTECTED_ACTIONS = new Set([
            "role",
            "password",
            "enable",
            "disable",
            "isfounder",
            "preferences/clear",
        ]);
        const isProtectedManagementAction =
            (req.method === "POST" &&
                action !== undefined &&
                ADMIN_PROTECTED_ACTIONS.has(action)) ||
            (req.method === "DELETE" && !action);

        if (isProtectedManagementAction && callerClaims) {
            const targetInfo = await getTargetInfo();
            const targetRole = resolveEffectiveRole(
                targetInfo?.role,
                Boolean(targetInfo?.isFounder),
            );
            if (callerClaims.sub === username) {
                log?.("warn", "Blocked self-management attempt.", {
                    ...logMeta,
                    accountId: callerClaims.sub,
                    targetAccountId: username,
                    action,
                    targetRole,
                });
                res.writeHead(403, {
                    "content-type": "application/json",
                });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "protected_self_account",
                            message: "Accounts cannot modify themselves here",
                        },
                    }),
                );
                return true;
            }
            if (
                callerIsAdmin &&
                (targetRole === "admin" || targetRole === "owner")
            ) {
                log?.(
                    "warn",
                    "Blocked admin attempt to modify privileged account.",
                    {
                        ...logMeta,
                        accountId: callerClaims.sub,
                        targetAccountId: username,
                        action,
                        targetRole,
                    },
                );
                res.writeHead(403, {
                    "content-type": "application/json",
                });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "protected_admin_account",
                            message:
                                "Only owner can modify admin or owner accounts",
                        },
                    }),
                );
                return true;
            }
        }

        const FOUNDER_PROTECTED_ACTIONS = new Set([
            "role",
            "password",
            "disable",
            "isfounder",
        ]);
        const isFounderProtectedRequest =
            (req.method === "POST" &&
                action !== undefined &&
                FOUNDER_PROTECTED_ACTIONS.has(action)) ||
            (req.method === "DELETE" && !action);
        if (isFounderProtectedRequest) {
            if (
                callerClaims &&
                !callerIsOwner &&
                callerClaims.sub !== username
            ) {
                const targetInfo = await getTargetInfo();
                const targetRole = resolveEffectiveRole(
                    targetInfo?.role,
                    Boolean(targetInfo?.isFounder),
                );
                if (targetRole === "owner") {
                    log?.(
                        "warn",
                        "Blocked modification of protected founder account.",
                        {
                            ...logMeta,
                            accountId: callerClaims.sub,
                            targetAccountId: username,
                            action,
                        },
                    );
                    res.writeHead(403, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "protected_account",
                                message:
                                    "This account cannot be modified by other admins",
                            },
                        }),
                    );
                    return true;
                }
            }
        }

        if (req.method === "POST" && !action) {
            const body = await readJson(req);
            const role = String(body.role ?? "user");
            if (!VALID_ROLES.has(role)) {
                log?.("warn", "Rejected user creation with invalid role.", {
                    ...logMeta,
                    accountId: adminClaims.sub,
                    targetAccountId: username,
                    role,
                });
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
            const flowCtx = getCapability?.("system:ctx") as Ctx | undefined;
            if (flowCtx?.hasFlow("provision-user")) {
                const result = await flowCtx.runFlow("provision-user", {
                    username,
                    password: String(body.password ?? ""),
                    role,
                });
                const emitResult = (result.data["emit-events"] ??
                    (result.stageResults["emit-events"] ?? [])[0]) as
                    | { emitted?: boolean; accountId?: string }
                    | undefined;
                const persistResult = (result.stageResults["persist-account"] ??
                    [])[0] as
                    | {
                          persisted: boolean;
                          created?: { username: string };
                          reason?: string;
                      }
                    | undefined;
                if (!persistResult?.persisted) {
                    res.writeHead(500, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: persistResult?.reason ?? "create_failed",
                                message: "Failed to create user account",
                            },
                        }),
                    );
                    return true;
                }
                log?.("info", "Created user account (flow).", {
                    ...logMeta,
                    accountId: adminClaims.sub,
                    targetAccountId:
                        emitResult?.accountId ??
                        persistResult.created?.username,
                    role,
                });
                res.writeHead(201, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: persistResult.created }));
                return true;
            }
            const created = await accountStore.register(
                username,
                String(body.password ?? ""),
                role === "admin",
            );
            log?.("info", "Created user account (legacy).", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId: created.username,
                role,
            });
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: created }));
            return true;
        }

        if (req.method === "POST" && action === "role") {
            const body = await readJson(req);
            const role = String(body.role ?? "user");
            if (role === "owner") {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message: "Owner role cannot be assigned manually",
                        },
                    }),
                );
                return true;
            }
            if (!VALID_ROLES.has(role)) {
                log?.("warn", "Rejected role change with invalid role.", {
                    ...logMeta,
                    accountId: adminClaims.sub,
                    targetAccountId: username,
                    role,
                });
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
            const revokedCount = ctx.revokeAccessTokensForSubject(username);
            await accountStore.setRole(username, role as any);
            await setProfileRole?.(username, role);
            if (role === "teacher") {
                await setProfileVisibility?.(username, "friends");
                log?.("warn", "Updated teacher visibility default.", {
                    ...logMeta,
                    accountId: adminClaims.sub,
                    targetAccountId: username,
                    visibility: "friends",
                });
            }
            log?.("warn", "Updated user role.", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId: username,
                role,
                revokedTokenCount: revokedCount,
            });
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
            log?.("warn", "Updated user password.", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId: username,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "enable") {
            await accountStore.setEnabled(username, true);
            log?.("warn", "Enabled user account.", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId: username,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "disable") {
            if (callerClaims?.sub === username) {
                log?.("warn", "Blocked self-disable attempt.", {
                    ...logMeta,
                    accountId: callerClaims.sub,
                });
                res.writeHead(409, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "cannot_disable_self",
                            message: "You cannot disable your own account",
                        },
                    }),
                );
                return true;
            }
            const flowCtx = getCapability?.("system:ctx") as Ctx | undefined;
            if (flowCtx?.hasFlow("deprovision-user")) {
                const targetInfo = await getTargetInfo();
                const targetRole = resolveEffectiveRole(
                    targetInfo?.role,
                    Boolean(targetInfo?.isFounder),
                );
                await flowCtx.runFlow("deprovision-user", {
                    username,
                    action: "disable" as const,
                    callerRole: callerClaims?.role ?? "admin",
                    targetRole,
                    targetIsFounder: Boolean(targetInfo?.isFounder),
                });
                log?.("warn", "Disabled user account (flow).", {
                    ...logMeta,
                    accountId: adminClaims.sub,
                    targetAccountId: username,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { updated: true } }));
                return true;
            }
            await accountStore.setEnabled(username, false);
            const revokedCount = ctx.revokeAccessTokensForSubject(username);
            log?.("warn", "Disabled user account.", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId: username,
                revokedTokenCount: revokedCount,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "isfounder") {
            const body = await readJson(req);
            await accountStore.setFounder(username, Boolean(body.isFounder));
            log?.("warn", "Updated founder status.", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId: username,
                isFounder: Boolean(body.isFounder),
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: { updated: true, isFounder: Boolean(body.isFounder) },
                }),
            );
            return true;
        }

        if (req.method === "POST" && action === "preferences/clear") {
            if (preferenceStore) {
                await preferenceStore.clearUser(username);
            }
            log?.("warn", "Cleared user preferences.", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId: username,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { cleared: true } }));
            return true;
        }

        if (req.method === "DELETE" && !action) {
            const flowCtx = getCapability?.("system:ctx") as Ctx | undefined;
            if (flowCtx?.hasFlow("deprovision-user")) {
                const targetInfo = await getTargetInfo();
                const targetRole = resolveEffectiveRole(
                    targetInfo?.role,
                    Boolean(targetInfo?.isFounder),
                );
                await flowCtx.runFlow("deprovision-user", {
                    username,
                    action: "delete" as const,
                    callerRole: callerClaims?.role ?? "admin",
                    targetRole,
                    targetIsFounder: Boolean(targetInfo?.isFounder),
                });
                log?.("warn", "Deleted user account (flow).", {
                    ...logMeta,
                    accountId: adminClaims.sub,
                    targetAccountId: username,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { deleted: true } }));
                return true;
            }
            const revokedCount = ctx.revokeAccessTokensForSubject(username);
            await accountStore.delete(username);
            log?.("warn", "Deleted user account.", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId: username,
                revokedTokenCount: revokedCount,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { deleted: true } }));
            return true;
        }

        return false;
    };
}
