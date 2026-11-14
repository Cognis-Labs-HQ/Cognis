import test from "node:test";
import assert from "node:assert/strict";
import { avatarFixture } from "./avatar-fixture.js";

test("a failed first read remains retryable on the next hydration", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    const main = state.document.querySelector("main");
    main.innerHTML = state.markup();
    state.setRequest(async () => new Response("", { status: 503 }));
    await state.avatar.hydrateProfileAvatars(main);
    assert.equal(main.querySelector("img"), null);
    state.setRequest(async () => new Response("image"));
    await state.avatar.hydrateProfileAvatars(main);
    assert.ok(main.querySelector("img"));
});

test("navbar retains the exact loaded image across a transient metadata refresh", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    await state.navbar.updateNavbarAvatar();
    const image = state.document.querySelector(".avatar-image");
    assert.ok(image);
    state.setRequest(async () => new Response("", { status: 503 }));
    await state.navbar.updateNavbarAvatar();
    assert.equal(state.document.querySelector(".avatar-image"), image);
});

test("an image error can recover on a later explicit hydration", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    const main = state.document.querySelector("main");
    main.innerHTML = state.markup();
    await state.avatar.hydrateProfileAvatars(main);
    const image = main.querySelector("img");
    state.avatar.handleProfileAvatarError({ target: image });
    await state.avatar.hydrateProfileAvatars(main);
    assert.ok(main.querySelector("img"));
    assert.notEqual(main.querySelector("img").src, image.src);
});

test("reopening a preview preserves the same loaded avatar node", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    const main = state.document.querySelector("main");
    main.innerHTML = '<a href="/profile/alice">Alice</a>';
    const link = main.firstElementChild;
    state.preview.bindProfilePreviews({ t: () => "Loading" });
    link.dispatchEvent(
        new state.window.FocusEvent("focusin", { bubbles: true }),
    );
    await state.timers();
    const image = state.document.querySelector(".profile-mini-preview img");
    assert.ok(image);
    link.dispatchEvent(
        new state.window.FocusEvent("focusout", { bubbles: true }),
    );
    await state.timers();
    link.dispatchEvent(
        new state.window.FocusEvent("focusin", { bubbles: true }),
    );
    await state.timers();
    assert.equal(
        state.document.querySelector(".profile-mini-preview img"),
        image,
    );
});

test("explicit absence and access denial clear navbar images; a new key replaces them", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    await state.navbar.updateNavbarAvatar();
    const original = state.document.querySelector(".avatar-image");
    state.setProfile({ handle: "alice", avatarKey: "alice/avatar-two" });
    await state.navbar.updateNavbarAvatar();
    assert.notEqual(state.document.querySelector(".avatar-image"), original);
    state.setProfile({ handle: "alice", avatarKey: null });
    await state.navbar.updateNavbarAvatar();
    assert.equal(state.document.querySelector(".avatar-image"), null);
    state.setProfile({ handle: "alice", avatarKey: "alice/avatar-three" });
    await state.navbar.updateNavbarAvatar();
    state.setRequest(async () => new Response("", { status: 403 }));
    await state.navbar.updateNavbarAvatar();
    assert.equal(state.document.querySelector(".avatar-image"), null);
});

test("navbar image decoding errors leave a retryable next refresh", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    await state.navbar.updateNavbarAvatar();
    const image = state.document.querySelector(".avatar-image");
    image.dispatchEvent(new state.window.Event("error"));
    assert.equal(state.document.querySelector(".avatar-image"), null);
    await state.navbar.updateNavbarAvatar();
    assert.notEqual(
        state.document.querySelector(".avatar-image").src,
        image.src,
    );
});

test("unchanged navbar refreshes keep the original image error recovery valid", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    await state.navbar.updateNavbarAvatar();
    const image = state.document.querySelector(".avatar-image");
    await state.navbar.updateNavbarAvatar();
    image.dispatchEvent(new state.window.Event("error"));
    await state.navbar.updateNavbarAvatar();
    assert.notEqual(
        state.document.querySelector(".avatar-image").src,
        image.src,
    );
});

test("unknown provider outcomes cannot authorize an image", async (context) => {
    const state = avatarFixture(context);
    await state.ready;
    const provider = state.uiCtx.capabilities.get("ui:navbarAvatarProvider");
    state.uiCtx.capabilities.remove("ui:navbarAvatarProvider", provider);
    state.uiCtx.capabilities.contribute(
        "ui:navbarAvatarProvider",
        async () => ({
            profileAvailable: true,
            avatarBlobUrl: "blob:unclassified",
        }),
    );
    await state.navbar.updateNavbarAvatar();
    assert.equal(state.document.querySelector(".avatar-image"), null);
});
