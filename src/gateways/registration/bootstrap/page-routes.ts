import path from "node:path";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { LocalAccountStore } from "@cognis/core";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";

const REGISTRATION_UI_ROOT = path.resolve(
    process.cwd(),
    "src",
    "gateways",
    "registration",
    "ui",
);

export function createRegistrationPageRoutes(
    accountStore?: LocalAccountStore,
    isGatewayEnabled: () => boolean = () => false,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (request.method !== "GET") return false;
        if (url.pathname === "/register") {
            const file = await readFile(
                path.join(REGISTRATION_UI_ROOT, "pages", "register.html"),
            );
            ctx.setPageSecurityHeaders(response);
            response.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            });
            response.end(file);
            return true;
        }
        if (url.pathname !== "/invite") return false;
        const session = ctx.getCookieSession(request);
        if (!session) {
            response.writeHead(302, {
                location: "/login?reason=session_expired",
            });
            response.end();
            return true;
        }
        const privileged = session.role === "admin" || session.role === "owner";
        if (
            !isGatewayEnabled() ||
            (!privileged &&
                (!accountStore || !(await accountStore.isFounder(session.sub))))
        ) {
            response.writeHead(302, { location: "/dashboard" });
            response.end();
            return true;
        }
        try {
            const file = await readFile(
                path.join(REGISTRATION_UI_ROOT, "pages", "invite.html"),
            );
            ctx.setPageSecurityHeaders(response);
            response.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            });
            response.end(file);
        } catch {
            response.writeHead(404, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    error: { code: "not_found", message: "Asset not found." },
                }),
            );
        }
        return true;
    };
}
