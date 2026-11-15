import assert from "node:assert/strict";
import test from "node:test";
import { registerHttpCommand } from "../http-command-plugin.ts";
import type { CommandHandler } from "../types.ts";
import { launchCli, ptyOptions } from "./fixtures/process.ts";

test(
    "command-owned TFA wizard collects target and required method order",
    ptyOptions,
    async () => {
        const run = await launchCli(["tfa:preferences:set"]);
        try {
            await run.waitFor(() => run.stderr().includes("username ("));
            run.send("fixture-target\n");
            await run.waitFor(() => run.stderr().includes("methodIds ("));
            run.send("method-one,method-two\n");
            const result = await run.outcome();
            assert.equal(result.code, 0);
            assert.equal(result.restored, true);
            assert.doesNotMatch(
                run.stdout(),
                /wizard|methodIds \(|username \(/,
            );
            const requests = (await run.requests()).filter(
                (request) => request.method === "PUT",
            );
            assert.deepEqual(requests, [
                {
                    method: "PUT",
                    path: "/api/v1/tfa/methods/preferences?accountId=fixture-target",
                    body: { methodIds: ["method-one", "method-two"] },
                },
            ]);
        } finally {
            await run.dispose();
        }
    },
);

test(
    "cancelled required body input sends no mutation",
    ptyOptions,
    async () => {
        const run = await launchCli(["tfa:preferences:set"]);
        try {
            await run.waitFor(() => run.stderr().includes("username ("));
            run.send("fixture-target\n");
            await run.waitFor(() => run.stderr().includes("methodIds ("));
            run.send("\u0004");
            assert.equal((await run.outcome()).code, 1);
            assert.equal(
                (await run.requests()).some(
                    (request) => request.method !== "GET",
                ),
                false,
            );
        } finally {
            await run.dispose();
        }
    },
);

test("explicit required body input works without a terminal", async () => {
    const run = await launchCli(
        [
            "tfa:preferences:set",
            "fixture-target",
            '{"methodIds":["method-one"]}',
        ],
        false,
    );
    try {
        assert.equal((await run.outcome()).code, 0);
        assert.doesNotMatch(run.stderr(), /wizard/);
        const request = (await run.requests()).find(
            (entry) => entry.method === "PUT",
        );
        assert.deepEqual(request?.body, { methodIds: ["method-one"] });
    } finally {
        await run.dispose();
    }
});

for (const [locale, message] of [
    ["en", "Missing required JSON body field"],
    ["de", "Erforderliches Feld"],
    ["id", "Bidang wajib"],
    ["ja", "JSON 本文の必須項目"],
]) {
    test(`partial arguments fail before mutation with ${locale} guidance`, async () => {
        const run = await launchCli(
            ["tfa:preferences:set", "fixture-target"],
            false,
            { LC_ALL: locale },
        );
        try {
            assert.equal((await run.outcome()).code, 1);
            assert.equal(run.stdout(), "");
            assert.ok(run.stderr().includes(message));
            assert.ok(run.stderr().includes("methodIds"));
            assert.equal(
                (await run.requests()).some(
                    (request) => request.method !== "GET",
                ),
                false,
            );
        } finally {
            await run.dispose();
        }
    });
}

test("command help exposes its target and required JSON fields", async () => {
    const run = await launchCli(["tfa:preferences:set", "--help"], false);
    try {
        assert.equal((await run.outcome()).code, 0);
        assert.match(
            run.stdout(),
            /Arguments:\s+username \(string, required\)/,
        );
        assert.match(
            run.stdout(),
            /JSON body fields:\s+methodIds \(string\[\], required\)/,
        );
        assert.equal(
            (await run.requests()).some((request) => request.method !== "GET"),
            false,
        );
    } finally {
        await run.dispose();
    }
});

test("registered required fields reject incomplete payloads without credentials or HTTP", async () => {
    let handler: CommandHandler | undefined;
    registerHttpCommand(
        {
            name: "fixture:required",
            method: "POST",
            path: "/fixture",
            params: ["target"],
            bodyFields: [{ name: "items", type: "string[]", required: true }],
            description: "Fixture",
        },
        (_name, registered, options) => {
            handler = registered;
            assert.deepEqual(options?.input?.params, ["target"]);
            assert.deepEqual(options?.input?.bodyFields, [
                { name: "items", type: "string[]", required: true },
            ]);
        },
    );
    const context = {
        apiBaseUrl: "https://cli-audit.invalid",
        getApiToken: async (): Promise<string> => {
            throw new Error("Unexpected credential request");
        },
    };
    for (const payload of [undefined, "{}"]) {
        await assert.rejects(
            handler!({
                ...context,
                args: ["target", ...(payload ? [payload] : [])],
            }),
            /Missing required JSON body field: items/,
        );
    }
    for (const payload of [
        '{"items":null}',
        '{"items":" "}',
        '{"items":false}',
        '{"items":[1]}',
    ]) {
        await assert.rejects(
            handler!({ ...context, args: ["target", payload] }),
            /Invalid input field: items/,
        );
    }
    await assert.rejects(
        handler!({ ...context, args: ["target", "{secret-fixture", "extra"] }),
        /Too many arguments/,
    );
    await assert.rejects(
        handler!({ ...context, args: ["target", "{secret-fixture"] }),
        (error: Error) =>
            error.message.includes("Expected a JSON object") &&
            !error.message.includes("secret-fixture"),
    );
    await assert.rejects(
        handler!({ ...context, args: ["target", "[]"] }),
        /Expected a JSON object/,
    );
    await assert.rejects(
        handler!({ ...context, args: ["", "{}"] }),
        /Missing required argument: target/,
    );
});

test("required generic JSON payload retains its complete request shape", async () => {
    let handler: CommandHandler | undefined;
    registerHttpCommand(
        {
            name: "fixture:payload",
            method: "POST",
            path: "/fixture",
            bodyFields: [{ name: "payload", type: "json", required: true }],
            description: "Fixture",
        },
        (_name, registered) => {
            handler = registered;
        },
    );
    const originalFetch = globalThis.fetch;
    const received: unknown[] = [];
    globalThis.fetch = async (url, options) => {
        assert.equal(String(url), "https://cli-audit.invalid/fixture");
        received.push(JSON.parse(String(options?.body)));
        return Response.json({ data: { accepted: true } });
    };
    try {
        await handler!({
            args: ['{"items":["one"]}'],
            apiBaseUrl: "https://cli-audit.invalid",
            getApiToken: async () => "fixture-only",
        });
        assert.deepEqual(received, [{ items: ["one"] }]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("a declared mutation query has its own explicit JSON argument", async () => {
    let handler: CommandHandler | undefined;
    registerHttpCommand(
        {
            name: "fixture:body-query",
            method: "POST",
            path: "/fixture/:target",
            params: ["target"],
            bodyFields: [{ name: "items", type: "string[]", required: true }],
            queryFields: [{ name: "revision", type: "number", required: true }],
            description: "Fixture",
        },
        (_name, registered, options) => {
            handler = registered;
            assert.match(
                options!.usage!,
                /<target> \[body-json\] \[query-json\]/,
            );
        },
    );
    const originalFetch = globalThis.fetch;
    const received: unknown[] = [];
    globalThis.fetch = async (url, options) => {
        received.push({
            url: String(url),
            body: JSON.parse(String(options?.body)),
        });
        return Response.json({ data: { accepted: true } });
    };
    const context = {
        apiBaseUrl: "https://cli-audit.invalid",
        getApiToken: async () => "fixture-only",
    };
    try {
        await assert.rejects(
            handler!({ ...context, args: ["target", '{"items":[]}'] }),
            /Missing required JSON query field: revision/,
        );
        assert.deepEqual(received, []);
        await handler!({
            ...context,
            args: ["target", '{"items":[]}', '{"revision":0}'],
        });
        assert.deepEqual(received, [
            {
                url: "https://cli-audit.invalid/fixture/target?revision=0",
                body: { items: [] },
            },
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
