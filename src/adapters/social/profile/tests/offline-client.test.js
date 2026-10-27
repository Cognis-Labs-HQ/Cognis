import { loadProfileOfflineClient as loadClient } from "./reuse/offline-client.js";
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
    const client = loadClient(fixture);
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
    const client = loadClient(fixture);
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
    const client = loadClient(fixture);
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

test("own profile, connections, posts, preferences and images prepare before first offline visit and other profiles are blocked", async (context) => {
    const paths = [];
    const host = createOfflineClientFixture(async (path) => {
        paths.push(path);
        if (path.startsWith("/api/v1/files/"))
            return new Response(new Uint8Array([1, 2, 3]), {
                headers: { "content-type": "image/png" },
            });
        return Response.json({
            data: path.endsWith("/profile")
                ? {
                      handle: "public-name",
                      accountId: "learner",
                      displayName: "Owner",
                      avatarKey: "own.png",
                  }
                : path.includes("/preferences/")
                  ? { layoutJson: JSON.stringify({ mode: "dark" }) }
                  : [{ id: "item" }],
        });
    });
    context.after(() => host.controller.abort());
    let available;
    host.ctx.capabilities.contribute(
        "offline:registerSessionRoutes",
        (_ids, _signal, options) => {
            available = options.available;
        },
    );
    const client = loadClient(host);
    client.registerProfileOfflineClient(host.ctx);
    host.ctx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "test:ownProfile" },
        () => ({ authenticated: true }),
    );
    await host.ctx.runFlow("authenticate-session", {});
    for (let i = 0; i < 50 && !available({}, "/profile/public-name"); i++)
        await new Promise((resolve) => setImmediate(resolve));
    assert.equal(available({}, "/profile/public-name"), true);
    assert.equal(available({}, "/profile/other"), false);
    await client.profileFetch("/api/v1/social/users/other/profile");
    const count = paths.length;
    host.disconnect();
    assert.equal(
        (await (await client.profileFetch("/api/v1/social/profile")).json())
            .data.displayName,
        "Owner",
    );
    assert.equal(
        (await (await client.profileFetch("/api/v1/social/posts")).json())
            .data[0].id,
        "item",
    );
    assert.equal(
        (
            await (
                await client.profileFetch("/api/v1/files/profile/own.png")
            ).blob()
        ).size,
        3,
    );
    await assert.rejects(
        client.profileFetch("/api/v1/social/users/other/profile"),
        /offline_access_denied/,
    );
    assert.equal(paths.length, count);
    assert.equal(host.outbox.hasBufferedChanges(), false);
    await client.profileFetch(
        "/api/v1/social/users/learner/preferences/ui-preferences",
        { method: "PUT", body: JSON.stringify({ layout: { mode: "light" } }) },
    );
    assert.equal(host.outbox.hasBufferedChanges(), true);
    assert.equal(
        JSON.parse(
            (
                await (
                    await client.profileFetch(
                        "/api/v1/social/users/learner/preferences/ui-preferences",
                    )
                ).json()
            ).data.layoutJson,
        ).mode,
        "light",
    );
});

test("large profile images remain available online within the offline cache bound", async (context) => {
    const host = createOfflineClientFixture(
        async () =>
            new Response(new Uint8Array(350_001), {
                headers: { "content-type": "image/png" },
            }),
    );
    context.after(() => host.controller.abort());
    const client = loadClient(host);
    client.registerProfileOfflineClient(host.ctx);
    assert.equal(
        (
            await (
                await client.profileFetch("/api/v1/files/profile/large.png")
            ).blob()
        ).size,
        350_001,
    );
    host.disconnect();
    await assert.rejects(
        client.profileFetch("/api/v1/files/profile/large.png"),
        /offline_read_unavailable/,
    );
});

test("a delayed private profile image cannot cross an account switch", async (context) => {
    let release;
    const response = new Promise((resolve) => {
        release = resolve;
    });
    const host = createOfflineClientFixture(() => response);
    context.after(() => host.controller.abort());
    const client = loadClient(host);
    client.registerProfileOfflineClient(host.ctx);
    const image = client.profileFetch("/api/v1/files/profile/own.png");
    await new Promise((resolve) => setImmediate(resolve));
    host.changeAccount("other");
    release(new Response(new Uint8Array([1, 2, 3])));
    await assert.rejects(image, /offline_account_changed/);
});
