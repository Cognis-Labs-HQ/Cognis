import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
    createCtx,
    type ModuleManifest,
    type ModuleRuntimeGateway,
} from "@cognis/core";
import { createModuleExtensionRoutes } from "../../reuse/module-extension-routes.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";

async function createFixture(context: test.TestContext) {
    const modulesRoot = await mkdtemp(
        path.join(tmpdir(), "cognis-capability-refresh-"),
    );
    const previousRoot = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = modulesRoot;
    context.after(async () => {
        if (previousRoot === undefined)
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        else process.env.COGNIS_EXTERNAL_MODULES_ROOT = previousRoot;
        await rm(modulesRoot, { recursive: true, force: true });
    });
    const systemCtx = createCtx();
    // Production route capabilities and public system capabilities use separate stores.
    const routeCapabilities = new Map<string, unknown>([
        ["system:ctx", systemCtx],
    ]);
    const manifests: ModuleManifest[] = [];
    const enabled = new Set<string>();
    const runtime: ModuleRuntimeGateway = {
        async listManifests() {
            return manifests;
        },
        async installFromZip() {
            throw new Error("unused");
        },
        async enable(moduleId) {
            return { moduleId, enabled: true };
        },
        async disable(moduleId) {
            return { moduleId, enabled: false };
        },
    };
    const failures: string[] = [];
    const extensions = createModuleExtensionRoutes(
        runtime,
        (moduleId) => enabled.has(moduleId),
        undefined,
        {
            routeContext: createDefaultRouteContext({
                getCapability: <T>(key: string) =>
                    routeCapabilities.get(key) as T | undefined,
                flow: systemCtx.flow,
            }),
            onBootstrapFailed(moduleId) {
                failures.push(moduleId);
            },
        },
    );
    async function addModule(
        id: string,
        source: string,
        privileged = false,
        disabledApi = false,
    ) {
        const uuid = randomUUID();
        const moduleRoot = path.join(modulesRoot, uuid);
        await mkdir(moduleRoot);
        await writeFile(path.join(moduleRoot, "bootstrap.mjs"), source);
        const manifest: ModuleManifest = {
            id,
            uuid,
            name: id,
            version: "2.3.146",
            class: "extension",
            coreApiVersion: "0.3.107",
            capabilities: [],
            privileged,
            entrypoints: {
                bootstrap: "./bootstrap.mjs",
                ...(disabledApi ? { disabledApi: "./bootstrap.mjs" } : {}),
            },
            files: [
                {
                    path: "bootstrap.mjs",
                    sha256: createHash("sha256").update(source).digest("hex"),
                },
            ],
        };
        const rawManifest = JSON.stringify(manifest);
        await writeFile(path.join(moduleRoot, "manifest.json"), rawManifest);
        await writeFile(
            path.join(moduleRoot, ".cognis-install.json"),
            JSON.stringify({
                cloneUrl: `https://github.com/Cognis-Labs-HQ/${id}.git`,
                manifestSha256: createHash("sha256")
                    .update(rawManifest)
                    .digest("hex"),
            }),
        );
        manifests.push(manifest);
        enabled.add(id);
    }
    async function request(
        route = "/api/v1/modules/jitsi-meet/whiteboard/availability",
    ): Promise<unknown> {
        let body = "";
        const response = {
            writeHead() {},
            end(value: string) {
                body = value;
            },
        } as unknown as ServerResponse;
        assert.equal(
            await extensions.handle(
                { method: "GET" } as IncomingMessage,
                response,
                new URL(route, "http://localhost"),
            ),
            true,
        );
        return JSON.parse(body);
    }
    return {
        systemCtx,
        routeCapabilities,
        enabled,
        failures,
        extensions,
        addModule,
        request,
    };
}

