import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import type { CapabilityStore } from "@cognis/core";
import { issueAccessToken } from "../access-tokens.js";

export type HttpIncomingMessage = import("node:http").IncomingMessage;

export type InMemoryDb = {
    execute: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    executeCommand: () => Promise<{ rows: unknown[] }>;
    ensureTable: () => Promise<void>;
    transaction: <T>(cb: (db: InMemoryDb) => Promise<T>) => Promise<T>;
};

export type TestResponse = {
    writeHead: (code: number, headers?: Record<string, unknown>) => void;
    end: (payload: string) => void;
    readonly status: number;
    readonly payload: string;
    readonly headers: Record<string, unknown>;
};

export function makeInMemoryDb(): InMemoryDb {
    return {
        execute: async (_sql: string, _params?: unknown[]) => ({ rows: [] }),
        executeCommand: async () => ({ rows: [] }),
        ensureTable: async () => {},
        transaction: async <T>(
            cb: (db: InMemoryDb) => Promise<T>,
        ): Promise<T> => cb(makeInMemoryDb()),
    };
}

export function makeJsonRequest(
    method: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
): HttpIncomingMessage {
    const chunks = [Buffer.from(JSON.stringify(body))];
    return {
        method,
        headers,
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    } as unknown as HttpIncomingMessage;
}

export async function dispatchRoute(
    routeRegistry: RouteRegistry,
    req: HttpIncomingMessage,
    pathname: string,
): Promise<{ handled: boolean; res: TestResponse }> {
    const res = makeResponse();
    let handled = false;
    for (const entry of routeRegistry.getEntries()) {
        handled = await entry.handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL(pathname, "http://localhost"),
        );
        if (handled) break;
    }
    return { handled, res };
}

export function makeResponse(): TestResponse {
    let status = 0;
    let payload = "";
    let headers: Record<string, unknown> = {};
    return {
        writeHead(code: number, nextHeaders?: Record<string, unknown>) {
            status = code;
            headers = nextHeaders ?? {};
        },
        end(nextPayload: string) {
            payload = nextPayload;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
        get headers() {
            return headers;
        },
    };
}

export const adminToken = issueAccessToken("test-session", "admin", null);

export function contributeTestKeyring(capabilities: CapabilityStore): void {
    capabilities.contribute("auth:keyringVaultStore", {
        async ensureSchema() {},
        async get() {
            return null;
        },
        async set() {},
        async delete() {},
    });
    capabilities.contribute(
        "auth:keyringRouteFactory",
        () => async () => false,
    );
}
