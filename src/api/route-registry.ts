import type { IncomingMessage, ServerResponse } from "node:http";

export type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
) => Promise<boolean>;

export interface RouteEntry {
    handler: RouteHandler;
    gatewayId?: string;
}

/**
 * Registry that gateways and adapters use to self-register route handlers.
 * An optional `gatewayId` ties the handler to a gateway so the server can
 * skip it when that gateway is disabled.
 * The server iterates registered handlers in insertion order for each request.
 */
export class RouteRegistry {
    private readonly entries: RouteEntry[] = [];

    register(handler: RouteHandler, gatewayId?: string): void {
        this.entries.push({ handler, gatewayId });
    }

    getHandlers(): readonly RouteHandler[] {
        return this.entries.map((e) => e.handler);
    }

    getEntries(): readonly RouteEntry[] {
        return this.entries;
    }
}
