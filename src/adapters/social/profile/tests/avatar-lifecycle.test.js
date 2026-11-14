import test from "node:test";
import assert from "node:assert/strict";
import { avatarFixture, deferred, settle } from "./avatar-fixture.js";

for (const changed of [
    "account",
    "token",
    "key",
    "label",
    "navigation",
    "provider",
]) {
    test(`late hydration cannot paint after ${changed} changes`, async (context) => {
        const state = avatarFixture(context);
        await state.ready;
        const main = state.document.querySelector("main");
        main.innerHTML = state.markup();
        const response = deferred();
        state.setRequest(() => response.promise);
        const loading = state.avatar.hydrateProfileAvatars(main);
        await settle();
        if (changed === "account")
            state.window.localStorage.setItem("cognis_account", "bob");
        if (changed === "token")
            state.window.localStorage.setItem(
                "cognis_access_token",
                "token-bob",
            );
        if (changed === "key")
            main.querySelector("[data-avatar-key]").dataset.avatarKey =
                "bob/avatar";
        if (changed === "label")
            main.querySelector("[data-avatar-key]").dataset.avatarLabel = "Bob";
        if (changed === "navigation") main.remove();
        if (changed === "provider") await state.lifecycle.reconcile([]);
        response.resolve(new Response("old-image"));
        await loading;
        assert.equal(main.querySelector("img"), null);
    });
}

test("concurrent repeated mounts coalesce reads; provider removal clears and can remount", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    const main = state.document.querySelector("main");
    main.innerHTML = state.markup() + state.markup();
    await Promise.all([
        state.avatar.hydrateProfileAvatars(main),
        state.avatar.hydrateProfileAvatars(main),
    ]);
    assert.equal(state.requests.length, 1);
    assert.equal(main.querySelectorAll("img").length, 2);
    await state.navbar.updateNavbarAvatar();
    await state.lifecycle.reconcile([]);
    assert.equal(
        state.uiCtx.capabilities.get("ui:profileAvatarRenderer"),
        undefined,
    );
    assert.equal(main.querySelectorAll("img").length, 0);
    assert.equal(state.document.querySelector(".avatar-image"), null);
    assert.equal(
        await state.avatar.fetchProfileAvatarBlobUrl("alice/avatar-one"),
        null,
    );
    await state.lifecycle.reconcile(state.catalog);
    await state.avatar.hydrateProfileAvatars(main);
    assert.equal(main.querySelectorAll("img").length, 2);
});

test("TTL revalidation retains identical bytes and updates changed bytes in the same image", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    const main = state.document.querySelector("main");
    main.innerHTML = state.markup();
    await state.avatar.hydrateProfileAvatars(main);
    const image = main.querySelector("img");
    const source = image.src;
    state.advance(60_001);
    await state.avatar.hydrateProfileAvatars(main);
    assert.equal(image.src, source);
    assert.equal(main.querySelector("img"), image);
    state.advance(60_001);
    state.setRequest(async () => new Response("changed"));
    await state.avatar.hydrateProfileAvatars(main);
    assert.equal(main.querySelector("img"), image);
    assert.notEqual(image.src, source);
    assert.ok(state.revoked.includes(source));
});

for (const status of [401, 403, 404, 410]) {
    test(`confirmed HTTP ${status} removes an image and expires its negative cache`, async (context) => {
        const state = avatarFixture(context);
        await state.ready;
        const main = state.document.querySelector("main");
        main.innerHTML = state.markup();
        await state.avatar.hydrateProfileAvatars(main);
        state.advance(60_001);
        state.setRequest(async () => new Response("", { status }));
        await state.avatar.hydrateProfileAvatars(main);
        assert.equal(main.querySelector("img"), null);
        assert.equal(
            state.avatar.isProfileAvatarUnavailable("alice/avatar-one"),
            true,
        );
        state.advance(60_001);
        state.setRequest(async () => new Response("recovered"));
        await state.avatar.hydrateProfileAvatars(main);
        assert.ok(main.querySelector("img"));
    });
}

test("cache bounds keys and never retains a failed promise", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    for (let index = 0; index < 129; index++)
        await state.avatar.fetchProfileAvatarBlobUrl(`key-${index}`);
    assert.equal(state.revoked.length, 1);
    await state.avatar.fetchProfileAvatarBlobUrl("key-0");
    assert.equal(state.requests.length, 130);
    state.setRequest(async () => {
        throw new TypeError("network");
    });
    assert.equal(await state.avatar.fetchProfileAvatarBlobUrl("failed"), null);
    state.setRequest(async () => new Response("recovery"));
    assert.ok(await state.avatar.fetchProfileAvatarBlobUrl("failed"));
});

