import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    createCtx,
    GatewayRegistry,
    HealthService,
    type ModuleRuntimeGateway,
} from "@cognis/core";
import { buildServer } from "../../server.js";
import { RouteRegistry } from "../../reuse/route-registry.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { UIRegistry } from "../../reuse/ui-registry.js";

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

test("buildServer loads external module assets before accepting requests", async () => {
    const externalRoot = await mkdtemp(
        path.join(tmpdir(), "cognis-server-external-module-"),
    );
    const uuid = "11111111-2222-4333-8444-555555555555";
    const moduleRoot = path.join(externalRoot, uuid);
    await mkdir(path.join(moduleRoot, "ui"), { recursive: true });
    await writeFile(
        path.join(moduleRoot, "bootstrap.js"),
        `export function bootstrapModule(ctx) {
            ctx.registerStaticDir("", ctx.moduleRoot + "/ui");
        }`,
    );
    await writeFile(path.join(moduleRoot, "ui", "app.js"), "export {};");
    const previousExternalRoot = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = externalRoot;
    const systemCtx = createCtx();
    systemCtx.contributeCapability("system:ctx", systemCtx);
    const server = buildServer({
        moduleRuntimeGateway: {
            listManifests: async () => [
                {
                    id: "jitsi-meet",
                    uuid,
                    class: "extension",
                    enabledByDefault: true,
                    entrypoints: { bootstrap: "./bootstrap.js" },
                },
            ],
        } as unknown as ModuleRuntimeGateway,
        uiRegistry: new UIRegistry(),
        routeContext: createDefaultRouteContext({
            getCapability: (id) => systemCtx.getCapability(id),
            flow: systemCtx.flow,
        }),
    });

    try {
        const port = await listen(server);
        const response = await fetch(
            `http://127.0.0.1:${port}/static/modules/jitsi-meet/app.js`,
        );
        assert.equal(response.status, 200);
        assert.equal(await response.text(), "export {};");
    } finally {
        await close(server);
        await rm(externalRoot, { recursive: true, force: true });
        if (previousExternalRoot === undefined) {
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        } else {
            process.env.COGNIS_EXTERNAL_MODULES_ROOT = previousExternalRoot;
        }
    }
});

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
