/**
 * Tests CLI output formatting helpers.
 *
 * Exports:
 *   none — verifies the public formatter exports from ../index.ts.
 *
 * Usage example:
 *   npm test -- src/tooling/cli/tests/index.test.ts
 *
 * The tests cover formatted JSON fallback and command-specific rendering for
 * representative built-in commands.
 */
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import test from "node:test";
import assert from "node:assert/strict";
import {
    executeRegisteredCommand,
    formatCommandOutput,
    formatStructured,
} from "../index.ts";
import { printGlobalHelp } from "../help.ts";
import { loadModuleCliPlugins } from "../plugins.ts";
import { registry } from "../registry.ts";
import { ApiRequestError } from "../http.ts";

function captureConsoleLog(run: () => void): string {
    const originalLog = console.log;
    const lines: string[] = [];
    try {
        console.log = (...args: unknown[]) => {
            lines.push(args.join(" "));
        };
        run();
    } finally {
        console.log = originalLog;
    }
    return lines.join("\n");
}

test("formatStructured pretty-prints JSON strings", () => {
    assert.equal(
        formatStructured('{"data":{"status":"ok"}}'),
        '{\n  "data": {\n    "status": "ok"\n  }\n}',
    );
});

test("formatStructured pretty-prints object payloads and handles empty output", () => {
    assert.equal(
        formatStructured({ data: { status: "ok", count: 2 } }),
        '{\n  "data": {\n    "status": "ok",\n    "count": 2\n  }\n}',
    );
    assert.equal(formatStructured(undefined), "");
});

