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
    async function addModule(id: string, source: string, privileged = false) {
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
            entrypoints: { bootstrap: "./bootstrap.mjs" },
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
    async function request(): Promise<unknown> {
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
                new URL(
                    "http://localhost/api/v1/modules/jitsi-meet/whiteboard/availability",
                ),
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