const providerSource = `export async function bootstrapModule(ctx) {
  await ctx.getCapability('host:bootstrapGate')?.();
  ctx.contributePublicCapability('whiteboard:fetchBoardData', (id) => ({ id, title: 'Planning', creatorId: 'admin' }));
  ctx.contributeCapability('whiteboard:internal', 'private');
}`;
const consumerSource = `export function bootstrapModule(ctx) {
  ctx.registerApiGet('/api/v1/modules/jitsi-meet/whiteboard/availability', async (_req, res) => {
    const fetchBoard = ctx.getCapability('whiteboard:fetchBoardData');
    const assurance = await ctx.getModuleAssurance('nextcloud-whiteboard');
    res.writeHead(200);
    res.end(JSON.stringify({
      available: typeof fetchBoard === 'function',
      has: ctx.capabilities.has('whiteboard:fetchBoardData'),
      get: ctx.capabilities.get('whiteboard:fetchBoardData') === fetchBoard,
      required: fetchBoard ? ctx.capabilities.require('whiteboard:fetchBoardData') === fetchBoard : null,
      board: fetchBoard ? fetchBoard('planning') : null,
      privateVisible: ctx.getCapability('whiteboard:internal') !== undefined || ctx.capabilities.has('whiteboard:internal'),
      systemVisible: ctx.getCapability('system:ctx') !== undefined || ctx.capabilities.has('system:ctx'),
      assurance,
    }));
  });
}`;

test("module consumers resolve live public provider capabilities across refresh and disable", async (context) => {
    const fixture = await createFixture(context);
    // Load the consumer first to exercise request-time discovery independently of bootstrap order.
    await fixture.addModule("jitsi-meet", consumerSource);
    await fixture.addModule("nextcloud-whiteboard", providerSource, true);
    await fixture.extensions.refresh({ throwOnFailure: true });
    assert.equal(
        fixture.routeCapabilities.has("whiteboard:fetchBoardData"),
        false,
    );
    const firstCapability = fixture.systemCtx.getCapability(
        "whiteboard:fetchBoardData",
    );
    const first = (await fixture.request()) as Record<string, unknown>;
    assert.deepEqual(first, {
        available: true,
        has: true,
        get: true,
        required: true,
        board: { id: "planning", title: "Planning", creatorId: "admin" },
        privateVisible: false,
        systemVisible: false,
        assurance: {
            requested: true,
            trustedSource: true,
            sourceRepository:
                "https://github.com/Cognis-Labs-HQ/nextcloud-whiteboard.git",
            moduleId: "nextcloud-whiteboard",
            moduleUuid: (first.assurance as { moduleUuid: string }).moduleUuid,
            version: "2.3.146",
            integrity: "verified",
        },
    });
    await fixture.extensions.refresh({ throwOnFailure: true });
    assert.notEqual(
        fixture.systemCtx.getCapability("whiteboard:fetchBoardData"),
        firstCapability,
    );
    assert.deepEqual(await fixture.request(), first);
    fixture.enabled.delete("nextcloud-whiteboard");
    await fixture.extensions.refresh({ throwOnFailure: true });
    const disabled = (await fixture.request()) as Record<string, unknown>;
    assert.equal(disabled.available, false);
    assert.equal(disabled.has, false);
    fixture.enabled.add("nextcloud-whiteboard");
    await fixture.extensions.refresh({ throwOnFailure: true });
    assert.deepEqual(await fixture.request(), first);
    assert.deepEqual(fixture.failures, []);
});

test("overlapping refreshes complete without conflicting provider registrations", async (context) => {
    const fixture = await createFixture(context);
    await fixture.addModule("nextcloud-whiteboard", providerSource, true);
    let releaseBootstrap!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
        markStarted = resolve;
    });
    const gate = new Promise<void>((resolve) => {
        releaseBootstrap = resolve;
    });
    fixture.routeCapabilities.set("host:bootstrapGate", () => {
        markStarted();
        return gate;
    });
    const firstRefresh = fixture.extensions.refresh({ throwOnFailure: true });
    await started;
    const secondRefresh = fixture.extensions.refresh({ throwOnFailure: true });
    releaseBootstrap();
    await Promise.all([firstRefresh, secondRefresh]);
    assert.equal(
        fixture.systemCtx.isPublicCapability("whiteboard:fetchBoardData"),
        true,
    );
    assert.equal(
        typeof fixture.systemCtx.getCapability("whiteboard:fetchBoardData"),
        "function",
    );
    assert.deepEqual(fixture.failures, []);
});

