import { runBootstrapScope, type CapabilityContracts } from "@cognis/core";
import type {
    Ctx,
    GatewayRegistry,
    ModuleService,
    BootstrapLog,
} from "@cognis/core";
import type { RouteHandler } from "../reuse/route-registry.js";
import type { RouteContext } from "../reuse/route-context.js";
import type { UIRegistry } from "../reuse/ui-registry.js";
import { createComponentTransport } from "./transport.js";
import { createComponentState } from "./state.js";
import { createComponentService, type ComponentService } from "./service.js";
import { createComponentFailures } from "./failures.js";
import { createComponentRoutes } from "../routes/components/index.js";
import type {
    ProviderDescriptor,
    ComponentOwner,
    ComponentTarget,
} from "./types.js";
import path from "node:path";

export async function installComponentManagement(options: {
    ctx: Ctx;
    routeContext: RouteContext;
    handlers: () => readonly RouteHandler[];
    modules: Pick<ModuleService, "list">;
    gateways?: GatewayRegistry;
    uiRegistry?: UIRegistry;
    components?: () => Promise<
        Array<{
            id: string;
            gatewayId?: string;
            version?: string;
            required?: boolean;
            locked?: boolean;
            adapterId?: string;
            name?: string;
            ui?: { stringsBaseUrl?: string };
        }>
    >;
    log: BootstrapLog;
}): Promise<{
    routes: RouteHandler;
    capability: Omit<ComponentService, "dispose"> & {
        describeProviders<T extends ProviderDescriptor>(
            entries: T[],
            catalog: string,
        ): Promise<T[]>;
    };
    reportServerFailure(
        request: import("node:http").IncomingMessage,
        owner: ComponentTarget,
    ): Promise<void>;
    dispose(): Promise<void>;
}> {
    const { ctx, log } = options;
    const disposers: Array<() => void | Promise<void>> = [];
    const installed = await runBootstrapScope(
        ctx,
        "api:components",
        async () => {
            const transport = createComponentTransport(options.handlers);
            const service = createComponentService(
                ctx,
                transport,
                createComponentState(
                    path.resolve("config/component-channels.json"),
                    log,
                ),
                log,
                async () =>
                    (await options.modules.list())
                        .filter((entry) => entry.class === "core")
                        .map((entry) => ({
                            ...entry,
                            type: "module" as const,
                            managedBy: "host" as const,
                            status: "enabled",
                        })),
            );
            const describe = async <T extends ProviderDescriptor>(
                providers: T[],
            ): Promise<T[]> => {
                const [modules, components] = await Promise.all([
                    options.modules.list(),
                    options.components?.() ?? [],
                ]);
                return providers.map((provider) => {
                    if (!provider.component) return provider;
                    const identity = provider.component;
                    const manifest =
                        identity.type === "module"
                            ? modules.find(
                                  (module) => module.id === identity.id,
                              )
                            : identity.type === "gateway"
                              ? options.gateways?.get(identity.id)
                              : components.find(
                                    (entry) =>
                                        (entry.adapterId ?? entry.id) ===
                                            identity.id &&
                                        entry.gatewayId === identity.gatewayId,
                                );
                    const owner: ComponentOwner = {
                        ...identity,
                        version: manifest?.version,
                        ...(manifest?.name ? { name: manifest.name } : {}),
                        ...(manifest &&
                        "ui" in manifest &&
                        manifest.ui?.stringsBaseUrl
                            ? { stringsBaseUrl: manifest.ui.stringsBaseUrl }
                            : {}),
                        required:
                            identity.type === "module"
                                ? Boolean(
                                      manifest &&
                                      "class" in manifest &&
                                      manifest.class === "core",
                                  )
                                : (manifest &&
                                      "required" in manifest &&
                                      manifest.required === true) ||
                                  Boolean(
                                      manifest &&
                                      "locked" in manifest &&
                                      manifest.locked === true,
                                  ),
                    };
                    return { ...provider, component: owner };
                });
            };
            const report = createComponentFailures(
                ctx,
                service,
                () =>
                    describe([
                        ...(options.uiRegistry?.listCapabilityProviders() ??
                            []),
                        ...(options.uiRegistry?.listNavbarPlugins() ?? []),
                    ]),
                log,
            );
            const publicCapability = {
                list: service.list,
                info: service.info,
                releaseChannels: service.releaseChannels,
                releaseChannel: service.releaseChannel,
                apply: service.apply,
            };
            const providerCatalog = {
                async describeProviders<T extends ProviderDescriptor>(
                    providers: T[],
                    catalog: string,
                ) {
                    return describe(providers);
                },
            };
            const capability = { ...publicCapability, ...providerCatalog };
            ctx.requireCapability<CapabilityContracts>(
                "system:contracts",
            ).define("component:management", {
                version: 1,
                kind: "object",
                description:
                    "Authenticated component inspection, release choices, lifecycle actions.",
                members: {
                    list: "function",
                    info: "function",
                    releaseChannels: "function",
                    releaseChannel: "function",
                    apply: "function",
                },
            });
            ctx.contributePublicCapability(
                "component:management",
                publicCapability,
            );
            ctx.contributeCapability(
                "component:providerCatalog",
                providerCatalog,
            );
            disposers.push(service.dispose, () => {
                ctx.unregisterFlow("component:reportFailure");
                if (
                    ctx.getCapability("component:management") ===
                    publicCapability
                )
                    ctx.removeCapability("component:management");
                if (
                    ctx.getCapability("component:providerCatalog") ===
                    providerCatalog
                )
                    ctx.removeCapability("component:providerCatalog");
            });
            return {
                routes: createComponentRoutes(
                    service,
                    report,
                    options.routeContext,
                    log,
                ),
                capability,
                async reportServerFailure(
                    request: import("node:http").IncomingMessage,
                    target: ComponentTarget,
                ) {
                    const claims = options.routeContext.getAuthClaims(request);
                    if (
                        !claims ||
                        !options.routeContext.hasMinRole(claims.role, "admin")
                    )
                        return;
                    const descriptor = (
                        await describe([
                            {
                                scriptUrl: "",
                                component: {
                                    ...target,
                                    required: false,
                                },
                            },
                        ])
                    )[0];
                    if (descriptor.component)
                        await report(
                            request,
                            {
                                phase: "runtime",
                                occurrenceId: crypto.randomUUID(),
                            },
                            true,
                            descriptor.component,
                        );
                },
            };
        },
        (dispose) => disposers.push(dispose),
    );
    return {
        ...installed,
        dispose: async () => {
            for (const dispose of disposers.reverse()) await dispose();
        },
    };
}
