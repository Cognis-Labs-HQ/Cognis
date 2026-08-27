import assert from "node:assert/strict";
import test from "node:test";
import { discoverModuleSourcesOnStartup } from "../../server.js";

test("startup refreshes module sources once and reports discovered modules", async () => {
    const calls: unknown[][] = [];
    const logs: Array<Record<string, unknown>> = [];

    await discoverModuleSourcesOnStartup(
        {
            discover: async (...args: unknown[]) => {
                calls.push(args);
                return [{ uuid: "module-uuid" }] as never;
            },
        },
        (level, message, meta) => logs.push({ level, message, ...meta }),
    );

    assert.deepEqual(calls, [[{}, undefined, true]]);
    assert.deepEqual(logs, [
        {
            level: "info",
            message: "Initial module marketplace discovery completed.",
            component: "api-modules",
            operation: "startup-source-discovery",
            catalogModulesFound: 1,
        },
    ]);
});

test("startup reports module source refresh failures", async () => {
    const logs: Array<Record<string, unknown>> = [];

    await discoverModuleSourcesOnStartup(
        {
            discover: async () => {
                throw new Error("source unavailable");
            },
        },
        (level, message, meta) => logs.push({ level, message, ...meta }),
    );

    assert.deepEqual(logs, [
        {
            level: "warn",
            message: "Initial module marketplace discovery failed.",
            component: "api-modules",
            operation: "startup-source-discovery",
            error: "source unavailable",
        },
    ]);
});
