import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { CoreShareGateway } from "../gateway/index.js";

function createGateway(): CoreShareGateway {
    return new CoreShareGateway(
        { ensureSchema: async () => {} } as never,
        { ensureSchema: async () => {} } as never,
        { ensureSchema: async () => {} } as never,
    );
}

test("share gateway discovers Link and User method adapters", async () => {
    const gateway = createGateway();
    await gateway.discoverAdapters(path.resolve("src/adapters/share"));
    assert.deepEqual(
        gateway.listAdapters().map(({ id }) => id),
        ["link", "user"],
    );
    assert.deepEqual(gateway.prepareAdapterShare("link", {}), {
        accessControls: { recipients: [] },
    });
    assert.deepEqual(
        gateway.prepareAdapterShare("user", {
            recipients: [{ type: "user", id: "bob" }],
        }),
        {
            accessControls: {
                recipients: [{ type: "user", id: "bob" }],
            },
        },
    );
    assert.deepEqual(
        gateway.listAdapters().map(({ pageModuleUrl }) => pageModuleUrl),
        [
            "/static/adapters/share/link/page.js",
            "/static/adapters/share/user/page.js",
        ],
    );
});

test("share gateway tolerates an absent adapter directory", async () => {
    const gateway = createGateway();
    const temp = await mkdtemp(path.join(os.tmpdir(), "share-adapters-"));
    await gateway.discoverAdapters(path.join(temp, "missing"));
    assert.deepEqual(gateway.listAdapters(), []);
});
