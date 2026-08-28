import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import type {
    BootstrapLog,
    ModuleManifest,
    ModuleMarketplaceService,
    ModuleService,
} from "@cognis/core";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../reuse/route-context.js";
import { readJson } from "../../reuse/read-json.js";

export interface ModuleRouteHooks {
    validateInstallDependencies?: (
        manifest: ModuleManifest,
    ) => Promise<void> | void;
    beforeEnable?: (moduleId: string) => Promise<void> | void;
    onEnabled?: (moduleId: string) => Promise<void> | void;
    onDisabled?: (moduleId: string) => Promise<void> | void;
    getStatus?: (moduleId: string) => "enabled" | "disabled" | "available";
    log?: BootstrapLog;
    getIntegrityReport?: () => Promise<
        Array<{
            moduleId: string;
            file: string;
            expected: string | null;
            actual: string | null;
            status: "ok" | "mismatch" | "missing" | "missing_shasum";
        }>
    >;
    onImported?: (moduleId: string) => Promise<void> | void;
    beforeUninstall?: (
        moduleId: string,
        options: { deleteContent: boolean },
    ) => Promise<boolean | void> | boolean | void;
    onUninstalled?: (moduleId: string) => Promise<void> | void;
}

export class ModuleEnableValidationError extends Error {
    constructor(
        readonly code: string,
        message: string,
    ) {
        super(message);
    }
}

const PUBLIC_INSTALL_ERROR_CODES = new Set([
    "github_connection_timeout",
    "invalid_module_asset_convention",
    "invalid_module_asset_path",
    "invalid_module_branch",
    "invalid_module_commit",
    "invalid_module_manifest",
    "invalid_module_repository_layout",
    "invalid_module_repository_path",
    "invalid_module_source",
    "missing_module_license_file",
    "module_id_conflict",
    "module_uuid_mismatch",
    "unsupported_clone_url",
]);

function publicInstallErrorCode(error: unknown): string | undefined {
    const explicitCode = (error as { code?: unknown })?.code;
    if (
        typeof explicitCode === "string" &&
        PUBLIC_INSTALL_ERROR_CODES.has(explicitCode)
    ) {
        return explicitCode;
    }
    const message = error instanceof Error ? error.message : "";
    return PUBLIC_INSTALL_ERROR_CODES.has(message) ? message : undefined;
}

async function withMarketplaceAssetUrls<T extends { assetIds?: unknown }>(
    module: T,
    marketplace: ModuleMarketplaceService,
    log?: BootstrapLog,
): Promise<
    T & {
        assets?: {
            icon?: string;
            banner?: string;
            screenshots?: string[];
            media?: Array<{ url: string; contentType: string }>;
        };
    }
> {
    const assetIds = module.assetIds as
        | {
              icon?: string;
              banner?: string;
              screenshots?: string[];
              media?: Array<{ id: string; contentType: string }>;
              strings?: Record<string, string>;
          }
        | undefined;
    const assetUrl = (id: string) =>
        `/api/v1/modules/catalog/assets/${encodeURIComponent(id)}`;
    const moduleUi =
        (module as { ui?: Record<string, unknown> }).ui ?? undefined;
    const declaresStrings =
        typeof moduleUi?.stringsBaseUrl === "string" ||
        Boolean(assetIds?.strings);
    const englishStringsId = assetIds?.strings?.en;
    const englishStrings = englishStringsId
        ? await marketplace.getAsset(englishStringsId)
        : undefined;
    if (declaresStrings && !englishStrings) {
        log?.("warn", "Module catalog strings were unavailable.", {
            component: "api-modules",
            operation: "resolve-marketplace-strings",
            moduleUuid: String((module as { uuid?: unknown }).uuid ?? ""),
            locale: "en",
            assetId: englishStringsId,
        });
    }
    return {
        ...module,
        ui: declaresStrings
            ? {
                  ...moduleUi,
                  stringsBaseUrl: englishStrings
                      ? `/api/v1/modules/catalog/strings/${encodeURIComponent(String((module as { uuid?: unknown }).uuid ?? ""))}`
                      : undefined,
              }
            : (module as { ui?: Record<string, unknown> }).ui,
        assets: assetIds
            ? {
                  icon: assetIds.icon ? assetUrl(assetIds.icon) : undefined,
                  banner: assetIds.banner
                      ? assetUrl(assetIds.banner)
                      : undefined,
                  screenshots: (assetIds.screenshots ?? []).map(assetUrl),
                  media: (assetIds.media ?? []).map((entry) => ({
                      url: assetUrl(entry.id),
                      contentType: entry.contentType,
                  })),
              }
            : undefined,
    };
}

