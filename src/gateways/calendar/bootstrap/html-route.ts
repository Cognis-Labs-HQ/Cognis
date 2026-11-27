import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { RouteContext } from "../../../api/reuse/route-context.js";

export function createCalendarHtmlRoute(
    gatewayRoot: string,
    routeContext: RouteContext,
): (
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
) => Promise<boolean> {
    return async (request, response, url) => {
        if (request.method !== "GET" || url.pathname !== "/calendar")
            return false;
        if (!routeContext.getCookieSession(request)) {
            response.writeHead(302, { location: "/login" });
            response.end();
            return true;
        }
        routeContext.setPageSecurityHeaders(response);
        const html = await readFile(
            path.join(gatewayRoot, "ui", "index.html"),
            "utf8",
        );
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(html);
        return true;
    };
}
