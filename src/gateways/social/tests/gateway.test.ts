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

test("social gateway lists manifest-discovered adapters even without bootstrap export", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cognis-social-adapters-"));
    const adapterDir = path.join(root, "messages");
    await mkdir(adapterDir);
    await writeFile(
        path.join(adapterDir, "manifest.json"),
        JSON.stringify({
            name: "Messages Adapter",
            gateway: "social",
            requires: ["social:profile"],
        }),
    );
    await writeFile(
        path.join(adapterDir, "package.json"),
        JSON.stringify({ main: "index.mjs", type: "module" }),
    );
    await writeFile(
        path.join(adapterDir, "index.mjs"),
        "export const noop = true;\n",
    );

    const gateway = new CoreSocialGateway();
    await gateway.bootstrapAdapters(root, createBaseCtx(gateway));

    assert.deepEqual(gateway.listAdapters(), [
        {
            id: "messages",
            name: "Messages Adapter",
            active: false,
            requires: ["social:profile"],
        },
    ]);
});
