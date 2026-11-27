import { withMarketplaceAssetUrls } from "./catalog-presentation.js";
import { createModuleMarketplaceStateRoute } from "./marketplace-state.js";
import { createModuleSourceRoutes } from "./sources.js";
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
    onDisabled?: (
        moduleId: string,
        options: { preserveEnabledState: boolean },
    ) => Promise<void> | void;
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
    "module_install_timeout",
    "invalid_module_asset_convention",
    "invalid_module_asset_path",
    "invalid_module_branch",
    "invalid_module_commit",
    "invalid_module_manifest",
    "invalid_module_repository_layout",
    "invalid_module_repository_path",
    "invalid_module_source",
    "missing_module_license_file",
    "module_dependency_disabled",
    "module_dependency_unavailable",
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

function sendRestartRequired(response: ServerResponse): void {
    response.writeHead(409, { "content-type": "application/json" });
    response.end(
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
    const sourceRoutes = marketplace
        ? createModuleSourceRoutes(marketplace, ctx, hooks?.log)
        : null;
    const installJobs = new Map<
        string,
        | { status: "pending" }
        | { status: "succeeded"; data: unknown }
        | { status: "failed"; message: string; code?: string }
    >();
    const restartRequiredModules = new Set<string>();
    const stateRoute = marketplace
        ? createModuleMarketplaceStateRoute({
              moduleService,
              marketplace,
              ctx,
              restartRequiredModules,
              getStatus: hooks?.getStatus,
              log: hooks?.log,
          })
        : undefined;
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const logMetadata = {
            component: "api-modules",
            method: request.method ?? "GET",
            path: url.pathname,
        };
        if (sourceRoutes && (await sourceRoutes(request, response, url)))
            return true;
        if (stateRoute && (await stateRoute(request, response, url)))
            return true;
        const channelMatch = url.pathname.match(
            /^\/api\/v1\/modules\/catalog\/([^/]+)\/channel$/,
        );
        if (marketplace && channelMatch && request.method === "PUT") {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const body = await readJson(request);
            if (typeof body.branch !== "string" || !body.branch.trim()) {
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
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
            response.writeHead(204);
            response.end();
            return true;
        }
        const assetMatch = url.pathname.match(
            /^\/api\/v1\/modules\/catalog\/assets\/([a-f0-9]{64})$/,
        );
        const stringsMatch = url.pathname.match(
            /^\/api\/v1\/modules\/catalog\/strings\/([^/]+)\/([a-z]{2})\/strings\.xml$/,
        );
        if (marketplace && stringsMatch && request.method === "GET") {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const moduleUuid = decodeURIComponent(stringsMatch[1]);
            const module = (await marketplace.listCachedModules()).find(
                (entry) => entry.uuid === moduleUuid,
            );
            const strings = module?.assetIds?.strings;
            let locale = stringsMatch[2];
            const assetId = strings?.[locale];
            let asset = assetId
                ? await marketplace.getAsset(assetId)
                : undefined;
            if (!asset && locale !== "en" && strings?.en) {
                locale = "en";
                asset = await marketplace.getAsset(strings.en);
            }
            if (!asset) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "module_strings_not_found",
                            message: "Module strings not found.",
                        },
                    }),
                );
                return true;
            }
            response.writeHead(200, {
                "content-type": asset.contentType,
                "content-language": locale,
                "cache-control": "private, max-age=3600",
                "x-content-type-options": "nosniff",
            });
            response.end(asset.body);
            return true;
        }
        if (marketplace && assetMatch && request.method === "GET") {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const asset = await marketplace.getAsset(assetMatch[1]);
            if (!asset) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "module_asset_not_found",
                            message: "Module asset not found.",
                        },
                    }),
                );
                return true;
            }
            response.writeHead(200, {
                "content-type": asset.contentType,
                "cache-control": "private, max-age=3600",
                "x-content-type-options": "nosniff",
            });
            response.end(asset.body);
            return true;
        }
        const installJobMatch = url.pathname.match(
            /^\/api\/v1\/modules\/install\/([a-f0-9-]+)$/,
        );
        if (marketplace && installJobMatch && request.method === "GET") {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const job = installJobs.get(installJobMatch[1]);
            if (!job) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
                response.writeHead(422, { "content-type": "application/json" });
                response.end(
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
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: job }));
            return true;
        }
        if (
            marketplace &&
            url.pathname === "/api/v1/modules/catalog" &&
            (request.method === "GET" || request.method === "POST")
        ) {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const body =
                request.method === "POST" ? await readJson(request) : {};
            const sourceUuids = Array.isArray(body.sourceUuids)
                ? body.sourceUuids.filter(
                      (value): value is string => typeof value === "string",
                  )
                : undefined;
            const recommended = new Set(
                await marketplace.listRecommendedModuleUuids(
                    body.forceRefresh === true,
                ),
            );
            const discovery =
                request.method === "POST"
                    ? await marketplace.discoverWithReport(
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
                request.method === "POST"
                    ? "Module source scan completed."
                    : "Listed cached module discoveries.",
                {
                    ...logMetadata,
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
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data, meta: { sourceFailures } }));
            return true;
        }
        if (
            marketplace &&
            url.pathname === "/api/v1/modules/install" &&
            request.method === "POST"
        ) {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const body = await readJson(request);
            const requestedModule = body.module as { uuid?: string };
            if (
                requestedModule.uuid &&
                restartRequiredModules.has(requestedModule.uuid)
            ) {
                sendRestartRequired(response);
                return true;
            }
            const installedModules = await moduleService.list();
            const installedModule = installedModules.find(
                (entry) => entry.uuid === requestedModule.uuid,
            );
            const collidingModule = installedModules.find(
                (entry) =>
                    entry.id === (body.module as { id?: string }).id &&
                    entry.uuid !== requestedModule.uuid,
            );
            if (collidingModule) {
                const conflict = {
                    moduleId: collidingModule.id,
                    installedModuleUuid: collidingModule.uuid,
                    requestedModuleUuid: requestedModule.uuid,
                };
                hooks?.log?.(
                    "error",
                    "Module installation rejected due to an ID conflict.",
                    {
                        ...logMetadata,
                        operation: "install_module",
                        accountId: claims.sub,
                        ...conflict,
                    },
                );
                response.writeHead(409, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "module_id_conflict",
                            message:
                                "A different module already uses this module ID.",
                            conflict,
                        },
                    }),
                );
                return true;
            }
            if (
                installedModule &&
                hooks?.getStatus?.(installedModule.id) === "enabled"
            ) {
                response.writeHead(409, { "content-type": "application/json" });
                response.end(
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
                        ...logMetadata,
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
                            ...logMetadata,
                            accountId: claims.sub,
                            moduleUuid: requestedModule.uuid,
                            ...(code ? { code } : {}),
                            error: internalMessage,
                        },
                    );
                });
            response.writeHead(202, { "content-type": "application/json" });
            response.end(
                JSON.stringify({ data: { jobId, status: "pending" } }),
            );
            return true;
        }
        const uninstallMatch = url.pathname.match(
            /^\/api\/v1\/modules\/([^/]+)\/uninstall$/,
        );
        if (marketplace && uninstallMatch && request.method === "DELETE") {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const moduleUuid = decodeURIComponent(uninstallMatch[1]);
            if (restartRequiredModules.has(moduleUuid)) {
                sendRestartRequired(response);
                return true;
            }
            const manifest = (await moduleService.list()).find(
                (entry) => entry.uuid === moduleUuid,
            );
            if (manifest && hooks?.getStatus?.(manifest.id) === "enabled") {
                response.writeHead(409, { "content-type": "application/json" });
                response.end(
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
            const body = await readJson(request).catch(() => ({}));
            const deleteContent = body?.deleteContent === true;
            if (manifest) {
                const cleanupSupported = await hooks?.beforeUninstall?.(
                    manifest.id,
                    {
                        deleteContent,
                    },
                );
                if (deleteContent && cleanupSupported === false) {
                    response.writeHead(409, {
                        "content-type": "application/json",
                    });
                    response.end(
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
                ...logMetadata,
                accountId: claims.sub,
                moduleId: manifest?.id,
                moduleUuid,
                deleteContent,
            });
            response.writeHead(204);
            response.end();
            return true;
        }
        if (url.pathname === "/api/v1/modules" && request.method === "GET") {
            const claims = ctx.requireAuth(request, response, "admin");
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
                ...logMetadata,
                accountId: claims.sub,
                count: data.length,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data }));
            return true;
        }
        if (
            url.pathname === "/api/v1/modules/integrity" &&
            request.method === "GET"
        ) {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const data = (await hooks?.getIntegrityReport?.()) ?? [];
            hooks?.log?.("debug", "Generated module integrity report.", {
                ...logMetadata,
                accountId: claims.sub,
                count: data.length,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data }));
            return true;
        }
        if (url.pathname === "/api/v1/modules/import/github") {
            if (request.method !== "POST") return false;
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const body = await readJson(request);
            const repositoryUrl = String(body.repositoryUrl ?? "").trim();
            const versionTag = String(body.versionTag ?? "").trim();
            if (!repositoryUrl || !versionTag) {
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
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
                ...logMetadata,
                accountId: claims.sub,
                moduleId: manifest.id,
                repositoryUrl,
                versionTag,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: manifest }));
            return true;
        }

        const match = url.pathname.match(
            /^\/api\/v1\/modules\/([^/]+)\/(enable|disable)$/,
        );
        if (!match || request.method !== "POST") return false;

        const claims = ctx.requireAuth(request, response, "admin");
        if (!claims) return true;

        const moduleId = decodeURIComponent(match[1]);
        const action = match[2];
        const acknowledged =
            request.headers["x-cognis-external-module-disclaimer"] ===
                "accepted" ||
            url.searchParams.get("acknowledgeExternalDisclaimer") === "true";
        const integrityAcknowledgement = String(
            request.headers["x-cognis-module-integrity-risk"] ?? "",
        );

        const lifecycleManifest = (await moduleService.list()).find(
            (manifest) => manifest.id === moduleId,
        );
        if (
            lifecycleManifest &&
            restartRequiredModules.has(lifecycleManifest.uuid)
        ) {
            sendRestartRequired(response);
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
                response.writeHead(409, { "content-type": "application/json" });
                response.end(
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
                        ...logMetadata,
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
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
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
                    ...logMetadata,
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
                response.writeHead(409, {
                    "content-type": "application/json",
                });
                response.end(
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
                ...logMetadata,
                accountId: claims.sub,
                moduleId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }

        if (action === "enable") await hooks?.onEnabled?.(moduleId);
        if (action === "disable") {
            await hooks?.onDisabled?.(moduleId, {
                preserveEnabledState:
                    request.headers["x-cognis-module-lifecycle"] ===
                    "temporary-update",
            });
        }
        hooks?.log?.(
            action === "disable" ? "warn" : "info",
            `Module ${action}d.`,
            {
                ...logMetadata,
                accountId: claims.sub,
                moduleId,
                acknowledgedExternalDisclaimer: acknowledged,
            },
        );

        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ data: result }));
        return true;
    };
}
