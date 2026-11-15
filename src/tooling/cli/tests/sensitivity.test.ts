import assert from "node:assert/strict";
import test from "node:test";
import { launchCli, ptyOptions } from "./fixtures/process.ts";

test(
    "owner-marked ordinary fields remain visible across a hidden password field",
    ptyOptions,
    async () => {
        const run = await launchCli(["user:create"]);
        try {
            await run.waitFor(() => run.stderr().includes("username ("));
            assert.match(
                run.stderr(),
                /username \(string, required, visible\)/,
            );
            run.send("fixture-target\n");
            await run.waitFor(() => run.stderr().includes("password ("));
            assert.ok(run.stderr().includes("fixture-target"));
            assert.match(run.stderr(), /password \(string, required, hidden\)/);
            run.send("fixture-secret-password\n");
            await run.waitFor(() => run.stderr().includes("role ("));
            assert.match(run.stderr(), /role \(string, required, visible\)/);
            run.send("user\n");
            const outcome = await run.outcome();
            assert.equal(outcome.code, 0);
            assert.equal(outcome.restored, true);
            assert.doesNotMatch(
                run.stdout() + run.stderr(),
                /fixture-secret-password/,
            );
            const request = (await run.requests()).find(
                (entry) => entry.method === "POST",
            );
            assert.deepEqual(request?.body, {
                password: "fixture-secret-password",
                role: "user",
            });
        } finally {
            await run.dispose();
        }
    },
);

for (const scenario of [
    {
        command: "fixture:token",
        field: "token",
        input: "fixture-secret-token",
        body: { token: "fixture-secret-token" },
    },
    {
        command: "tfa:enforcement:set",
        field: "payload",
        input: '{"token":"fixture-secret-json"}',
        body: { token: "fixture-secret-json" },
    },
]) {
    test(
        `secret or undeclared ${scenario.field} input stays hidden`,
        ptyOptions,
        async () => {
            const run = await launchCli([scenario.command]);
            try {
                await run.waitFor(() =>
                    run.stderr().includes(`${scenario.field} (`),
                );
                assert.match(run.stderr(), /hidden\):/);
                run.send(scenario.input + "\n");
                const result = await run.outcome();
                assert.equal(result.code, 0);
                assert.equal(result.restored, true);
                assert.doesNotMatch(
                    run.stdout() + run.stderr(),
                    /fixture-secret/,
                );
                assert.deepEqual(
                    (await run.requests()).find(
                        (entry) => entry.method !== "GET",
                    )?.body,
                    scenario.body,
                );
            } finally {
                await run.dispose();
            }
        },
    );
}
