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

function registerReadClient(context, fixture, options = {}) {
    context.after(() => fixture.controller.abort());
    const { registerOfflineHttpClient } =
        fixture.imports["/static/reuse/offline-http-client.js"];
    return registerOfflineHttpClient(fixture.ctx, {
        owner: "test.reads",
        request: fixture.imports["/static/reuse/api-client.js"].apiFetch,
        describe: () => ({ read: true }),
        ...options,
    });
}

test("GET responses distinguish live, cached and disconnect fallback payloads", async (context) => {
    let fail = false;
    let disconnectAfterSuccess = false;
    let requests = 0;
    const fixture = createOfflineClientFixture(async () => {
        requests++;
        if (fail) {
            fixture.disconnect();
            throw new TypeError("Failed to fetch");
        }
        if (disconnectAfterSuccess) fixture.disconnect();
        return Response.json({ data: { value: requests } });
    });
    const request = registerReadClient(context, fixture, {
        project: (_path, payload) => ({ ...payload, projected: true }),
    });
    const stages = [];
    for (const stage of ["before", "after"])
        fixture.ctx.extendFlow(
            "test:reads:request",
            stage,
            { id: `observe:${stage}` },
            ({ input }) => {
                stages.push(`${stage}:${input.path}`);
            },
        );
    const live = await request("/resource");
    assert.equal(live.status, 200);
    assert.equal(live.statusText, "");
    assert.deepEqual(Object.fromEntries(live.headers), {
        "content-type": "application/json",
        "x-cognis-read-source": "live",
    });
    const expected = { data: { value: 1 }, projected: true };
    assert.deepEqual(await live.json(), expected);
    fixture.disconnect();
    const cached = await request("/resource");
    assert.equal(cached.status, 200);
    assert.equal(cached.headers.get("content-type"), "application/json");
    assert.equal(cached.headers.get("x-cognis-read-source"), "cached");
    assert.deepEqual(await cached.json(), expected);
    assert.equal(requests, 1);
    fixture.reconnect();
    fail = true;
    const fallback = await request("/resource");
    assert.equal(fallback.status, 200);
    assert.equal(fallback.headers.get("content-type"), "application/json");
    assert.equal(fallback.headers.get("x-cognis-read-source"), "cached");
    assert.deepEqual(await fallback.json(), expected);
    fixture.reconnect();
    fail = false;
    disconnectAfterSuccess = true;
    const completed = await request("/resource");
    assert.equal(completed.headers.get("x-cognis-read-source"), "live");
    assert.deepEqual(await completed.json(), {
        data: { value: 3 },
        projected: true,
    });
    assert.deepEqual(
        stages,
        Array(4).fill(["before:/resource", "after:/resource"]).flat(),
    );
});

test("a later GET sharing an older pending body is shared, while the next transport is live", async (context) => {
    const bodyStarted = Promise.withResolvers();
    const finishBody = Promise.withResolvers();
    const payload = { data: ["same"] };
    let requests = 0;
    const fixture = createOfflineClientFixture(async () => {
        requests++;
        const response = Response.json(payload);
        if (requests === 1)
            response.json = async () => {
                bodyStarted.resolve();
                await finishBody.promise;
                return structuredClone(payload);
            };
        return response;
    });
    const request = registerReadClient(context, fixture);
    const first = request("/resource");
    await bodyStarted.promise;
    const second = request("/resource");
    await new Promise((resolve) => setImmediate(resolve));
    finishBody.resolve();
    const responses = await Promise.all([first, second]);
    assert.equal(requests, 1);
    responses.push(await request("/resource"));
    assert.equal(requests, 2);
    const sources = ["live", "shared", "live"];
    for (const [index, response] of responses.entries()) {
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-type"), "application/json");
        assert.equal(
            response.headers.get("x-cognis-read-source"),
            sources[index],
        );
        assert.deepEqual(await response.json(), payload);
    }
});

function deferredReadClient(context) {
    const transport = Promise.withResolvers();
    const started = Promise.withResolvers();
    let requests = 0;
    const fixture = createOfflineClientFixture(() => {
        requests++;
        started.resolve();
        return transport.promise;
    });
    return {
        transport,
        started,
        request: registerReadClient(context, fixture),
        requests: () => requests,
    };
}

