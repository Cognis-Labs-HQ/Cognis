import type { IncomingMessage, ServerResponse } from "node:http";

export interface ModuleRouteOptions {
    access?: unknown;
    allowWhenDisabled?: boolean;
}

type ModuleRouteHandler = (
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
