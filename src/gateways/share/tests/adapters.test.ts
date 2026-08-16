import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
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

test("share adapter manifests declare their parent gateway", async () => {
    const manifests = await Promise.all(
        ["link", "user"].map(async (adapterId) =>
            JSON.parse(
                await readFile(
                    `src/adapters/share/${adapterId}/manifest.json`,
                    "utf8",
                ),
            ),
        ),
    );

    assert.deepEqual(
        manifests.map((manifest: { gateway?: string }) => manifest.gateway),
        ["share", "share"],
    );
});

test("share gateway discovers Link and User method adapters", async () => {
    const gateway = createGateway();
    await gateway.discoverAdapters(path.resolve("src/adapters/share"));
    assert.deepEqual(
        gateway.listAdapters().map(({ id }) => id),
        ["link", "user"],
    );
    assert.deepEqual(
        gateway.listAdapters().map(({ delivery }) => delivery),
        ["public", "account"],
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
    assert.deepEqual(
        gateway.listAdapters().map(({ locked, publisher }) => ({
            locked,
            publisher,
        })),
        [
            { locked: false, publisher: "Cognis Labs HQ" },
            { locked: false, publisher: "Cognis Labs HQ" },
        ],
    );
});

test("share gateway tolerates an absent adapter directory", async () => {
    const gateway = createGateway();
    const temp = await mkdtemp(path.join(os.tmpdir(), "share-adapters-"));
    await gateway.discoverAdapters(path.join(temp, "missing"));
    assert.deepEqual(gateway.listAdapters(), []);
});

test("permission-only updates preserve existing account unlock grants", async () => {
    let updateInput: Record<string, unknown> | null = null;
    const existing = {
        id: "share-1",
        ownerAccountId: "alice",
        resourceType: "calendar",
        resourceId: "calendar-1",
        metadata: { adapterId: "user" },
        accessControls: { permissions: ["read"], recipients: [] },
        expiresAt: "",
    };
    const gateway = new CoreShareGateway(
        {
            getById: async () => existing,
            listByOwner: async () => [existing],
            updateById: async (input: Record<string, unknown>) => {
                updateInput = input;
                return null;
            },
        } as never,
        { ensureSchema: async () => {} } as never,
        { ensureSchema: async () => {} } as never,
    );

    await gateway.updateToken({
        shareId: "share-1",
        ownerAccountId: "alice",
        grantedCapabilities: ["calendar:read", "calendar:write"],
    });

    assert.ok(updateInput);
    assert.equal(Object.hasOwn(updateInput, "password"), false);
});
