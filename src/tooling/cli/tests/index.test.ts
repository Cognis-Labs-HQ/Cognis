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
import test from "node:test";
import assert from "node:assert/strict";
import {
    executeRegisteredCommand,
    formatCommandOutput,
    formatStructured,
} from "../index.ts";

test("formatStructured pretty-prints JSON strings", () => {
    assert.equal(
        formatStructured('{"data":{"status":"ok"}}'),
        '{\n  "data": {\n    "status": "ok"\n  }\n}',
    );
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

test("formatCommandOutput renders modules:list as a table", () => {
    const output = formatCommandOutput("modules:list", {
        data: [
            {
                id: "demo",
                version: "1.2.3",
                class: "extension",
                status: "available",
            },
        ],
    });

    assert.match(output, /^Modules/m);
    assert.match(output, /ID\s+Version\s+Class\s+Status/);
    assert.match(output, /demo\s+1.2.3\s+extension\s+available/);
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

test("modules:enable fails when API acknowledgement says module is still disabled", async () => {
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
            executeRegisteredCommand("modules:enable", ["demo"], {
                apiBaseUrl: "http://localhost:3000",
                getApiToken: async () => "token",
            }),
            /Module "demo" was not enabled: Module remains disabled/,
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});
