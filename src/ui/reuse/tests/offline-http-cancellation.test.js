import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";

function client(context, options = {}) {
    const delivered = [];
    const fixture = createOfflineClientFixture(async (path, input) => {
        delivered.push({ path, method: input.method });
        return options.send
            ? options.send()
            : Response.json({ data: { deleted: true } });
    }, options);
    context.after(() => fixture.controller.abort());
    const { registerOfflineHttpClient } =
        fixture.imports["/static/reuse/offline-http-client.js"];
    const request = registerOfflineHttpClient(fixture.ctx, {
        owner: "test.cancellation",
        describe: () => ({ write: true }),
        request: fixture.imports["/static/reuse/api-client.js"].apiFetch,
    });
    return { ...fixture, request, delivered };
}

for (const offline of [false, true]) {
    for (const boundary of [
        "before",
        "first-pending",
        "delivery-pending",
        ...(offline ? ["submit-lock"] : []),
    ]) {
        test(`abort at ${boundary} prevents ${offline ? "durable queue" : "online"} submission`, async (context) => {
            const entered = Promise.withResolvers();
            const release = Promise.withResolvers();
            let locks = 0;
            const fixture = client(context, {
                withLock: async (operation) => {
                    locks++;
                    if (boundary === "submit-lock" && locks === 3) {
                        entered.resolve();
                        await release.promise;
                    }
                    return operation();
                },
            });
            if (offline) fixture.disconnect();
            if (boundary === "before")
                fixture.ctx.extendFlow(
                    "test:cancellation:request",
                    "before",
                    { id: "hold" },
                    async () => {
                        entered.resolve();
                        await release.promise;
                    },
                );
            if (boundary.endsWith("pending")) {
                const original = fixture.outbox.pending;
                let reads = 0;
                fixture.outbox.pending = async (...args) => {
                    reads++;
                    if (reads === (boundary === "first-pending" ? 1 : 2)) {
                        entered.resolve();
                        await release.promise;
                    }
                    return original(...args);
                };
            }
            const controller = new AbortController();
            const pending = fixture.request("/posts/one", {
                method: "DELETE",
                signal: controller.signal,
            });
            const rejected = assert.rejects(pending, { name: "AbortError" });
            await entered.promise;
            controller.abort();
            release.resolve();
            await rejected;
            assert.equal(fixture.delivered.length, 0);
            assert.equal(
                (await fixture.outbox.pending("test.cancellation")).length,
                0,
            );
            assert.equal(fixture.values.has("cognis_offline_outbox"), false);
        });
    }
}

for (const offline of [false, true]) {
    for (const supplied of [false, true]) {
        test(`${offline ? "queue" : "online"} success preserves ${supplied ? "active signal" : "no-signal"} behavior`, async (context) => {
            const fixture = client(context);
            if (offline) fixture.disconnect();
            const controller = new AbortController();
            const response = await fixture.request("/posts/one", {
                method: "DELETE",
                ...(supplied ? { signal: controller.signal } : {}),
            });
            assert.equal(response.status, offline ? 202 : 200);
            controller.abort();
            assert.equal(fixture.delivered.length, offline ? 0 : 1);
            assert.equal(
                (await fixture.outbox.pending("test.cancellation")).length,
                offline ? 1 : 0,
            );
            if (offline) {
                fixture.reconnect();
                assert.equal((await fixture.outbox.flush()).sent, 1);
                assert.equal(fixture.delivered.length, 1);
            }
        });
    }
}

test("abort after transport starts does not enqueue an uncertain failed write", async (context) => {
    const entered = Promise.withResolvers();
    const release = Promise.withResolvers();
    const fixture = client(context, {
        send: async () => {
            entered.resolve();
            await release.promise;
            throw new TypeError("connection_lost");
        },
    });
    const controller = new AbortController();
    const pending = fixture.request("/posts/one", {
        method: "DELETE",
        signal: controller.signal,
    });
    const rejected = assert.rejects(pending, { name: "AbortError" });
    await entered.promise;
    controller.abort();
    fixture.disconnect();
    release.resolve();
    await rejected;
    assert.equal(
        fixture.delivered.length,
        1,
        "the write was already attempted; abort is not proof it was unsent",
    );
    assert.equal((await fixture.outbox.pending("test.cancellation")).length, 0);
});

for (const boundary of ["flush", "post-flush-pending"]) {
    test(`abort during ${boundary} retains prior delivery and prevents a new write`, async (context) => {
        const fixture = client(context);
        fixture.disconnect();
        await fixture.request("/posts/previous", { method: "DELETE" });
        fixture.reconnect();
        const entered = Promise.withResolvers();
        const release = Promise.withResolvers();
        const originalFlush = fixture.outbox.flush;
        fixture.outbox.flush = async () => {
            const result = await originalFlush();
            if (boundary === "flush") {
                entered.resolve();
                await release.promise;
            }
            return result;
        };
        const originalPending = fixture.outbox.pending;
        let reads = 0;
        fixture.outbox.pending = async (...args) => {
            const result = await originalPending(...args);
            if (++reads === 2 && boundary === "post-flush-pending") {
                entered.resolve();
                await release.promise;
            }
            return result;
        };
        const { deliverOrQueue } = loadTestModule(
            new URL("../offline-delivery.js", import.meta.url),
            {
                "./offline-identity.js":
                    fixture.imports["/static/reuse/offline-identity.js"],
                "./offline-state.js": {
                    isOffline: () => false,
                    offlineEnabled: () => false,
                },
            },
            fixture.globals,
        );
        const controller = new AbortController();
        const pending = deliverOrQueue(
            fixture.ctx,
            "test.cancellation",
            "next",
            { path: "/posts/next", method: "DELETE" },
            () => {
                throw new Error("unexpected_new_transport");
            },
            { signal: controller.signal },
        );
        const rejected = assert.rejects(pending, { name: "AbortError" });
        await entered.promise;
        controller.abort();
        release.resolve();
        await rejected;
        assert.deepEqual(fixture.delivered, [
            { path: "/posts/previous", method: "DELETE" },
        ]);
        assert.equal(
            (await fixture.outbox.pending("test.cancellation")).length,
            0,
        );
    });
}
