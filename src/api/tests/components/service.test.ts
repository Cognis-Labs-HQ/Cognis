import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { createCtx } from "@cognis/core";
import { createComponentTransport } from "../../components/transport.js";
import { createComponentService } from "../../components/service.js";
import { createComponentState } from "../../components/state.js";
import { createComponentFailures } from "../../components/failures.js";
import { createComponentRoutes } from "../../routes/components/index.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { readJson } from "../../reuse/read-json.js";

async function fixture(context: import("node:test").TestContext) {
    const directory = await mkdtemp(
        path.join(os.tmpdir(), "component-recovery-"),
    );
    context.after(() => rm(directory, { recursive: true, force: true }));
    const ctx = createCtx();
    const calls: Array<{
        path: string;
        method?: string;
        body?: Record<string, unknown>;
    }> = [];
    const rows = [
        {
            id: "language",
            uuid: "11111111-1111-4111-8111-111111111111",
            class: "extension",
            version: "1.0.0",
            status: "enabled",
            installedBranch: "main",
        },
        {
            id: "protected",
            uuid: "22222222-2222-4222-8222-222222222222",
            class: "extension",
            required: true,
            version: "1.0.0",
            status: "enabled",
        },
    ];
    let pending = true,
        failed = false;
    const transport = createComponentTransport(() => [
        async (request, response, url) => {
            const body =
                request.method === "POST" ? await readJson(request) : undefined;
            calls.push({ path: url.pathname, method: request.method, body });
            if (request.headers.authorization !== "Bearer administrator") {
                response.writeHead(403);
                response.end(JSON.stringify({ error: { code: "forbidden" } }));
                return true;
            }
            let data: unknown;
            if (url.pathname === "/api/v1/modules") data = rows;
            else if (url.pathname === "/api/v1/gateways")
                data = [
                    {
                        id: "storage",
                        required: true,
                        status: "active",
                        hasAdapters: true,
                    },
                ];
            else if (url.pathname.endsWith("/adapters"))
                data = [
                    {
                        id: "optional",
                        enabled: true,
                        required: false,
                        controls: {
                            enable: "/api/v1/gateways/storage/adapters/optional/enable",
                            disable:
                                "/api/v1/gateways/storage/adapters/optional/disable",
                        },
                    },
                ];
            else if (url.pathname === "/api/v1/modules/catalog")
                data = [
                    {
                        ...rows[0],
                        defaultBranch: "main",
                        branches: [{ name: "main" }, { name: "preview" }],
                        releases: [{ name: "v1" }],
                    },
                ];
            else if (url.pathname === "/api/v1/modules/install") {
                response.writeHead(202);
                response.end(
                    JSON.stringify({
                        data: {
                            jobId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                            status: "pending",
                        },
                    }),
                );
                return true;
            } else if (url.pathname.includes("/install/")) {
                if (failed) {
                    response.writeHead(422);
                    response.end(
                        JSON.stringify({
                            error: { code: "invalid_module_manifest" },
                        }),
                    );
                    return true;
                }
                data = pending
                    ? { status: "pending" }
                    : {
                          status: "succeeded",
                          data: {
                              id: "language",
                              version: "1.1.0",
                              restartRequired: true,
                          },
                      };
                pending = false;
            } else if (url.pathname.endsWith("/disable"))
                data = { enabled: false };
            else if (url.pathname.endsWith("/enable")) data = { enabled: true };
            else return false;
            response.writeHead(200);
            response.end(JSON.stringify({ data }));
            return true;
        },
    ]);
    const logs: unknown[] = [];
    const state = createComponentState(path.join(directory, "channels.json"));
    const service = createComponentService(ctx, transport, state, (...args) =>
        logs.push(args),
    );
    const request = Readable.from([]) as IncomingMessage;
    request.headers = { authorization: "Bearer administrator" };
    return {
        ctx,
        calls,
        rows,
        service,
        transport,
        state,
        request,
        logs,
        setFailed() {
            failed = true;
        },
        directory,
    };
}

test("component operations execute real flows, persist channels and poll upgrade jobs through pending completion", async (context) => {
    const host = await fixture(context);
    const target = { type: "module", id: "language" };
    assert.equal(
        ((await host.service.list(host.request)) as unknown[]).length,
        4,
    );
    assert.deepEqual(
        await host.service.releaseChannels(host.request, { target }),
        { data: ["main", "preview", "v1"] },
    );
    await host.service.releaseChannel(host.request, {
        target,
        channel: "preview",
    });
    assert.equal(
        await createComponentState(
            path.join(host.directory, "channels.json"),
        ).get(JSON.stringify(["module", "", "language"])),
        "preview",
    );
    const progress: Array<Record<string, unknown>> = [];
    const result = (await host.service.apply(
        host.request,
        {
            action: "upgrade",
            target,
        },
        { onProgress: (event) => progress.push(event) },
    )) as {
        results: Array<{
            status: string;
            data: { version: string; restartRequired: boolean };
        }>;
    };
    assert.equal(result.results[0].status, "succeeded");
    assert.equal(result.results[0].data.version, "1.1.0");
    assert.equal(result.results[0].data.restartRequired, true);
    assert.deepEqual(
        progress.map((event) => event.phase),
        [
            "preparing",
            "starting",
            "disabling",
            "installing",
            "waiting",
            "succeeded",
        ],
    );
    assert.equal(
        progress.find((event) => event.phase === "installing")?.channel,
        "preview",
    );
    assert.deepEqual(progress.at(-1)?.target, {
        type: "module",
        id: "language",
        gatewayId: undefined,
    });
    assert.equal(
        host.calls.find((call) => call.path === "/api/v1/modules/install")?.body
            ?.branch,
        "preview",
    );
    assert.equal(
        host.calls.filter((call) => call.path.includes("/install/")).length,
        2,
    );
    assert.ok(host.ctx.hasFlow("component:apply"));
    assert.ok(host.ctx.hasFlow("component:releaseChannel"));
    assert.deepEqual(await host.service.info(host.request, { target }), {
        ...host.rows[0],
        type: "module",
        managedBy: "marketplace",
        required: false,
        releaseChannel: "preview",
        independentlyUpgradeable: true,
    });
    await assert.rejects(
        host.service.releaseChannel(host.request, {
            target,
            channel: "absent",
        }),
        /invalid_component_channel/,
    );
});

