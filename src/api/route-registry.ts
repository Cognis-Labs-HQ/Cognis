import type { IncomingMessage, ServerResponse } from "node:http";

export type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
) => Promise<boolean>;

/**
 * Registry that gateways and adapters use to self-register route handlers.
 * The server iterates registered handlers in insertion order for each request.
 */
export class RouteRegistry {
    private readonly handlers: RouteHandler[] = [];

    register(handler: RouteHandler): void {
        this.handlers.push(handler);
    }

    getHandlers(): readonly RouteHandler[] {
        return this.handlers;
    }
}
