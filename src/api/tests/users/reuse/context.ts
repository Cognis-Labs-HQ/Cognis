import type { IncomingMessage } from "node:http";
import {
    CapabilityStore,
    CTX_CAPABILITY,
    createCtx,
    registerCanonicalFlow,
    runBootstrapScope,
    USER_LIFECYCLE_FLOW_CATALOG,
    type BootstrapDisposer,
    type CapabilityContracts,
    type LocalAccountStore,
} from "@cognis/core";
import type {
    AccountTargetDecision,
    AuthorizeAccountTarget,
} from "../../../routes/users/account-target.js";
import type { RouteContext } from "../../../reuse/route-context.js";
import {
    hasMinRole,
    verifyAccessToken,
    revokeAccessTokensForSubject,
} from "./sessions.js";

import { registerDeprovisionFixture } from "./deprovision.js";

export interface ContextOptions {
    policy?: AuthorizeAccountTarget | false;
    decisions?: Readonly<Record<string, AccountTargetDecision>>;
    contractVersion?: number;
}

export function allowTarget(accountId: string): AccountTargetDecision {
    return { allowed: true, accountId, isCurrent: () => true };
}

/** An outcome-controlled Auth contract, not another copy of Auth's policy. */
export async function makeRouteContext(
    accountStore: LocalAccountStore,
    options: ContextOptions = {},
) {
    const VALID_ROLES = new Set(["user", "teacher", "moderator", "admin"]);
    const capabilities = new CapabilityStore();
    const flowCtx = createCtx();
    const policyCalls: Parameters<AuthorizeAccountTarget>[0][] = [];
    const disposers: BootstrapDisposer[] = [];
    const revocationCalls: string[] = [];
    const revokeSessions = (subject: string): number => {
        revocationCalls.push(subject);
        return revokeAccessTokensForSubject(subject);
    };
    capabilities.contribute(CTX_CAPABILITY, flowCtx);
    capabilities.contribute(
        "auth:revokeAccessTokensForSubject",
        revokeSessions,
    );
    const policy: AuthorizeAccountTarget = async (input) => {
        policyCalls.push(input);
        if (options.policy) return options.policy(input);
        return (
            options.decisions?.[`${input.actor.sub}/${input.accountId}`] ??
            allowTarget(input.accountId)
        );
    };
    if (options.policy !== false) {
        flowCtx.contributePublicCapability(
            "auth:authorizeAccountTarget",
            policy,
        );
        await runBootstrapScope(
            flowCtx,
            "gateway:auth",
            async () => {
                flowCtx
                    .requireCapability<CapabilityContracts>("system:contracts")
                    .define("auth:authorizeAccountTarget", {
                        version: options.contractVersion ?? 1,
                        kind: "function",
                        description: "Test account target authorization.",
                    });
            },
            (dispose) => disposers.push(dispose),
        );
    }
    for (const flow of USER_LIFECYCLE_FLOW_CATALOG) {
        registerCanonicalFlow(flowCtx, flow);
    }
    flowCtx.flow.extend(
        "provision-user",
        "validate-request",
        { id: "test:validate-account-input" },
        (stageCtx) => {
            const input = (stageCtx.input ?? {}) as { role?: string };
            const role = String(input.role ?? "user");
            if (!VALID_ROLES.has(role)) {
                return { valid: false, reason: "invalid_role", role };
            }
            return { valid: true, role };
        },
    );
    flowCtx.flow.extend(
        "provision-user",
        "persist-account",
        { id: "test:create-account" },
        async (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                username?: string;
                password?: string;
            };
            const validateResult = (
                (stageCtx.stageResults["validate-request"] ?? []) as Array<{
                    valid: boolean;
                    reason?: string;
                    role?: string;
                }>
            )[0];
            if (!validateResult?.valid) {
                return {
                    persisted: false,
                    reason: validateResult?.reason ?? "validation_failed",
                };
            }
            const username = String(input.username ?? "");
            const password = String(input.password ?? "").trim();
            const role = validateResult.role ?? "user";
            if (!password) {
                return { persisted: false, reason: "missing_password" };
            }
            const created = await accountStore.register(
                username,
                password,
                role === "admin" ? "admin" : "user",
            );
            return { persisted: true, created, role };
        },
    );
    flowCtx.flow.extend(
        "provision-user",
        "emit-events",
        { id: "test:provision-emit" },
        (stageCtx) => {
            const persistResult = (
                (stageCtx.stageResults["persist-account"] ?? []) as Array<{
                    persisted: boolean;
                    created?: { username: string };
                    role?: string;
                }>
            )[0];
            if (!persistResult?.persisted) return { emitted: false };
            return {
                emitted: true,
                accountId: persistResult.created?.username,
                role: persistResult.role,
            };
        },
    );
    const outcomeDisposers = await registerDeprovisionFixture(
        flowCtx,
        capabilities,
        accountStore,
    );
    const getAuthClaims = (req: IncomingMessage) => {
        const authorization = req.headers.authorization ?? "";
        return verifyAccessToken(authorization.replace(/^Bearer /, ""));
    };
    const unused = (): never => {
        throw new Error("unexpected_route_context_call");
    };
    const routeContext: RouteContext = {
        getAuthClaims,
        requireAuth(req, res, minRole = "user") {
            const claims = getAuthClaims(req);
            if (claims && hasMinRole(claims.role, minRole)) return claims;
            res.writeHead(claims ? 403 : 401, {
                "content-type": "application/json",
            });
            res.end(
                JSON.stringify({
                    error: { code: claims ? "forbidden" : "unauthorized" },
                }),
            );
            return null;
        },
        canAccessUserData: (claims, accountId) =>
            claims.sub === accountId || hasMinRole(claims.role, "admin"),
        hasMinRole,
        requireRoleAccess: unused,
        getCookieSession: unused,
        setPageSecurityHeaders: unused,
        lookupAccessToken: unused,
        revokeAccessTokensForSubject: revokeSessions,
        getCapability: capabilities.get.bind(capabilities),
        requireCapability: capabilities.require.bind(capabilities),
        flow: flowCtx.flow,
    };
    return Object.assign(routeContext, {
        runtime: flowCtx,
        policyCalls,
        disposers,
        revocationCalls,
        outcomeDisposers,
    });
}

export function createProfileLifecycleTracker() {
    const states = new Map<string, "active" | "deactivated" | "archived">();
    return {
        states,
        get: async (accountId: string) => states.get(accountId) ?? "active",
        set: async (
            accountId: string,
            lifecycleState: "active" | "deactivated" | "archived",
        ) => {
            states.set(accountId, lifecycleState);
        },
    };
}
