import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkoutModuleRepository } from "../../../services/module-loader/marketplace/checkout.js";

const commit = "0123456789012345678901234567890123456789";

async function fixture(context: test.TestContext) {
    const root = await mkdtemp(path.join(tmpdir(), "cognis-checkout-policy-"));
    context.after(() => rm(root, { recursive: true, force: true }));
    return {
        root,
        commit,
        cloneUrl: "https://github.com/example/module.git",
        environment: { GIT_TERMINAL_PROMPT: "0" },
        log: () => undefined,
    };
}

test("checkout fetches the pinned commit with a bounded transfer and idle policy", async (context) => {
    const options = await fixture(context);
    const commands: string[][] = [];
    assert.equal(
        await checkoutModuleRepository(
            options,
            async (file, args, commandOptions) => {
                assert.equal(file, "git");
                assert.equal(commandOptions.env, options.environment);
                assert.equal(commandOptions.timeout, 15 * 60 * 1000);
                commands.push(args);
                return { stdout: args.includes("rev-parse") ? commit : "" };
            },
        ),
        commit,
    );
    assert.equal(commands.length, 5);
    const transfer = commands[2];
    assert.deepEqual(transfer.slice(-7), [
        "fetch",
        "--depth=1",
        "--no-tags",
        "--no-recurse-submodules",
        "--no-progress",
        "origin",
        commit,
    ]);
    assert.ok(transfer.includes("http.lowSpeedTime=120"));
    assert.ok(transfer.includes("http.lowSpeedLimit=1024"));
    assert.deepEqual(commands[3].slice(-4), [
        "checkout",
        "--quiet",
        "--detach",
        commit,
    ]);
});

for (const scenario of [
    {
        message:
            "fatal: Operation too slow. Less than 1024 bytes/sec transferred the last 120 seconds",
        code: "module_install_timeout",
    },
    {
        message: "Command failed: git fetch",
        killed: true,
        code: "module_install_timeout",
    },
    {
        message: "fatal: unable to access repository: SSL connection timeout",
        code: "github_connection_timeout",
    },
]) {
    test(`checkout reports and bounds retries for ${scenario.message}`, async (context) => {
        const options = await fixture(context);
        let transfers = 0;
        const failure = Object.assign(new Error(scenario.message), {
            killed: scenario.killed,
        });
        const logs: Array<{ retry?: unknown; stage?: unknown }> = [];
        await assert.rejects(
            checkoutModuleRepository(
                {
                    ...options,
                    log: (_level, _message, metadata) => {
                        logs.push(metadata ?? {});
                    },
                },
                async (_file, args) => {
                    if (args.includes("fetch")) {
                        transfers += 1;
                        throw failure;
                    }
                    return { stdout: "" };
                },
            ),
            { code: scenario.code },
        );
        assert.equal(transfers, 3);
        assert.deepEqual(
            logs
                .filter((entry) => entry.stage === "download")
                .map((entry) => entry.retry),
            [true, true, false],
        );
    });
}

test("checkout fails promptly on authorization errors and rejects an unexpected commit", async (context) => {
    const options = await fixture(context);
    let transfers = 0;
    await assert.rejects(
        checkoutModuleRepository(options, async (_file, args) => {
            if (args.includes("fetch")) {
                transfers += 1;
                throw new Error("Authentication failed");
            }
            return { stdout: "" };
        }),
        /Authentication failed/,
    );
    assert.equal(transfers, 1);
    await assert.rejects(
        checkoutModuleRepository(options, async () => ({
            stdout: "different-commit",
        })),
        /invalid_module_commit/,
    );
});
