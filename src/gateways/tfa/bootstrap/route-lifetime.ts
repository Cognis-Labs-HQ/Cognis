import { requireBootstrapScope, type Ctx } from "@cognis/core";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { IncomingMessage, ServerResponse } from "node:http";

type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
) => Promise<boolean>;

export interface RouteLifetime {
    capture(): number;
    isCurrent(revision: number): boolean;
    register(handler: RouteHandler): void;
}

export function createRouteLifetime(
    ctx: GatewayBootstrapContext,
): RouteLifetime {
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    let active = true;
    let revision = 0;
    const handlers: RouteHandler[] = [];
    let removers: Array<() => boolean> = [];
    const isCurrent = (expected: number) =>
        active &&
        revision === expected &&
        ctx.gatewayRegistry.get("tfa")?.status !== "disabled";
    const install = (handler: RouteHandler) =>
        ctx.routeRegistry.register(async (req, res, url) => {
            if (!isCurrent(revision)) return false;
            return handler(req, res, url);
        }, "tfa");
    const dispose = () => {
        active = false;
        revision += 1;
        for (const remove of removers) remove();
        removers = [];
    };
    dispose.reactivate = () => {
        if (active) return;
        revision += 1;
        active = true;
        removers = handlers.map(install);
    };
    requireBootstrapScope(root).registerDisposer(dispose);
    return {
        capture: () => revision,
        isCurrent,
        register(handler) {
            handlers.push(handler);
            removers.push(install(handler));
        },
    };
}
