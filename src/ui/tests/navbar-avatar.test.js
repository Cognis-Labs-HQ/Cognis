import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { loadTestModule } from "../../tooling/reuse/test-module.ts";

function fixture(context) {
    const window = new JSDOM(
        '<button class="avatar-button"><span class="availability-indicator"></span></button><ul><li><a data-profile-link></a></li></ul>',
        { url: "https://synthetic.invalid/" },
    ).window;
    context.after(() => window.close());
    const document = window.document;
    const values = new Map();
    const uiCtx = { capabilities: { get: (key) => values.get(key) } };
    const errors = [];
    window.localStorage.setItem("cognis_account", "alice");
    window.localStorage.setItem("cognis_access_token", "synthetic-alice");
    const host = loadTestModule(
        new URL("../layouts/navbar-avatar.js", import.meta.url),
        { "../reuse/ui-ctx.js": { uiCtx } },
        {
            window,
            document,
            localStorage: window.localStorage,
            console: { error: (...args) => errors.push(args) },
        },
    );
    const button = document.querySelector(".avatar-button");
    const indicator = button.firstElementChild;
    const makeContent = () => {
        const content = document.createElement("span");
        content.className = "owner-content";
        content.textContent = "AL";
        return content;
    };
    return {
        window,
        document,
        values,
        errors,
        host,
        button,
        indicator,
        makeContent,
    };
}

for (const kind of ["absent", "throws", "null", "normal"]) {
    test(`owner callback outcome: ${kind}`, async (context) => {
        const state = fixture(context);
        const content = state.makeContent();
        if (kind !== "absent")
            state.values.set("ui:navbarAvatarProvider", () => ({
                avatarState: "missing",
                profileAvailable: true,
                renderContent: () => {
                    if (kind === "throws") throw new Error("synthetic");
                    return kind === "null" ? null : content;
                },
            }));
        await state.host.updateNavbarAvatar();
        assert.equal(state.button.lastElementChild, state.indicator);
        assert.equal(
            state.button.querySelector(".owner-content"),
            kind === "normal" ? content : null,
        );
        assert.equal(
            state.document.querySelector("li").hidden,
            kind !== "normal",
        );
        assert.equal(state.errors.length, kind === "throws" ? 1 : 0);
    });
}

for (const kind of ["account", "token", "provider", "detach", "dispose"]) {
    test(`late provider result cannot cross ${kind}`, async (context) => {
        const state = fixture(context);
        const controller = new state.window.AbortController();
        let resolve;
        let renderCalls = 0;
        const provider = Object.assign(
            () =>
                new Promise((accept) => {
                    resolve = accept;
                }),
            { signal: controller.signal },
        );
        state.values.set("ui:navbarAvatarProvider", provider);
        const pending = state.host.updateNavbarAvatar();
        if (kind === "account")
            state.window.localStorage.setItem("cognis_account", "bob");
        if (kind === "token")
            state.window.localStorage.setItem(
                "cognis_access_token",
                "synthetic-bob",
            );
        if (kind === "provider") state.values.delete("ui:navbarAvatarProvider");
        if (kind === "detach") state.button.remove();
        if (kind === "dispose") controller.abort();
        resolve({
            profileAvailable: true,
            avatarState: "available",
            renderContent: () => {
                renderCalls++;
                return state.makeContent();
            },
        });
        await pending;
        assert.equal(renderCalls, 0);
    });
}

for (const kind of ["account", "token", "provider", "detach", "dispose"]) {
    test(`synchronous content generation cannot cross ${kind}`, async (context) => {
        const state = fixture(context);
        const controller = new state.window.AbortController();
        const provider = Object.assign(
            () => ({
                profileAvailable: true,
                avatarState: "available",
                renderContent: () => {
                    if (kind === "account")
                        state.window.localStorage.setItem(
                            "cognis_account",
                            "bob",
                        );
                    if (kind === "token")
                        state.window.localStorage.setItem(
                            "cognis_access_token",
                            "synthetic-bob",
                        );
                    if (kind === "provider")
                        state.values.delete("ui:navbarAvatarProvider");
                    if (kind === "detach") state.button.remove();
                    if (kind === "dispose") controller.abort();
                    return state.makeContent();
                },
            }),
            { signal: controller.signal },
        );
        state.values.set("ui:navbarAvatarProvider", provider);
        await state.host.updateNavbarAvatar();
        assert.equal(state.button.querySelector(".owner-content"), null);
    });
}

