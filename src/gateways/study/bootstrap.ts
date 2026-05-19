import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { GatewayBootstrapContext } from "../shared.js";
import { readJson } from "../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../api/reuse/route-context.js";
import { CoreStudyGateway } from "./gateway.js";

const GATEWAY_ROOT = path.dirname(fileURLToPath(import.meta.url));
const MODULES_ROOT =
    process.env.COGNIS_MODULES_ROOT ??
    path.resolve(GATEWAY_ROOT, "../../modules");
const LANGUAGE_MODULES_ROOT = path.resolve(MODULES_ROOT, "study", "languages");

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
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    const base = `/api/v1/gateways/${gatewayId}/adapters`;

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === base && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: gateway.listAdapters() }));
            return true;
        }

        const modulesMatch = url.pathname.match(
            /^\/api\/v1\/study\/languages\/([^/]+)\/modules$/,
        );
        if (modulesMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res);
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
            if (!ctx.requireAuth(req, res, "admin")) return true;
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
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const routeHelpers = resolveRouteContext(routeContext);
    const gateway = new CoreStudyGateway();
    const adaptersRoot = path.join(ctx.adaptersRoot, "study");

    await Promise.all([
        gateway.discoverAdapters(adaptersRoot),
        gateway.discoverLanguageModules(LANGUAGE_MODULES_ROOT),
    ]);
    ctx.log?.(
        "info",
        "Study gateway: adapters and language modules discovered.",
        {
            component: "study-gateway",
            adaptersRoot,
            adapterCount: gateway.listAdapters().length,
        },
    );

    const syncModuleEnabledState = (
        moduleId: string,
        enabled: boolean,
    ): void => {
        gateway.setLanguageModuleEnabled(moduleId, enabled);
    };
    /**
     * modules:onStateChanged — keeps study language module availability
     * synchronized with runtime module state changes.
     */
    ctx.capabilities.contribute(
        "modules:onStateChanged",
        syncModuleEnabledState,
    );

    /**
     * Resolves a language code to module metadata, then evaluates enablement
     * through the module-state-aware checker.
     */
    const isLanguageEnabled = async (
        languageCode: string,
    ): Promise<boolean> => {
        const languageModule = gateway
            .listRegisteredLanguageModules()
            .find((candidate) => candidate.code === languageCode);
        if (!languageModule) return false;
        return gateway.isLanguageModuleEnabled(languageModule.moduleId);
    };

    await Promise.all([
        gateway.bootstrapAdapters(adaptersRoot, {
            gateway,
            capabilities: ctx.capabilities,
            gatewayRegistry: ctx.gatewayRegistry,
            registerRoute: (handler, gatewayId) =>
                ctx.routeRegistry.register(handler, gatewayId ?? "study"),
            registerNavbarPlugin: (scriptUrl, isEnabled) =>
                ctx.uiRegistry?.registerNavbarPlugin({ scriptUrl, isEnabled }),
            registerSpaRoute: (route) =>
                ctx.uiRegistry?.registerSpaRoute(route),
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
                ctx.uiRegistry.registerAdapterStaticDir(
                    gatewayId,
                    adapterId,
                    dir,
                );
            },
            log: ctx.log,
            dbExecutor: ctx.capabilities.get("db:executor") ?? ctx.dbExecutor,
        }),
        gateway.bootstrapLanguageModules(LANGUAGE_MODULES_ROOT, {
            capabilities: ctx.capabilities,
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
        }),
    ]);

    ctx.log?.(
        "info",
        "Study gateway: adapters and language modules bootstrapped.",
        {
            component: "study-gateway",
            adapterCount: gateway.listAdapters().length,
        },
    );

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
        if (!routeHelpers.getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        routeHelpers.setPageSecurityHeaders(res);
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
        const claims = routeHelpers.requireAuth(req, res);
        if (!claims) return true;
        const languages = gateway
            .listRegisteredLanguageModules()
            .filter((language) => language.enabled)
            .map((language) => ({
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
        version: "1.5.4",
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
