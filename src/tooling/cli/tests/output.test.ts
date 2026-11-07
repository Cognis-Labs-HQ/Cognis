import assert from "node:assert/strict";
import test from "node:test";
import { formatCommandOutput, parseOutputOptions } from "../index.ts";
import { registry } from "../registry.ts";
import { loadModuleCliPlugins } from "../plugins.ts";
import { renderApiErrorPayload } from "../formatters.ts";
import { readProgressResponse } from "../reuse/progress-stream.ts";
import { describeProgress, withCommandProgress } from "../reuse/progress.ts";

const manifest = {
    id: "example",
    version: "2.0.0",
    files: Array.from({ length: 100 }, (_, index) => ({
        path: `internal-${index}.js`,
        sha256: "manifest-detail",
    })),
};

test("every registered built-in and contributed command has concise default output and complete verbose output", async () => {
    await loadModuleCliPlugins();
    const audited: string[] = [];
    for (const [name, spec] of registry) {
        const list = [
            "renderComponentsList",
            "renderGatewaysList",
            "renderUsersList",
        ].includes(spec.render?.name ?? "");
        const results = [
            "component:upgrade",
            "component:enable",
            "component:disable",
            "component:release-channel",
        ].includes(name);
        const data = list
            ? [
                  {
                      id: "example",
                      username: "example",
                      type: "module",
                      status: "enabled",
                      version: "2.0.0",
                  },
              ]
            : results
              ? {
                    results: [
                        {
                            target: { type: "module", id: "example" },
                            status: "succeeded",
                            data: { ...manifest, restartRequired: true },
                        },
                    ],
                }
              : {
                    ...manifest,
                    username: "example",
                    role: "admin",
                    status: "ok",
                    enabled: true,
                    token: "requested-fixture-token",
                };
        const payload = { username: "example", data };
        const output = formatCommandOutput(name, payload);
        assert.ok(output.trim().length > 0, name);
        assert.ok(output.length < 3000, `${name}: default output is excessive`);
        assert.doesNotMatch(
            output,
            /manifest-detail|\[object Object\]|undefined/,
            name,
        );
        assert.deepEqual(
            JSON.parse(formatCommandOutput(name, payload, { verbose: true })),
            payload,
            name,
        );
        audited.push(name);
    }
    assert.ok(audited.includes("component:upgrade"));
    assert.ok(audited.includes("notify:send"));
    assert.ok(audited.includes("tfa:methods"));
    assert.ok(audited.includes("search:query"));
    console.log(
        `Audited output for ${audited.length} registered commands: ${audited.join(", ")}`,
    );
});

test("bulk summaries identify each outcome and give actionable restart and host-upgrade advice", () => {
    const output = formatCommandOutput("component:upgrade", {
        data: {
            results: [
                {
                    target: { type: "module", id: "example" },
                    status: "succeeded",
                    data: { ...manifest, restartRequired: true },
                },
                {
                    target: { type: "gateway", id: "auth" },
                    status: "skipped",
                    code: "component_managed_by_host",
                },
                {
                    target: { type: "module", id: "broken" },
                    status: "failed",
                    code: "component_upgrade_timeout",
                },
            ],
        },
    });
    assert.match(
        output,
        /Module example: succeeded.*version 2.0.0.*Restart Cognis/,
    );
    assert.match(output, /Gateway auth: skipped.*host deployment/);
    assert.match(output, /Module broken: failed.*check component:info/);
    assert.match(output, /1 succeeded, 1 skipped, 1 failed/);
    assert.doesNotMatch(output, /manifest-detail/);
});

test("verbose flags are removed from arguments and literal flags after -- survive", () => {
    assert.deepEqual(parseOutputOptions(["module", "example", "-v"]), {
        args: ["module", "example"],
        verbose: true,
    });
    assert.deepEqual(parseOutputOptions(["--verbose", "module", "example"]), {
        args: ["module", "example"],
        verbose: true,
    });
    assert.deepEqual(parseOutputOptions(["--", "-v"]), {
        args: ["-v"],
        verbose: false,
    });
    const payload = {
        error: {
            code: "invalid",
            message: "Invalid selection",
            details: manifest,
        },
    };
    assert.doesNotMatch(
        renderApiErrorPayload({ status: 400, payload }),
        /manifest-detail/,
    );
    assert.match(
        renderApiErrorPayload({ status: 400, payload, verbose: true }),
        /manifest-detail/,
    );
});

test("progress starts immediately and timers are disposed on success and failure", async (context) => {
    context.mock.timers.enable({ apis: ["setInterval", "Date"] });
    const lines: string[] = [];
    let finish!: () => void;
    const operation = withCommandProgress(
        "component:upgrade",
        () =>
            new Promise<void>((resolve) => {
                finish = resolve;
            }),
        (line) => lines.push(line),
    );
    assert.equal(lines[0], "Component upgrade: working…");
    context.mock.timers.tick(10_000);
    assert.match(lines[1], /10s elapsed/);
    finish();
    await operation;
    context.mock.timers.tick(10_000);
    assert.equal(lines.length, 2);
    await assert.rejects(
        withCommandProgress(
            "example",
            async () => {
                throw new Error("failed");
            },
            (line) => lines.push(line),
        ),
        /failed/,
    );
    context.mock.timers.tick(10_000);
    assert.equal(lines.length, 3);
});

test("progress readers reject interrupted and failed operations and handle split UTF-8 chunks", async () => {
    const events: unknown[] = [];
    const bytes = new TextEncoder().encode(
        JSON.stringify({
            type: "progress",
            phase: "installing",
            channel: "日本語",
        }) +
            "\n" +
            JSON.stringify({
                type: "result",
                payload: { data: { ok: true } },
            }) +
            "\n",
    );
    const stream = new ReadableStream({
        start(controller) {
            for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
            controller.close();
        },
    });
    assert.deepEqual(
        await readProgressResponse(
            new Response(stream, {
                headers: { "content-type": "application/x-ndjson" },
            }),
            (event) => events.push(event),
        ),
        { data: { ok: true } },
    );
    assert.equal((events[0] as { channel: string }).channel, "日本語");
    const response = (body: string) =>
        new Response(body, {
            headers: { "content-type": "application/x-ndjson" },
        });
    await assert.rejects(
        readProgressResponse(
            response('{"type":"progress","phase":"installing"}\n'),
            () => {},
        ),
        /before the command result/,
    );
    await assert.rejects(
        readProgressResponse(
            response(
                '{"type":"error","status":409,"error":{"code":"component_protected"}}\n',
            ),
            () => {},
        ),
        /component_protected/,
    );
    await assert.rejects(
        readProgressResponse(response("not-json\n"), () => {}),
        SyntaxError,
    );
});

test("progress and unchanged results use sentence case and describe the actual no-op", () => {
    assert.equal(
        describeProgress({
            target: { type: "module", id: "analytics" },
            phase: "installing",
            channel: "master",
        }),
        "Module analytics: installing selected release (master)",
    );
    for (const [reason, message] of [
        ["already_enabled", "Already enabled."],
        ["already_disabled", "Already disabled."],
        ["up_to_date", "Up to date."],
    ]) {
        const output = formatCommandOutput("component:upgrade", {
            data: {
                results: [
                    {
                        target: { type: "module", id: "analytics" },
                        status: "succeeded",
                        data: { unchanged: true, reason },
                    },
                ],
            },
        });
        assert.ok(output.startsWith("Module analytics: succeeded"));
        assert.ok(output.includes(message));
        if (reason !== "already_enabled")
            assert.ok(!output.includes("Already enabled."));
    }
});
