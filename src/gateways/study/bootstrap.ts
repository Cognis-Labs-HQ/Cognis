import { readGatewayManifestVersion } from "../reuse/manifest-version.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { GatewayBootstrapContext } from "../shared.js";
import type { Ctx } from "@cognis/core";
import { readJson } from "../../api/reuse/read-json.js";
import { buildGatewayAdapterAdminControls } from "../../api/reuse/adapter-admin-controls.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../api/reuse/route-context.js";
import { CoreStudyGateway, type LanguageChildComponent } from "./gateway.js";
import { createGatewayUiRegistryHooks } from "../reuse/ui-registry-hooks.js";

const GATEWAY_ROOT = path.dirname(fileURLToPath(import.meta.url));
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
    gatewayRegistry: GatewayBootstrapContext["gatewayRegistry"],
    isLanguageEnabled: (languageCode: string) => Promise<boolean>,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    const base = `/api/v1/gateways/${gatewayId}/adapters`;
    const toggleAdapterRoutePattern = new RegExp(
        `^${base}/([^/]+)/(enable|disable)$`,
    );

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === base && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: gateway.listAdapters().map((adapter) => ({
                        ...adapter,
                        controls: buildGatewayAdapterAdminControls(
                            base,
                            adapter.id,
                        ),
                    })),
                }),
            );
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
                        data: {
                            ...config,
                            enabled: gateway.isAdapterEnabled(adapterId),
                        },
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

        const toggleMatch = url.pathname.match(toggleAdapterRoutePattern);
        if (toggleMatch && req.method === "POST") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(toggleMatch[1]);
            const action = toggleMatch[2] as "enable" | "disable";
            const adapter = gateway.getAdapter(adapterId);
            if (!adapter) {
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
            if (action === "enable") {
                const gatewayEntry = gatewayRegistry.get(gatewayId);
                if (gatewayEntry?.status === "disabled") {
                    res.writeHead(409, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "gateway_disabled",
                                message:
                                    "Cannot enable an adapter while its gateway is disabled",
                            },
                        }),
                    );
                    return true;
                }
                await gateway.enableAdapter(adapterId);
            } else {
                await gateway.disableAdapter(adapterId);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { enabled: action === "enable" } }));
            return true;
        }

        return false;
    };
}

/**
 * Standard gateway bootstrap entry point for the Study Gateway.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const manifestVersion = await readGatewayManifestVersion(
        import.meta.url,
        "./manifest.json",
    );
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const routeHelpers = resolveRouteContext(routeContext);
    const gateway = new CoreStudyGateway();
    const adaptersRoot = path.join(ctx.adaptersRoot, "study");

    const syncLanguageCapabilities = (): void => {
        const systemCtx = ctx.capabilities.get<Ctx>("system:ctx");
        const capabilityIds =
            systemCtx?.listCapabilities() ?? ctx.capabilities.list();
        for (const capabilityId of capabilityIds.filter((id) =>
            /^study:language:[^:]+$/.test(id),
        )) {
            const descriptor = (systemCtx?.getCapability(capabilityId) ??
                ctx.capabilities.get(capabilityId)) as
                | {
                      code?: string;
                      languageCode?: string;
                      name?: string;
                      languageName?: string;
                      flag?: string;
                      languageFlag?: string;
                      version?: string;
                      moduleId?: string;
                      childComponents?: Array<
                          LanguageChildComponent & { labelKey?: string }
                      >;
                  }
                | undefined;
            const languageCode = String(
                descriptor?.code ?? descriptor?.languageCode ?? "",
            ).trim();
            if (!languageCode) continue;
            const moduleId =
                descriptor?.moduleId ?? `study-language-${languageCode}`;
            gateway.registerLanguageModule(
                {
                    languageCode,
                    languageName: String(
                        descriptor?.name ??
                            descriptor?.languageName ??
                            languageCode,
                    ),
                    languageFlag: String(
                        descriptor?.flag ?? descriptor?.languageFlag ?? "",
                    ),
                    version: String(descriptor?.version ?? "0.0.0"),
                    listChildComponents: () =>
                        (descriptor?.childComponents ?? []).map(
                            (component) => ({
                                ...component,
                                label:
                                    component.label ??
                                    component.labelKey ??
                                    component.id,
                            }),
                        ),
                },
                { moduleId },
            );
            gateway.setLanguageModuleEnabled(moduleId, true);
        }
    };

    await gateway.discoverAdapters(adaptersRoot);
    ctx.log?.("info", "Study gateway: adapters discovered.", {
        component: "study-gateway",
        adaptersRoot,
        adapterCount: gateway.listAdapters().length,
    });

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
        syncLanguageCapabilities();
        const languageModule = gateway
            .listRegisteredLanguageModules()
            .find((candidate) => candidate.code === languageCode);
        if (!languageModule) return false;
        return gateway.isLanguageModuleEnabled(languageModule.moduleId);
    };
    const uiHooks = createGatewayUiRegistryHooks(ctx.uiRegistry, "study");

    await gateway.bootstrapAdapters(adaptersRoot, {
        ...uiHooks,
        gateway,
        capabilities: ctx.capabilities,
        gatewayRegistry: ctx.gatewayRegistry,
        flow: ctx.flow,
        registerRoute: (handler, gatewayId) =>
            ctx.routeRegistry.register(handler, gatewayId ?? "study"),
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
    });

    ctx.log?.("info", "Study gateway: adapters bootstrapped.", {
        component: "study-gateway",
        adapterCount: gateway.listAdapters().length,
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
        syncLanguageCapabilities();
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
        createStudyAdapterRoutes(
            "study",
            gateway,
            ctx.gatewayRegistry,
            isLanguageEnabled,
        ),
        "study",
    );

    ctx.routeRegistry.registerPrefix("/api/v1/study", "study");
    ctx.gatewayRegistry.register({
        id: "study",
        name: "Study Gateway",
        version: manifestVersion,
        description:
            "Per-language classes, teacher assignments, and learning progress.",
        publisher: "Cognis Labs HQ",
        hasAdapters: true,
    });

    ctx.log?.("info", "Study gateway: initialized.", {
        component: "study-gateway",
        adaptersRoot,
    });

    if (ctx.flow.exists("bootstrap-platform")) {
        ctx.flow.extend(
            "bootstrap-platform",
            "register-flows",
            { id: "study-gateway:bootstrap-registration" },
            () => ({ gatewayId: "study", registeredFlowIds: [] }),
        );
    }
}
