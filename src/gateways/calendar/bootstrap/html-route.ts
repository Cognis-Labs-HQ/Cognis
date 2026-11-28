import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { RouteContext } from "../../../api/reuse/route-context.js";

export function createCalendarHtmlRoute(
    gatewayRoot: string,
    routeContext: RouteContext,
): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    return async (req, res, url) => {
        if (req.method !== "GET" || url.pathname !== "/calendar") return false;
        if (!routeContext.getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        routeContext.setPageSecurityHeaders(res);
        const html = await readFile(
            path.join(gatewayRoot, "ui", "index.html"),
            "utf8",
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
}
