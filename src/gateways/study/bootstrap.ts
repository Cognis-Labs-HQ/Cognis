import { authorizeLanguageModuleNamespace } from "./module-namespaces.js";
import { createHash } from "node:crypto";
import { recordStudyResult } from "./progress.js";
import { StudyAudio } from "./audio.js";
import { readGatewayManifestVersion } from "../reuse/manifest-version.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { GatewayBootstrapContext } from "../shared.js";
import type { Ctx } from "@cognis/core";
import { readJson } from "../../api/reuse/read-json.js";
import { buildGatewayAdapterAdminControls } from "../../api/reuse/adapter-admin-controls.js";
import type { RouteContext } from "../../api/reuse/route-context.js";
import { CoreStudyGateway, type LanguageChildComponent } from "./gateway.js";
import { createGatewayUiRegistryHooks } from "../reuse/ui-registry-hooks.js";
import { StudyFavourites } from "./reuse/favourites.js";
import { createFavouriteRoutes } from "./reuse/favourite-routes.js";
import {
    DRAWING_PROGRESS_FLOWS,
    DrawingProgressStore,
} from "./drawing/progress.js";
import { createDrawingRoutes } from "./drawing/routes/index.js";
import type { UserPreferenceStore } from "../../api/reuse/preference-store.js";

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
    ctx: RouteContext,
) {
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
    if (!routeContext) throw new Error("auth_route_context_unavailable");
    const gateway = new CoreStudyGateway(
        (reference) =>
            ctx.gatewayRegistry
                .list()
                .some(
                    (dependency) =>
                        dependency.uuid === reference &&
                        dependency.status === "active",
                ),
        (reference) => ctx.capabilities.has(reference),
    );
    const adaptersRoot = path.join(ctx.adaptersRoot, "study");
    const systemCtx = ctx.capabilities.get<Ctx>("system:ctx");
    if (!systemCtx)
        throw new Error("Study requires the platform ctx capability.");
    if (!systemCtx.hasFlow("study:audio:fetch"))
        systemCtx?.registerFlow({
            id: "study:audio:fetch",
            stages: ["validate", "fetch"],
        });
    const audio = new StudyAudio(ctx.flow, ctx.log);
    ctx.capabilities.contribute("study:audio", audio);
    systemCtx.contributePublicCapability("study:audio:provider", {
        registerProvider: audio.registerProvider.bind(audio),
        registerLanguage: audio.registerLanguage.bind(audio),
    });
    const preferences =
        ctx.capabilities.get<UserPreferenceStore>("preferences:store");
    if (preferences) {
        for (const contract of DRAWING_PROGRESS_FLOWS) {
            if (!systemCtx.hasFlow(contract.id))
                systemCtx.registerFlow(contract);
        }
        ctx.routeRegistry.register(
            createDrawingRoutes(
                new DrawingProgressStore(preferences),
                routeContext,
                ctx.flow,
                ctx.log,
                (actor, entryId, result) =>
                    recordStudyResult(ctx.capabilities, actor, {
                        accountId: actor.accountId,
                        entryId,
                        activity: "drawing",
                        eventId: result.attempt
                            ? "drawing-" +
                              createHash("sha256")
                                  .update(
                                      JSON.stringify([
                                          actor.accountId,
                                          entryId,
                                          result.attempt.id,
                                      ]),
                                  )
                                  .digest("hex")
                            : undefined,
                        occurredAt: result.attempt?.occurredAt,
                        correct: result.result !== "incorrect",
                        assisted: result.assisted,
                        mistakes: result.mistakes,
                    }),
                () =>
                    gateway.isAdapterEnabled("library") &&
                    gateway.isAdapterEnabled("progress"),
            ),
            "study",
        );
        if (!systemCtx?.hasFlow("study:favourites:save"))
            systemCtx?.registerFlow({
                id: "study:favourites:save",
                stages: ["authorize", "validate", "persist"],
            });
        const favourites = new StudyFavourites(preferences);
        ctx.capabilities.contribute("study:favourites", favourites);
        ctx.routeRegistry.register(
            createFavouriteRoutes(favourites, routeContext, ctx.flow, ctx.log),
            "study",
        );
    }
    for (const flow of [
        {
            id: "study:library:import",
            stages: ["authorize", "validate", "persist"],
        },
        {
            id: "study:library:create",
            stages: ["normalize", "resolve", "validate", "persist"],
        },
        {
            id: "study:library:update",
            stages: ["authorize", "validate", "persist", "audit"],
        },
        {
            id: "study:library:resolve",
            stages: ["normalize", "propose", "rank"],
        },
        {
            id: "study:library:search",
            stages: ["authorize", "validate", "search", "audit"],
        },
        { id: "study:library:notifyRequest", stages: ["deliver"] },
        { id: "study:library:notifyContent", stages: ["deliver"] },
        { id: "study:library:stageRequest", stages: ["authorize", "persist"] },
        {
            id: "study:library:uploadImage",
            stages: ["authorize", "validate", "persist"],
        },
        { id: "study:library:readImage", stages: ["authorize"] },
        { id: "study:library:discardImage", stages: ["authorize", "discard"] },
        {
            id: "study:library:uploadAudio",
            stages: ["authorize", "validate", "persist"],
        },
        {
            id: "study:library:regenerateAudio",
            stages: ["authorize", "validate", "resolve", "persist"],
        },
        {
            id: "study:library:audio",
            stages: ["authorize", "validate", "resolve"],
        },
        {
            id: "study:library:lookup",
            stages: ["discover", "lookup", "rank"],
        },
        {
            id: "study:library:ingest",
            stages: ["inspect", "validate", "stage", "persist", "audit"],
        },
        {
            id: "study:library:merge",
            stages: ["authorize", "validate", "merge", "audit"],
        },
        {
            id: "study:library:move",
            stages: ["authorize", "validate", "move", "audit"],
        },
        {
            id: "study:library:delete",
            stages: ["authorize", "validate", "delete", "audit"],
        },
    ]) {
        if (!systemCtx?.hasFlow(flow.id)) {
            systemCtx?.registerFlow({
                ...flow,
                description:
                    "Orchestrates provider-neutral Study Library operations.",
            });
        }
    }

    const languageModuleStates = new Map<string, boolean>();
    const syncLanguageCapabilities = (): void => {
        const systemCtx = ctx.capabilities.get<Ctx>("system:ctx");
        const capabilityIds =
            systemCtx?.listCapabilities() ?? ctx.capabilities.list();
        const activeModuleIds = new Set<string>();
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
            activeModuleIds.add(moduleId);
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
            gateway.setLanguageModuleEnabled(
                moduleId,
                languageModuleStates.get(moduleId) !== false,
            );
        }
        for (const registered of gateway.listRegisteredLanguageModules()) {
            if (
                registered.moduleClass !== "core" &&
                !activeModuleIds.has(registered.moduleId)
            )
                gateway.setLanguageModuleEnabled(registered.moduleId, false);
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
        languageModuleStates.set(moduleId, enabled);
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
    const isStudyEnabled = () =>
        ctx.gatewayRegistry.get("study")?.status !== "disabled";
    const uiHooks = createGatewayUiRegistryHooks(ctx.uiRegistry, "study");
    ctx.uiRegistry?.registerCapabilityProvider({
        scriptUrl: "/static/gateways/study/flow-contracts.js",
        providesCapabilities: [
            "study:library:detailFlow",
            "study:subPages",
            "study:navigation",
        ],
        isEnabled: isStudyEnabled,
    });

    await gateway.bootstrapAdapters(adaptersRoot, {
        ...uiHooks,
        registerCapabilityProvider: (provider) =>
            ctx.uiRegistry?.registerCapabilityProvider({
                ...provider,
                isEnabled: () =>
                    isStudyEnabled() &&
                    (!provider.isEnabled || provider.isEnabled()),
            }),
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
    const studyStylesheets = [
        "/static/styles/page-builder.css",
        "/static/styles/reuse/page-sections.css",
        "/static/gateways/study/study.css",
    ];
    const isStudyAvailable = (): boolean => {
        syncLanguageCapabilities();
        return (
            ctx.gatewayRegistry.get("study")?.status !== "disabled" &&
            gateway
                .listRegisteredLanguageModules()
                .some((language) => language.enabled)
        );
    };
    ctx.uiRegistry?.registerSpaRoute({
        id: "gateway.study",
        pattern: "^/study(?:/welcome|/settings)?$",
        base: "/study",
        scriptUrl: "/static/gateways/study/study.js",
        stylesheets: studyStylesheets,
        requiredCapabilities: ["study:subPages"],
        isEnabled: isStudyAvailable,
    });
    ctx.uiRegistry?.registerSpaRoute({
        id: "gateway.study.child",
        pattern: "^/study/(?!welcome$|settings$)[^/]+$",
        base: "/study",
        scriptUrl: "/static/gateways/study/route.js",
        stylesheets: studyStylesheets,
        requiredCapabilities: ["study:subPages"],
        isEnabled: isStudyAvailable,
    });

    const serveStudyHtml = async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method !== "GET") return false;
        if (url.pathname !== "/study" && !url.pathname.startsWith("/study/"))
            return false;
        if (!routeContext.getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        if (!isStudyAvailable()) {
            res.writeHead(302, { location: "/error?code=503" });
            res.end();
            return true;
        }
        if (
            url.pathname !== "/study" &&
            url.pathname !== "/study/welcome" &&
            url.pathname !== "/study/settings"
        )
            return false;
        routeContext.setPageSecurityHeaders(res);
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
        const claims = routeContext.requireAuth(req, res);
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
            routeContext,
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

    ctx.gatewayRegistry.registerModuleNamespacePolicy(
        "study",
        authorizeLanguageModuleNamespace,
    );

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