test("a rejected refresh does not prevent subsequent refreshes", async (context) => {
    const fixture = await createFixture(context);
    await fixture.addModule(
        "broken-module",
        `export function bootstrapModule(ctx) {
    ctx.contributePublicCapability('broken-module:partial', true);
    throw new Error('bootstrap failed');
  }`,
    );
    await assert.rejects(
        fixture.extensions.refresh({ throwOnFailure: true }),
        /bootstrap failed/,
    );
    fixture.enabled.delete("broken-module");
    await fixture.addModule("nextcloud-whiteboard", providerSource, true);
    await fixture.extensions.refresh({ throwOnFailure: true });
    assert.equal(
        typeof fixture.systemCtx.getCapability("whiteboard:fetchBoardData"),
        "function",
    );
    assert.deepEqual(fixture.failures, ["broken-module"]);
});

test("module resource disposers run on disable and failed bootstrap", async (context) => {
    const fixture = await createFixture(context);
    let releases = 0;
    fixture.routeCapabilities.set("host:cleanup", () => {
        releases += 1;
    });
    await fixture.addModule(
        "resource-module",
        `export function bootstrapModule(ctx) { ctx.registerDisposer(() => ctx.getCapability('host:cleanup')()); }`,
    );
    await fixture.extensions.refresh();
    fixture.enabled.delete("resource-module");
    await fixture.extensions.refresh();
    assert.equal(releases, 1);
    fixture.enabled.add("resource-module");
    await fixture.extensions.refresh();
    fixture.enabled.delete("resource-module");
    await fixture.extensions.refresh();
    assert.equal(releases, 2);
    await fixture.addModule(
        "failed-resource",
        `export function bootstrapModule(ctx) { ctx.registerDisposer(() => ctx.getCapability('host:cleanup')()); throw new Error('bootstrap_failed'); }`,
    );
    await fixture.extensions.refresh();
    assert.equal(releases, 3);
    assert.ok(fixture.failures.includes("failed-resource"));
});

test("failed disabled configuration bootstrap removes partial routes and resources", async (context) => {
    const fixture = await createFixture(context);
    let releases = 0;
    fixture.routeCapabilities.set("host:cleanup", () => {
        releases += 1;
    });
    await fixture.addModule(
        "disabled-resource",
        `export function registerDisabledApiRoutes(ctx) {
        ctx.registerApiGet('/api/v1/modules/disabled-resource/config', (_req, res) => { res.end('{}'); }, { allowWhenDisabled: true });
        ctx.registerDisposer(() => ctx.getCapability('host:cleanup')());
        throw new Error('config_failed');
    }`,
        false,
        true,
    );
    fixture.enabled.delete("disabled-resource");
    await fixture.extensions.refresh();
    assert.equal(releases, 1);
    const handled = await fixture.extensions.handle(
        { method: "GET" } as IncomingMessage,
        { end() {}, writeHead() {} } as unknown as ServerResponse,
        new URL("http://localhost/api/v1/modules/disabled-resource/config"),
    );
    assert.equal(handled, false);
});

test("failed activation reconciles unrelated routes and their flows before rejecting", async (context) => {
    const fixture = await createFixture(context);
    await fixture.addModule(
        "broken-study",
        `export function bootstrapModule() { throw new Error('content_pack_version_conflict'); }`,
    );
    await fixture.addModule(
        "jitsi-meet",
        `export function bootstrapModule(ctx) {
        ctx.registerFlow({ id: 'jitsi-meet:consentStatus', stages: ['read'] });
        ctx.registerApiGet('/api/v1/modules/jitsi-meet/whiteboard/availability', async (_req, res) => {
            const result = await ctx.flow.run('jitsi-meet:consentStatus', {}, { implementations: { read: () => ({ accepted: true }) } });
            res.end(JSON.stringify(result));
        });
    }`,
    );
    await assert.rejects(
        fixture.extensions.refresh({ throwOnFailure: true }),
        /content_pack_version_conflict/,
    );
    await fixture.request();
    await assert.rejects(
        fixture.extensions.refresh({ throwOnFailure: true }),
        /content_pack_version_conflict/,
    );
    await fixture.request();
    assert.deepEqual(fixture.failures, ["broken-study", "broken-study"]);
});

