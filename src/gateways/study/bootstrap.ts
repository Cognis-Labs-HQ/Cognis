import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { GatewayBootstrapContext } from "../shared.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";
import { requireAuth } from "../../api/auth/guard.js";
import { CoreStudyGateway } from "./gateway.js";

const GATEWAY_ROOT = path.dirname(fileURLToPath(import.meta.url));
const LANGUAGE_MODULES_ROOT = path.resolve(
    GATEWAY_ROOT,
    "../../../modules/study/languages",
);

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
            const components = gateway.listChildComponents(
                languageCode,
                claims.role,
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: components }));
            return true;
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
    const dbType =
        ctx.capabilities.get<SupportedDbType>("db:type") ?? ctx.dbType;

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
        log: ctx.log,
        dbExecutor,
        dbType,
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

    await gateway.bootstrapLanguageModules(LANGUAGE_MODULES_ROOT, {
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
    });

    ctx.log?.("info", "Study gateway: language modules bootstrapped.", {
        component: "study-gateway",
    });

    ctx.uiRegistry?.registerStaticDir("study", path.join(GATEWAY_ROOT, "ui"));
    ctx.uiRegistry?.registerNavbarPlugin({
        scriptUrl: "/static/gateways/study/navbar.js",
    });

    ctx.routeRegistry.register(
        createStudyAdapterRoutes("study", gateway),
        "study",
    );

    ctx.gatewayRegistry.register({
        id: "study",
        name: "Study Gateway",
        version: "1.2.0",
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