test("out-of-order navbar metadata cannot revoke a newer key", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    await state.navbar.updateNavbarAvatar();
    const old = deferred();
    state.setRequest(async (path) =>
        path.endsWith("/ping") ? new Response() : old.promise,
    );
    const first = state.navbar.updateNavbarAvatar();
    await settle();
    state.setRequest(async (path) =>
        path.startsWith("/api/v1/files/")
            ? new Response("new")
            : Response.json({
                  data: { handle: "alice", avatarKey: "new-key" },
              }),
    );
    await state.navbar.updateNavbarAvatar();
    const current = state.document.querySelector(".avatar-image");
    old.resolve(
        Response.json({ data: { handle: "alice", avatarKey: "old-key" } }),
    );
    await first;
    assert.equal(state.document.querySelector(".avatar-image"), current);
    assert.ok(!state.revoked.includes(current.src));
});

test("late denial from an old account cannot invalidate the new account image", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    const old = deferred();
    state.setRequest(async (path) =>
        path.endsWith("/ping") ? new Response() : old.promise,
    );
    const first = state.navbar.updateNavbarAvatar();
    await settle();
    state.window.localStorage.setItem("cognis_account", "bob");
    state.window.localStorage.setItem("cognis_access_token", "token-bob");
    state.setRequest(async (path) =>
        path.startsWith("/api/v1/files/")
            ? new Response("bob")
            : Response.json({ data: { handle: "bob", avatarKey: "bob-key" } }),
    );
    await state.navbar.updateNavbarAvatar();
    const current = state.document.querySelector(".avatar-image");
    old.resolve(new Response("", { status: 403 }));
    await first;
    assert.equal(state.document.querySelector(".avatar-image"), current);
    assert.ok(!state.revoked.includes(current.src));
});

test("replaced navbar buttons release their old provider listeners", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    const signal = state.uiCtx.capabilities.get(
        "ui:navbarAvatarProvider",
    ).signal;
    const listeners = new Set();
    const add = signal.addEventListener.bind(signal);
    const remove = signal.removeEventListener.bind(signal);
    signal.addEventListener = (type, callback, options) => {
        if (type === "abort") listeners.add(callback);
        add(type, callback, options);
    };
    signal.removeEventListener = (type, callback, options) => {
        if (type === "abort") listeners.delete(callback);
        remove(type, callback, options);
    };
    for (let index = 0; index < 5; index++) {
        const button = state.document.createElement("button");
        button.className = "avatar-button";
        state.document.querySelector(".avatar-button").replaceWith(button);
        await state.navbar.updateNavbarAvatar();
        assert.equal(listeners.size, 1);
    }
    state.document.querySelector(".avatar-button").remove();
    await state.navbar.updateNavbarAvatar();
    assert.equal(listeners.size, 0);
});

test("a reconnected navbar target reacquires provider cleanup", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    const original = state.document.querySelector(".avatar-button");
    await state.navbar.updateNavbarAvatar();
    const replacement = state.document.createElement("button");
    replacement.className = "avatar-button";
    original.replaceWith(replacement);
    await state.navbar.updateNavbarAvatar();
    replacement.replaceWith(original);
    await state.navbar.updateNavbarAvatar();
    assert.ok(original.querySelector(".avatar-image"));
    await state.lifecycle.reconcile([]);
    assert.equal(original.querySelector(".avatar-image"), null);
});

test("renderer readiness notifications revoke before registry removal and recover after rollback", async (context) => {
    const state = avatarFixture(context);
    const changes = [];
    state.window.addEventListener(
        "cognis:profile-avatar-renderer-changed",
        () => {
            const provider = state.uiCtx.capabilities.get(
                "ui:profileAvatarRenderer",
            );
            changes.push({
                available: provider?.available,
                registered: !!provider,
            });
        },
    );
    await state.ready;
    const retained = state.uiCtx.capabilities.get("ui:profileAvatarRenderer");
    assert.equal(retained.available, true);
    await state.lifecycle.reconcile([]);
    assert.equal(retained.available, false);
    assert.deepEqual(changes, [
        { available: true, registered: true },
        { available: false, registered: true },
    ]);
    state.failAvailability(new Error("availability_mount_failed"));
    await assert.rejects(
        state.lifecycle.reconcile(state.catalog),
        /availability_mount_failed/,
    );
    assert.equal(retained.available, false);
    assert.equal(
        state.uiCtx.capabilities.get("ui:profileAvatarRenderer"),
        undefined,
    );
    assert.deepEqual(changes.slice(-2), [
        { available: true, registered: true },
        { available: false, registered: true },
    ]);
    state.failAvailability(null);
    await state.lifecycle.reconcile(state.catalog);
    assert.equal(retained.available, true);
    assert.equal(changes.at(-1).available, true);
});
