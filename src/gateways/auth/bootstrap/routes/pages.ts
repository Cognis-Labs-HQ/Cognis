import path from "node:path";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";

const AUTH_UI_ROOT = path.resolve(
    process.cwd(),
    "src",
    "gateways",
    "auth",
    "ui",
);

export async function serveAuthCallbackPage(
    response: ServerResponse,
    routeContext?: RouteContext,
): Promise<void> {
    const ctx = resolveRouteContext(routeContext);
    try {
        const file = await readFile(
            path.join(AUTH_UI_ROOT, "pages", "callback.html"),
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
}

export function createAuthPageRoutes(routeContext?: RouteContext) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (request.method !== "GET") return false;
        const page = url.pathname === "/login" ? "login.html" : null;
        if (!page) return false;
        try {
            const file = await readFile(path.join(AUTH_UI_ROOT, "pages", page));
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
