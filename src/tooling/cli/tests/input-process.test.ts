import assert from "node:assert/strict";
import test from "node:test";
import { launchCli, ptyOptions } from "./fixtures/process.ts";

for (const interactive of [false, true]) {
    test(
        `empty TFA preference order is preserved (${interactive ? "wizard" : "arguments"})`,
        interactive ? ptyOptions : {},
        async () => {
            const run = await launchCli(
                [
                    "tfa:preferences:set",
                    ...(interactive
                        ? []
                        : ["fixture-target", '{"methodIds":[]}']),
                ],
                interactive,
            );
            try {
                if (interactive) {
                    await run.waitFor(() =>
                        run.stderr().includes("username ("),
                    );
                    run.send("fixture-target\n");
                    await run.waitFor(() =>
                        run.stderr().includes("methodIds ("),
                    );
                    assert.match(run.stderr(), /Use \[\] for an empty list/);
                    run.send("[]\n");
                }
                const result = await run.outcome();
                assert.equal(result.code, 0);
                if (interactive) assert.equal(result.restored, true);
                assert.deepEqual(
                    (await run.requests()).filter(
                        (entry) => entry.method === "PUT",
                    ),
                    [
                        {
                            method: "PUT",
                            path: "/api/v1/tfa/methods/preferences?accountId=fixture-target",
                            body: { methodIds: [] },
                        },
                    ],
                );
            } finally {
                await run.dispose();
            }
        },
    );
}

for (const input of [
    '{"methodIds":false}',
    '{"methodIds":[1]}',
    '{"methodIds":null}',
]) {
    test(`wrong typed preference input is rejected: ${input}`, async () => {
        const run = await launchCli(
            ["tfa:preferences:set", "fixture-target", input],
            false,
        );
        try {
            assert.equal((await run.outcome()).code, 1);
            assert.match(run.stderr(), /Invalid input field: methodIds/);
            assert.equal(
                (await run.requests()).some((entry) => entry.method !== "GET"),
                false,
            );
        } finally {
            await run.dispose();
        }
    });
}

for (const interactive of [false, true]) {
    for (const input of ["{}", "[]", "false", '{"value":1e999}']) {
        test(
            `whole JSON shape ${input} is consistent (${interactive ? "wizard" : "arguments"})`,
            interactive ? ptyOptions : {},
            async () => {
                const run = await launchCli(
                    ["tfa:enforcement:set", ...(interactive ? [] : [input])],
                    interactive,
                );
                try {
                    if (interactive) {
                        await run.waitFor(() =>
                            run.stderr().includes("payload ("),
                        );
                        run.send(input + "\n");
                    }
                    const result = await run.outcome();
                    assert.equal(result.code, input === "{}" ? 0 : 1);
                    if (interactive) assert.equal(result.restored, true);
                    const mutations = (await run.requests()).filter(
                        (entry) => entry.method !== "GET",
                    );
                    assert.deepEqual(
                        mutations,
                        input === "{}"
                            ? [
                                  {
                                      method: "PUT",
                                      path: "/api/v1/tfa/enforcement",
                                      body: {},
                                  },
                              ]
                            : [],
                    );
                } finally {
                    await run.dispose();
                }
            },
        );
    }
}

test(
    "password whitespace is preserved without echoing the secret",
    ptyOptions,
    async () => {
        const run = await launchCli(["user:set-password"]);
        try {
            await run.waitFor(() => run.stderr().includes("username ("));
            run.send("fixture-target\n");
            await run.waitFor(() => run.stderr().includes("password ("));
            run.send("  fixture-secret-password  \n");
            const result = await run.outcome();
            assert.equal(result.code, 0);
            assert.equal(result.restored, true);
            assert.doesNotMatch(
                run.stdout() + run.stderr(),
                /fixture-secret-password/,
            );
            assert.deepEqual(
                (await run.requests()).filter(
                    (entry) => entry.method === "POST",
                ),
                [
                    {
                        method: "POST",
                        path: "/api/v1/users/fixture-target/password",
                        body: { password: "  fixture-secret-password  " },
                    },
                ],
            );
        } finally {
            await run.dispose();
        }
    },
);

for (const scenario of [
    { type: "number", input: "not-a-number" },
    { type: "number", input: "Infinity" },
    { type: "number", input: "1e999" },
    { type: "number", input: "0", expected: 0 },
    { type: "boolean", input: "maybe" },
    { type: "boolean", input: "false", expected: false },
]) {
    test(
        `supplemental ${scenario.type} wizard validates ${scenario.input}`,
        ptyOptions,
        async () => {
            const run = await launchCli([`fixture:${scenario.type}`]);
            try {
                await run.waitFor(() => run.stderr().includes("value ("));
                run.send(scenario.input + "\n");
                const valid = scenario.expected !== undefined;
                const result = await run.outcome();
                assert.equal(result.code, valid ? 0 : 1);
                assert.equal(result.restored, true);
                const mutations = (await run.requests()).filter(
                    (entry) => entry.method !== "GET",
                );
                assert.deepEqual(
                    mutations,
                    valid
                        ? [
                              {
                                  method: "POST",
                                  path: `/fixture/${scenario.type}`,
                                  body: { value: scenario.expected },
                              },
                          ]
                        : [],
                );
            } finally {
                await run.dispose();
            }
        },
    );
}

test(
    "supplemental required query is prompted and preserves existing query data",
    ptyOptions,
    async () => {
        const run = await launchCli(["fixture:query"]);
        try {
            await run.waitFor(() => run.stderr().includes("term ("));
            run.send("fixture query\n");
            assert.equal((await run.outcome()).code, 0);
            assert.deepEqual(
                (await run.requests()).filter((entry) =>
                    entry.path.startsWith("/fixture/"),
                ),
                [
                    {
                        method: "GET",
                        path: "/fixture/query?existing=preserved&term=fixture+query",
                        body: null,
                    },
                ],
            );
        } finally {
            await run.dispose();
        }
    },
);

for (const payload of [
    "{}",
    '{"term":false}',
    '{"term":"fixture"}',
    '{"term":""}',
]) {
    test(`supplemental explicit query validates ${payload}`, async () => {
        const run = await launchCli(["fixture:query", payload], false);
        try {
            const value: unknown = JSON.parse(payload).term;
            const valid = typeof value === "string";
            assert.equal((await run.outcome()).code, valid ? 0 : 1);
            const requests = (await run.requests()).filter((entry) =>
                entry.path.startsWith("/fixture/"),
            );
            assert.equal(requests.length, valid ? 1 : 0);
            if (valid)
                assert.equal(
                    requests[0]?.path,
                    `/fixture/query?existing=preserved&term=${value}`,
                );
            if (payload === "{}")
                assert.match(
                    run.stderr(),
                    /Missing required JSON query field: term/,
                );
        } finally {
            await run.dispose();
        }
    });
}
