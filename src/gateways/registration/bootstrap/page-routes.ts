import path from "node:path";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { PUBLIC_ROOT } from "./helpers.js";

export function createRegistrationPageRoutes(routeContext?: RouteContext) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname !== "/register" || req.method !== "GET") return false;

        try {
            const file = await readFile(
                path.join(PUBLIC_ROOT, "pages", "register.html"),
            );
            ctx.setPageSecurityHeaders(res);
            res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            });
            res.end(file);
            return true;
        } catch {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "not_found", message: "Asset not found." },
                }),
            );
            return true;
        }
    };
}
