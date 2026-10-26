import test from "node:test";
import assert from "node:assert/strict";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

test("profile flows retain text, posts and bounded media and replay updates in order", async () => {
    const calls = [];
    const fixture = createOfflineClientFixture(async (path, options = {}) => {
        if (options.method) assert.ok(options.signal instanceof AbortSignal);
        calls.push({ path, ...options });
        return Response.json({
            data: path.endsWith("/posts") ? [] : { displayName: "Original" },
        });
    });
    const client = loadTestModule(
        new URL("../ui/offline-client.js", import.meta.url),
        fixture.imports,
        fixture.globals,
    );
    client.registerProfileOfflineClient(fixture.ctx);
    const activity = [];
    fixture.ctx.extendFlow(
        "activity:record",
        "capture",
        { id: "test:profileActivity" },
        ({ input }) => activity.push(input),
    );
    const publicClient = loadTestModule(
        new URL("../ui/client.js", import.meta.url),
        { "./offline-client.js": client },
        fixture.globals,
    ).profileUiClient;
    const request = client.profileFetch;
    await request("/api/v1/social/profile");
    await request("/api/v1/social/posts");
    fixture.disconnect();
    const edit = await (
        await publicClient.updateProfile({ displayName: "Offline" })
    ).json();
    assert.equal(edit.queued, true);
    const post = await (
        await request("/api/v1/social/posts", {
            method: "POST",
            body: JSON.stringify({
                content: "Queued post",
                visibility: "friends",
            }),
        })
    ).json();
    await request("/api/v1/social/profile/avatar", {
        method: "PUT",
        headers: { "content-type": "image/png" },
        body: new Uint8Array([1, 2, 3]).buffer,
    });
    assert.equal(
        (await (await request("/api/v1/social/profile")).json()).data
            .displayName,
        "Offline",
    );
    assert.equal(
        (await (await request("/api/v1/social/posts")).json()).data[0].id,
        post.data.id,
    );
    assert.equal(calls.length, 2);
    await assert.rejects(
        request("/api/v1/social/profile/banner", {
            method: "PUT",
            body: new Uint8Array(350001).buffer,
        }),
        /offline_outbox_full/,
    );
    assert.equal(activity.length, 3);
    assert.equal(activity[1].id, post.data.id);
    assert.deepEqual(Object.keys(activity[1].meta), ["action"]);
    fixture.reconnect();
    await request("/api/v1/social/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName: "Newest" }),
    });
    assert.equal(
        calls.length,
        2,
        "a later online edit waits behind the queued edit",
    );
    assert.equal((await fixture.outbox.flush()).sent, 4);
    assert.equal(JSON.parse(calls[2].body).displayName, "Offline");
    assert.equal(JSON.parse(calls[3].body).operationId, post.data.id);
    assert.deepEqual(Array.from(calls[4].body), [1, 2, 3]);
    assert.equal(JSON.parse(calls[5].body).displayName, "Newest");
    fixture.controller.abort();
    await assert.rejects(request("/api/v1/social/profile"), {
        name: "AbortError",
    });
});

test("account changes during media preparation cannot queue a previous account's image", async () => {
    const fixture = createOfflineClientFixture(() => assert.fail("transport"));
    const client = loadTestModule(
        new URL("../ui/offline-client.js", import.meta.url),
        fixture.imports,
        fixture.globals,
    );
    client.registerProfileOfflineClient(fixture.ctx);
    fixture.disconnect();
    let release;
    let begin;
    const started = new Promise((resolve) => {
        begin = resolve;
    });
    const prepared = new Promise((resolve) => {
        release = resolve;
    });
    class DelayedImage extends Blob {
        async arrayBuffer() {
            begin();
            return prepared;
        }
    }
    const operation = client.profileFetch("/api/v1/social/profile/avatar", {
        method: "PUT",
        body: new DelayedImage(["image"]),
    });
    await started;
    fixture.changeAccount("another");
    release(new Uint8Array([1, 2, 3]).buffer);
    await assert.rejects(operation, /offline_account_changed/);
    assert.equal(fixture.values.size, 0);
    fixture.controller.abort();
});

test("automatic preference writes can require connectivity without buffering or reordering explicit user edits", async () => {
    const calls = [];
    const fixture = createOfflineClientFixture(async (path, options = {}) => {
        calls.push({ path, options });
        return Response.json({ data: {} });
    });
    const client = loadTestModule(
        new URL("../ui/offline-client.js", import.meta.url),
        fixture.imports,
        fixture.globals,
    );
    client.registerProfileOfflineClient(fixture.ctx);
    const path = "/api/v1/social/users/learner/preferences/ui-preferences";
    const write = {
        method: "PUT",
        body: JSON.stringify({ layout: { detectedTimezone: "UTC" } }),
        bufferOffline: false,
    };
    await client.profileFetch(path, write);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.bufferOffline, undefined);
    fixture.disconnect();
    await assert.rejects(
        client.profileFetch(path, write),
        /offline_operation_unavailable/,
    );
    assert.equal(fixture.outbox.hasBufferedChanges(), false);
    assert.equal(calls.length, 1);
    await client.profileFetch(path, {
        method: "PUT",
        body: JSON.stringify({ layout: { timezone: "UTC" } }),
    });
    assert.equal(fixture.outbox.hasBufferedChanges(), true);
    fixture.controller.abort();
});
