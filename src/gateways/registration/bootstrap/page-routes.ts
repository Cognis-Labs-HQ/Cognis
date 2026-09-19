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
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method !== "GET") return false;
        if (url.pathname === "/register") {
            const file = await readFile(
                path.join(REGISTRATION_UI_ROOT, "pages", "register.html"),
            );
            ctx.setPageSecurityHeaders(res);
            res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            });
            res.end(file);
            return true;
        }
        if (url.pathname !== "/invite") return false;
        const session = ctx.getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login?reason=session_expired" });
            res.end();
            return true;
        }
        if (session.role === "admin") {
            res.writeHead(302, { location: "/users" });
            res.end();
            return true;
        }
        if (
            !isGatewayEnabled() ||
            !accountStore ||
            !(await accountStore.isFounder(session.sub))
        ) {
            res.writeHead(302, { location: "/dashboard" });
            res.end();
            return true;
        }
        try {
            const file = await readFile(
                path.join(REGISTRATION_UI_ROOT, "pages", "invite.html"),
            );
            ctx.setPageSecurityHeaders(res);
            res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            });
            res.end(file);
        } catch {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "not_found", message: "Asset not found." },
                }),
            );
        }
        return true;
    };
}
