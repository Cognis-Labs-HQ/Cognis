import test from "node:test";
import assert from "node:assert/strict";
import { tutorialHost, play, tick } from "./fixtures/host.js";

for (const firstTime of [false, true]) {
    test(`target replacement during preparation retries before publishing readiness (firstTime=${firstTime})`, async (context) => {
        const preparing = Promise.withResolvers();
        const rendered = Promise.withResolvers();
        let original;
        const state = tutorialHost({
            onPresent: async (entry) => {
                if (entry.target === original && !entry.waiting) {
                    preparing.resolve(entry);
                    await rendered.promise;
                }
            },
        });
        context.after(state.dispose);
        const owner = state.owner();
        original = state.element();
        let current = original;
        const target = await owner.target("control", {
            resolve: () => current,
        });
        const registration = await owner.register(
            play([{ id: "inspect", titleKey: "inspect", target: target.id }]),
        );
        const session = await registration.start({ firstTime });
        const stale = await preparing.promise;
        let ready = false;
        void session.ready.then(() => (ready = true));
        current = state.element();
        original.isConnected = false;
        stale.dispose();
        stale.lost();
        await tick();
        assert.equal(ready, false);
        rendered.resolve();
        assert.equal(await session.ready, true);
        assert.equal(state.rendered.at(-1).target, current);
        assert.equal(state.rendered.at(-1).disposed, false);
        assert.equal(stale.disposed, true);
        const lease = await state.ctx.capabilities
            .get("ui:floatingMenus")
            .request({ signal: state.ctx.signal });
        let granted = false;
        void lease.ready.then(() => (granted = true));
        await tick();
        assert.equal(granted, false);
        await session.next();
        assert.equal((await session.finished).status, "completed");
        assert.equal(await lease.ready, true);
        await lease.dispose();
        assert.ok(state.rendered.every((entry) => entry.disposed));
    });
}

test("late target-loss callbacks cannot replace a restarted presentation", async (context) => {
    const preparing = Promise.withResolvers();
    const rendered = Promise.withResolvers();
    let original;
    const state = tutorialHost({
        onPresent: async (entry) => {
            if (entry.target === original && !entry.waiting) {
                preparing.resolve(entry);
                await rendered.promise;
            }
        },
    });
    context.after(state.dispose);
    const owner = state.owner();
    original = state.element();
    let current = original;
    const target = await owner.target("control", { resolve: () => current });
    const registration = await owner.register(
        play([{ id: "inspect", titleKey: "inspect", target: target.id }]),
    );
    const session = await registration.start();
    const stale = await preparing.promise;
    current = state.element();
    await session.restart();
    const count = state.rendered.length;
    stale.lost(new Error("stale presentation"));
    rendered.resolve();
    await tick();
    assert.equal(state.rendered.length, count);
    assert.equal(state.rendered.at(-1).target, current);
    assert.equal(state.rendered.at(-1).disposed, false);
    assert.equal(state.api.current().stepId, "inspect");
    assert.deepEqual(
        state.logs.filter(([level]) => level === "error"),
        [],
    );
    await session.skip();
});

test("owner removal cancels pending presentation recovery and releases the menu reservation", async (context) => {
    const preparing = Promise.withResolvers();
    const rendered = Promise.withResolvers();
    const state = tutorialHost({
        onPresent: async (entry) => {
            if (entry.target && !entry.waiting) {
                preparing.resolve(entry);
                await rendered.promise;
            }
        },
    });
    context.after(state.dispose);
    const owner = state.owner();
    const control = state.element();
    const target = await owner.target("control", { resolve: () => control });
    const registration = await owner.register(
        play([{ id: "inspect", titleKey: "inspect", target: target.id }]),
    );
    const session = await registration.start();
    const stale = await preparing.promise;
    stale.lost();
    owner.abort();
    assert.equal((await session.finished).status, "cancelled");
    assert.equal(await session.ready, false);
    rendered.resolve();
    await tick();
    assert.equal(state.api.current(), null);
    assert.ok(state.rendered.every((entry) => entry.disposed));
    const lease = await state.ctx.capabilities
        .get("ui:floatingMenus")
        .request({ signal: state.ctx.signal });
    assert.equal(await lease.ready, true);
    await lease.dispose();
});

test("temporarily losing a shown target keeps controls and restores the same step", async (context) => {
    const state = tutorialHost();
    context.after(state.dispose);
    const owner = state.owner();
    let control = state.element();
    const target = await owner.target("control", { resolve: () => control });
    const registered = await owner.register(
        play([
            {
                id: "shown",
                titleKey: "shown",
                target: target.id,
                effects: { spotlight: true },
                missing: { timeoutMs: 0, action: "skip" },
            },
        ]),
    );
    const session = await registered.start();
    await session.ready;
    control = null;
    state.rendered.at(-1).lost();
    await tick();
    assert.equal(session.state().stepId, "shown");
    assert.equal(state.api.current().stepId, "shown");
    assert.equal(state.rendered.at(-1).missing, true);
    assert.equal(state.rendered.at(-1).disposed, false);
    control = state.element();
    await new Promise((resolve) => setTimeout(resolve, 75));
    assert.equal(state.rendered.at(-1).target, control);
    assert.equal(state.rendered.at(-1).waiting, undefined);
    await session.next();
    assert.equal((await session.finished).status, "completed");
});
