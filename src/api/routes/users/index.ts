import type { IncomingMessage, ServerResponse } from "node:http";
import type { BootstrapLog, Ctx } from "@cognis/core";
import type { LocalAccountStore } from "@cognis/core";
import type { UserPreferenceStore } from "../../reuse/preference-store.js";
import { readJson } from "../../reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../reuse/route-context.js";
import {
    authorizeManagementTarget,
    rejectAccountTarget,
    type ManagementTargetAuthorization,
} from "./account-target.js";

import {
    bindDeprovisionOutcome,
    type DeprovisionOutcome,
} from "./deprovision-outcome.js";

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
    setProfileRole?: (accountId: string, role: string) => Promise<void>,
    log?: BootstrapLog,
    getProfileVisibility?: (
        accountId: string,
    ) => Promise<string | null | undefined>,
    setProfileVisibility?: (
        accountId: string,
        visibility: "friends",
    ) => Promise<void>,
    routeContext?: RouteContext,
    getProfileLifecycleState?: (
        accountId: string,
    ) => Promise<string | null | undefined>,
    setProfileLifecycleState?: (
        accountId: string,
        lifecycleState: "active" | "deactivated" | "archived",
    ) => Promise<void>,
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
            const isSecondFactorEnabled = ctx.getCapability<
                (accountId: string) => Promise<boolean>
            >("tfa:isSecondFactorEnabled");
            const getProfileHandle =
                ctx.getCapability<
                    (accountId: string) => Promise<string | undefined>
                >("profile:getHandle");
            const users = await Promise.all(
                (await accountStore.list()).map(async (user) => ({
                    ...user,
                    handle: getProfileHandle
                        ? await getProfileHandle(user.accountId).catch(
                              () => undefined,
                          )
                        : undefined,
                    lifecycleState:
                        (await getProfileLifecycleState?.(user.accountId).catch(
                            () => null,
                        )) ?? "active",
                    role: resolveEffectiveRole(
                        user.role,
                        Boolean(user.isFounder),
                    ),
                    hasTfaConfigured: isSecondFactorEnabled
                        ? await isSecondFactorEnabled(user.accountId).catch(
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
            /^\/api\/v1\/users\/([^/]+)(?:\/(role|password|enable|disable|dearchive|isfounder|preferences\/clear))?$/,
        );
        if (!match) return false;
        const verifiedClaims = ctx.requireAuth(req, res, "admin");
        if (!verifiedClaims) return true;
        const adminClaims = Object.freeze({
            sub: verifiedClaims.sub,
            role: verifiedClaims.role,
        });

        let username: string;
        try {
            username = decodeURIComponent(match[1]);
        } catch {
            rejectAccountTarget(res, {
                allowed: false,
                status: 400,
                code: "bad_request",
            });
            return true;
        }
        const action = match[2];
        const callerClaims = adminClaims;
        let targetInfoCache:
            Awaited<ReturnType<LocalAccountStore["getInfo"]>> | undefined;

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
            "dearchive",
            "isfounder",
            "preferences/clear",
        ]);
        const isProtectedManagementAction =
            (req.method === "POST" &&
                action !== undefined &&
                ADMIN_PROTECTED_ACTIONS.has(action)) ||
            (req.method === "DELETE" && !action);

        let authorization: ManagementTargetAuthorization | undefined;
        if (isProtectedManagementAction) {
            authorization = await authorizeManagementTarget(
                ctx,
                req,
                res,
                username,
                adminClaims,
                log,
            );
            if (!authorization?.check()) return true;
        }

        // Authorization is point-in-time. Refresh after preparation, before the
        // mutation sequence starts; retain its lifecycle/actor lease within that
        // sequence so our own role write does not block required profile sync.
        async function refreshPreparedAuthorization(): Promise<void> {
            if (!authorization?.check()) {
                authorization = undefined;
                return;
            }
            authorization = await authorizeManagementTarget(
                ctx,
                req,
                res,
                username,
                adminClaims,
                log,
            );
        }

        function deprovisionPersisted(
            outcome: DeprovisionOutcome,
            expectedAction: "delete" | "archive",
        ): outcome is Extract<DeprovisionOutcome, { persisted: true }> {
            if (
                outcome.persisted &&
                outcome.username === username &&
                outcome.action === expectedAction
            )
                return true;
            const denial = outcome.persisted
                ? {
                      allowed: false as const,
                      status: 503 as const,
                      code: "account_policy_unavailable",
                  }
                : {
                      allowed: false as const,
                      status: outcome.status,
                      code: outcome.reason,
                  };
            log?.("error", "User deprovision did not persist.", {
                component: "api-users",
                operation: "deprovision-user",
                reason: denial.code,
            });
            rejectAccountTarget(res, denial);
            return false;
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
            if (!ctx.flow.exists("provision-user")) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "flow_unavailable",
                            message: "provision-user flow not available",
                        },
                    }),
                );
                return true;
            }
            const result = await ctx.flow.run("provision-user", {
                username,
                password: String(body.password ?? ""),
                role,
            });
            const emitResult = (result.data["emit-events"] ??
                (result.stageResults["emit-events"] ?? [])[0]) as
                { emitted?: boolean; accountId?: string } | undefined;
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
            log?.("info", "Created user account.", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId:
                    emitResult?.accountId ?? persistResult.created?.username,
                role,
            });
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: persistResult.created }));
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
            await refreshPreparedAuthorization();
            if (!authorization?.check()) return true;
            const revokedCount = ctx.revokeAccessTokensForSubject(username);
            await accountStore.setRole(username, role as any);
            if (!authorization?.check()) return true;
            await setProfileRole?.(username, role);
            if (!authorization?.check()) return true;
            if (role === "teacher" || role === "admin" || role === "owner") {
                await setProfileVisibility?.(username, "friends");
                log?.("warn", "Updated privileged role visibility default.", {
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
            const targetInfo = await getTargetInfo();
            if (targetInfo?.provider && targetInfo.provider !== "local") {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "external_password_managed",
                            message:
                                "External users cannot have their passwords changed in Cognis",
                        },
                    }),
                );
                return true;
            }
            const body = await readJson(req);
            await refreshPreparedAuthorization();
            if (!authorization?.check()) return true;
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
            if (!setProfileLifecycleState) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "profile_lifecycle_unavailable",
                            message: "Profile lifecycle state unavailable",
                        },
                    }),
                );
                return true;
            }
            if (!ctx.flow.exists("deprovision-user")) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "flow_unavailable",
                            message: "deprovision-user flow not available",
                        },
                    }),
                );
                return true;
            }
            const readOutcome = bindDeprovisionOutcome(() =>
                ctx.getCapability<Ctx>("system:ctx"),
            );
            if (!readOutcome) {
                deprovisionPersisted(
                    {
                        persisted: false,
                        status: 503,
                        reason: "account_policy_unavailable",
                    },
                    "archive",
                );
                return true;
            }
            const targetInfo = await getTargetInfo();
            const targetRole = resolveEffectiveRole(
                targetInfo?.role,
                Boolean(targetInfo?.isFounder),
            );
            await refreshPreparedAuthorization();
            if (!authorization?.check()) return true;
            const deprovisionInput = Object.freeze({
                username,
                action: "archive" as const,
                actor: callerClaims,
                callerRole: callerClaims.role,
                targetRole,
                targetIsFounder: Boolean(targetInfo?.isFounder),
                isAuthorizationCurrent: authorization.isCurrent,
            });
            const disableResult = await ctx.flow.run(
                "deprovision-user",
                deprovisionInput,
            );
            const outcome = readOutcome(
                deprovisionInput,
                disableResult.stageResults,
            );
            if (!deprovisionPersisted(outcome, "archive")) return true;
            if (!authorization?.check()) return true;
            await setProfileLifecycleState(username, "archived");
            log?.("warn", "Archived user account from admin disable control.", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId: username,
                revokedTokenCount: outcome.revokedTokenCount ?? 0,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "dearchive") {
            if (!setProfileLifecycleState) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "profile_lifecycle_unavailable",
                            message: "Profile lifecycle state unavailable",
                        },
                    }),
                );
                return true;
            }
            await setProfileLifecycleState(username, "active");
            log?.("warn", "De-archived user profile.", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId: username,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "isfounder") {
            const body = await readJson(req);
            await refreshPreparedAuthorization();
            if (!authorization?.check()) return true;
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
            if (!ctx.flow.exists("deprovision-user")) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "flow_unavailable",
                            message: "deprovision-user flow not available",
                        },
                    }),
                );
                return true;
            }
            const readOutcome = bindDeprovisionOutcome(() =>
                ctx.getCapability<Ctx>("system:ctx"),
            );
            if (!readOutcome) {
                deprovisionPersisted(
                    {
                        persisted: false,
                        status: 503,
                        reason: "account_policy_unavailable",
                    },
                    "delete",
                );
                return true;
            }
            const targetInfo = await getTargetInfo();
            const targetRole = resolveEffectiveRole(
                targetInfo?.role,
                Boolean(targetInfo?.isFounder),
            );
            await refreshPreparedAuthorization();
            if (!authorization?.check()) return true;
            const deprovisionInput = Object.freeze({
                username,
                action: "delete" as const,
                actor: callerClaims,
                callerRole: callerClaims.role,
                targetRole,
                targetIsFounder: Boolean(targetInfo?.isFounder),
                isAuthorizationCurrent: authorization.isCurrent,
            });
            const deleteResult = await ctx.flow.run(
                "deprovision-user",
                deprovisionInput,
            );
            const outcome = readOutcome(
                deprovisionInput,
                deleteResult.stageResults,
            );
            if (!deprovisionPersisted(outcome, "delete")) return true;
            log?.("warn", "Deleted user account.", {
                ...logMeta,
                accountId: adminClaims.sub,
                targetAccountId: username,
                revokedTokenCount: outcome.revokedTokenCount ?? 0,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { deleted: true } }));
            return true;
        }

        return false;
    };
}
