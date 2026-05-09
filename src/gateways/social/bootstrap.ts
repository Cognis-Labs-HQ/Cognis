import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { GatewayBootstrapContext } from "../shared.js";
import type { CapabilityStore } from "@cognis/core";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";
import type { GatewayRegistry } from "@cognis/core";

/**
 * Context passed to `bootstrapSocialAdapter` when a social adapter exports
 * that function. Mirrors the notify gateway's adapter contract, providing the
 * minimal surface adapters need to self-register routes, static assets, navbar
 * plugins, and inter-adapter capabilities.
 *
 * Adapters register themselves with the social gateway by exporting:
 *   export async function bootstrapSocialAdapter(ctx: SocialAdapterBootstrapCtx)
 *
 * Capabilities contributed by an adapter are exposed to the rest of the
 * application via the shared CapabilityStore (`ctx.capabilities`). Other
 * adapters may consume those capabilities to interoperate without holding
 * direct references — for example the messages adapter consumes the profile
 * adapter's `social:profileStore` capability for handle lookup.
 */
export interface SocialAdapterBootstrapCtx {
    adapterId: string;
    adapterRoot: string;
    capabilities: CapabilityStore;
    gatewayRegistry: GatewayRegistry;
    registerRoute(
        handler: (
            req: IncomingMessage,
            res: ServerResponse,
            url: URL,
        ) => Promise<boolean>,
        gatewayId?: string,
    ): void;
    registerAdapterStaticDir?(
        gatewayId: string,
        adapterId: string,
        absoluteDir: string,
    ): void;
    registerNavbarPlugin(scriptUrl: string): void;
    registerStaticDir(urlPrefix: string, absoluteDir: string): void;
    registerAuthTypingMessage?(message: {
        id: string;
        textKey: string;
        ownerType: "gateway" | "adapter";
        ownerId: string;
    }): void;
    log?: (level: string, msg: string, meta?: Record<string, unknown>) => void;
    dbExecutor?: DbExecutor;
    dbType?: SupportedDbType;
    /** True when the social gateway is currently enabled. */
    isGatewayEnabled(): boolean;
}

/**
 * Discovers all social adapters under `src/adapters/social/<adapter-id>/` and
 * invokes each adapter's `bootstrapSocialAdapter(ctx)` export. Mirrors the
 * notify gateway's adapter discovery: the social gateway itself owns no
 * profile/posts/social-graph logic — concrete features live in adapters.
 */
async function bootstrapSocialAdapters(
    adaptersRoot: string,
    ctx: GatewayBootstrapContext,
): Promise<void> {
    let entries: string[];
    try {
        entries = await readdir(adaptersRoot);
    } catch {
        return;
    }

    for (const entry of entries) {
        const adapterDir = path.join(adaptersRoot, entry);
        const pkgPath = path.join(adapterDir, "package.json");

        let mod: Record<string, unknown>;
        try {
            const raw = await readFile(pkgPath, "utf8");
            const pkg = JSON.parse(raw) as { main?: string };
            if (!pkg.main) continue;
            const entryPath = pathToFileURL(
                path.resolve(adapterDir, pkg.main),
            ).href;
            mod = await import(entryPath);
        } catch (err) {
            ctx.log?.("warn", "Failed to load social adapter module.", {
                component: "social-gateway",
                adapter: entry,
                error: err instanceof Error ? err.message : String(err),
            });
            continue;
        }

        if (typeof mod.bootstrapSocialAdapter !== "function") {
            ctx.log?.(
                "debug",
                "Social adapter has no bootstrapSocialAdapter export — skipping.",
                {
                    component: "social-gateway",
                    adapter: entry,
                },
            );
            continue;
        }

        const adapterCtx: SocialAdapterBootstrapCtx = {
            adapterId: entry,
            adapterRoot: adapterDir,
            capabilities: ctx.capabilities,
            gatewayRegistry: ctx.gatewayRegistry,
            registerRoute: (handler, gatewayId) =>
                ctx.routeRegistry.register(handler, gatewayId ?? "social"),
            registerNavbarPlugin: (scriptUrl) =>
                ctx.uiRegistry?.registerNavbarPlugin({ scriptUrl }),
            registerStaticDir: (prefix, dir) =>
                ctx.uiRegistry?.registerStaticDir(prefix, dir),
            registerAdapterStaticDir: (gw, ad, dir) =>
                ctx.uiRegistry?.registerAdapterStaticDir(gw, ad, dir),
            registerAuthTypingMessage: (message) =>
                ctx.uiRegistry?.registerAuthTypingMessage(message),
            log: ctx.log,
            dbExecutor:
                ctx.capabilities.get<DbExecutor>("db:executor") ??
                ctx.dbExecutor,
            dbType:
                ctx.capabilities.get<SupportedDbType>("db:type") ?? ctx.dbType,
            isGatewayEnabled: () =>
                ctx.gatewayRegistry.get("social")?.status !== "disabled",
        };

        const bootstrap = mod.bootstrapSocialAdapter as (
            ctx: SocialAdapterBootstrapCtx,
        ) => Promise<void> | void;
        await bootstrap(adapterCtx);
        ctx.log?.("info", "Social adapter bootstrapped.", {
            component: "social-gateway",
            adapter: entry,
        });
    }
}

/**
 * Standard gateway bootstrap entry point for the Social Gateway. The gateway
 * itself is intentionally thin: it discovers and bootstraps adapters under
 * `src/adapters/social/<adapter-id>/` and exposes their contributed
 * capabilities via the shared CapabilityStore.
 *
 * Concrete features (profiles, posts, social graph, file storage,
 * preferences, messaging) all live in adapters. Removing an adapter from disk
 * cleanly removes the associated functionality without touching the gateway.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const adaptersRoot = path.join(ctx.adaptersRoot, "social");
    await bootstrapSocialAdapters(adaptersRoot, ctx);

    ctx.gatewayRegistry.register({
        id: "social",
        name: "Social Gateway",
        version: "1.2.0",
        description:
            "User profiles, social graph, posts, file storage, and messaging — implemented by adapters under src/adapters/social/.",
        publisher: "Cognis Labs",
    });

    ctx.log?.("info", "Social gateway: initialized.", {
        component: "social-gateway",
        adaptersRoot,
    });
}
