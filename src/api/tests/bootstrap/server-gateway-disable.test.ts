import test from "node:test";
import assert from "node:assert/strict";
import { GatewayRegistry, type ModuleRuntimeGateway } from "@cognis/core";
import { buildServer } from "../../server.js";
import { RouteRegistry } from "../../reuse/route-registry.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";

function listen(server: import("node:http").Server): Promise<number> {
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (!address || typeof address === "string") {
                reject(new Error("server_address_unavailable"));
                return;
            }
            resolve(address.port);
        });
    });
}

function close(server: import("node:http").Server): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

test("buildServer returns gateway_disabled for disabled gateway prefixes", async () => {
    const routeRegistry = new RouteRegistry();
    routeRegistry.registerPrefix("/api/v1/notify", "notify");

    const gatewayRegistry = new GatewayRegistry();
    gatewayRegistry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "1.4.9",
        description: "Dispatches notifications via pluggable adapter senders.",
        publisher: "Cognis Labs HQ",
        required: false,
        hasAdapters: true,
    });
    gatewayRegistry.disable("notify");

    const server = buildServer({
        moduleRuntimeGateway: {
            listManifests: async () => [],
        } as unknown as ModuleRuntimeGateway,
        routeRegistry,
        gatewayRegistry,
        routeContext: createDefaultRouteContext(),
    });

    try {
        const port = await listen(server);
        const response = await fetch(
            `http://127.0.0.1:${port}/api/v1/notify/providers`,
        );
        const payload = (await response.json()) as {
            error: { code: string; message: string };
        };

        assert.equal(response.status, 503);
        assert.deepEqual(payload, {
            error: {
                code: "gateway_disabled",
                message: "Gateway disabled",
            },
        });
    } finally {
        await close(server);
    }
});
