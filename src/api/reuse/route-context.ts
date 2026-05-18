import type { IncomingMessage, ServerResponse } from "node:http";
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
}

export function createDefaultRouteContext(): RouteContext {
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
    };
}

export function resolveRouteContext(routeContext?: RouteContext): RouteContext {
    return routeContext ?? createDefaultRouteContext();
}
