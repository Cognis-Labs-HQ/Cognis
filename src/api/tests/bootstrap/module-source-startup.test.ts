import assert from "node:assert/strict";
import test from "node:test";
import { discoverModuleSourcesOnStartup } from "../../server.js";

test("startup refreshes module sources once and reports discovered modules", async () => {
    const calls: unknown[][] = [];
    const logs: Array<Record<string, unknown>> = [];

    await discoverModuleSourcesOnStartup(
        {
            listSources: async () => [
                { uuid: "public-source", scanPrivateRepos: false },
                { uuid: "private-source", scanPrivateRepos: true },
            ],
            discover: async (...args: unknown[]) => {
                calls.push(args);
                return [{ uuid: "module-uuid" }] as never;
            },
        },
        (level, message, meta) => logs.push({ level, message, ...meta }),
    );

    assert.deepEqual(calls, [[{}, ["public-source"], true]]);
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
            listSources: async () => [{ uuid: "public-source" }],
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

test("startup leaves credentialed sources for authenticated polling", async () => {
    let discoveryCalled = false;

    await discoverModuleSourcesOnStartup(
        {
            listSources: async () => [
                { uuid: "private-source", scanPrivateRepos: true },
            ],
            discover: async () => {
                discoveryCalled = true;
                return [];
            },
        },
        () => undefined,
    );

    assert.equal(discoveryCalled, false);
});
