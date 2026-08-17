import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    BootstrapLog,
    ModuleMarketplaceService,
    ModuleService,
} from "@cognis/core";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../reuse/route-context.js";
import { readJson } from "../../reuse/read-json.js";

export interface ModuleRouteHooks {
    beforeEnable?: (moduleId: string) => Promise<void> | void;
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
    onUninstalled?: (moduleId: string) => Promise<void> | void;
}

function withMarketplaceAssetUrls<T extends { assetIds?: unknown }>(
    module: T,
): T & { assets?: { icon?: string; banner?: string; screenshots?: string[] } } {
    const assetIds = module.assetIds as
        { icon?: string; banner?: string; screenshots?: string[] } | undefined;
    const assetUrl = (id: string) =>
        `/api/v1/modules/catalog/assets/${encodeURIComponent(id)}`;
    return {
        ...module,
        assets: assetIds
            ? {
                  icon: assetIds.icon ? assetUrl(assetIds.icon) : undefined,
                  banner: assetIds.banner
                      ? assetUrl(assetIds.banner)
                      : undefined,
                  screenshots: (assetIds.screenshots ?? []).map(assetUrl),
              }
            : undefined,
    };
}

export function createModuleRoutes(
    moduleService: ModuleService,
    hooks?: ModuleRouteHooks,
    routeContext?: RouteContext,
    marketplace?: ModuleMarketplaceService,
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
        if (marketplace && url.pathname === "/api/v1/modules/sources") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            if (req.method === "GET") {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({ data: await marketplace.listSources() }),
                );
                return true;
            }
            if (req.method === "POST") {
                const source = await marketplace.saveSource(
                    (await readJson(req)) as never,
                );
                hooks?.log?.("info", "Module source saved.", {
                    ...logMeta,
                    accountId: claims.sub,
                    sourceUuid: source.uuid,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: source }));
                return true;
            }
        }
        if (marketplace && url.pathname === "/api/v1/modules/settings") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const data =
                req.method === "PUT"
                    ? await marketplace.saveSettings(
                          (await readJson(req)) as never,
                      )
                    : req.method === "GET"
                      ? await marketplace.getSettings()
                      : null;
            if (data) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data }));
                return true;
            }
        }
        const sourceDeleteMatch = url.pathname.match(
            /^\/api\/v1\/modules\/sources\/([^/]+)$/,
        );
        if (marketplace && sourceDeleteMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            await marketplace.removeSource(
                decodeURIComponent(sourceDeleteMatch[1]),
            );
            hooks?.log?.("info", "Module source removed.", {
                ...logMeta,
                accountId: claims.sub,
                sourceUuid: sourceDeleteMatch[1],
            });
            res.writeHead(204);
            res.end();
            return true;
        }
        const assetMatch = url.pathname.match(
            /^\/api\/v1\/modules\/catalog\/assets\/([a-f0-9]{64})$/,
        );
        if (marketplace && assetMatch && req.method === "GET") {
            const asset = marketplace.getAsset(assetMatch[1]);
            if (!asset) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "module_asset_not_found",
                            message: "Module asset not found.",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, {
                "content-type": asset.contentType,
                "cache-control": "private, max-age=3600",
                "x-content-type-options": "nosniff",
            });
            res.end(asset.body);
            return true;
        }
        if (
            marketplace &&
            url.pathname === "/api/v1/modules/catalog" &&
            req.method === "POST"
        ) {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const body = await readJson(req);
            const sourceUuids = Array.isArray(body.sourceUuids)
                ? body.sourceUuids.filter(
                      (value): value is string => typeof value === "string",
                  )
                : undefined;
            const recommended = new Set(
                await marketplace.listRecommendedModuleUuids(),
            );
            const data = (
                await marketplace.discover(
                    (body.tokens ?? {}) as Record<string, string>,
                    sourceUuids,
                )
            ).map((module) =>
                withMarketplaceAssetUrls({
                    ...module,
                    recommended: recommended.has(module.uuid),
                }),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
            return true;
        }
        if (
            marketplace &&
            url.pathname === "/api/v1/modules/install" &&
            req.method === "POST"
        ) {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const body = await readJson(req);
            const requestedModule = body.module as { uuid?: string };
            const installedModule = (await moduleService.list()).find(
                (entry) => entry.uuid === requestedModule.uuid,
            );
            if (
                installedModule &&
                hooks?.getStatus?.(installedModule.id) === "enabled"
            ) {
                res.writeHead(409, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "module_enabled",
                            message: "Disable the module before updating it.",
                        },
                    }),
                );
                return true;
            }
            const manifest = await marketplace.install(
                requestedModule as never,
                typeof body.token === "string" ? body.token : undefined,
                typeof body.branch === "string" ? body.branch : undefined,
            );
            hooks?.log?.("info", "External module installed.", {
                ...logMeta,
                accountId: claims.sub,
                moduleUuid: manifest.uuid,
            });
            await hooks?.onImported?.(manifest.id);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: manifest }));
            return true;
        }
        const uninstallMatch = url.pathname.match(
            /^\/api\/v1\/modules\/([^/]+)\/uninstall$/,
        );
        if (marketplace && uninstallMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const moduleUuid = decodeURIComponent(uninstallMatch[1]);
            const manifest = (await moduleService.list()).find(
                (entry) => entry.uuid === moduleUuid,
            );
            if (manifest && hooks?.getStatus?.(manifest.id) === "enabled") {
                res.writeHead(409, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "module_enabled",
                            message:
                                "Disable the module before uninstalling it.",
                        },
                    }),
                );
                return true;
            }
            await marketplace.uninstall(moduleUuid);
            if (manifest) await hooks?.onUninstalled?.(manifest.id);
            hooks?.log?.("info", "External module uninstalled.", {
                ...logMeta,
                accountId: claims.sub,
                moduleUuid,
            });
            res.writeHead(204);
            res.end();
            return true;
        }
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
                            message:
                                "repositoryUrl and versionTag are required",
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

        if (action === "enable") {
            await hooks?.beforeEnable?.(moduleId);
        }

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