test("ApiRequestError formats JSON payloads for readable CLI errors", () => {
    const error = new ApiRequestError(400, "Bad Request", {
        error: { code: "invalid", message: "Invalid payload" },
    });

    assert.match(error.message, /\n  "error": \{/);
    assert.match(error.message, /\n    "message": "Invalid payload"/);
});

test("formatCommandOutput renders user:create with labeled fields", () => {
    const output = formatCommandOutput("user:create", {
        data: {
            username: "alice",
            role: "admin",
            enabled: true,
        },
    });

    assert.match(output, /^User Created/m);
    assert.match(output, /Username: alice/);
    assert.match(output, /Role: admin/);
    assert.match(output, /Status: enabled/);
});

test("formatCommandOutput renders user:list with effective roles", () => {
    const output = formatCommandOutput("user:list", {
        data: [
            {
                username: "admin",
                role: "owner",
                enabled: true,
                isFounder: true,
            },
            {
                username: "alice",
                role: "admin",
                enabled: true,
                isFounder: false,
            },
        ],
    });

    assert.match(output, /^Users/m);
    assert.match(output, /Username\s+Role\s+Status\s+Founder/);
    assert.match(output, /admin\s+owner\s+enabled\s+yes/);
    assert.match(output, /alice\s+admin\s+enabled\s+no/);
});

test("formatCommandOutput renders component:list as a table", () => {
    const output = formatCommandOutput("component:list", {
        data: [
            {
                id: "demo",
                type: "module",
                version: "1.2.3",
                status: "available",
            },
            {
                id: "auth",
                type: "gateway",
                version: "2.0.0",
                status: "active",
            },
            {
                id: "local",
                type: "adapter",
                version: "1.0.0",
                status: "enabled",
                gatewayId: "auth",
            },
        ],
    });

    assert.match(output, /^Components/m);
    assert.match(output, /ID\s+Type\s+Version\s+Status\s+Gateway/);
    assert.match(output, /demo\s+module\s+1.2.3\s+available/);
    assert.match(output, /auth\s+gateway\s+2.0.0\s+active/);
    assert.match(output, /local\s+adapter\s+1.0.0\s+enabled\s+auth/);
});

test("user:set-password fails with clear message when user is missing", async () => {
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];
    try {
        globalThis.fetch = async (input) => {
            const requestUrl = String(input);
            requests.push(requestUrl);
            if (requestUrl.endsWith("/api/v1/users/ghost/info")) {
                return new Response(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                    {
                        status: 404,
                        statusText: "Not Found",
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            throw new Error(`Unexpected request: ${requestUrl}`);
        };

        await assert.rejects(
            executeRegisteredCommand(
                "user:set-password",
                ["ghost", "secret123"],
                {
                    apiBaseUrl: "http://localhost:3000",
                    getApiToken: async () => "token",
                },
            ),
            /User "ghost" not found\./,
        );
        assert.equal(requests.length, 1);
        assert.ok(requests[0].endsWith("/api/v1/users/ghost/info"));
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("user:set-password updates password after existence check succeeds", async () => {
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];
    try {
        globalThis.fetch = async (input) => {
            const requestUrl = String(input);
            requests.push(requestUrl);
            if (requestUrl.endsWith("/api/v1/users/alice/info")) {
                return new Response(
                    JSON.stringify({ data: { username: "alice" } }),
                    {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            if (requestUrl.endsWith("/api/v1/users/alice/password")) {
                return new Response(
                    JSON.stringify({ data: { updated: true } }),
                    {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            throw new Error(`Unexpected request: ${requestUrl}`);
        };

        const payload = (await executeRegisteredCommand(
            "user:set-password",
            ["alice", "secret123"],
            {
                apiBaseUrl: "http://localhost:3000",
                getApiToken: async () => "token",
            },
        )) as { username?: string };

        assert.equal(payload.username, "alice");
        assert.deepEqual(requests, [
            "http://localhost:3000/api/v1/users/alice/info",
            "http://localhost:3000/api/v1/users/alice/password",
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("all user mutation commands fail fast when target user is missing", async () => {
    const originalFetch = globalThis.fetch;
    const commands: Array<{ name: string; args: string[] }> = [
        { name: "user:role", args: ["ghost", "user"] },
        { name: "user:disable", args: ["ghost"] },
        { name: "user:enable", args: ["ghost"] },
        { name: "user:isfounder", args: ["ghost", "true"] },
        { name: "user:delete", args: ["ghost"] },
        { name: "user:preferences:clear", args: ["ghost"] },
    ];

    try {
        for (const command of commands) {
            const requests: string[] = [];
            globalThis.fetch = async (input) => {
                const requestUrl = String(input);
                requests.push(requestUrl);
                if (requestUrl.endsWith("/api/v1/users/ghost/info")) {
                    return new Response(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "User not found",
                            },
                        }),
                        {
                            status: 404,
                            statusText: "Not Found",
                            headers: { "content-type": "application/json" },
                        },
                    );
                }
                throw new Error(`Unexpected request: ${requestUrl}`);
            };

            await assert.rejects(
                executeRegisteredCommand(command.name, command.args, {
                    apiBaseUrl: "http://localhost:3000",
                    getApiToken: async () => "token",
                }),
                /User "ghost" not found\./,
            );
            assert.equal(
                requests.length,
                1,
                `Expected one request for ${command.name}`,
            );
            assert.ok(requests[0].endsWith("/api/v1/users/ghost/info"));
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("user:set-password fails when API reports updated false", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input) => {
            const requestUrl = String(input);
            if (requestUrl.endsWith("/api/v1/users/alice/info")) {
                return new Response(
                    JSON.stringify({ data: { username: "alice" } }),
                    {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            if (requestUrl.endsWith("/api/v1/users/alice/password")) {
                return new Response(
                    JSON.stringify({
                        data: { updated: false, message: "No account changed" },
                    }),
                    {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            throw new Error(`Unexpected request: ${requestUrl}`);
        };

        await assert.rejects(
            executeRegisteredCommand("user:set-password", ["alice", "pw"], {
                apiBaseUrl: "http://localhost:3000",
                getApiToken: async () => "token",
            }),
            /User "alice" password update failed: No account changed/,
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("component:enable fails when API acknowledgement says module is still disabled", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input) => {
            const requestUrl = String(input);
            if (requestUrl.endsWith("/api/v1/modules/demo/enable")) {
                return new Response(
                    JSON.stringify({
                        data: { moduleId: "demo", enabled: false },
                        message: "Module remains disabled",
                    }),
                    {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            throw new Error(`Unexpected request: ${requestUrl}`);
        };

        await assert.rejects(
            executeRegisteredCommand("component:enable", ["module", "demo"], {
                apiBaseUrl: "http://localhost:3000",
                getApiToken: async () => "token",
            }),
            /Module "demo" was not enabled: Module remains disabled/,
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("component:list aggregates modules, gateways, and adapters", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input) => {
            const requestUrl = String(input);
            if (requestUrl.endsWith("/api/v1/modules")) {
                return new Response(
                    JSON.stringify({
                        data: [
                            {
                                id: "analytics",
                                version: "1.0.0",
                                status: "enabled",
                            },
                        ],
                    }),
                    {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            if (requestUrl.endsWith("/api/v1/gateways")) {
                return new Response(
                    JSON.stringify({
                        data: [
                            { id: "auth", version: "2.0.0", status: "active" },
                        ],
                    }),
                    {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            if (requestUrl.endsWith("/api/v1/gateways/auth/adapters")) {
                return new Response(
                    JSON.stringify({
                        data: [
                            {
                                adapterId: "local",
                                version: "1.2.0",
                                enabled: true,
                            },
                        ],
                    }),
                    {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            throw new Error(`Unexpected request: ${requestUrl}`);
        };

        const payload = (await executeRegisteredCommand("component:list", [], {
            apiBaseUrl: "http://localhost:3000",
            getApiToken: async () => "token",
        })) as {
            data: Array<{ id: string; type: string; gatewayId?: string }>;
        };

        assert.deepEqual(payload.data, [
            {
                id: "analytics",
                type: "module",
                version: "1.0.0",
                status: "enabled",
            },
            { id: "auth", type: "gateway", version: "2.0.0", status: "active" },
            {
                id: "local",
                type: "adapter",
                version: "1.2.0",
                status: "enabled",
                gatewayId: "auth",
            },
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("component:config:get only returns schema-exposed fields", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input) => {
            const requestUrl = String(input);
            if (
                requestUrl.endsWith(
                    "/api/v1/gateways/auth/adapters/oidc/config",
                )
            ) {
                return new Response(
                    JSON.stringify({
                        data: {
                            clientId: "demo-client",
                            clientSecret: "hidden",
                            enabled: true,
                        },
                        schema: [{ key: "clientId" }],
                    }),
                    {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            throw new Error(`Unexpected request: ${requestUrl}`);
        };

        const payload = await executeRegisteredCommand(
            "component:config:get",
            ["adapter", "auth", "oidc"],
            {
                apiBaseUrl: "http://localhost:3000",
                getApiToken: async () => "token",
            },
        );

        assert.deepEqual(payload, {
            data: { clientId: "demo-client" },
            schema: [{ key: "clientId" }],
        });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("component:config:set rejects fields not exposed by adapter schema", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input) => {
            const requestUrl = String(input);
            if (
                requestUrl.endsWith(
                    "/api/v1/gateways/auth/adapters/oidc/config",
                )
            ) {
                return new Response(
                    JSON.stringify({
                        data: { clientId: "demo-client" },
                        schema: [{ key: "clientId" }],
                    }),
                    {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            throw new Error(`Unexpected request: ${requestUrl}`);
        };

        await assert.rejects(
            executeRegisteredCommand(
                "component:config:set",
                [
                    "adapter",
                    "auth",
                    "oidc",
                    JSON.stringify({ clientId: "demo-client", enabled: true }),
                ],
                {
                    apiBaseUrl: "http://localhost:3000",
                    getApiToken: async () => "token",
                },
            ),
            /Config field\(s\) are not user-configurable: enabled/,
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("system health labels component contributions as Components", () => {
    const output = formatCommandOutput("system:health", {
        data: {
            status: "ok",
            contributions: [
                {
                    componentId: "jitsi-meet",
                    componentType: "module",
                    status: "ok",
                    message: "reachable",
                },
            ],
        },
    });

    assert.match(output, /Components/);
    assert.doesNotMatch(output, /Component Contributions/);
});

test("component CLI plugins register broad operational coverage", async () => {
    await loadModuleCliPlugins();

    for (const commandName of [
        "tfa:methods",
        "email:add",
        "invite:create",
        "calendar:event:create",
        "notify:broadcasts:create",
        "study:languages",
        "messages:rooms",
        "share:token:create",
        "search:query",
        "docs:list",
        "ui:routes",
        "files:quota:defaults",
        "social:posts",
    ]) {
        assert.ok(
            registry.has(commandName),
            `${commandName} should be registered`,
        );
    }
});

test("search:query maps wizard-friendly query fields to search API", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input, init) => {
            assert.equal(
                String(input),
                "http://localhost:3000/api/v1/search?q=alice&type=users",
            );
            assert.equal(init?.method, "GET");
            return new Response(JSON.stringify({ data: [] }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        };

        const payload = await executeRegisteredCommand(
            "search:query",
            [JSON.stringify({ q: "alice", type: "users" })],
            {
                apiBaseUrl: "http://localhost:3000",
                getApiToken: async () => "token",
            },
        );

        assert.deepEqual(payload, { data: [] });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("renderStructuredSummary turns JSON arrays and metadata into readable output", () => {
    const output = formatCommandOutput("calendar:list", {
        data: [
            {
                id: "cal-1",
                ownerAccountId: "alice",
                name: "Alice Calendar",
                visibility: "private",
            },
        ],
        meta: { currentAccountId: "alice", requestedByAccountId: "cognis-cli" },
    });

    assert.match(output, /Id\s+Owner Account Id\s+Name\s+Visibility/);
    assert.match(output, /cal-1\s+alice\s+Alice Calendar\s+private/);
    assert.match(output, /Metadata/);
    assert.match(output, /Current Account Id: alice/);
    assert.match(output, /Requested By Account Id: cognis-cli/);
});

test("feature CLI command maps positional args and JSON body to API route", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input, init) => {
            assert.equal(
                String(input),
                "http://localhost:3000/api/v1/calendar/calendars/cal-1/events",
            );
            assert.equal(init?.method, "POST");
            assert.equal(init?.body, JSON.stringify({ title: "Demo" }));
            return new Response(JSON.stringify({ data: { created: true } }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        };

        const payload = await executeRegisteredCommand(
            "calendar:event:create",
            ["cal-1", JSON.stringify({ title: "Demo" })],
            {
                apiBaseUrl: "http://localhost:3000",
                getApiToken: async () => "token",
            },
        );

        assert.deepEqual(payload, { data: { created: true } });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("calendar:list forwards admin-selected account ID as query JSON", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input, init) => {
            assert.equal(
                String(input),
                "http://localhost:3000/api/v1/calendar/calendars?accountId=alice",
            );
            assert.equal(init?.method, "GET");
            return new Response(
                JSON.stringify({
                    data: [{ id: "cal-1", ownerAccountId: "alice" }],
                    meta: { currentAccountId: "alice" },
                }),
                {
                    status: 200,
                    headers: { "content-type": "application/json" },
                },
            );
        };

        const payload = await executeRegisteredCommand(
            "calendar:list",
            [JSON.stringify({ accountId: "alice" })],
            {
                apiBaseUrl: "http://localhost:3000",
                getApiToken: async () => "token",
            },
        );

        assert.deepEqual(payload, {
            data: [{ id: "cal-1", ownerAccountId: "alice" }],
            meta: { currentAccountId: "alice" },
        });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("feature CLI command maps optional query JSON to API route", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input, init) => {
            assert.equal(
                String(input),
                "http://localhost:3000/api/v1/share/tokens?resourceType=meeting&resourceId=meeting-1",
            );
            assert.equal(init?.method, "GET");
            return new Response(JSON.stringify({ data: [] }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        };

        const payload = await executeRegisteredCommand(
            "share:tokens",
            [
                JSON.stringify({
                    resourceType: "meeting",
                    resourceId: "meeting-1",
                }),
            ],
            {
                apiBaseUrl: "http://localhost:3000",
                getApiToken: async () => "token",
            },
        );

        assert.deepEqual(payload, { data: [] });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("notify:send accepts structured JSON payloads for direct execution", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input, init) => {
            assert.equal(
                String(input),
                "http://localhost:3000/api/v1/notify/send",
            );
            assert.equal(init?.method, "POST");
            assert.equal(
                init?.body,
                JSON.stringify({
                    category: "system",
                    recipientUsername: "alice",
                    subject: "Maintenance",
                    body: "Window starts at 22:00 UTC",
                }),
            );
            return new Response(JSON.stringify({ data: { sent: true } }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        };

        const payload = await executeRegisteredCommand(
            "notify:send",
            [
                JSON.stringify({
                    category: "system",
                    recipientUsername: "alice",
                    subject: "Maintenance",
                    body: "Window starts at 22:00 UTC",
                }),
            ],
            {
                apiBaseUrl: "http://localhost:3000",
                getApiToken: async () => "token",
            },
        );

        assert.deepEqual(payload, { data: { sent: true } });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("global help includes component commands under the Components section", () => {
    const output = captureConsoleLog(() => printGlobalHelp());

    assert.match(output, /\n  Components:/);
    assert.match(
        output,
        /component:list\s+List modules, gateways, and adapters/,
    );
    assert.match(
        output,
        /component:enable\s+Enable a module, gateway, or adapter/,
    );
    assert.doesNotMatch(output, /\n  Modules:\n(?:.*\n)*?\s+component:/);
});

test("loadModuleCliPlugins discovers manifest-declared component CLI commands", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "cognis-cli-modules-"));
    const moduleRoot = path.join(tempRoot, "demo-component");
    const gatewayRoot = path.join(tempRoot, "demo-gateway");
    const adapterRoot = path.join(
        tempRoot,
        "demo-gateway-adapters",
        "demo-adapter",
    );
    const previousModulePaths = process.env.COGNIS_MODULE_CLI_PATHS;
    const previousGatewayPaths = process.env.COGNIS_GATEWAY_CLI_PATHS;
    const previousAdapterPaths = process.env.COGNIS_ADAPTER_CLI_PATHS;

    try {
        await mkdir(path.join(moduleRoot, "tools"), { recursive: true });
        await mkdir(path.join(gatewayRoot, "cli"), { recursive: true });
        await mkdir(path.join(adapterRoot, "cli"), { recursive: true });
        await writeFile(
            path.join(moduleRoot, "manifest.json"),
            JSON.stringify({ entrypoints: { cli: "./tools/commands.js" } }),
        );
        await writeFile(
            path.join(moduleRoot, "tools", "commands.js"),
            `export function registerCommands({ register }) {
                register("demo-component:inspect", async () => ({ data: { ok: true } }), {
                    usage: "cognisctl demo-component:inspect",
                    description: "Inspect the demo component.",
                    section: "Demo Component",
                });
            }`,
        );
        await writeFile(
            path.join(gatewayRoot, "cli", "index.js"),
            `export function registerCommands({ register }) {
                register("demo-gateway:status", async () => ({ data: { status: "ok" } }), {
                    usage: "cognisctl demo-gateway:status",
                    description: "Inspect the demo gateway.",
                    section: "Demo Gateway",
                });
            }`,
        );
        await writeFile(
            path.join(adapterRoot, "cli", "index.js"),
            `export function registerCommands({ register }) {
                register("demo-adapter:status", async () => ({ data: { status: "ok" } }), {
                    usage: "cognisctl demo-adapter:status",
                    description: "Inspect the demo adapter.",
                    section: "Demo Adapter",
                });
            }`,
        );

        process.env.COGNIS_MODULE_CLI_PATHS = tempRoot;
        process.env.COGNIS_GATEWAY_CLI_PATHS = tempRoot;
        process.env.COGNIS_ADAPTER_CLI_PATHS = tempRoot;
        await loadModuleCliPlugins({ refresh: true });

        assert.ok(registry.has("demo-component:inspect"));
        assert.ok(registry.has("demo-gateway:status"));
        assert.ok(registry.has("demo-adapter:status"));
        assert.equal(
            formatCommandOutput(
                "demo-component:inspect",
                await executeRegisteredCommand("demo-component:inspect", [], {
                    apiBaseUrl: "http://localhost:3000",
                    getApiToken: async () => "token",
                }),
            ),
            '{\n  "data": {\n    "ok": true\n  }\n}',
        );

        const output = captureConsoleLog(() => printGlobalHelp());
        assert.match(output, /\n  Demo Component:/);
        assert.match(output, /\n  Demo Gateway:/);
        assert.match(output, /\n  Demo Adapter:/);
        assert.match(
            output,
            /demo-component:inspect\s+Inspect the demo component\./,
        );
    } finally {
        registry.delete("demo-component:inspect");
        registry.delete("demo-gateway:status");
        registry.delete("demo-adapter:status");
        if (previousModulePaths === undefined) {
            delete process.env.COGNIS_MODULE_CLI_PATHS;
        } else {
            process.env.COGNIS_MODULE_CLI_PATHS = previousModulePaths;
        }
        if (previousGatewayPaths === undefined) {
            delete process.env.COGNIS_GATEWAY_CLI_PATHS;
        } else {
            process.env.COGNIS_GATEWAY_CLI_PATHS = previousGatewayPaths;
        }
        if (previousAdapterPaths === undefined) {
            delete process.env.COGNIS_ADAPTER_CLI_PATHS;
        } else {
            process.env.COGNIS_ADAPTER_CLI_PATHS = previousAdapterPaths;
        }
        await rm(tempRoot, { recursive: true, force: true });
    }
});
