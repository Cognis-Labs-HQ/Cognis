import type {
    BootstrapLog,
    FlowApi,
    FlowRegistration,
    RoleAccessPolicy,
} from "@cognis/core";
import type { ModuleAssurance } from "./module-assurance.js";
import type { IncomingMessage, ServerResponse } from "node:http";

export interface ModuleRouteOptions {
    access?: unknown;
    allowWhenDisabled?: boolean;
}

export type ModuleRouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
) => Promise<void> | void;

export interface ModuleApiRouter {
    get(
        routePath: string,
        handler: ModuleRouteHandler,
        options?: ModuleRouteOptions,
    ): void;
    post(
        routePath: string,
        handler: ModuleRouteHandler,
        options?: ModuleRouteOptions,
    ): void;
    put(
        routePath: string,
        handler: ModuleRouteHandler,
        options?: ModuleRouteOptions,
    ): void;
    patch(
        routePath: string,
        handler: ModuleRouteHandler,
        options?: ModuleRouteOptions,
    ): void;
    delete(
        routePath: string,
        handler: ModuleRouteHandler,
        options?: ModuleRouteOptions,
    ): void;
}

export interface ModuleUiRegistrationContext {
    moduleId: string;
    moduleUuid: string;
    moduleRoot: string;
    registerNavbarPlugin(
        plugin:
            | {
                  scriptUrl: string;
                  access?: RoleAccessPolicy;
                  providesCapabilities?: string[];
              }
            | string,
    ): void;
    registerCapabilityProvider(provider: {
        offlineAccessGuard?: string;
        scriptUrl: string;
        providesCapabilities: string[];
    }): void;
    registerSpaRoute(route: {
        id: string;
        pattern: string;
        base: string;
        scriptUrl: string;
        stylesheets?: string[];
        access?: RoleAccessPolicy;
        public?: boolean;
        /** Public, server-independent page; list every runtime asset it needs. */
        offline?: { assets: string[] };
        requiredCapabilities?: string[];
        componentPage?: {
            labelKey: string;
            descriptionKey: string;
            modes: Array<"overlay" | "fullscreen" | "pip">;
        };
    }): void;
    registerAuthFooterPlugin(plugin: { scriptUrl: string }): void;
    registerSettingsSection(section: {
        id: string;
        label: string;
        scriptUrl: string;
        access?: RoleAccessPolicy;
        stringsBaseUrl?: string;
    }): void;
    registerPageExtension(
        pageId: string,
        element: {
            id: string;
            label: string;
            scriptUrl: string;
            access?: RoleAccessPolicy;
        },
    ): void;
    registerAdminSection(section: {
        id: string;
        label: string;
        scriptUrl: string;
        access?: RoleAccessPolicy;
        stringsBaseUrl?: string;
    }): void;
    registerStaticDir(urlPrefix: string, absoluteDir: string): void;
    registerAuthTypingMessage(message: {
        id: string;
        textKey: string;
        access?: RoleAccessPolicy;
    }): void;
}

export interface ModuleApiRegistrationContext {
    moduleId: string;
    moduleRoot: string;
    getCapability<T>(capabilityId: string): T | undefined;
    capabilities: {
        contribute(key: string, value: unknown): void;
        get<T>(key: string): T | undefined;
        has(key: string): boolean;
        require<T>(key: string): T;
    };
    log?: BootstrapLog;
}
export interface ModuleBootstrapCtx
    extends ModuleUiRegistrationContext, ModuleApiRegistrationContext {
    flow: FlowApi;
    registerDisposer(dispose: () => void | Promise<void>): void;
    registerApiGet(
        routePath: string,
        handler: ModuleRouteHandler,
        options?: ModuleRouteOptions,
    ): void;
    registerApiPost(
        routePath: string,
        handler: ModuleRouteHandler,
        options?: ModuleRouteOptions,
    ): void;
    registerApiPut(
        routePath: string,
        handler: ModuleRouteHandler,
        options?: ModuleRouteOptions,
    ): void;
    registerApiPatch(
        routePath: string,
        handler: ModuleRouteHandler,
        options?: ModuleRouteOptions,
    ): void;
    registerApiDelete(
        routePath: string,
        handler: ModuleRouteHandler,
        options?: ModuleRouteOptions,
    ): void;
    router: ModuleApiRouter;
    contributeCapability(key: string, value: unknown): void;
    contributePublicCapability(key: string, value: unknown): void;
    registerFlow(flow: FlowRegistration): void;
    getModuleAssurance(moduleId: string): Promise<ModuleAssurance | null>;
}

export interface ModuleBootstrapPlugin {
    bootstrapModule?: (
        ctx: ModuleBootstrapCtx,
    ) =>
        | Promise<void | (() => void | Promise<void>)>
        | void
        | (() => void | Promise<void>);
    teardownModule?: (ctx: ModuleBootstrapCtx) => Promise<void> | void;
    uninstallModule?: (
        ctx: Pick<
            ModuleBootstrapCtx,
            "moduleId" | "moduleRoot" | "getCapability" | "log"
        >,
        options: { deleteContent: boolean },
    ) => Promise<void> | void;
}
export interface ModuleDisabledApiPlugin {
    registerDisabledApiRoutes?: (
        ctx: ModuleBootstrapCtx,
    ) => Promise<void> | void;
}
