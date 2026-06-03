import type { IncomingMessage, ServerResponse } from "node:http";
import type { BootstrapLog, ModuleService } from "@cognis/core";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../reuse/route-context.js";
import { readJson } from "../../reuse/read-json.js";

export interface ModuleRouteHooks {
    onEnabled?: (moduleId: string) => Promise<void> | void;
    onDisabled?: (moduleId: string) => Promise<void> | void;
    getStatus?: (moduleId: string) => "enabled" | "disabled" | "available";
    log?: BootstrapLog;
    getIntegrityReport?: () => Promise<
        Array<{
            moduleId: string;
            file: string;
            expected: string;
            actual: string | null;
            status: "ok" | "mismatch" | "missing";
        }>
    >;
    onImported?: (moduleId: string) => Promise<void> | void;
}

export function createModuleRoutes(
    moduleService: ModuleService,
    hooks?: ModuleRouteHooks,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const logMeta = {
            component: "api-modules",
            method: req.method ?? "GET",
            path: url.pathname,
        };
        if (url.pathname === "/api/v1/modules" && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const manifests = await moduleService.list();
            const data = manifests.map((manifest) => ({
                ...manifest,
                status:
                    hooks?.getStatus?.(manifest.id) ??
                    (manifest.class === "core" ? "enabled" : "available"),
            }));
            hooks?.log?.("debug", "Listed modules.", {
                ...logMeta,
                accountId: claims.sub,
                count: data.length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
            return true;
        }
        if (
            url.pathname === "/api/v1/modules/integrity" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const data = (await hooks?.getIntegrityReport?.()) ?? [];
            hooks?.log?.("debug", "Generated module integrity report.", {
                ...logMeta,
                accountId: claims.sub,
                count: data.length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
            return true;
        }
        if (url.pathname === "/api/v1/modules/import/github") {
            if (req.method !== "POST") return false;
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const body = await readJson(req);
            const repositoryUrl = String(body.repositoryUrl ?? "").trim();
            const versionTag = String(body.versionTag ?? "").trim();
            if (!repositoryUrl || !versionTag) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_body",
                            message: "repositoryUrl and versionTag are required",
                        },
                    }),
                );
                return true;
            }
            const manifest = await moduleService.importFromGithub({
                repositoryUrl,
                versionTag,
            });
            await hooks?.onImported?.(manifest.id);
            hooks?.log?.("info", "Module imported from GitHub.", {
                ...logMeta,
                accountId: claims.sub,
                moduleId: manifest.id,
                repositoryUrl,
                versionTag,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: manifest }));
            return true;
        }

        const match = url.pathname.match(
            /^\/api\/v1\/modules\/([^/]+)\/(enable|disable)$/,
        );
        if (!match || req.method !== "POST") return false;

        const claims = ctx.requireAuth(req, res, "admin");
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
        hooks?.log?.("info", `Module ${action}d.`, {
            ...logMeta,
            accountId: claims.sub,
            moduleId,
            acknowledgedExternalDisclaimer: acknowledged,
        });

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: result }));
        return true;
    };
}
