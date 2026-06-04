import type { IncomingMessage, ServerResponse } from "node:http";
import { NULL_FLOW_API, type FlowApi } from "@cognis/core";
import {
    canAccessUserData,
    getAuthClaims,
    getCookieSession,
    hasMinRole,
    requireAuth,
    requireRoleAccess,
    setPageSecurityHeaders,
} from "../../gateways/auth/guard.js";
import {
    lookupAccessToken,
    revokeAccessTokensForSubject,
    type AccessRole,
} from "../../gateways/auth/access-tokens.js";
import type { RoleAccessPolicy } from "@cognis/core";

export interface RouteContext {
    getAuthClaims(
        req: IncomingMessage,
    ): { sub: string; role: AccessRole } | null;
    requireAuth(
        req: IncomingMessage,
        res: ServerResponse,
        minRole?: AccessRole,
    ): { sub: string; role: AccessRole } | null;
    requireRoleAccess(
        req: IncomingMessage,
        res: ServerResponse,
        policy: RoleAccessPolicy,
    ): { sub: string; role: AccessRole } | null;
    canAccessUserData(
        claims: { sub: string; role: AccessRole },
        targetUsername: string,
    ): boolean;
    hasMinRole(role: AccessRole, minRole: AccessRole): boolean;
    getCookieSession(req: IncomingMessage): {
        sub: string;
        role: AccessRole;
    } | null;
    setPageSecurityHeaders(res: ServerResponse): void;
    lookupAccessToken(
        token: string,
    ): { sub: string; role: AccessRole; revoked: boolean } | null;
    revokeAccessTokensForSubject(subject: string): number;
    getCapability<T>(capabilityId: string): T | undefined;
    requireCapability<T>(capabilityId: string): T;
    flow: FlowApi;
}

export interface RouteContextOptions {
    getCapability?: <T>(capabilityId: string) => T | undefined;
    requireCapability?: <T>(capabilityId: string) => T;
    flow?: FlowApi;
}

export function createDefaultRouteContext(
    options: RouteContextOptions = {},
): RouteContext {
    return {
        getAuthClaims,
        requireAuth,
        requireRoleAccess,
        canAccessUserData,
        hasMinRole,
        getCookieSession,
        setPageSecurityHeaders,
        lookupAccessToken,
        revokeAccessTokensForSubject,
        getCapability: options.getCapability ?? (() => undefined),
        requireCapability:
            options.requireCapability ??
            ((capabilityId: string) => {
                throw new Error(
                    `Required capability "${capabilityId}" is not available.`,
                );
            }),
        flow: options.flow ?? NULL_FLOW_API,
    };
}

export function resolveRouteContext(routeContext?: RouteContext): RouteContext {
    return routeContext ?? createDefaultRouteContext();
}