test("module-owned speech publication works without privilege across provider lifecycle", async (context) => {
    const fixture = await createFixture(context);
    await fixture.addModule(
        "jitsi-meet",
        `export function bootstrapModule(ctx) {
        ctx.registerApiGet('/api/v1/modules/jitsi-meet/whiteboard/availability', (_req, res) => {
            const speech = ctx.getCapability('elevenlabs-tts:synthesis');
            res.end(JSON.stringify({ available: Boolean(speech), revision: speech?.revision }));
        });
    }`,
    );
    await fixture.addModule(
        "elevenlabs-tts",
        `export function bootstrapModule(ctx) {
        ctx.contributePublicCapability('elevenlabs-tts:synthesis', { revision: 'one', synthesize: () => 'audio' });
    }`,
    );
    await fixture.extensions.refresh({ throwOnFailure: true });
    assert.deepEqual(await fixture.request(), {
        available: true,
        revision: "one",
    });
    fixture.enabled.delete("elevenlabs-tts");
    await fixture.extensions.refresh({ throwOnFailure: true });
    assert.deepEqual(await fixture.request(), { available: false });
    fixture.enabled.add("elevenlabs-tts");
    await fixture.extensions.refresh({ throwOnFailure: true });
    assert.deepEqual(await fixture.request(), {
        available: true,
        revision: "one",
    });
    assert.deepEqual(fixture.failures, []);
});

test("disabled configuration flows execute and survive enable-disable reconciliation", async (context) => {
    const fixture = await createFixture(context);
    await fixture.addModule(
        "config-provider",
        `
        function registerConfiguration(ctx) {
            ctx.registerFlow({ id: 'config-provider:readConfiguration', stages: ['read'] });
            ctx.flow.extend('config-provider:readConfiguration', 'read', { id: 'config-provider:readConfiguration:read' }, ({ data }) => {
                data.result = { configured: false };
            });
            ctx.registerApiGet('/api/v1/modules/config-provider/config', async (_req, res) => {
                const result = await ctx.flow.run('config-provider:readConfiguration', {});
                res.end(JSON.stringify(result.data.result));
            }, { allowWhenDisabled: true });
        }
        export function registerDisabledApiRoutes(ctx) { registerConfiguration(ctx); }
        export function bootstrapModule(ctx) {
            registerConfiguration(ctx);
            ctx.registerFlow({ id: 'config-provider:synthesize', stages: ['execute'] });
            ctx.contributePublicCapability('config-provider:synthesis', {});
        }
    `,
        false,
        true,
    );
    fixture.enabled.delete("config-provider");
    for (const enabled of [false, true, false, true, false]) {
        if (enabled) fixture.enabled.add("config-provider");
        else fixture.enabled.delete("config-provider");
        await fixture.extensions.refresh({ throwOnFailure: true });
        assert.deepEqual(
            await fixture.request("/api/v1/modules/config-provider/config"),
            { configured: false },
        );
        assert.equal(
            fixture.systemCtx.flow.exists("config-provider:readConfiguration"),
            true,
        );
        assert.equal(
            fixture.systemCtx.flow.exists("config-provider:synthesize"),
            enabled,
        );
        assert.equal(
            fixture.systemCtx.hasCapability("config-provider:synthesis"),
            enabled,
        );
    }
    assert.deepEqual(fixture.failures, []);
});

test("disabled entrypoints cannot register foreign flows even with privilege", async (context) => {
    const fixture = await createFixture(context);
    await fixture.addModule(
        "config-provider",
        `export function bootstrapModule() {}
        export function registerDisabledApiRoutes(ctx) {
            ctx.registerFlow({ id: 'host:configuration', stages: ['read'] });
        }`,
        true,
        true,
    );
    fixture.enabled.delete("config-provider");
    await assert.rejects(
        fixture.extensions.refresh({ throwOnFailure: true }),
        /module_privileged_access_required/,
    );
    assert.equal(fixture.systemCtx.flow.exists("host:configuration"), false);
    assert.deepEqual(fixture.failures, []);
});

