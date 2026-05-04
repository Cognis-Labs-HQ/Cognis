import { requireAuth } from "../../auth/guard.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ModuleService } from "@cognis/core";

export interface ModuleRouteHooks {
    onEnabled?: (moduleId: string) => Promise<void> | void;
    onDisabled?: (moduleId: string) => Promise<void> | void;
    getStatus?: (moduleId: string) => "enabled" | "disabled" | "available";
    getIntegrityReport?: () => Promise<
        Array<{
            moduleId: string;
            file: string;
            expected: string;
            actual: string | null;
            status: "ok" | "mismatch" | "missing";
        }>
    >;
}

export function createModuleRoutes(
    moduleService: ModuleService,
    hooks?: ModuleRouteHooks,
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === "/api/v1/modules" && req.method === "GET") {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const manifests = await moduleService.list();
            const data = manifests.map((manifest) => ({
                ...manifest,
                status:
                    hooks?.getStatus?.(manifest.id) ??
                    (manifest.class === "core" ? "enabled" : "available"),
            }));
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
            return true;
        }
        if (
            url.pathname === "/api/v1/modules/integrity" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const data = (await hooks?.getIntegrityReport?.()) ?? [];
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
            return true;
        }

        const match = url.pathname.match(
            /^\/api\/v1\/modules\/([^/]+)\/(enable|disable)$/,
        );
        if (!match || req.method !== "POST") return false;

        const claims = requireAuth(req, res, "admin");
        if (!claims) return true;

        const moduleId = decodeURIComponent(match[1]);
        const action = match[2];
        const acknowledged =
            req.headers["x-cognis-external-module-disclaimer"] === "accepted" ||
            url.searchParams.get("acknowledgeExternalDisclaimer") === "true";

        const result =
            action === "enable"
                ? await moduleService.enable(moduleId, {
                      acknowledgeExternalDisclaimer: acknowledged,
                  })
                : await moduleService.disable(moduleId);

        if (action === "enable") await hooks?.onEnabled?.(moduleId);
        if (action === "disable") await hooks?.onDisabled?.(moduleId);

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: result }));
        return true;
    };
}
