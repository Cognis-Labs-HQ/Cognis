import { getBootstrapScope } from "@cognis/core";
import { attributeComponentFault } from "../components/fault.js";
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
    private readonly prefixEntries: Array<{
        prefix: string;
        gatewayId: string;
    }> = [];

    register(handler: RouteHandler, gatewayId?: string): () => boolean {
        const scope = getBootstrapScope()?.owner.split(":");
        const owner =
            scope?.[0] === "adapter" && scope.length === 3
                ? {
                      type: "adapter" as const,
                      gatewayId: scope[1],
                      id: scope[2],
                  }
                : scope?.[0] === "module" && scope.length === 2
                  ? { type: "module" as const, id: scope[1] }
                  : gatewayId
                    ? { type: "gateway" as const, id: gatewayId }
                    : undefined;
        const ownedHandler: RouteHandler = owner
            ? async (request, response, url) => {
                  try {
                      return await handler(request, response, url);
                  } catch (error) {
                      throw attributeComponentFault(error, owner);
                  }
              }
            : handler;
        const entry = { handler: ownedHandler, gatewayId };
        this.entries.push(entry);
        return () => {
            const index = this.entries.indexOf(entry);
            if (index < 0) return false;
            this.entries.splice(index, 1);
            return true;
        };
    }

    registerPrefix(prefix: string, gatewayId: string): void {
        this.prefixEntries.push({ prefix, gatewayId });
    }

    findOwner(
        pathname: string,
    ): { gatewayId: string; prefix: string } | undefined {
        return this.prefixEntries
            .filter(
                ({ prefix }) =>
                    pathname === prefix || pathname.startsWith(`${prefix}/`),
            )
            .sort(
                (leftEntry, rightEntry) =>
                    rightEntry.prefix.length - leftEntry.prefix.length,
            )[0];
    }

    getHandlers(): readonly RouteHandler[] {
        return this.entries.map((entry) => entry.handler);
    }

    getEntries(): readonly RouteEntry[] {
        return this.entries;
    }

    getClaimedPrefixes(): readonly string[] {
        return this.prefixEntries.map(({ prefix }) => prefix);
    }
}
