import test from "node:test";
import assert from "node:assert/strict";
import {
    GatewayRegistry,
    HealthService,
    type ModuleRuntimeGateway,
} from "@cognis/core";
import { buildServer } from "../../server.js";
import { RouteRegistry } from "../../reuse/route-registry.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";

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

test("buildServer serves static UI assets before registered catch-all routes", async () => {
    const routeRegistry = new RouteRegistry();
    routeRegistry.register(async (_req, res, url) => {
        if (url.pathname.startsWith("/static/")) {
            res.writeHead(401, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "unauthorized", message: "Login required" },
                }),
            );
            return true;
        }
        return false;
    }, "test");

    const server = buildServer({
        moduleRuntimeGateway: {
            listManifests: async () => [],
        } as unknown as ModuleRuntimeGateway,
        routeRegistry,
        routeContext: createDefaultRouteContext(),
    });

    try {
        const port = await listen(server);
        const response = await fetch(
            `http://127.0.0.1:${port}/static/reuse/escape-html.js`,
        );
        const body = await response.text();

        assert.equal(response.status, 200);
        assert.equal(
            response.headers.get("content-type"),
            "text/javascript; charset=utf-8",
        );
        assert.match(body, /export function escapeHtml/);
    } finally {
        await close(server);
    }
});

test("buildServer serves system health from the injected health service", async () => {
    const healthService = new HealthService();
    healthService.contribute("test-gateway", () => ({
        componentId: "test-gateway",
        componentType: "gateway",
        status: "warning",
        message: "Injected health contribution",
        checkedAt: "2026-07-20T05:02:58.073Z",
    }));

    const server = buildServer({
        moduleRuntimeGateway: {
            listManifests: async () => [],
        } as unknown as ModuleRuntimeGateway,
        healthService,
        routeContext: createDefaultRouteContext(),
    });

    try {
        const port = await listen(server);
        const response = await fetch(
            `http://127.0.0.1:${port}/api/v1/system/health`,
        );
        const payload = (await response.json()) as {
            data: {
                status: string;
                contributions: Array<{
                    componentId: string;
                    componentType: string;
                    status: string;
                    message?: string;
                }>;
            };
        };

        assert.equal(response.status, 200);
        assert.equal(payload.data.status, "warning");
        assert.deepEqual(payload.data.contributions, [
            {
                componentId: "test-gateway",
                componentType: "gateway",
                status: "warning",
                message: "Injected health contribution",
                checkedAt: "2026-07-20T05:02:58.073Z",
            },
        ]);
    } finally {
        await close(server);
    }
});

test("buildServer waits for module initialization before handling enable requests", async () => {
    let initializationComplete = false;
    const manifest = {
        id: "test-module",
        name: "Test Module",
        version: "1.0.0",
        class: "extension",
    };
    const runtime = {
        async listManifests() {
            return [manifest];
        },
        async enable(moduleId: string) {
            return { moduleId, enabled: true };
        },
    } as unknown as ModuleRuntimeGateway;
    const server = buildServer({
        moduleRuntimeGateway: runtime,
        routeContext: createDefaultRouteContext(),
        loadModuleStates: async () => {
            await new Promise((resolve) => setTimeout(resolve, 25));
            initializationComplete = true;
            return [];
        },
        validateModuleEnable: () => {
            assert.equal(initializationComplete, true);
        },
    });

    try {
        const port = await listen(server);
        const token = issueAccessToken("admin-user", "admin", 60);
        const response = await fetch(
            `http://127.0.0.1:${port}/api/v1/modules/test-module/enable`,
            {
                method: "POST",
                headers: { authorization: `Bearer ${token}` },
            },
        );

        assert.equal(response.status, 200);
        assert.equal(initializationComplete, true);
    } finally {
        await close(server);
    }
});
