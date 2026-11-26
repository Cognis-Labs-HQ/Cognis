import {
    CapabilityStore,
    createCtx,
    runBootstrapScope,
    type CapabilityContracts,
} from "@cognis/core";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CoreSocialGateway } from "../gateway.js";

function createBaseCtx(gateway: CoreSocialGateway) {
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", createCtx());
    return {
        gateway,
        capabilities,
        gatewayRegistry: {
            get: () => undefined,
        },
        registerRoute: () => {},
        registerNavbarPlugin: () => {},
        registerStaticDir: () => {},
        isGatewayEnabled: () => true,
    } as never;
}

test("social gateway discovers adapters before bootstrap lifecycle wiring", async (t) => {
    const root = await mkdtemp(path.join(tmpdir(), "cognis-social-adapters-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const adapterDir = path.join(root, "messages");
    await mkdir(adapterDir);
    await writeFile(
        path.join(adapterDir, "manifest.json"),
        JSON.stringify({
            publisher: "Cognis Labs HQ",
            requires: ["social:profile"],
        }),
    );
    await writeFile(
        path.join(adapterDir, "package.json"),
        JSON.stringify({ main: "index.mjs", type: "module" }),
    );
    await copyFile(
        new URL("./fixtures/lifecycle-adapter/index.mjs", import.meta.url),
        path.join(adapterDir, "index.mjs"),
    );

    const gateway = new CoreSocialGateway();
    await gateway.discoverAdapters(root);

    assert.deepEqual(gateway.listAdapters(), [
        {
            id: "messages",
            name: "Messages",
            active: true,
            publisher: "Cognis Labs HQ",
            requires: ["social:profile"],
        },
    ]);

    const context = createBaseCtx(gateway) as unknown as {
        capabilities: CapabilityStore;
    };
    const systemCtx =
        context.capabilities.require<ReturnType<typeof createCtx>>(
            "system:ctx",
        );
    await runBootstrapScope(systemCtx, "gateway:social", () =>
        gateway.bootstrapAdapters(root, context as never),
    );
    const contracts =
        context.capabilities.require<CapabilityContracts>("system:contracts");
    assert.equal(
        contracts.describe("social:fixtureReady")?.owner,
        "adapter:social:messages",
    );
    assert.equal(
        contracts.resolve<() => boolean>("social:fixtureReady", 1)(),
        true,
    );
});

test("social adapter enablement persists through the config store", async () => {
    const saved = new Map<string, Record<string, unknown>>();
    const gateway = new CoreSocialGateway({
        async getConfig(adapterId) {
            return saved.get(adapterId) ?? null;
        },
        async saveConfig(adapterId, config) {
            saved.set(adapterId, config);
        },
    });
    gateway.registerAdapter({ adapterId: "profile", adapterName: "Profile" });

    await gateway.disableAdapter("profile");
    assert.equal(gateway.listAdapters()[0].active, false);
    assert.deepEqual(saved.get("profile"), { enabled: false });

    await gateway.enableAdapter("profile");
    assert.equal(gateway.listAdapters()[0].active, true);
    assert.deepEqual(saved.get("profile"), { enabled: true });
});
