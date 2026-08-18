import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
    CapabilityStore,
    GatewayRegistry,
    GatewayService,
} from "../services/gateway-service.js";

test("gateway bootstrap ignores infrastructure directories without manifests", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-gateways-"));
    const gatewaysRoot = path.join(root, "gateways");
    await mkdir(path.join(gatewaysRoot, "reuse"), { recursive: true });
    await writeFile(
        path.join(gatewaysRoot, "reuse", "bootstrap-loader.ts"),
        "export const load = () => undefined;",
    );
    const logMessages: string[] = [];
    const service = new GatewayService(new GatewayRegistry());

    const required = await service.bootstrap(gatewaysRoot, {
        gatewayRegistry: new GatewayRegistry(),
        capabilities: new CapabilityStore(),
        flow: {} as never,
        log: (_level, message) => logMessages.push(message),
    });

    assert.deepEqual(required, []);
    assert.deepEqual(logMessages, []);
});

test("gateway bootstrap derives hasAdapters from adapter parent manifests", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-gateways-"));
    const gatewaysRoot = path.join(root, "gateways");
    const adaptersRoot = path.join(root, "adapters");
    const gatewayRoot = path.join(gatewaysRoot, "example");
    const adapterRoot = path.join(adaptersRoot, "example", "provider");
    await mkdir(gatewayRoot, { recursive: true });
    await mkdir(adapterRoot, { recursive: true });
    await writeFile(
        path.join(gatewayRoot, "manifest.json"),
        JSON.stringify({ id: "example", required: false }),
    );
    await writeFile(
        path.join(gatewayRoot, "bootstrap.ts"),
        'export async function bootstrap(ctx) { ctx.gatewayRegistry.register({ id: "example", name: "Example", version: "1.0.0" }); }',
    );
    await writeFile(
        path.join(adapterRoot, "manifest.json"),
        JSON.stringify({ id: "provider", gateway: "example" }),
    );
    const registry = new GatewayRegistry();
    const service = new GatewayService(registry);

    await service.bootstrap(gatewaysRoot, {
        adaptersRoot,
        gatewayRegistry: registry,
        capabilities: new CapabilityStore(),
        flow: {} as never,
    });

    assert.equal(registry.get("example")?.hasAdapters, true);
});

test("gateway bootstrap reports the root error when a required gateway fails", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-gateways-"));
    const gatewaysRoot = path.join(root, "gateways");
    const gatewayRoot = path.join(gatewaysRoot, "db");
    const logMessages: Array<{
        level: string;
        message: string;
        meta?: Record<string, unknown>;
    }> = [];
    await mkdir(gatewayRoot, { recursive: true });
    await writeFile(
        path.join(gatewayRoot, "manifest.json"),
        JSON.stringify({ id: "db", required: true }),
    );
    await writeFile(
        path.join(gatewayRoot, "bootstrap.ts"),
        'export async function bootstrap() { throw new Error("password authentication failed for user cognis"); }',
    );
    const registry = new GatewayRegistry();
    const service = new GatewayService(registry);

    await assert.rejects(
        () =>
            service.bootstrap(gatewaysRoot, {
                gatewayRegistry: registry,
                capabilities: new CapabilityStore(),
                flow: {} as never,
                log: (level, message, meta) => {
                    logMessages.push({ level, message, meta });
                },
            }),
        /Required gateway "db" failed during bootstrap: password authentication failed for user cognis/,
    );

    assert.deepEqual(logMessages, [
        {
            level: "error",
            message: "Gateway bootstrap failed.",
            meta: {
                gatewayId: "db",
                required: true,
                error: "password authentication failed for user cognis",
            },
        },
    ]);
    assert.equal(registry.get("db"), undefined);
});

test("logging capability replaces the bootstrap logger for later gateways", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-gateways-"));
    const gatewaysRoot = path.join(root, "gateways");
    const loggingRoot = path.join(gatewaysRoot, "logging");
    const exampleRoot = path.join(gatewaysRoot, "example");
    await mkdir(loggingRoot, { recursive: true });
    await mkdir(exampleRoot, { recursive: true });
    await writeFile(
        path.join(loggingRoot, "manifest.json"),
        JSON.stringify({ id: "logging", required: true }),
    );
    await writeFile(
        path.join(loggingRoot, "bootstrap.ts"),
        `export async function bootstrap(ctx) {
            ctx.capabilities.contribute("logging:log", (_level, message) => {
                ctx.capabilities.contribute("test:logged-message", message);
            });
        }`,
    );
    await writeFile(
        path.join(exampleRoot, "manifest.json"),
        JSON.stringify({ id: "example", required: false }),
    );
    await writeFile(
        path.join(exampleRoot, "bootstrap.ts"),
        `export async function bootstrap(ctx) {
            ctx.log("debug", "debug from configured logger");
        }`,
    );
    const registry = new GatewayRegistry();
    const capabilities = new CapabilityStore();
    const service = new GatewayService(registry);
    const bootstrapMessages: string[] = [];

    await service.bootstrap(gatewaysRoot, {
        gatewayRegistry: registry,
        capabilities,
        flow: {} as never,
        log: (_level, message) => bootstrapMessages.push(message),
    });

    assert.equal(
        capabilities.get("test:logged-message"),
        "debug from configured logger",
    );
    assert.deepEqual(bootstrapMessages, []);
});

test("gateway bootstrap initializes declared dependencies first", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-gateways-"));
    const gatewaysRoot = path.join(root, "gateways");
    for (const gatewayId of ["logging", "db"]) {
        const gatewayRoot = path.join(gatewaysRoot, gatewayId);
        await mkdir(gatewayRoot, { recursive: true });
        await writeFile(
            path.join(gatewayRoot, "manifest.json"),
            JSON.stringify({
                id: gatewayId,
                required: true,
                requires: gatewayId === "logging" ? ["db"] : [],
            }),
        );
        await writeFile(
            path.join(gatewayRoot, "bootstrap.ts"),
            `export async function bootstrap(ctx) {
                const order = ctx.capabilities.get("test:bootstrap-order") ?? [];
                order.push("${gatewayId}");
                ctx.capabilities.contribute("test:bootstrap-order", order);
                ctx.gatewayRegistry.register({
                    id: "${gatewayId}",
                    name: "${gatewayId}",
                    version: "1.0.0",
                });
            }`,
        );
    }
    const registry = new GatewayRegistry();
    const capabilities = new CapabilityStore();
    const service = new GatewayService(registry);

    await service.bootstrap(gatewaysRoot, {
        gatewayRegistry: registry,
        capabilities,
        flow: {} as never,
    });

    assert.deepEqual(capabilities.get("test:bootstrap-order"), [
        "db",
        "logging",
    ]);
});
