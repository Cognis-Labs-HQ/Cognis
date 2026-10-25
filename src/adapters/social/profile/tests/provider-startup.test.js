import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createProviderLifecycle } from "../../../../ui/reuse/provider-lifecycle.js";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

function fixture() {
    const requests = [];
    const errors = [];
    const subscribers = new Set();
    const timers = new Map();
    let nextTimer = 0;
    let ready;
    let fail;
    const styles = new Promise((resolve, reject) => {
        ready = resolve;
        fail = reject;
    });
    const host = createOfflineClientFixture(async (path, options = {}) => {
        assert.equal(
            typeof host.ctx.capabilities.get("social:profileRequest"),
            "function",
        );
        requests.push({ path, options });
        return Response.json({ data: { status: "free" } });
    });
    host.ctx.capabilities.contribute("session:isAuthenticated", () => true);
    host.ctx.capabilities.contribute("ui:log", (...args) => errors.push(args));
    const window = new EventTarget();
    window.location = { pathname: "/administration/modules" };
    window.crypto = webcrypto;
    const session = new Map();
    window.sessionStorage = {
        getItem: (key) => session.get(key) ?? null,
        setItem: (key, value) => session.set(key, value),
    };
    window.setInterval = (callback) => {
        const id = ++nextTimer;
        timers.set(id, callback);
        return id;
    };
    window.clearInterval = (id) => timers.delete(id);
    const client = loadTestModule(
        new URL("../ui/offline-client.js", import.meta.url),
        host.imports,
        host.globals,
    );
    const globals = {
        ...host.globals,
        window,
        sessionStorage: window.sessionStorage,
        document: {
            hidden: false,
            querySelector: () => null,
            querySelectorAll: () => [],
        },
        Promise,
    };
    const availability = loadTestModule(
        new URL("../ui/availability.js", import.meta.url),
        {
            "./offline-client.js": { profileFetch: client.profileFetch },
            "/static/reuse/escape-html.js": { escapeHtml: String },
            "/static/reuse/ui-ctx.js": { uiCtx: host.ctx },
            "/static/reuse/i18n.js": {
                createI18n: async () => ({ t: (key) => key }),
            },
            "/static/reuse/page-composer/presence-tracker.js": {
                subscribePresenceActivity(listener) {
                    subscribers.add(listener);
                    listener({ active: true });
                    return () => subscribers.delete(listener);
                },
            },
        },
        globals,
    );
    const provider = loadTestModule(
        new URL("../ui/provider.js", import.meta.url),
        {
            "./availability.js": availability,
            "./offline-client.js": client,
            "./client.js": {
                profileUiClient: {
                    getCurrentProfile: () =>
                        client.profileFetch("/api/v1/social/profile"),
                },
            },
            "./profile-avatar.js": { ensureProfileAvatarStyles: () => styles },
        },
        globals,
    );
    const lifecycle = createProviderLifecycle({
        uiCtx: host.ctx,
        importProvider: async () => provider,
    });
    return {
        host,
        lifecycle,
        availability,
        requests,
        errors,
        subscribers,
        timers,
        window,
        ready,
        fail,
    };
}
const catalog = [{ scriptUrl: "/profile-provider" }];
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("an online administration load starts availability only after the Profile provider is ready", async () => {
    const state = fixture();
    assert.equal(state.subscribers.size, 0);
    assert.equal(state.timers.size, 0);
    assert.equal(await state.availability.fetchAvailability(), null);
    const mounting = state.lifecycle.reconcile(catalog);
    await settle();
    assert.equal(
        typeof state.host.ctx.capabilities.get("social:profileRequest"),
        "function",
    );
    assert.equal(state.requests.length, 0);
    state.ready();
    await mounting;
    await settle();
    assert.deepEqual(
        state.requests.map(({ path }) => path),
        ["/api/v1/social/availability/presence", "/api/v1/social/availability"],
    );
    assert.equal(state.subscribers.size, 1);
    assert.equal(state.timers.size, 2);
    assert.equal(state.errors.length, 0);
    await state.lifecycle.reconcile([]);
    state.host.controller.abort();
});

test("disable removes availability work, and re-enable starts one fresh subscription and timer set", async () => {
    const state = fixture();
    state.ready();
    await state.lifecycle.reconcile(catalog);
    await settle();
    const callbacks = [...state.timers.values()];
    const oldActivity = [...state.subscribers][0];
    const renderer = state.host.ctx.capabilities.get("ui:availabilityRenderer");
    const sent = state.requests.length;
    await state.lifecycle.reconcile([]);
    assert.equal(state.subscribers.size, 0);
    assert.equal(state.timers.size, 0);
    assert.equal(
        state.host.ctx.capabilities.get("social:profileRequest"),
        undefined,
    );
    assert.equal(
        state.host.ctx.capabilities.get("ui:availabilityRenderer"),
        undefined,
    );
    callbacks.forEach((callback) => callback());
    oldActivity({ active: false });
    state.window.dispatchEvent(new Event("pagehide"));
    assert.equal(await renderer.refresh(), null);
    await settle();
    assert.equal(state.requests.length, sent);
    await state.lifecycle.reconcile(catalog);
    await settle();
    assert.equal(state.requests.length, sent + 2);
    assert.equal(state.subscribers.size, 1);
    assert.equal(state.timers.size, 2);
    assert.equal(state.errors.length, 0);
    await state.lifecycle.reconcile([]);
    state.host.controller.abort();
});

test("a failed style load rolls back the profile client without starting background requests", async () => {
    const state = fixture();
    const mounting = state.lifecycle.reconcile(catalog);
    await settle();
    state.fail(new Error("stylesheet_unavailable"));
    await assert.rejects(mounting, /stylesheet_unavailable/);
    assert.equal(
        state.host.ctx.capabilities.get("social:profileRequest"),
        undefined,
    );
    assert.equal(
        state.host.ctx.capabilities.get("social:profileUiClient"),
        undefined,
    );
    assert.equal(state.requests.length, 0);
    assert.equal(state.subscribers.size, 0);
    assert.equal(state.timers.size, 0);
    state.host.controller.abort();
});

test("availability stops safely when the scoped profile client is removed before its callbacks", async () => {
    const state = fixture();
    state.ready();
    await state.lifecycle.reconcile(catalog);
    await settle();
    const sent = state.requests.length;
    state.host.ctx.capabilities.remove(
        "social:profileRequest",
        state.host.ctx.capabilities.get("social:profileRequest"),
    );
    await state.availability.refreshAvailabilityIndicators();
    await state.availability.hydrateAvailabilityIndicators();
    assert.equal(state.requests.length, sent);
    await state.lifecycle.reconcile([]);
});