test("coalesced transport errors keep their envelope and identify the transport starter", async (context) => {
    const client = deferredReadClient(context);
    const { request, transport, started } = client;
    const first = request("/resource");
    await started.promise;
    const second = request("/resource");
    await new Promise((resolve) => setImmediate(resolve));
    const payload = { error: { code: "denied" } };
    transport.reject(
        Object.assign(new Error("denied"), { status: 403, payload }),
    );
    const responses = await Promise.all([first, second]);
    assert.equal(client.requests(), 1);
    for (const [index, response] of responses.entries()) {
        assert.equal(response.status, 403);
        assert.equal(response.headers.get("content-type"), "application/json");
        assert.equal(
            response.headers.get("x-cognis-read-source"),
            index === 0 ? "live" : "shared",
        );
        assert.deepEqual(await response.json(), payload);
    }
});

for (const mode of [
    "undeclared",
    "accessToken",
    "authorization",
    "onlineOnly",
    "empty",
    "denied",
]) {
    test(`bypasses stay untouched while managed errors preserve their fields (${mode})`, async (context) => {
        const expected = new Response(
            mode === "empty" ? null : "exact response\nbody",
            {
                status: mode === "denied" ? 403 : mode === "empty" ? 204 : 206,
                statusText:
                    mode === "denied"
                        ? "Forbidden"
                        : mode === "empty"
                          ? "No Content"
                          : "Partial Content",
                headers: {
                    "content-type": "text/plain",
                    "x-resource-version": "7",
                    "x-cognis-read-source": "untrusted",
                },
            },
        );
        const fixture = createOfflineClientFixture(async () => expected);
        const request = registerReadClient(context, fixture, {
            describe: () =>
                ["undeclared", "empty"].includes(mode)
                    ? undefined
                    : { read: true },
        });
        const options =
            mode === "accessToken"
                ? { accessToken: "guest-token" }
                : mode === "authorization"
                  ? { headers: { authorization: "Bearer guest-token" } }
                  : mode === "onlineOnly"
                    ? { bufferOffline: false }
                    : {};
        const response = await request("/resource", options);
        if (mode !== "denied") assert.equal(response, expected);
        assert.equal(response.status, expected.status);
        assert.equal(response.statusText, expected.statusText);
        assert.deepEqual(Object.fromEntries(response.headers), {
            "content-type": "text/plain",
            "x-cognis-read-source": mode === "denied" ? "live" : "untrusted",
            "x-resource-version": "7",
        });
        assert.equal(
            await response.text(),
            mode === "empty" ? "" : "exact response\nbody",
        );
    });
}

test("coalesced raw HTTP errors keep independent readable bodies", async (context) => {
    const client = deferredReadClient(context);
    const { request, transport, started } = client;
    const first = request("/resource");
    await started.promise;
    const second = request("/resource");
    await new Promise((resolve) => setImmediate(resolve));
    const original = new Response("error body", {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "content-type": "text/plain", "retry-after": "10" },
    });
    transport.resolve(original);
    const responses = await Promise.all([first, second]);
    assert.equal(client.requests(), 1);
    for (const [index, response] of responses.entries()) {
        assert.equal(response.status, 503);
        assert.equal(response.statusText, "Service Unavailable");
        assert.equal(response.headers.get("content-type"), "text/plain");
        assert.equal(response.headers.get("retry-after"), "10");
        assert.equal(
            response.headers.get("x-cognis-read-source"),
            index === 0 ? "live" : "shared",
        );
        assert.equal(await response.text(), "error body");
    }
    assert.equal(original.bodyUsed, false);
    assert.equal(await original.text(), "error body");
});

for (const mode of [
    "undeclared",
    "accessToken",
    "authorization",
    "onlineOnly",
    "managed",
]) {
    test(`status-zero Responses retain identity and Fetch behavior (${mode})`, async (context) => {
        const expected = Response.error();
        const fixture = createOfflineClientFixture(async () => expected);
        const request = registerReadClient(context, fixture, {
            describe: () =>
                mode === "undeclared" ? undefined : { read: true },
        });
        const options =
            mode === "accessToken"
                ? { accessToken: "guest-token" }
                : mode === "authorization"
                  ? { headers: { authorization: "Bearer guest-token" } }
                  : mode === "onlineOnly"
                    ? { bufferOffline: false }
                    : {};
        const response = await request("/resource", options);
        assert.equal(response, expected);
        assert.equal(response.type, "error");
        assert.equal(response.status, 0);
        assert.equal(response.ok, false);
        assert.deepEqual([...response.headers], []);
        assert.equal(await response.text(), "");
    });
}

