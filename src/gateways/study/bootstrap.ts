import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { GatewayBootstrapContext } from "../shared.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { StructuredDbCommandResult } from "../db/reuse/db-command.js";
import {
    requireAuth,
    getCookieSession,
    setPageSecurityHeaders,
} from "../auth/guard.js";
import { readJson } from "../../api/reuse/read-json.js";
import { CoreStudyGateway } from "./gateway.js";

const GATEWAY_ROOT = path.dirname(fileURLToPath(import.meta.url));
const MODULES_ROOT =
    process.env.COGNIS_MODULES_ROOT ??
    path.resolve(process.cwd(), "src", "modules");
const LANGUAGE_MODULES_ROOT = path.resolve(MODULES_ROOT, "study", "languages");

function parseModuleEnabledValue(
    enabledValue: unknown,
    moduleClass: string,
): boolean {
    if (enabledValue === true || enabledValue === 1 || enabledValue === "1") {
        return true;
    }
    if (enabledValue === false || enabledValue === 0 || enabledValue === "0") {
        return false;
    }
    const normalizedClass = moduleClass.trim().toLowerCase();
    return normalizedClass === "core";
}

export type {
    StudyAdapterBootstrapCtx,
    StudyAdapter,
    LanguageModule,
    LanguageChildComponent,
    LanguageModuleBootstrapCtx,
} from "./gateway.js";

/**
 * Route handler for study adapter management — mirrors the social gateway
 * adapter controls so Administration sliders work for study adapters.
 */
function createStudyAdapterRoutes(
    gatewayId: string,
    gateway: CoreStudyGateway,
    isLanguageEnabled: (languageCode: string) => Promise<boolean>,
) {
    const base = `/api/v1/gateways/${gatewayId}/adapters`;

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === base && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: gateway.listAdapters() }));
            return true;
        }

        const modulesMatch = url.pathname.match(
            /^\/api\/v1\/study\/languages\/([^/]+)\/modules$/,
        );
        if (modulesMatch && req.method === "GET") {
            const claims = requireAuth(req, res);
            if (!claims) return true;
            const languageCode = decodeURIComponent(modulesMatch[1]);
            const languageIsEnabled = await isLanguageEnabled(languageCode);
            if (!languageIsEnabled) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: [] }));
                return true;
            }
            const components = gateway.listChildComponents(
                languageCode,
                claims.role,
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: components }));
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);

            if (req.method === "GET") {
                const config = gateway.getAdapterConfig(adapterId);
                if (config === null) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Adapter not found",
                            },
                        }),
                    );
                    return true;
                }
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: config,
                        envValues: {},
                        requiredFields: [],
                        supportsTest: false,
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                if (!gateway.getAdapter(adapterId)) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Adapter not found",
                            },
                        }),
                    );
                    return true;
                }
                const body = await readJson(req);
                await gateway.saveAdapterConfig(
                    adapterId,
                    body as Record<string, unknown>,
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }

            return false;
        }

        return false;
    };
}