test("content retention keeps button semantics and requires an explicit retryable outcome", async (context) => {
    const state = fixture(context);
    state.button.setAttribute("aria-label", "Account");
    state.button.setAttribute("aria-expanded", "true");
    const content = state.makeContent();
    let result;
    let currentState = "available";
    let key = "one";
    const provider = () => ({
        avatarState: currentState,
        avatarKey: key,
        profileAvailable: true,
        renderContent(previous, options) {
            result = { previous, ...options };
            return content;
        },
    });
    state.values.set("ui:navbarAvatarProvider", provider);
    await state.host.updateNavbarAvatar();
    await state.host.updateNavbarAvatar();
    assert.equal(result.previous, content);
    assert.equal(result.retainImage, false);
    currentState = "retryable";
    await state.host.updateNavbarAvatar();
    assert.equal(result.retainImage, true);
    key = "two";
    await state.host.updateNavbarAvatar();
    assert.equal(result.retainImage, false);
    assert.equal(state.button.getAttribute("aria-label"), "Account");
    assert.equal(state.button.getAttribute("aria-expanded"), "true");
    assert.equal(state.button.lastElementChild, state.indicator);
});

for (const outcome of ["async", "foreign", "unknown"]) {
    test(`invalid content contract is rejected: ${outcome}`, async (context) => {
        const state = fixture(context);
        const foreign = new JSDOM("<span></span>");
        context.after(() => foreign.window.close());
        state.values.set("ui:navbarAvatarProvider", () => ({
            avatarState: outcome === "unknown" ? undefined : "available",
            profileAvailable: true,
            renderContent: () =>
                outcome === "async"
                    ? Promise.resolve(state.makeContent())
                    : foreign.window.document.querySelector("span"),
        }));
        await state.host.updateNavbarAvatar();
        assert.equal(state.button.firstElementChild.textContent, "?");
        assert.equal(state.document.querySelector("li").hidden, true);
        assert.equal(state.errors.length, 1);
    });
}

test("a newer navbar refresh owns rendering and the provider subscription", async (context) => {
    const state = fixture(context);
    const controller = new state.window.AbortController();
    const pending = [];
    const provider = Object.assign(
        () => new Promise((resolve) => pending.push(resolve)),
        { signal: controller.signal },
    );
    state.values.set("ui:navbarAvatarProvider", provider);
    const first = state.host.updateNavbarAvatar();
    const second = state.host.updateNavbarAvatar();
    const content = state.makeContent();
    pending[1]({
        avatarState: "missing",
        profileAvailable: true,
        renderContent: () => content,
    });
    await second;
    pending[0]({
        avatarState: "missing",
        profileAvailable: true,
        renderContent: () => assert.fail("superseded renderer invoked"),
    });
    await first;
    assert.equal(state.button.firstElementChild, content);
    controller.abort();
    assert.equal(state.button.querySelector(".owner-content"), null);
    assert.equal(state.document.querySelector("li").hidden, true);
});

test("a replaced pending provider cannot clear the next provider when it aborts", async (context) => {
    const state = fixture(context);
    const firstScope = new state.window.AbortController();
    let finish;
    const firstProvider = Object.assign(
        () =>
            new Promise((resolve) => {
                finish = resolve;
            }),
        { signal: firstScope.signal },
    );
    state.values.set("ui:navbarAvatarProvider", firstProvider);
    const first = state.host.updateNavbarAvatar();
    const content = state.makeContent();
    state.values.set("ui:navbarAvatarProvider", () => ({
        avatarState: "missing",
        profileAvailable: true,
        renderContent: () => content,
    }));
    await state.host.updateNavbarAvatar();
    firstScope.abort();
    assert.equal(state.button.firstElementChild, content);
    assert.equal(state.document.querySelector("li").hidden, false);
    finish({
        avatarState: "missing",
        profileAvailable: true,
        renderContent: () => assert.fail("old provider rendered"),
    });
    await first;
    assert.equal(state.button.firstElementChild, content);
});
