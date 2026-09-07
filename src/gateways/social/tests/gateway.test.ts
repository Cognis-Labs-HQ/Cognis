import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CoreSocialGateway } from "../gateway.js";

function createBaseCtx(gateway: CoreSocialGateway) {
    return {
        gateway,
        capabilities: {
            get: () => undefined,
            contribute: () => {},
        },
        gatewayRegistry: {
            get: () => undefined,
        },
        registerRoute: () => {},
        registerNavbarPlugin: () => {},
        registerStaticDir: () => {},
        isGatewayEnabled: () => true,
    } as never;
}

test("social gateway discovers adapters before bootstrap lifecycle wiring", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cognis-social-adapters-"));
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
    await writeFile(
        path.join(adapterDir, "index.mjs"),
        `export function createSocialAdapter() {
            return {
                adapterId: 'messages',
                adapterName: 'Messages',
            };
        }
        export function bootstrapSocialAdapter(ctx) {
            ctx.registerRoute(async () => false, 'social');
        }
        `,
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

    await gateway.bootstrapAdapters(root, createBaseCtx(gateway));
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
