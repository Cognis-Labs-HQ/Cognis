import test from "node:test";
import assert from "node:assert/strict";
import { avatarFixture, deferred, settle } from "./avatar-fixture.js";

async function fixture(context) {
    const state = avatarFixture(context);
    await state.ready;
    const main = state.document.querySelector("main");
    main.innerHTML =
        '<a href="/profile/alice">Alice</a><a href="/profile/bob">Bob</a>';
    state.preview.bindProfilePreviews({ t: () => "Loading" });
    const links = main.querySelectorAll("a");
    const focus = (index) =>
        links[index].dispatchEvent(
            new state.window.FocusEvent("focusin", { bubbles: true }),
        );
    const close = () =>
        links[0].dispatchEvent(
            new state.window.FocusEvent("focusout", { bubbles: true }),
        );
    return { ...state, links, focus, close };
}

test("preview transient recovery, explicit deletion and privacy denial reconcile images", async (context) => {
    const state = await fixture(context);
    state.focus(0);
    await state.timers();
    const image = state.document.querySelector(".profile-mini-preview img");
    state.setRequest(async () => new Response("", { status: 503 }));
    state.focus(0);
    await state.timers();
    assert.equal(
        state.document.querySelector(".profile-mini-preview img"),
        image,
    );
    state.setRequest(async () =>
        Response.json({ data: { handle: "alice", avatarKey: null } }),
    );
    state.focus(0);
    await state.timers();
    assert.equal(
        state.document.querySelector(".profile-mini-preview img"),
        null,
    );
    state.setRequest(async (path) =>
        path.startsWith("/api/v1/files/")
            ? new Response("image")
            : Response.json({
                  data: { handle: "alice", avatarKey: "restored" },
              }),
    );
    state.focus(0);
    await state.timers();
    assert.ok(state.document.querySelector(".profile-mini-preview img"));
    state.setRequest(async () => new Response("", { status: 403 }));
    state.focus(0);
    await state.timers();
    assert.equal(
        state.document.querySelector(".profile-mini-preview img"),
        null,
    );
    assert.equal(
        state.document.querySelector(".profile-mini-preview").hidden,
        true,
    );
});

for (const action of ["close", "navigate", "account", "provider"]) {
    test(`a pending preview cannot reappear after ${action}`, async (context) => {
        const state = await fixture(context);
        const response = deferred();
        state.setRequest(() => response.promise);
        state.focus(0);
        const showing = state.timers();
        await settle();
        if (action === "close") state.close();
        if (action === "navigate") state.links[0].remove();
        if (action === "account")
            state.window.localStorage.setItem("cognis_account", "bob");
        if (action === "provider") await state.lifecycle.reconcile([]);
        response.resolve(
            Response.json({
                data: { handle: "alice", avatarKey: "alice-avatar" },
            }),
        );
        await showing;
        await state.timers();
        assert.equal(
            state.document.querySelector(".profile-mini-preview img"),
            null,
        );
    });
}

test("a late old-profile response does not replace a newer preview", async (context) => {
    const state = await fixture(context);
    const response = deferred();
    state.setRequest((path) =>
        path.includes("/users/alice/")
            ? response.promise
            : path.startsWith("/api/v1/files/")
              ? Promise.resolve(new Response("bob"))
              : Promise.resolve(
                    Response.json({
                        data: { handle: "bob", avatarKey: "bob-avatar" },
                    }),
                ),
    );
    state.focus(0);
    const first = state.timers();
    await settle();
    state.focus(1);
    await state.timers();
    const image = state.document.querySelector(".profile-mini-preview img");
    response.resolve(
        Response.json({ data: { handle: "alice", avatarKey: "alice-avatar" } }),
    );
    await first;
    assert.equal(
        state.document.querySelector(".profile-mini-preview img"),
        image,
    );
    assert.equal(image.dataset.avatarKey, "bob-avatar");
});

test("a real preview image error recovers on reopening without a retry loop", async (context) => {
    const state = await fixture(context);
    state.focus(0);
    await state.timers();
    const image = state.document.querySelector(".profile-mini-preview img");
    const reads = state.requests.length;
    image.dispatchEvent(new state.window.Event("error"));
    assert.equal(
        state.document.querySelector(".profile-mini-preview img"),
        null,
    );
    assert.equal(state.requests.length, reads);
    state.focus(0);
    await state.timers();
    assert.notEqual(
        state.document.querySelector(".profile-mini-preview img").src,
        image.src,
    );
});

test("the full navbar menu rebinds previews once after provider removal and re-enable", async (context) => {
    const state = avatarFixture(context, { menu: true });
    await state.ready;
    const main = state.document.querySelector("main");
    main.innerHTML = '<a href="/profile/alice">Alice</a>';
    const link = main.firstElementChild;
    const open = async () => {
        link.dispatchEvent(
            new state.window.FocusEvent("focusin", { bubbles: true }),
        );
        await state.timers();
        assert.ok(state.document.querySelector(".profile-mini-preview img"));
    };
    await open();
    assert.equal(state.subscribers.size, 1);
    assert.equal(state.searchProviders.size, 1);
    await state.lifecycle.reconcile([]);
    assert.equal(state.subscribers.size, 0);
    assert.equal(state.searchProviders.size, 0);
    assert.equal(state.document.querySelector(".availability-menu-item"), null);
    await state.lifecycle.reconcile(state.catalog);
    await open();
    assert.equal(state.subscribers.size, 1);
    assert.equal(state.searchProviders.size, 1);
    assert.equal(
        state.document.querySelectorAll(".availability-menu-item").length,
        1,
    );
});
