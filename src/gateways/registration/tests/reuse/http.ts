import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { createCtx } from "@cognis/core";
import type { RouteContext } from "../../../../api/reuse/route-context.js";

export function createRequest(options: {
    method: string;
    bearerToken?: string;
    body?: string;
}): IncomingMessage {
    const request = new IncomingMessage(new Socket());
    request.method = options.method;
    if (options.bearerToken)
        request.headers.authorization = `Bearer ${options.bearerToken}`;
    if (options.body) request.push(Buffer.from(options.body));
    request.push(null);
    return request;
}

export function createResponse(): {
    response: ServerResponse;
    statusCode: number;
    payload: string;
} {
    const response = new ServerResponse(createRequest({ method: "GET" }));
    let payload = "";
    response.end = (chunk?: unknown) => {
        if (chunk != null) payload += String(chunk);
        return response;
    };
    return {
        response,
        get statusCode() {
            return response.statusCode;
        },
        get payload() {
            return payload;
        },
    };
}

export function createRouteContext(): RouteContext {
    const claims = { sub: "admin-user", role: "admin" as const };
    return {
        getAuthClaims: () => claims,
        requireAuth: (request, response) => {
            if (request.headers.authorization === "Bearer admin-test-token")
                return claims;
            response.writeHead(403);
            response.end();
            return null;
        },
        requireRoleAccess: () => claims,
        canAccessUserData: () => true,
        hasMinRole: () => true,
        getCookieSession: () => null,
        setPageSecurityHeaders: () => {},
        lookupAccessToken: () => null,
        revokeAccessTokensForSubject: () => 0,
        getCapability: () => undefined,
        requireCapability: (id) => {
            throw new Error(`Missing test capability: ${id}`);
        },
        flow: createCtx().flow,
    };
}