function sendRestartRequired(res: ServerResponse): void {
    res.writeHead(409, { "content-type": "application/json" });
    res.end(
        JSON.stringify({
            error: {
                code: "module_restart_required",
                message:
                    "Restart the server before performing another module action.",
            },
        }),
    );
}

export function createModuleRoutes(
    moduleService: ModuleService,
    hooks?: ModuleRouteHooks,
    routeContext?: RouteContext,
    marketplace?: ModuleMarketplaceService,
) {
    const ctx = resolveRouteContext(routeContext);
    const installJobs = new Map<
        string,
        | { status: "pending" }
        | { status: "succeeded"; data: unknown }
        | { status: "failed"; message: string; code?: string }
    >();
    const restartRequiredModules = new Set<string>();
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
        if (
            marketplace &&
            url.pathname === "/api/v1/modules/sources/validate-credential" &&
            req.method === "POST"
        ) {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const body = await readJson(req);
            const data = await marketplace.validateSourceCredential(
                body.source as never,
                String(body.token ?? ""),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
            return true;
        }
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
                const body = await readJson(req);
                const existingSource = (await marketplace.listSources()).some(
                    (entry) => entry.uuid === body.uuid,
                );
                const source = await marketplace.saveSource(body as never);
                hooks?.log?.(
                    "info",
                    existingSource
                        ? "Module source updated."
                        : "Module source added.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                        sourceUuid: source.uuid,
                    },
                );
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
        const channelMatch = url.pathname.match(
            /^\/api\/v1\/modules\/catalog\/([^/]+)\/channel$/,
        );
        if (marketplace && channelMatch && req.method === "PUT") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const body = await readJson(req);
            if (typeof body.branch !== "string" || !body.branch.trim()) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_module_branch",
                            message: "Select a valid module release channel.",
                        },
                    }),
                );
                return true;
            }
            await marketplace.saveSelectedBranch(
                decodeURIComponent(channelMatch[1]),
                body.branch,
            );
            res.writeHead(204);
            res.end();
            return true;
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
            hooks?.log?.("warn", "Module source deleted.", {
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
        const stringsMatch = url.pathname.match(
            /^\/api\/v1\/modules\/catalog\/strings\/([^/]+)\/([a-z]{2})\/strings\.xml$/,
        );
        if (marketplace && stringsMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const moduleUuid = decodeURIComponent(stringsMatch[1]);
            const module = (await marketplace.listCachedModules()).find(
                (entry) => entry.uuid === moduleUuid,
            );
            const assetId = module?.assetIds?.strings?.[stringsMatch[2]];
            const asset = assetId
                ? await marketplace.getAsset(assetId)
                : undefined;
            if (!asset) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "module_strings_not_found",
                            message: "Module strings not found.",
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
        if (marketplace && assetMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const asset = await marketplace.getAsset(assetMatch[1]);
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
        const installJobMatch = url.pathname.match(
            /^\/api\/v1\/modules\/install\/([a-f0-9-]+)$/,
        );
        if (marketplace && installJobMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const job = installJobs.get(installJobMatch[1]);
            if (!job) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "module_install_job_not_found",
                            message: "Module installation job not found.",
                        },
                    }),
                );
                return true;
            }
            if (job.status === "failed") {
                installJobs.delete(installJobMatch[1]);
                res.writeHead(422, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: job.code ?? "module_install_failed",
                            message: job.message,
                        },
                    }),
                );
                return true;
            }
            if (job.status === "succeeded")
                installJobs.delete(installJobMatch[1]);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: job }));
            return true;
        }
        if (
            marketplace &&
            url.pathname === "/api/v1/modules/catalog" &&
            (req.method === "GET" || req.method === "POST")
        ) {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const body = req.method === "POST" ? await readJson(req) : {};
            const sourceUuids = Array.isArray(body.sourceUuids)
                ? body.sourceUuids.filter(
                      (value): value is string => typeof value === "string",
                  )
                : undefined;
            const recommended = new Set(
                await marketplace.listRecommendedModuleUuids(),
            );
            const discovery =
                req.method === "POST"
                    ? await marketplace.discoverWithReport(
                          (body.tokens ?? {}) as Record<string, string>,
                          sourceUuids,
                          body.forceRefresh === true,
                      )
                    : {
                          modules: await marketplace.listCachedModules(),
                          sourceFailures: [],
                      };
            const { modules, sourceFailures } = discovery;
            hooks?.log?.(
                "info",
                req.method === "POST"
                    ? "Module source scan completed."
                    : "Listed cached module discoveries.",
                {
                    ...logMeta,
                    accountId: claims.sub,
                    sourceUuids,
                    catalogModulesFound: modules.length,
                },
            );
            const data = await Promise.all(
                modules.map((module) =>
                    withMarketplaceAssetUrls(
                        {
                            ...module,
                            restartRequired: restartRequiredModules.has(
                                module.uuid,
                            ),
                            recommended: recommended.has(module.uuid),
                        },
                        marketplace,
                        hooks?.log,
                    ),
                ),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data, meta: { sourceFailures } }));
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
            if (
                requestedModule.uuid &&
                restartRequiredModules.has(requestedModule.uuid)
            ) {
                sendRestartRequired(res);
                return true;
            }
            const installedModule = (await moduleService.list()).find(
                (entry) => entry.uuid === requestedModule.uuid,
            );
            const collidingModule = (await moduleService.list()).find(
                (entry) =>
                    entry.id === (body.module as { id?: string }).id &&
                    entry.uuid !== requestedModule.uuid,
            );
            if (collidingModule) {
                res.writeHead(409, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "module_id_conflict",
                            message:
                                "A different module already uses this module ID.",
                        },
                    }),
                );
                return true;
            }
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
            const jobId = randomUUID();
            installJobs.set(jobId, { status: "pending" });
            void marketplace
                .install(
                    requestedModule as never,
                    typeof body.token === "string" ? body.token : undefined,
                    typeof body.branch === "string" ? body.branch : undefined,
                    async (manifest) => {
                        await hooks?.validateInstallDependencies?.(manifest);
                    },
                )
                .then(async (manifest) => {
                    await hooks?.onImported?.(manifest.id);
                    const restartRequired = Boolean(
                        installedModule && body.wasEnabled === true,
                    );
                    if (restartRequired) {
                        restartRequiredModules.add(manifest.uuid);
                    }
                    installJobs.set(jobId, {
                        status: "succeeded",
                        data: { ...manifest, restartRequired },
                    });
                    hooks?.log?.("info", "External module installed.", {
                        ...logMeta,
                        accountId: claims.sub,
                        moduleId: manifest.id,
                        moduleUuid: manifest.uuid,
                        restartRequired,
                    });
                })
                .catch((error) => {
                    const internalMessage =
                        error instanceof Error ? error.message : String(error);
                    const code = publicInstallErrorCode(error);
                    installJobs.set(jobId, {
                        status: "failed",
                        message: "Module installation failed.",
                        code,
                    });
                    hooks?.log?.(
                        "error",
                        "External module installation failed.",
                        {
                            ...logMeta,
                            accountId: claims.sub,
                            moduleUuid: requestedModule.uuid,
                            ...(code ? { code } : {}),
                            ...(code === "github_connection_timeout"
                                ? { knownCause: "container_network_mtu" }
                                : {}),
                            error: internalMessage,
                        },
                    );
                });
            res.writeHead(202, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { jobId, status: "pending" } }));
            return true;
        }
        const uninstallMatch = url.pathname.match(
            /^\/api\/v1\/modules\/([^/]+)\/uninstall$/,
        );
        if (marketplace && uninstallMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const moduleUuid = decodeURIComponent(uninstallMatch[1]);
            if (restartRequiredModules.has(moduleUuid)) {
                sendRestartRequired(res);
                return true;
            }
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
            const body = await readJson(req).catch(() => ({}));
            const deleteContent = body?.deleteContent === true;
            if (manifest) {
                const cleanupSupported = await hooks?.beforeUninstall?.(
                    manifest.id,
                    {
                        deleteContent,
                    },
                );
                if (deleteContent && cleanupSupported === false) {
                    res.writeHead(409, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "module_content_cleanup_unavailable",
                                message:
                                    "This module must provide an uninstallModule hook before Cognis can delete its external content.",
                            },
                        }),
                    );
                    return true;
                }
            }
            await marketplace.uninstall(moduleUuid);
            if (manifest) await hooks?.onUninstalled?.(manifest.id);
            hooks?.log?.("warn", "External module deleted.", {
                ...logMeta,
                accountId: claims.sub,
                moduleId: manifest?.id,
                moduleUuid,
                deleteContent,
            });
            res.writeHead(204);
            res.end();
            return true;
        }
        if (url.pathname === "/api/v1/modules" && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const manifests = (await moduleService.list()).filter(
                (manifest) => manifest.class !== "core",
            );
            const data = manifests.map((manifest) => ({
                ...manifest,
                restartRequired: restartRequiredModules.has(manifest.uuid),
                status: hooks?.getStatus?.(manifest.id) ?? "available",
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
        const integrityAcknowledgement = String(
            req.headers["x-cognis-module-integrity-risk"] ?? "",
        );

        const lifecycleManifest = (await moduleService.list()).find(
            (manifest) => manifest.id === moduleId,
        );
        if (
            lifecycleManifest &&
            restartRequiredModules.has(lifecycleManifest.uuid)
        ) {
            sendRestartRequired(res);
            return true;
        }

        if (action === "enable") {
            const integrityFailures = (
                (await hooks?.getIntegrityReport?.()) ?? []
            ).filter(
                (entry) => entry.moduleId === moduleId && entry.status !== "ok",
            );
            const integrityToken = createHash("sha256")
                .update(JSON.stringify(integrityFailures))
                .digest("hex");
            if (
                integrityFailures.length &&
                integrityAcknowledgement !== `accepted:${integrityToken}`
            ) {
                res.writeHead(409, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "module_integrity_acknowledgement_required",
                            message:
                                "Module files have missing or mismatched SHASUMs.",
                            integrityFailures,
                            integrityToken,
                        },
                    }),
                );
                return true;
            }
            if (integrityFailures.length) {
                hooks?.log?.(
                    "warn",
                    "Module integrity risk acknowledged before enablement.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                        moduleId,
                        integrityFailures,
                    },
                );
            }
            if (
                !acknowledged &&
                (await moduleService.requiresExternalAcknowledgement?.(
                    moduleId,
                ))
            ) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "external_module_acknowledgement_required",
                            message:
                                "External module disclaimer acknowledgement is required.",
                        },
                    }),
                );
                return true;
            }
            try {
                await hooks?.beforeEnable?.(moduleId);
            } catch (error) {
                hooks?.log?.("error", "Module enable validation failed.", {
                    ...logMeta,
                    accountId: claims.sub,
                    moduleId,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                const validationError =
                    error instanceof ModuleEnableValidationError
                        ? error
                        : new ModuleEnableValidationError(
                              "module_validation_failed",
                              "Module validation failed.",
                          );
                res.writeHead(409, {
                    "content-type": "application/json",
                });
                res.end(
                    JSON.stringify({
                        error: {
                            code: validationError.code,
                            message: validationError.message,
                        },
                    }),
                );
                return true;
            }
        }

        let result;
        try {
            result =
                action === "enable"
                    ? await moduleService.enable(moduleId, {
                          acknowledgeExternalDisclaimer: acknowledged,
                      })
                    : await moduleService.disable(moduleId);
        } catch (error) {
            hooks?.log?.("error", `Module ${action} failed.`, {
                ...logMeta,
                accountId: claims.sub,
                moduleId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }

        if (action === "enable") await hooks?.onEnabled?.(moduleId);
        if (action === "disable") await hooks?.onDisabled?.(moduleId);
        hooks?.log?.(
            action === "disable" ? "warn" : "info",
            `Module ${action}d.`,
            {
                ...logMeta,
                accountId: claims.sub,
                moduleId,
                acknowledgedExternalDisclaimer: acknowledged,
            },
        );

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: result }));
        return true;
    };
}