test("bulk disable keeps required owners active and disables children before parents; upgrades report host-managed components", async (context) => {
    const host = await fixture(context);
    const result = (await host.service.apply(host.request, {
        action: "disable",
        all: true,
    })) as {
        results: Array<{
            target: { id: string };
            status: string;
            code?: string;
        }>;
    };
    assert.equal(
        result.results.find((entry) => entry.target.id === "protected")?.status,
        "skipped",
    );
    assert.equal(
        result.results.find((entry) => entry.target.id === "storage")?.status,
        "skipped",
    );
    const mutation = host.calls.filter((call) =>
        call.path.endsWith("/disable"),
    );
    assert.deepEqual(
        mutation.map((call) => call.path),
        [
            "/api/v1/gateways/storage/adapters/optional/disable",
            "/api/v1/modules/language/disable",
        ],
    );
    const upgrade = (await host.service.apply(host.request, {
        action: "upgrade",
        all: true,
        type: "adapter",
    })) as { results: Array<{ code?: string }> };
    assert.equal(upgrade.results[0].code, "component_managed_by_host");
    assert.ok(
        !host.calls.some(
            (call) => call.path === "/api/v1/modules/protected/disable",
        ),
    );
});

test("a failed installation restores an enabled module through normal validation", async (context) => {
    const host = await fixture(context);
    host.setFailed();
    const result = (await host.service.apply(host.request, {
        action: "upgrade",
        target: { type: "module", id: "language" },
    })) as { results: Array<{ status: string; code: string }> };
    assert.equal(result.results[0].status, "failed");
    assert.equal(result.results[0].code, "invalid_module_manifest");
    assert.equal(host.calls.at(-1)?.path, "/api/v1/modules/language/enable");
});

test("failure reports are deduplicated, version-bound, protected and require administrator authority to disable globally", async (context) => {
    const host = await fixture(context);
    let now = 0;
    const owner = {
        type: "module" as const,
        id: "language",
        version: "1.0.0",
        required: false,
        critical: false,
    };
    const providers = [
        { scriptUrl: "/static/modules/language/provider.js", component: owner },
    ];
    const report = createComponentFailures(
        host.ctx,
        host.service,
        () => providers,
        () => {},
        () => now,
    );
    const input = (id: string) => ({
        scriptUrl: providers[0].scriptUrl,
        phase: "mount",
        occurrenceId: `${id.padStart(8, "0")}-0000-4000-8000-000000000000`,
    });
    for (let count = 0; count < 4; count++)
        await report(host.request, input("1"), true);
    assert.equal(
        host.calls.filter((call) => call.path.endsWith("/disable")).length,
        0,
    );
    for (let count = 2; count < 6; count++)
        await report(host.request, input(String(count)), false);
    assert.equal(
        host.calls.filter((call) => call.path.endsWith("/disable")).length,
        0,
    );
    await report(host.request, input("2"), true);
    const final = (await report(host.request, input("3"), true)) as {
        disabled: boolean;
    };
    assert.equal(final.disabled, true);
    assert.equal(
        host.calls.filter((call) => call.path.endsWith("/disable")).length,
        1,
    );
    owner.version = "1.1.0";
    owner.critical = true;
    for (let count = 4; count < 8; count++)
        await report(host.request, input(String(count)), true);
    assert.equal(
        host.calls.filter((call) => call.path.endsWith("/disable")).length,
        1,
    );
    owner.critical = false;
    now = 400_000;
    const fresh = (await report(host.request, input("8"), true)) as {
        failures: number;
    };
    assert.equal(fresh.failures, 1);
    await assert.rejects(
        report(
            host.request,
            { ...input("9"), scriptUrl: "/arbitrary.js" },
            true,
        ),
        /component_provider_not_found/,
    );
});

test("management transport preserves authentication and rejects non-management destinations", async (context) => {
    const host = await fixture(context);
    await assert.rejects(
        host.transport(host.request, "https://other.invalid/"),
        /invalid_component_route/,
    );
    await assert.rejects(
        host.transport(host.request, "/api/v1/users"),
        /invalid_component_route/,
    );
    host.request.headers = {};
    await assert.rejects(host.service.list(host.request), /forbidden/);
});

test("a protected dependent prevents disabling its optional dependency", async (context) => {
    const host = await fixture(context);
    Object.assign(host.rows[1], { hardDependencies: [host.rows[0].uuid] });
    const result = (await host.service.apply(host.request, {
        action: "disable",
        target: { type: "module", id: "language" },
    })) as { results: Array<{ status: string; code: string }> };
    assert.equal(result.results[0].status, "failed");
    assert.equal(result.results[0].code, "component_required_dependency");
    assert.ok(!host.calls.some((call) => call.path.endsWith("/disable")));
});