/**
 * Standard gateway bootstrap entry point for the Study Gateway.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const dbExecutor =
        ctx.capabilities.get<DbExecutor>("db:executor") ?? ctx.dbExecutor;

    const gateway = new CoreStudyGateway();
    const adaptersRoot = path.join(ctx.adaptersRoot, "study");

    await gateway.discoverAdapters(adaptersRoot);
    ctx.log?.("info", "Study gateway: adapters discovered.", {
        component: "study-gateway",
        adaptersRoot,
        adapterCount: gateway.listAdapters().length,
    });

    await gateway.bootstrapAdapters(adaptersRoot, {
        gateway,
        capabilities: ctx.capabilities,
        gatewayRegistry: ctx.gatewayRegistry,
        registerRoute: (handler, gatewayId) =>
            ctx.routeRegistry.register(handler, gatewayId ?? "study"),
        registerNavbarPlugin: (scriptUrl, isEnabled) =>
            ctx.uiRegistry?.registerNavbarPlugin({ scriptUrl, isEnabled }),
        registerPageExtension: (pageId, element) =>
            ctx.uiRegistry?.registerPageExtension(pageId, element),
        registerStaticDir: (prefix, dir) =>
            ctx.uiRegistry?.registerStaticDir(prefix, dir),
        registerAdapterStaticDir: (gatewayId, adapterId, dir) => {
            if (!ctx.uiRegistry?.registerAdapterStaticDir) {
                ctx.log?.(
                    "warn",
                    "Study adapter UI static directory registration skipped because the UI registry does not support adapter static dirs.",
                    {
                        component: "study-gateway",
                        gatewayId,
                        adapterId,
                        dir,
                    },
                );
                return;
            }
            ctx.uiRegistry.registerAdapterStaticDir(gatewayId, adapterId, dir);
        },
        log: ctx.log,
        dbExecutor,
    });

    ctx.log?.("info", "Study gateway: adapters bootstrapped.", {
        component: "study-gateway",
        adapterCount: gateway.listAdapters().length,
    });

    await gateway.discoverLanguageModules(LANGUAGE_MODULES_ROOT);
    ctx.log?.("info", "Study gateway: language modules discovered.", {
        component: "study-gateway",
        modulesRoot: LANGUAGE_MODULES_ROOT,
    });

    const isLanguageModuleEnabled = async (
        moduleId: string,
        moduleClass: string,
    ): Promise<boolean> => {
        if (!dbExecutor) {
            return parseModuleEnabledValue(undefined, moduleClass);
        }
        try {
            const queryResult = (await dbExecutor.executeCommand({
                option: "SELECT",
                table: "modules",
                columns: ["enabled"],
                where: [{ column: "module_id", value: moduleId }],
                limit: 1,
            })) as StructuredDbCommandResult<{ enabled?: unknown }>;
            const enabledValue = queryResult.rows?.[0]?.enabled;
            return parseModuleEnabledValue(enabledValue, moduleClass);
        } catch (error) {
            ctx.log?.(
                "error",
                "Study gateway: language module enablement lookup failed.",
                {
                    component: "study-gateway",
                    moduleId,
                    moduleClass,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
            return parseModuleEnabledValue(undefined, moduleClass);
        }
    };

    const isLanguageEnabled = async (
        languageCode: string,
    ): Promise<boolean> => {
        const languageModule = gateway
            .listRegisteredLanguageModules()
            .find((candidate) => candidate.code === languageCode);
        if (!languageModule) return false;
        return isLanguageModuleEnabled(
            languageModule.moduleId,
            languageModule.moduleClass,
        );
    };

    await gateway.bootstrapLanguageModules(
        LANGUAGE_MODULES_ROOT,
        {
            registerChildRoute: (handler) =>
                ctx.routeRegistry.register(handler, "study"),
            registerStaticDir: (prefix, dir) => {
                if (prefix.startsWith("modules/")) {
                    ctx.uiRegistry?.registerModuleStaticDir(
                        prefix.slice("modules/".length),
                        dir,
                    );
                } else {
                    ctx.uiRegistry?.registerStaticDir(prefix, dir);
                }
            },
            log: ctx.log,
        },
        {
            isLanguageModuleEnabled,
        },
    );

    ctx.log?.("info", "Study gateway: language modules bootstrapped.", {
        component: "study-gateway",
    });

    ctx.uiRegistry?.registerStaticDir("study", path.join(GATEWAY_ROOT, "ui"));

    const serveStudyHtml = async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method !== "GET") return false;
        if (
            url.pathname !== "/study" &&
            url.pathname !== "/study/welcome" &&
            url.pathname !== "/study/settings"
        )
            return false;
        if (!getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        setPageSecurityHeaders(res);
        const html = await readFile(
            path.join(GATEWAY_ROOT, "ui", "study.html"),
            "utf8",
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
    ctx.routeRegistry.register(serveStudyHtml, "study");

    const registeredLanguagesRoute = async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname !== "/api/v1/study/registered-languages" ||
            req.method !== "GET"
        )
            return false;
        const claims = requireAuth(req, res);
        if (!claims) return true;
        const languageCandidates = gateway.listRegisteredLanguageModules();
        const languageFlags = await Promise.all(
            languageCandidates.map(async (language) => ({
                language,
                enabled: await isLanguageModuleEnabled(
                    language.moduleId,
                    language.moduleClass,
                ),
            })),
        );
        const languages = languageFlags
            .filter((entry) => entry.enabled)
            .map(({ language }) => ({
                code: language.code,
                name: language.name,
                flag: language.flag,
            }));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: languages }));
        return true;
    };
    ctx.routeRegistry.register(registeredLanguagesRoute, "study");

    ctx.uiRegistry?.registerNavbarPlugin({
        scriptUrl: "/static/gateways/study/navbar.js",
        isEnabled: () =>
            ctx.gatewayRegistry.get("study")?.status !== "disabled",
    });

    ctx.routeRegistry.register(
        createStudyAdapterRoutes("study", gateway, isLanguageEnabled),
        "study",
    );

    ctx.gatewayRegistry.register({
        id: "study",
        name: "Study Gateway",
        version: "1.4.0",
        description:
            "Per-language classes, teacher assignments, and learning progress.",
        publisher: "Cognis Labs",
        hasAdapters: true,
    });

    ctx.log?.("info", "Study gateway: initialized.", {
        component: "study-gateway",
        adaptersRoot,
    });
}