test("a component restore callback reports cached and retains its projected payload", async (context) => {
    const fixture = createOfflineClientFixture(async () =>
        Response.json({ data: ["saved"] }),
    );
    const request = registerReadClient(context, fixture, {
        restoreRead: async (_path, pending, read) => {
            assert.equal(pending.length, 0);
            const payload = await read("/saved");
            fixture.reconnect();
            return payload;
        },
        project: (_path, payload) => ({ ...payload, projected: true }),
    });
    await request("/saved");
    fixture.disconnect();
    const restored = await request("/unvisited");
    assert.equal(restored.status, 200);
    assert.equal(restored.headers.get("content-type"), "application/json");
    assert.equal(restored.headers.get("x-cognis-read-source"), "cached");
    assert.deepEqual(await restored.json(), {
        data: ["saved"],
        projected: true,
    });
});

test("read provenance retains owner, account and lifecycle boundaries", async (context) => {
    const transport = Promise.withResolvers();
    const fixture = createOfflineClientFixture(async (path) =>
        path === "/pending"
            ? transport.promise
            : Response.json({ data: ["private"] }),
    );
    const clients = ["first", "second"].map((name) =>
        registerReadClient(context, fixture, {
            owner: `test.${name}`,
        }),
    );
    await clients[0]("/saved");
    fixture.disconnect();
    await assert.rejects(clients[1]("/saved"), /offline_read_unavailable/);
    fixture.changeAccount("another");
    await assert.rejects(clients[0]("/saved"), /offline_read_unavailable/);
    fixture.reconnect();
    const pending = clients[0]("/pending");
    await new Promise((resolve) => setImmediate(resolve));
    fixture.changeAccount("third");
    transport.resolve(Response.json({ data: ["old account"] }));
    await assert.rejects(pending, /offline_account_changed/);
    assert.equal(clients[0].hasCachedRead("/pending"), false);
    fixture.controller.abort();
    assert.equal(clients[0].hasCachedRead("/saved"), false);
    await assert.rejects(clients[0]("/saved"), { name: "AbortError" });
    await assert.rejects(
        fixture.ctx.runFlow("test:first:request"),
        /not registered/,
    );
});

test("an acknowledged snapshot replaces pending GETs with cached provenance", async (context) => {
    const transport = Promise.withResolvers();
    const fixture = createOfflineClientFixture(async (_path, options) =>
        options.method === "PUT"
            ? Response.json({ data: ["acknowledged"] })
            : transport.promise,
    );
    const request = registerReadClient(context, fixture, {
        describe: (_path, method) =>
            method === "PUT"
                ? { write: true, readSnapshot: (operation) => operation.body }
                : { read: true },
    });
    const first = request("/resource");
    const second = request("/resource");
    await new Promise((resolve) => setImmediate(resolve));
    const mutation = await request("/resource", {
        method: "PUT",
        body: JSON.stringify({ data: ["acknowledged"] }),
    });
    assert.equal(mutation.status, 200);
    assert.equal(mutation.headers.get("x-cognis-read-source"), null);
    assert.deepEqual(await mutation.json(), { data: ["acknowledged"] });
    transport.resolve(Response.json({ data: ["old"] }));
    for (const response of await Promise.all([first, second])) {
        assert.equal(response.headers.get("x-cognis-read-source"), "cached");
        assert.deepEqual(await response.json(), { data: ["acknowledged"] });
    }
});

test("aborting an owner prevents pending GET responses and allows a fresh registration", async (context) => {
    const transport = Promise.withResolvers();
    const fixture = createOfflineClientFixture(() => transport.promise);
    const request = registerReadClient(context, fixture);
    const pending = request("/resource");
    await new Promise((resolve) => setImmediate(resolve));
    fixture.controller.abort();
    transport.resolve(Response.json({ data: ["aborted"] }));
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(request.hasCachedRead("/resource"), false);
    const replacement = createOfflineClientFixture(async () =>
        Response.json({ data: ["fresh"] }),
    );
    const read = registerReadClient(context, replacement);
    const response = await read("/resource");
    assert.equal(response.headers.get("x-cognis-read-source"), "live");
    assert.deepEqual(await response.json(), { data: ["fresh"] });
});