test("disabled entrypoints cannot hook existing flows and failed setup rolls back owned flows", async (context) => {
    const fixture = await createFixture(context);
    fixture.systemCtx.registerFlow({
        id: "host:configuration",
        stages: ["read"],
    });
    await fixture.addModule(
        "config-provider",
        `export function bootstrapModule() {}
        export function registerDisabledApiRoutes(ctx) {
            ctx.registerFlow({ id: 'config-provider:readConfiguration', stages: ['read'] });
            ctx.flow.extend('host:configuration', 'read', { id: 'unexpected' }, () => {});
        }`,
        true,
        true,
    );
    fixture.enabled.delete("config-provider");
    await assert.rejects(
        fixture.extensions.refresh({ throwOnFailure: true }),
        /module_disabled_flow_not_owned/,
    );
    assert.equal(fixture.systemCtx.flow.exists("host:configuration"), true);
    assert.equal(
        fixture.systemCtx.flow.exists("config-provider:readConfiguration"),
        false,
    );
    assert.deepEqual(fixture.failures, []);
});

const consentSource = `export function bootstrapModule(ctx) {
    ctx.registerFlow({ id: 'terms-of-service:consentStatus', stages: ['read'] });
    ctx.flow.extend('terms-of-service:consentStatus', 'read', { id: 'terms-of-service:read' }, ({ data }) => { data.result = { accepted: true }; });
    ctx.registerApiGet('/api/v1/modules/terms-of-service/consent', async (_req, res) => {
        await ctx.getCapability('host:requestGate')?.();
        const result = await ctx.flow.run('terms-of-service:consentStatus', {});
        res.end(JSON.stringify(result.data.result));
    });
}`;

test("consent requests wait for failed module reconciliation to finish", async (context) => {
    const fixture = await createFixture(context);
    let releaseBootstrap!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
        markStarted = resolve;
    });
    const gate = new Promise<void>((resolve) => {
        releaseBootstrap = resolve;
    });
    await fixture.addModule(
        "broken-study",
        `export async function bootstrapModule(ctx) {
        const wait = ctx.getCapability('host:bootstrapGate');
        if (!wait) return;
        await wait();
        throw new Error('content_pack_failed');
    }`,
    );
    await fixture.addModule("terms-of-service", consentSource);
    await fixture.extensions.refresh({ throwOnFailure: true });
    fixture.routeCapabilities.set("host:bootstrapGate", () => {
        markStarted();
        return gate;
    });
    const refresh = fixture.extensions.refresh({ throwOnFailure: true });
    const failed = assert.rejects(refresh, /content_pack_failed/);
    await started;
    const request = fixture.request("/api/v1/modules/terms-of-service/consent");
    const result = request.then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
    );
    releaseBootstrap();
    await failed;
    assert.deepEqual(await result, { value: { accepted: true } });
});

test("module reconciliation waits for consent requests already using its flows", async (context) => {
    const fixture = await createFixture(context);
    await fixture.addModule("terms-of-service", consentSource);
    await fixture.extensions.refresh({ throwOnFailure: true });
    let releaseRequest!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
        markStarted = resolve;
    });
    const gate = new Promise<void>((resolve) => {
        releaseRequest = resolve;
    });
    fixture.routeCapabilities.set("host:requestGate", () => {
        markStarted();
        return gate;
    });
    const request = fixture.request("/api/v1/modules/terms-of-service/consent");
    const result = request.then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
    );
    await started;
    const refresh = fixture.extensions.refresh({ throwOnFailure: true });
    let refreshed = false;
    void refresh.then(() => {
        refreshed = true;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    const flowRetained = fixture.systemCtx.flow.exists(
        "terms-of-service:consentStatus",
    );
    releaseRequest();
    assert.deepEqual(await result, { value: { accepted: true } });
    assert.equal(flowRetained, true);
    await refresh;
    assert.equal(refreshed, true);
});
