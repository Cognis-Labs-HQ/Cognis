import assert from "node:assert/strict";
import test from "node:test";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";

const sequences = [
    {
        name: "block state",
        path: "/resource/block",
        methods: ["POST", "DELETE", "POST"],
    },
    {
        name: "avatar upload",
        path: "/resource/avatar",
        methods: ["PUT", "DELETE", "PUT"],
        binary: true,
    },
    {
        name: "primary email",
        paths: [
            "/emails/one/primary",
            "/emails/two/primary",
            "/emails/one/primary",
        ],
        methods: ["PUT", "PUT", "PUT"],
    },
];
for (const sequence of sequences) {
    test(`queued ${sequence.name} preserves intervening mutations and replays the user's final choice`, async (context) => {
        const delivered = [];
        const fixture = createOfflineClientFixture(async (path, options) => {
            delivered.push({ path, method: options.method });
            return Response.json({ data: {} });
        });
        context.after(() => fixture.controller.abort());
        const { registerOfflineHttpClient } =
            fixture.imports["/static/reuse/offline-http-client.js"];
        const request = registerOfflineHttpClient(fixture.ctx, {
            owner: "test.mutations",
            request: fixture.imports["/static/reuse/api-client.js"].apiFetch,
            describe: (_path, method) => ({
                write: true,
                binary: Boolean(sequence.binary && method === "PUT"),
            }),
        });
        fixture.disconnect();
        const operations = sequence.methods.map((method, index) => ({
            path: sequence.paths?.[index] ?? sequence.path,
            method,
        }));
        for (const { path, method } of operations) {
            const body =
                sequence.binary && method === "PUT"
                    ? Uint8Array.of(1, 2, 3)
                    : undefined;
            assert.equal((await request(path, { method, body })).status, 202);
        }
        assert.equal(
            (await fixture.outbox.pending("test.mutations")).length,
            3,
        );
        const final = operations.at(-1);
        await request(final.path, {
            method: final.method,
            body: sequence.binary ? Uint8Array.of(1, 2, 3) : undefined,
        });
        assert.equal(
            (await fixture.outbox.pending("test.mutations")).length,
            3,
        );
        const original = fixture.ctx.capabilities.get("session:isOfflineValid");
        fixture.ctx.capabilities.remove("session:isOfflineValid", original);
        await assert.rejects(
            request(final.path, { method: final.method }),
            /offline_delivery_unavailable/,
        );
        fixture.ctx.capabilities.contribute("session:isOfflineValid", original);
        fixture.reconnect();
        assert.equal((await fixture.outbox.flush()).sent, 3);
        assert.deepEqual(delivered, operations);
    });
}
