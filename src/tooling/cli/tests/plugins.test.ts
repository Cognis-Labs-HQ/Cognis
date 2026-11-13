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
import { renderApiErrorPayload } from "../formatters.ts";
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

test("component CLI plugins register broad operational coverage", async () => {
    await loadModuleCliPlugins();

    for (const commandName of [
        "tfa:methods",
        "email:add",
        "invite:create",
        "calendar:events",
        "notify:broadcasts:create",
        "study:languages",
        "share:tokens",
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

test("SMTP adapter owns email CLI commands", async () => {
    await loadModuleCliPlugins({ refresh: true });

    assert.ok(
        registry.has("notify:send"),
        "notify gateway commands should load",
    );
    assert.equal(
        registry.get("notify:send")?.section,
        "Notify",
        "notify commands should use metadata-free prefix sections",
    );
    assert.ok(
        registry.has("email:add"),
        "SMTP adapter email command should load",
    );
    assert.equal(
        registry.get("email:add")?.section,
        "SMTP Adapter",
        "email commands should be contributed by the SMTP adapter",
    );
});

test("plugin commands use structured summaries by default", async () => {
    await loadModuleCliPlugins();

    const analyticsOutput = formatCommandOutput("analytics:metrics", {
        data: { totalUsers: 2, activeUsers: 1 },
    });
    assert.match(analyticsOutput, /Total Users: 2/);
    assert.match(analyticsOutput, /Active Users: 1/);

    const jitsiOutput = formatCommandOutput("jitsi-meet:meetings", {
        data: [
            {
                id: "meet-1",
                title: "Planning",
                invitedParticipantCount: 3,
                activeParticipantCount: 2,
            },
        ],
    });
    assert.match(
        jitsiOutput,
        /Id\s+Title\s+Invited Participant Count\s+Active Participant Count/,
    );
    assert.match(jitsiOutput, /meet-1\s+Planning\s+3\s+2/);

    const filesOutput = formatCommandOutput("files:quota:defaults", {
        data: [{ namespaceId: "avatars", quotaBytes: 1024 }],
    });
    assert.match(filesOutput, /Namespace Id\s+Quota Bytes/);
    assert.match(filesOutput, /avatars\s+1024/);
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
        meta: {
            currentAccountId: "alice",
            requestedByAccountId: "system:cognis-cli",
        },
    });

    assert.match(output, /Id\s+Owner Account Id\s+Name\s+Visibility/);
    assert.match(output, /cal-1\s+alice\s+Alice Calendar\s+private/);
    assert.match(output, /Metadata/);
    assert.match(output, /Current Account Id: alice/);
    assert.match(output, /Requested By Account Id: system:cognis-cli/);
});

test("calendar:events maps calendar IDs to inspection routes", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input, init) => {
            assert.equal(
                String(input),
                "http://localhost:3000/api/v1/calendar/calendars/cal-1/events",
            );
            assert.equal(init?.method, "GET");
            return new Response(JSON.stringify({ data: [] }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        };

        const payload = await executeRegisteredCommand(
            "calendar:events",
            ["cal-1"],
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

test("tfa CLI commands require a target username", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (input, init) => {
            assert.equal(
                String(input),
                "http://localhost:3000/api/v1/tfa/methods?accountId=alice",
            );
            assert.equal(init?.method, "GET");
            return new Response(
                JSON.stringify({ data: { enabledMethods: [] } }),
                {
                    status: 200,
                    headers: { "content-type": "application/json" },
                },
            );
        };

        const payload = await executeRegisteredCommand(
            "tfa:methods",
            ["alice"],
            {
                apiBaseUrl: "http://localhost:3000",
                getApiToken: async () => "token",
            },
        );

        assert.deepEqual(payload, { data: { enabledMethods: [] } });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("calendar:list requires a target username and forwards account ID", async () => {
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
            ["alice"],
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

test("loadModuleCliPlugins filters commands for disabled components", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "cognis-cli-filter-"));
    const enabledRoot = path.join(tempRoot, "enabled-module");
    const disabledRoot = path.join(tempRoot, "disabled-module");
    const previousModulePaths = process.env.COGNIS_MODULE_CLI_PATHS;
    const previousGatewayPaths = process.env.COGNIS_GATEWAY_CLI_PATHS;
    const previousAdapterPaths = process.env.COGNIS_ADAPTER_CLI_PATHS;
    const originalFetch = globalThis.fetch;

    try {
        for (const moduleRoot of [enabledRoot, disabledRoot]) {
            await mkdir(path.join(moduleRoot, "cli"), { recursive: true });
            await writeFile(
                path.join(moduleRoot, "manifest.json"),
                JSON.stringify({ entrypoints: { cli: "./cli/index.js" } }),
            );
        }
        await writeFile(
            path.join(enabledRoot, "cli", "index.js"),
            `export function registerCommands({ register }) {
                register("enabled-module:inspect", async () => ({ data: { ok: true } }), {
                    usage: "cognisctl enabled-module:inspect",
                    description: "Inspect enabled module.",
                });
            }`,
        );
        await writeFile(
            path.join(disabledRoot, "cli", "index.js"),
            `export function registerCommands({ register }) {
                register("disabled-module:inspect", async () => ({ data: { ok: true } }), {
                    usage: "cognisctl disabled-module:inspect",
                    description: "Inspect disabled module.",
                });
            }`,
        );

        process.env.COGNIS_MODULE_CLI_PATHS = tempRoot;
        process.env.COGNIS_GATEWAY_CLI_PATHS = path.join(tempRoot, "gateways");
        process.env.COGNIS_ADAPTER_CLI_PATHS = path.join(tempRoot, "adapters");
        globalThis.fetch = async (input) => {
            const requestUrl = String(input);
            if (requestUrl.endsWith("/api/v1/modules")) {
                return new Response(
                    JSON.stringify({
                        data: [
                            { id: "enabled-module", status: "enabled" },
                            { id: "disabled-module", status: "disabled" },
                        ],
                    }),
                    {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    },
                );
            }
            if (requestUrl.endsWith("/api/v1/gateways")) {
                return new Response(JSON.stringify({ data: [] }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            }
            throw new Error(`Unexpected request: ${requestUrl}`);
        };

        await loadModuleCliPlugins({
            refresh: true,
            filterDisabled: true,
            apiBaseUrl: "http://localhost:3000",
            getApiToken: async () => "token",
        });

        assert.ok(registry.has("enabled-module:inspect"));
        assert.equal(registry.has("disabled-module:inspect"), false);
    } finally {
        registry.delete("enabled-module:inspect");
        registry.delete("disabled-module:inspect");
        globalThis.fetch = originalFetch;
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
            "Ok: Yes",
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
